import { unzipSync, strFromU8 } from "fflate";

// Converts a Critical Notes campaign export (the .zip from its "Export"
// option, or the campaign.json inside it) into Curator notes.
//
// The export also holds a markdown/ folder, but campaign.json is used
// instead: the markdown drops each entry's parent, NPC flag and id, and the
// ids are what "[Name](locations/185039)"-style links in the text point at.

// Critical Notes section -> Curator category. The timeline has no Curator
// tab of its own, so it goes under a grouping note in Lore.
const SECTION_CATEGORIES = {
    characters: "characters",
    locations: "locations",
    factions: "factions",
    quests: "quests",
    lore: "lore",
    loot: "loot",
    timeline: "lore"
};

const GROUPED_SECTIONS = {
    timeline: "Timeline"
};

// Mirrors NON_NESTABLE_CATEGORIES in script.js.
const NON_NESTABLE_CATEGORIES = ["characters", "npcs"];

const CROSS_LINK_PATTERN = /\[([^\]]*)\]\((characters|locations|factions|quests|loot|lore|timeline)\/(\d+)\)/g;

export function readCriticalNotesFile(fileName, bytes) {
    let jsonText;

    if (/\.json$/i.test(fileName)) {
        jsonText = strFromU8(bytes);
    } else {
        let files;

        try {
            files = unzipSync(bytes, {
                filter: function(file) {
                    return /(^|\/)campaign\.json$/.test(file.name);
                }
            });
        } catch (error) {
            throw new Error("That file isn't a readable .zip. Please choose the export exactly as Critical Notes downloaded it.");
        }

        const entryName = Object.keys(files)[0];

        if (!entryName) {
            throw new Error("Couldn't find campaign.json in that .zip. Is it a Critical Notes campaign export?");
        }

        jsonText = strFromU8(files[entryName]);
    }

    let data;

    try {
        data = JSON.parse(jsonText);
    } catch (error) {
        throw new Error("campaign.json in that export couldn't be read.");
    }

    if (!data || typeof data !== "object" || !Object.keys(SECTION_CATEGORIES).some((section) => Array.isArray(data[section]))) {
        throw new Error("That doesn't look like a Critical Notes campaign export.");
    }

    return data;
}

// Counts per section, for the preview shown before importing.
export function summarizeCriticalNotesExport(data) {
    const characters = data.characters || [];
    const count = (section) => (data[section] || []).length;
    const all = Object.keys(SECTION_CATEGORIES).flatMap((section) => data[section] || []);

    return {
        name: (data.name || "").trim(),
        playerCharacters: characters.filter((entry) => !entry.isNpc).length,
        npcs: characters.filter((entry) => entry.isNpc).length,
        locations: count("locations"),
        factions: count("factions"),
        quests: count("quests"),
        lore: count("lore"),
        loot: count("loot"),
        timeline: count("timeline"),
        hidden: all.filter((entry) => entry.isHidden).length
    };
}

function formatDate(date, calendar) {
    const months = (calendar && calendar.months) || [];
    const month = months[date.month - 1];

    return month
        ? `${date.day} ${month.name} ${date.year}`
        : `Day ${date.day}, Month ${date.month}, Year ${date.year}`;
}

function byOrderThenName(a, b) {
    return (a.order || 0) - (b.order || 0) || String(a.name || "").localeCompare(String(b.name || ""));
}

// Returns { notes } ready for POST /api/campaigns/import: each note carries
// a pre-generated id, so parents and links can point at notes that don't
// exist yet (the server inserts them all in one statement).
export function convertCriticalNotesExport(data, { includeHidden }) {
    const entries = [];

    Object.keys(SECTION_CATEGORIES).forEach(function(section) {
        (data[section] || []).forEach(function(entry) {
            if (!includeHidden && entry.isHidden) {
                return;
            }

            const category = section === "characters"
                ? (entry.isNpc ? "npcs" : "characters")
                : SECTION_CATEGORIES[section];

            entries.push({ section, entry, category, id: crypto.randomUUID() });
        });
    });

    const byExportId = new Map(entries.map((item) => [item.entry.id, item]));

    function linkTo(exportId, label) {
        const target = byExportId.get(exportId);
        // Links to skipped (hidden) entries become plain text.
        return target ? `[${label}](note:${target.id})` : label;
    }

    const notes = [];

    // Campaign overview first, from the export's own description fields.
    const overviewParts = [data.description, data.membersInfo && `## Members\n\n${data.membersInfo}`]
        .filter((part) => part && String(part).trim());

    if (overviewParts.length > 0) {
        notes.push({
            id: crypto.randomUUID(),
            title: "Campaign Overview",
            description: "Imported from Critical Notes",
            content: overviewParts.join("\n\n"),
            category: "lore",
            parentId: null,
            completed: false
        });
    }

    // One grouping note per section in GROUPED_SECTIONS, as the parent of
    // that section's top-level entries.
    const groupIds = {};

    Object.keys(GROUPED_SECTIONS).forEach(function(section) {
        if (entries.some((item) => item.section === section)) {
            groupIds[section] = crypto.randomUUID();
            notes.push({
                id: groupIds[section],
                title: GROUPED_SECTIONS[section],
                description: "",
                content: "",
                category: "lore",
                parentId: null,
                completed: false
            });
        }
    });

    entries
        .slice()
        .sort((a, b) => byOrderThenName(a.entry, b.entry))
        .forEach(function({ section, entry, category, id }) {
            const parent = entry.parent ? byExportId.get(entry.parent) : null;
            let parentId = null;

            // Parents are only kept within the same category, and only
            // where Curator supports nesting. An entry whose parent was
            // skipped (hidden) moves up to the top level.
            if (parent && parent.category === category && !NON_NESTABLE_CATEGORIES.includes(category)) {
                parentId = parent.id;
            } else if (groupIds[section]) {
                parentId = groupIds[section];
            }

            const text = String(entry.text || "").replace(CROSS_LINK_PATTERN, function(match, label, linkSection, exportId) {
                return linkTo(Number(exportId), label);
            });

            const extras = [];

            (entry.dates || []).forEach(function(date) {
                extras.push(`**${date.label || "Date"}:** ${formatDate(date, data.calendar)}`);
            });

            const related = (entry.links || [])
                .map((linkedId) => byExportId.get(linkedId))
                .filter(Boolean)
                .map((target) => linkTo(target.entry.id, target.entry.name || "Untitled"));

            if (related.length > 0) {
                extras.push(`**Related:** ${related.join(", ")}`);
            }

            const firstDate = (entry.dates || [])[0];
            const title = String(entry.name || "").trim()
                || (firstDate ? formatDate(firstDate, data.calendar) : "Untitled");

            notes.push({
                id,
                title,
                description: String(entry.subtitle || ""),
                content: [text.trim(), ...extras].filter(Boolean).join("\n\n"),
                category,
                parentId,
                completed: Boolean(entry.isCompleted)
            });
        });

    return { notes };
}
