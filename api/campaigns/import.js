import { query, isUuid } from "../_lib/db.js";
import { requireUserId } from "../_lib/auth.js";
import { withHandler } from "../_lib/respond.js";
import { parseGame } from "../_lib/game.js";

const RETURNING = "id, name, map_image_url, game, party_name, created_at";

const IMPORTABLE_CATEGORIES = ["characters", "npcs", "enemies", "lore", "factions", "locations", "quests", "loot"];
const MAX_NOTES = 5000;

function badRequest(response, error) {
    response.status(400).json({ error });
}

// Creates a new campaign from an import (see src/importers/), notes and all.
// Note ids are generated client-side so parents and "note:<id>" links can
// reference notes in the same import; they're validated here as UUIDs and
// parents must point within the import itself.
export default withHandler(async function handler(request, response) {
    const userId = await requireUserId(request);

    if (request.method !== "POST") {
        response.status(405).json({ error: "Method not allowed" });
        return;
    }

    const body = request.body || {};
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const game = parseGame(body.game);
    const notes = body.notes;

    if (!name) {
        return badRequest(response, "name is required");
    }

    if (!game) {
        return badRequest(response, "game is required");
    }

    if (!Array.isArray(notes) || notes.length > MAX_NOTES) {
        return badRequest(response, `notes must be a list of at most ${MAX_NOTES} notes`);
    }

    const ids = new Set();

    for (const note of notes) {
        if (!note || !isUuid(note.id) || ids.has(note.id)) {
            return badRequest(response, "Every note needs a unique id");
        }

        ids.add(note.id);
    }

    const nextSortOrder = {};
    const rows = [];

    for (const note of notes) {
        const title = typeof note.title === "string" ? note.title.trim() : "";

        if (!title) {
            return badRequest(response, "Every note needs a title");
        }

        if (!IMPORTABLE_CATEGORIES.includes(note.category)) {
            return badRequest(response, `Unknown category "${note.category}"`);
        }

        if (note.parentId != null && !ids.has(note.parentId)) {
            return badRequest(response, `"${title}" has a parent that isn't part of this import`);
        }

        // Keeps the import's own order within each category.
        const sortOrder = nextSortOrder[note.category] || 0;
        nextSortOrder[note.category] = sortOrder + 1;

        rows.push({
            id: note.id,
            title,
            description: typeof note.description === "string" ? note.description : "",
            content: typeof note.content === "string" ? note.content : "",
            category: note.category,
            parent_id: note.parentId || null,
            completed: note.completed === true,
            sort_order: sortOrder
        });
    }

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
});
