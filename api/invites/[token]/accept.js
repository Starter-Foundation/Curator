import { query, isUuid } from "../../_lib/db.js";
import { requireUserId } from "../../_lib/auth.js";
import { withHandler } from "../../_lib/respond.js";

export default withHandler(async function handler(request, response) {
    if (request.method !== "POST") {
        response.status(405).json({ error: "Method not allowed" });
        return;
    }

    const userId = await requireUserId(request);
    const { token } = request.query;

    if (!isUuid(token)) {
        response.status(404).json({ error: "This invite link is invalid or has expired." });
        return;
    }

    const [invite] = await query(
        `SELECT campaign_id FROM campaign_invites WHERE token = $1 AND expires_at > now()`,
        [token]
    );

    if (!invite) {
        response.status(404).json({ error: "This invite link is invalid or has expired." });
        return;
    }

    const [campaign] = await query(`SELECT user_id FROM campaigns WHERE id = $1`, [invite.campaign_id]);

    if (!campaign) {
        response.status(404).json({ error: "Campaign not found" });
        return;
    }

    // The owner clicking their own invite link, or an existing member
    // (who might already be a DM) reusing it, shouldn't be touched -
    // ON CONFLICT DO NOTHING keeps whatever role they already have.
    if (campaign.user_id !== userId) {
        await query(
            `INSERT INTO campaign_members (campaign_id, user_id, role)
             VALUES ($1, $2, 'player')
             ON CONFLICT (campaign_id, user_id) DO NOTHING`,
            [invite.campaign_id, userId]
        );
    }

    response.status(200).json({ campaignId: invite.campaign_id });
});
