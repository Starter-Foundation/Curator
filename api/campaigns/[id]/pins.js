import { query, getOwnedCampaign } from "../../_lib/db.js";
import { requireUserId } from "../../_lib/auth.js";
import { withHandler } from "../../_lib/respond.js";

const RETURNING = "id, campaign_id, note_id, x, y";

export default withHandler(async function handler(request, response) {
    const userId = await requireUserId(request);
    const { id: campaignId } = request.query;

    await getOwnedCampaign(campaignId, userId);

    if (request.method === "GET") {
        const pins = await query(
            `SELECT ${RETURNING} FROM map_pins WHERE campaign_id = $1`,
            [campaignId]
        );
        response.status(200).json(pins);
        return;
    }

    if (request.method === "POST") {
        const body = request.body || {};

        if (typeof body.x !== "number" || typeof body.y !== "number" || !body.noteId) {
            response.status(400).json({ error: "x, y, and noteId are required" });
            return;
        }

        const [pin] = await query(
            `INSERT INTO map_pins (campaign_id, note_id, x, y)
             VALUES ($1, $2, $3, $4)
             RETURNING ${RETURNING}`,
            [campaignId, body.noteId, body.x, body.y]
        );

        response.status(201).json(pin);
        return;
    }

    response.status(405).json({ error: "Method not allowed" });
});
