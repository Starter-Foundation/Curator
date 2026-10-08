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

// A note left unsaved in the editor (POST with draft: true), visible only to
// its author. `draftOf` is the existing note it holds changes to, if any.
// Drafts keep the text, parent and completion only - not avatar, player or
// owner, which other people's views (Player Info, loot) read directly.
async function createDraft(campaignId, userId, title, category, body, response) {
    const draftOf = body.draftOf || null;

    if (draftOf) {
        const [original] = isUuid(draftOf)
            ? await query(
                `SELECT id FROM notes WHERE id = $1 AND campaign_id = $2 AND draft_by IS NULL`,
                [draftOf, campaignId]
            )
            : [];

        if (!original) {
            response.status(400).json({ error: "draftOf must be a note in this campaign" });
            return;
        }
    }

    const [draft] = await query(
        `INSERT INTO notes
            (campaign_id, title, description, content, category, parent_id, completed, draft_by, draft_of)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING ${RETURNING}`,
        [
            campaignId,
            title,
            body.description || "",
            body.content || "",
            category,
            body.parentId || null,
            Boolean(body.completed),
            userId,
            draftOf
        ]
    );

    response.status(201).json(draft);
}
