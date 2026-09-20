import { query } from "./_lib/db.js";
import { requireUserId } from "./_lib/auth.js";
import { withHandler } from "./_lib/respond.js";

const RETURNING = "id, name, map_image_url, created_at";

export default withHandler(async function handler(request, response) {
    const userId = await requireUserId(request);

    if (request.method === "GET") {
        const campaigns = await query(
            `SELECT ${RETURNING} FROM campaigns WHERE user_id = $1 ORDER BY created_at ASC`,
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

        response.status(201).json(campaign);
        return;
    }

    response.status(405).json({ error: "Method not allowed" });
});
