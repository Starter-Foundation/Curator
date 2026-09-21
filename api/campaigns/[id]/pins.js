import { query, getAccessibleCampaign, requireEditorRole } from "../../_lib/db.js";
import { requireUserId } from "../../_lib/auth.js";
import { withHandler } from "../../_lib/respond.js";

const RETURNING = "id, campaign_id, note_id, x, y, color";

export default withHandler(async function handler(request, response) {
    const userId = await requireUserId(request);
    const { id: campaignId } = request.query;

    const campaign = await getAccessibleCampaign(campaignId, userId);

    if (request.method === "GET") {
        const pins = await query(
            `SELECT ${RETURNING} FROM map_pins WHERE campaign_id = $1`,
            [campaignId]
        );
        response.status(200).json(pins);
        return;
    }

    if (request.method === "POST") {
        requireEditorRole(campaign.role);

        const body = request.body || {};

        if (typeof body.x !== "number" || typeof body.y !== "number" || !body.noteId) {
            response.status(400).json({ error: "x, y, and noteId are required" });
            return;
        }

        const color = typeof body.color === "string" && body.color.trim() ? body.color.trim() : "#0057B7";

        const [pin] = await query(
            `INSERT INTO map_pins (campaign_id, note_id, x, y, color)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING ${RETURNING}`,
            [campaignId, body.noteId, body.x, body.y, color]
        );

        response.status(201).json(pin);
        return;
    }

    // Pin deletion lives here (as ?pinId=, not its own /api/pins/:id route)
    // to stay under Vercel Hobby's 12-function per-deployment cap.
    if (request.method === "DELETE") {
        requireEditorRole(campaign.role);

        const { pinId } = request.query;

        const rows = await query(
            `DELETE FROM map_pins WHERE id = $1 AND campaign_id = $2 RETURNING id`,
            [pinId, campaignId]
        );

        if (!rows[0]) {
            response.status(404).json({ error: "Pin not found" });
            return;
        }

        response.status(204).end();
        return;
    }

    response.status(405).json({ error: "Method not allowed" });
});
