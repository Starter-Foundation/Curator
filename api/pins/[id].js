import { query } from "../_lib/db.js";
import { requireUserId } from "../_lib/auth.js";
import { withHandler } from "../_lib/respond.js";

export default withHandler(async function handler(request, response) {
    const userId = await requireUserId(request);
    const { id } = request.query;

    if (request.method === "DELETE") {
        // Access (owner or DM) is enforced in the query itself (join
        // through campaigns/campaign_members) rather than a separate
        // lookup, so this is atomic.
        const rows = await query(
            `DELETE FROM map_pins
             USING campaigns
             LEFT JOIN campaign_members
                 ON campaign_members.campaign_id = campaigns.id AND campaign_members.user_id = $2
             WHERE map_pins.id = $1
               AND map_pins.campaign_id = campaigns.id
               AND (campaigns.user_id = $2 OR campaign_members.role = 'dm')
             RETURNING map_pins.id`,
            [id, userId]
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
