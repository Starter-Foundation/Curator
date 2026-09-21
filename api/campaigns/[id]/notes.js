import { query, getAccessibleCampaign, requireEditorRole } from "../../_lib/db.js";
import { requireUserId } from "../../_lib/auth.js";
import { withHandler } from "../../_lib/respond.js";

const RETURNING =
    "id, campaign_id, title, description, content, category, parent_id, completed, sort_order, avatar_url, created_at";

export default withHandler(async function handler(request, response) {
    const userId = await requireUserId(request);
    const { id: campaignId } = request.query;

    const campaign = await getAccessibleCampaign(campaignId, userId);

    if (request.method === "GET") {
        const notes = await query(
            `SELECT ${RETURNING} FROM notes
             WHERE campaign_id = $1
             ORDER BY sort_order ASC, created_at ASC`,
            [campaignId]
        );
        response.status(200).json(notes);
        return;
    }

    if (request.method === "POST") {
        requireEditorRole(campaign.role);

        const body = request.body || {};
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

        // New notes go to the end of their category's list, mirroring
        // campaign.notes.push() in the current localStorage version.
        const [{ next_sort_order: nextSortOrder }] = await query(
            `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort_order
             FROM notes WHERE campaign_id = $1 AND category = $2`,
            [campaignId, category]
        );

        const [note] = await query(
            `INSERT INTO notes
                (campaign_id, title, description, content, category, parent_id, completed, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING ${RETURNING}`,
            [
                campaignId,
                title,
                body.description || "",
                body.content || "",
                category,
                body.parentId || null,
                Boolean(body.completed),
                nextSortOrder
            ]
        );

        response.status(201).json(note);
        return;
    }

    response.status(405).json({ error: "Method not allowed" });
});
