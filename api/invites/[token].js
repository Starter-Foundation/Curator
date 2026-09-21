import { query, isUuid } from "../_lib/db.js";
import { withHandler } from "../_lib/respond.js";

// Unlike every other route, this one is intentionally public (no
// requireUserId): it's fetched before sign-up/sign-in, to show the visitor
// which campaign they're being invited to. It only ever returns the
// campaign's name, never anything sensitive.
export default withHandler(async function handler(request, response) {
    const { token } = request.query;

    if (request.method !== "GET") {
        response.status(405).json({ error: "Method not allowed" });
        return;
    }

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
});
