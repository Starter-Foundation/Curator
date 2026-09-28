import { query, getAccessibleCampaign, requireOwnerRole } from "../../_lib/db.js";
import { requireUserId } from "../../_lib/auth.js";
import { withHandler } from "../../_lib/respond.js";
import { requireConfirmation, TRANSFER_CAMPAIGN_PHRASE } from "../../_lib/confirm.js";

// POST { userId, confirmation }: hands the campaign to an existing member.
// The previous owner stays on as a DM, so they don't lose access.
export default withHandler(async function handler(request, response) {
    const userId = await requireUserId(request);
    const { id: campaignId } = request.query;

    if (request.method !== "POST") {
        response.status(405).json({ error: "Method not allowed" });
        return;
    }

    const campaign = await getAccessibleCampaign(campaignId, userId);

    requireOwnerRole(campaign.role);
    requireConfirmation(request.body, TRANSFER_CAMPAIGN_PHRASE);

    const newOwnerId = (request.body || {}).userId;

    if (typeof newOwnerId !== "string" || !newOwnerId || newOwnerId === userId) {
        response.status(400).json({ error: "Choose someone else who already has access to this campaign" });
        return;
    }

    // One statement, so the swap happens completely or not at all: the new
    // owner's member row is removed (owners aren't rows in campaign_members),
    // the campaign changes hands only if that row existed and the caller
    // still owns it, and the old owner is added back as a DM.
    const [transferred] = await query(
        `WITH new_owner AS (
             DELETE FROM campaign_members
             WHERE campaign_id = $1 AND user_id = $2
               AND EXISTS (SELECT 1 FROM campaigns WHERE id = $1 AND user_id = $3)
             RETURNING user_id
         ), updated AS (
             UPDATE campaigns SET user_id = new_owner.user_id
             FROM new_owner
             WHERE campaigns.id = $1 AND campaigns.user_id = $3
             RETURNING campaigns.id
         ), previous_owner AS (
             INSERT INTO campaign_members (campaign_id, user_id, role)
             SELECT $1, $3, 'dm' FROM updated
         )
         SELECT id FROM updated`,
        [campaignId, newOwnerId, userId]
    );

    if (!transferred) {
        response.status(400).json({ error: "That person doesn't have access to this campaign" });
        return;
    }

    response.status(200).json({ ownerId: newOwnerId, role: "dm" });
});
