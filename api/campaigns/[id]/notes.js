import { query, isUuid, getAccessibleCampaign, requireEditorRole } from "../../_lib/db.js";
import { requireUserId } from "../../_lib/auth.js";
import { withHandler } from "../../_lib/respond.js";
import { parseLootOwner } from "../../_lib/loot.js";
import { importNotes } from "../../_lib/importCampaign.js";

const RETURNING =
    "id, campaign_id, title, description, content, category, parent_id, completed, sort_order, avatar_url, played_by, in_party, owned_by, draft_by, draft_of, created_at";

export default withHandler(async function handler(request, response) {
    const userId = await requireUserId(request);
    const { id: campaignId } = request.query;

    const campaign = await getAccessibleCampaign(campaignId, userId);

    if (request.method === "GET") {
        // Everyone's real notes, plus only the caller's own drafts.
        const notes = await query(
            `SELECT ${RETURNING} FROM notes
             WHERE campaign_id = $1 AND (draft_by IS NULL OR draft_by = $2)
             ORDER BY sort_order ASC, created_at ASC`,
            [campaignId, userId]
        );
        response.status(200).json(notes);
        return;
    }

    if (request.method === "POST") {
        requireEditorRole(campaign.role);

        const body = request.body || {};

        // A list of notes is an import into this campaign. Handled here
        // rather than in its own route - see api/_lib/importCampaign.js.
        if (Object.prototype.hasOwnProperty.call(body, "notes")) {
            await importNotes(campaignId, body, response);
            return;
        }

        const title = (body.title || "").trim();
        const category = body.category;

        if (!title) {
            response.status(400).json({ error: "title is required" });
            return;
        }

        if (!category) {
            response.status(400).json({ error: "category is required" });
            return;
        }

        if (body.draft === true) {
            await createDraft(campaignId, userId, title, category, body, response);
            return;
        }

        const ownedBy = category === "loot" ? await parseLootOwner(body.ownedBy, campaignId) : null;

        // New notes go to the end of their category's list, mirroring
        // campaign.notes.push() in the current localStorage version.
        const [{ next_sort_order: nextSortOrder }] = await query(
            `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort_order
             FROM notes WHERE campaign_id = $1 AND category = $2 AND draft_by IS NULL`,
            [campaignId, category]
        );

        const [note] = await query(
            `INSERT INTO notes
                (campaign_id, title, description, content, category, parent_id, completed, sort_order, played_by, owned_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING ${RETURNING}`,
            [
                campaignId,
                title,
                body.description || "",
                body.content || "",
                category,
                body.parentId || null,
                Boolean(body.completed),
                nextSortOrder,
                body.playedBy || null,
                ownedBy
            ]
        );

        response.status(201).json(note);
        return;
    }

    response.status(405).json({ error: "Method not allowed" });
});

// Saves a draft - a note left unsaved in the editor, visible only to its
// author (POST with draft: true). It's an upsert on an id the client
// generates, so the client can keep retrying the same save (after a dropped
// connection, or from a copy kept in the browser) without making duplicates.
// `draftOf` is the existing note it holds changes to, if any.
//
// A draft may outlive the notes it points at (e.g. saved offline, synced
// later), so a missing original or parent is dropped rather than refused -
// refusing would leave the client retrying forever.
//
// Drafts keep the text, parent and completion only - not avatar, player or
// owner, which other people's views (Player Info, loot) read directly.
async function createDraft(campaignId, userId, title, category, body, response) {
    if (!isUuid(body.id)) {
        response.status(400).json({ error: "A draft needs an id" });
        return;
    }

    const references = [body.draftOf, body.parentId].filter(isUuid);
    const existing = references.length === 0 ? [] : await query(
        `SELECT id FROM notes WHERE campaign_id = $1 AND draft_by IS NULL AND id = ANY($2::uuid[])`,
        [campaignId, references]
    );
    const existingIds = new Set(existing.map((note) => note.id));
    const draftOf = existingIds.has(body.draftOf) ? body.draftOf : null;
    const parentId = existingIds.has(body.parentId) ? body.parentId : null;

    // The WHERE stops an id that belongs to someone else's draft, a real
    // note or another campaign from being overwritten: nothing is returned.
    const [draft] = await query(
        `INSERT INTO notes
            (id, campaign_id, title, description, content, category, parent_id, completed, draft_by, draft_of)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET
             title = EXCLUDED.title,
             description = EXCLUDED.description,
             content = EXCLUDED.content,
             category = EXCLUDED.category,
             parent_id = EXCLUDED.parent_id,
             completed = EXCLUDED.completed,
             draft_of = EXCLUDED.draft_of
         WHERE notes.draft_by = EXCLUDED.draft_by AND notes.campaign_id = EXCLUDED.campaign_id
         RETURNING ${RETURNING}`,
        [
            body.id,
            campaignId,
            title,
            typeof body.description === "string" ? body.description : "",
            typeof body.content === "string" ? body.content : "",
            category,
            parentId,
            Boolean(body.completed),
            userId,
            draftOf
        ]
    );

    if (!draft) {
        response.status(409).json({ error: "That draft can't be saved" });
        return;
    }

    response.status(200).json(draft);
}
