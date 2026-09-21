import { query, isUuid } from "../_lib/db.js";
import { requireUserId } from "../_lib/auth.js";
import { withHandler } from "../_lib/respond.js";

// GET and POST share this one file (rather than POST living at
// /api/invites/:token/accept) to stay under Vercel Hobby's 12-function
// per-deployment cap - see AGENTS-style note in api/campaigns/[id]/members.js
// for the same reasoning on that route.
export default withHandler(async function handler(request, response) {
    const { token } = request.query;

    if (request.method === "GET") {
        // Unlike every other route, this is intentionally public (no
        // requireUserId): it's fetched before sign-up/sign-in, to show the
        // visitor which campaign they're being invited to. It only ever
        // returns the campaign's name, never anything sensitive.
        if (!isUuid(token)) {
            response.status(404).json({ error: "This invite link is invalid or has expired." });
            return;
        }

        const [invite] = await query(
            `SELECT campaigns.id AS campaign_id, campaigns.name AS campaign_name
             FROM campaign_invites
             JOIN campaigns ON campaigns.id = campaign_invites.campaign_id
             WHERE campaign_invites.token = $1 AND campaign_invites.expires_at > now()`,
            [token]
        );

        if (!invite) {
            response.status(404).json({ error: "This invite link is invalid or has expired." });
            return;
        }

        response.status(200).json({ campaignId: invite.campaign_id, campaignName: invite.campaign_name });
        return;
    }

    if (request.method === "POST") {
        const userId = await requireUserId(request);

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
        return;
    }

    response.status(405).json({ error: "Method not allowed" });
});
