import { query, getAccessibleCampaign, requireOwnerRole } from "../../_lib/db.js";
import { requireUserId } from "../../_lib/auth.js";
import { withHandler } from "../../_lib/respond.js";

export default withHandler(async function handler(request, response) {
    const userId = await requireUserId(request);
    const { id: campaignId } = request.query;

    const campaign = await getAccessibleCampaign(campaignId, userId);

    requireOwnerRole(campaign.role);

    if (request.method === "POST") {
        // Reuses the existing token/expiry while still valid (making the
        // link "reusable"), and only rolls a fresh one once it has expired.
        const [invite] = await query(
            `INSERT INTO campaign_invites (campaign_id, expires_at)
             VALUES ($1, now() + interval '24 hours')
             ON CONFLICT (campaign_id) DO UPDATE
                 SET token = CASE WHEN campaign_invites.expires_at > now() THEN campaign_invites.token ELSE gen_random_uuid() END,
                     expires_at = CASE WHEN campaign_invites.expires_at > now() THEN campaign_invites.expires_at ELSE now() + interval '24 hours' END
             RETURNING token, expires_at`,
            [campaignId]
        );

        response.status(200).json({ token: invite.token, expiresAt: invite.expires_at });
        return;
    }

    response.status(405).json({ error: "Method not allowed" });
});
