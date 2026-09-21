import { query } from "./_lib/db.js";
import { requireUserId } from "./_lib/auth.js";
import { withHandler } from "./_lib/respond.js";

const RETURNING = "id, name, map_image_url, created_at";

export default withHandler(async function handler(request, response) {
    const userId = await requireUserId(request);

    if (request.method === "GET") {
        // Owned campaigns plus any the caller was invited into, each
        // carrying the caller's role so the client can gate edit UI.
        const campaigns = await query(
            `SELECT campaigns.id, campaigns.name, campaigns.map_image_url, campaigns.created_at,
                    CASE WHEN campaigns.user_id = $1 THEN 'owner' ELSE campaign_members.role END AS role
             FROM campaigns
             LEFT JOIN campaign_members
                 ON campaign_members.campaign_id = campaigns.id AND campaign_members.user_id = $1
             WHERE campaigns.user_id = $1 OR campaign_members.user_id = $1
             ORDER BY campaigns.created_at ASC`,
            [userId]
        );
        response.status(200).json(campaigns);
        return;
    }

    if (request.method === "POST") {
        const name = ((request.body || {}).name || "").trim();

        if (!name) {
            response.status(400).json({ error: "name is required" });
            return;
        }

        const [campaign] = await query(
            `INSERT INTO campaigns (user_id, name) VALUES ($1, $2) RETURNING ${RETURNING}`,
            [userId, name]
        );

        response.status(201).json({ ...campaign, role: "owner" });
        return;
    }

    response.status(405).json({ error: "Method not allowed" });
});
