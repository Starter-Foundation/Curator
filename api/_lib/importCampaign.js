import { query, isUuid } from "./db.js";
import { parseGame } from "./game.js";

const RETURNING = "id, name, map_image_url, game, party_name, created_at";

const IMPORTABLE_CATEGORIES = ["characters", "npcs", "enemies", "lore", "factions", "locations", "quests", "loot", "sessions"];
const MAX_NOTES = 5000;

function badRequest(message) {
    return Object.assign(new Error(message), { statusCode: 400 });
}

function textField(value) {
    return typeof value === "string" ? value : "";
}

function requireTitle(note) {
    const title = typeof note.title === "string" ? note.title.trim() : "";

    if (!title) {
        throw badRequest("Every note needs a title");
    }

    return title;
}

// Validates imported notes and turns them into rows for jsonb_to_recordset.
// Note ids are generated client-side so parents and "note:<id>" links can
// reference notes in the same import; they're validated here as UUIDs, and
// each parent must be part of the import or one of `existingIds`.
// `nextSortOrder` maps category -> first free sort_order, and is advanced
// so the import keeps its own order at the end of each category.
function buildNoteRows(notes, { existingIds = new Set(), nextSortOrder = {} } = {}) {
    if (!Array.isArray(notes) || notes.length > MAX_NOTES) {
        throw badRequest(`notes must be a list of at most ${MAX_NOTES} notes`);
    }

    const ids = new Set();

    for (const note of notes) {
        if (!note || !isUuid(note.id) || ids.has(note.id) || existingIds.has(note.id)) {
            throw badRequest("Every note needs a unique id");
        }

        ids.add(note.id);
    }

    return notes.map(function(note) {
        const title = requireTitle(note);

        if (!IMPORTABLE_CATEGORIES.includes(note.category)) {
            throw badRequest(`Unknown category "${note.category}"`);
        }

        if (note.parentId != null && !ids.has(note.parentId) && !existingIds.has(note.parentId)) {
            throw badRequest(`"${title}" has a parent that isn't part of this import or campaign`);
        }

        const sortOrder = nextSortOrder[note.category] || 0;
        nextSortOrder[note.category] = sortOrder + 1;

        return {
            id: note.id,
            title,
            description: textField(note.description),
            content: textField(note.content),
            category: note.category,
            parent_id: note.parentId || null,
            completed: note.completed === true,
            sort_order: sortOrder
        };
    });
}

// Creates a new campaign from an import (see src/importers/), notes and all:
// POST /api/campaigns with a `notes` list (see api/campaigns.js). Lives here
// rather than as its own route because the Hobby plan caps a deployment at
// 12 serverless functions.
export async function importCampaign(userId, body, response) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const game = parseGame(body.game);

    if (!name) {
        throw badRequest("name is required");
    }

    if (!game) {
        throw badRequest("game is required");
    }

    const rows = buildNoteRows(body.notes);

    // One statement, so the campaign and its notes are created together or
    // not at all. Parent foreign keys are checked at the end of the
    // statement, so a child can be inserted alongside its parent.
    const [campaign] = await query(
        `WITH new_campaign AS (
             INSERT INTO campaigns (user_id, name, game) VALUES ($1, $2, $3)
             RETURNING ${RETURNING}
         ), new_notes AS (
             INSERT INTO notes (id, campaign_id, title, description, content, category, parent_id, completed, sort_order)
             SELECT note.id, new_campaign.id, note.title, note.description, note.content,
                    note.category, note.parent_id, note.completed, note.sort_order
             FROM new_campaign,
                  jsonb_to_recordset($4::jsonb) AS note(
                      id UUID, title TEXT, description TEXT, content TEXT, category TEXT,
                      parent_id UUID, completed BOOLEAN, sort_order INTEGER
                  )
         )
         SELECT * FROM new_campaign`,
        [userId, name, game, JSON.stringify(rows)]
    );

    response.status(201).json({ ...campaign, role: "owner", importedNotes: rows.length });
}

// Imports notes into an existing campaign: POST /api/campaigns/:id/notes
// with a `notes` list (see api/campaigns/[id]/notes.js). The client has
// already resolved name clashes with the user (src/importers/mergeImport.js),
// so this receives:
//   notes      - new notes, as for importCampaign(); parents may also be
//                existing notes in this campaign
//   overwrites - [{ id, title, description, content, completed }] replacing
//                the text of existing notes in this campaign (they keep
//                their place in the tree, avatar, owner, etc.)
export async function importNotes(campaignId, body, response) {
    const overwrites = body.overwrites == null ? [] : body.overwrites;

    if (!Array.isArray(overwrites) || overwrites.length > MAX_NOTES) {
        throw badRequest(`overwrites must be a list of at most ${MAX_NOTES} notes`);
    }

    const existing = await query(
        `SELECT id, category, sort_order FROM notes WHERE campaign_id = $1`,
        [campaignId]
    );
    const existingIds = new Set(existing.map((note) => note.id));
    const nextSortOrder = {};

    existing.forEach(function(note) {
        nextSortOrder[note.category] = Math.max(nextSortOrder[note.category] || 0, note.sort_order + 1);
    });

    const rows = buildNoteRows(body.notes, { existingIds, nextSortOrder });

    const overwrittenIds = new Set();
    const overwriteRows = overwrites.map(function(note) {
        if (!note || !existingIds.has(note.id) || overwrittenIds.has(note.id)) {
            throw badRequest("Every overwritten note must be a different note in this campaign");
        }

        overwrittenIds.add(note.id);

        return {
            id: note.id,
            title: requireTitle(note),
            description: textField(note.description),
            content: textField(note.content),
            completed: note.completed === true
        };
    });

    // One statement, so the import applies in full or not at all.
    await query(
        `WITH new_notes AS (
             INSERT INTO notes (id, campaign_id, title, description, content, category, parent_id, completed, sort_order)
             SELECT note.id, $1::uuid, note.title, note.description, note.content,
                    note.category, note.parent_id, note.completed, note.sort_order
             FROM jsonb_to_recordset($2::jsonb) AS note(
                 id UUID, title TEXT, description TEXT, content TEXT, category TEXT,
                 parent_id UUID, completed BOOLEAN, sort_order INTEGER
             )
         ), overwritten AS (
             UPDATE notes
             SET title = note.title, description = note.description,
                 content = note.content, completed = note.completed
             FROM jsonb_to_recordset($3::jsonb) AS note(
                 id UUID, title TEXT, description TEXT, content TEXT, completed BOOLEAN
             )
             WHERE notes.id = note.id AND notes.campaign_id = $1::uuid
         )
         SELECT 1`,
        [campaignId, JSON.stringify(rows), JSON.stringify(overwriteRows)]
    );

    response.status(201).json({ importedNotes: rows.length, overwrittenNotes: overwriteRows.length });
}
