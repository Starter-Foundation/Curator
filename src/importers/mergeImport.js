// Merges imported notes (e.g. from convertCriticalNotesExport()) into an
// existing campaign. A note "already exists" when the campaign has a note
// with the same title (ignoring case) in the same category; for each of
// those the user picks one of IMPORT_CHOICES, and planNotesImport() turns
// that into the payload for api.importNotes().

export const IMPORT_CHOICES = {
    overwrite: "overwrite",
    skip: "skip",
    keepBoth: "keep-both"
};

const NOTE_LINK_PATTERN = /\(note:([0-9a-f-]{36})\)/gi;

function matchKey(category, title) {
    return `${category}\u0000${String(title).trim().toLowerCase()}`;
}

function remapLinks(text, idMap) {
    return text.replace(NOTE_LINK_PATTERN, function(match, noteId) {
        return idMap.has(noteId) ? `(note:${idMap.get(noteId)})` : match;
    });
}

// The first existing note per category + title, in the campaign's order.
function indexExistingNotes(existingNotes) {
    const byKey = new Map();

    existingNotes.forEach(function(note) {
        const key = matchKey(note.category, note.title);

        if (!byKey.has(key)) {
            byKey.set(key, note);
        }
    });

    return byKey;
}

// Groups the imported notes whose name is already taken, one entry per
// existing note: { key, title, category, existing, identical }. Identical
// ones (same title, description, text and completion) need no decision -
// planNotesImport() always skips them.
export function findImportConflicts(existingNotes, importedNotes) {
    const existingByKey = indexExistingNotes(existingNotes);
    const matches = [];
    // Links in the imported text point at imported ids; mapping every
    // match to its existing note lets the text be compared like for like.
    const idMap = new Map();

    importedNotes.forEach(function(note) {
        const key = matchKey(note.category, note.title);
        const existing = existingByKey.get(key);

        if (existing) {
            matches.push({ key, note, existing });
            idMap.set(note.id, existing.id);
        }
    });

    const conflicts = new Map();

    matches.forEach(function({ key, note, existing }) {
        const identical = note.title === existing.title
            && note.description === (existing.description || "")
            && remapLinks(note.content, idMap) === (existing.content || "")
            && note.completed === Boolean(existing.completed);

        const conflict = conflicts.get(key);

        if (conflict) {
            conflict.identical = conflict.identical && identical;
        } else {
            conflicts.set(key, { key, title: existing.title, category: existing.category, existing, identical });
        }
    });

    return Array.from(conflicts.values());
}

function keepBothTitle(title, category, takenKeys) {
    let candidate = `${title} (imported)`;
    let number = 2;

    while (takenKeys.has(matchKey(category, candidate))) {
        candidate = `${title} (imported ${number})`;
        number += 1;
    }

    return candidate;
}

// `choices` maps each non-identical conflict's key to an IMPORT_CHOICES
// value. Returns { notes, overwrites, skipped } where notes/overwrites are
// ready for api.importNotes():
// - Skipped and overwritten notes are replaced by the existing note they
//   match, so imported children nest under it and links point at it.
// - "Keep both" imports the note as "<title> (imported)".
export function planNotesImport(existingNotes, importedNotes, choices) {
    const existingByKey = indexExistingNotes(existingNotes);
    const identicalKeys = new Set(
        findImportConflicts(existingNotes, importedNotes)
            .filter((conflict) => conflict.identical)
            .map((conflict) => conflict.key)
    );
    const takenKeys = new Set(existingNotes.map((note) => matchKey(note.category, note.title)));
    const overwrittenIds = new Set();
    const idMap = new Map();

    const decisions = importedNotes.map(function(note) {
        const key = matchKey(note.category, note.title);
        const existing = existingByKey.get(key);

        if (!existing) {
            return { note, choice: null };
        }

        let choice = identicalKeys.has(key) ? IMPORT_CHOICES.skip : choices.get(key);

        // The import itself has two notes with this name: only the first
        // can overwrite the existing note, so later ones are kept too.
        if (choice === IMPORT_CHOICES.overwrite && overwrittenIds.has(existing.id)) {
            choice = IMPORT_CHOICES.keepBoth;
        }

        if (choice === IMPORT_CHOICES.overwrite) {
            overwrittenIds.add(existing.id);
        }

        if (choice === IMPORT_CHOICES.overwrite || choice === IMPORT_CHOICES.skip) {
            idMap.set(note.id, existing.id);
        }

        return { note, existing, choice };
    });

    const notes = [];
    const overwrites = [];
    let skipped = 0;

    decisions.forEach(function({ note, existing, choice }) {
        const content = remapLinks(note.content, idMap);

        if (choice === IMPORT_CHOICES.skip) {
            skipped += 1;
            return;
        }

        if (choice === IMPORT_CHOICES.overwrite) {
            overwrites.push({
                id: existing.id,
                title: note.title,
                description: note.description,
                content,
                completed: note.completed
            });
            return;
        }

        const title = choice === IMPORT_CHOICES.keepBoth
            ? keepBothTitle(note.title, note.category, takenKeys)
            : note.title;

        takenKeys.add(matchKey(note.category, title));

        notes.push({
            ...note,
            title,
            content,
            parentId: note.parentId ? idMap.get(note.parentId) || note.parentId : null
        });
    });

    return { notes, overwrites, skipped };
}
