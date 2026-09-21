import { query, getAccessibleCampaign, requireOwnerRole } from "../../_lib/db.js";
import { requireUserId } from "../../_lib/auth.js";
import { withHandler } from "../../_lib/respond.js";

export default withHandler(async function handler(request, response) {
    const userId = await requireUserId(request);
    const { id: campaignId } = request.query;

    const campaign = await getAccessibleCampaign(campaignId, userId);

    if (request.method === "GET") {
        const [[owner], members] = await Promise.all([
            query(
                `SELECT neon_auth."user".id AS user_id, neon_auth."user".email
                 FROM campaigns
                 LEFT JOIN neon_auth."user" ON neon_auth."user".id::text = campaigns.user_id
                 WHERE campaigns.id = $1`,
                [campaignId]
            ),
            query(
                `SELECT campaign_members.user_id, campaign_members.role, neon_auth."user".email
                 FROM campaign_members
                 LEFT JOIN neon_auth."user" ON neon_auth."user".id::text = campaign_members.user_id
                 WHERE campaign_members.campaign_id = $1
                 ORDER BY campaign_members.created_at ASC`,
                [campaignId]
            )
        ]);

        response.status(200).json({
            owner: { userId: campaign.owner_id, email: (owner && owner.email) || null, role: "owner" },
            members: members.map((row) => ({ userId: row.user_id, email: row.email || null, role: row.role }))
        });
        return;
    }

    if (request.method === "PATCH") {
        requireOwnerRole(campaign.role);

        const body = request.body || {};
        const targetUserId = body.userId;
        const role = body.role;

        if (!targetUserId || (role !== "dm" && role !== "player")) {
            response.status(400).json({ error: "userId and a role of \"dm\" or \"player\" are required" });
            return;
        }

        if (targetUserId === campaign.owner_id) {
            response.status(400).json({ error: "Can't change the owner's role" });
            return;
        }

        const [member] = await query(
            `UPDATE campaign_members SET role = $3 WHERE campaign_id = $1 AND user_id = $2
             RETURNING user_id, role`,
            [campaignId, targetUserId, role]
        );

        if (!member) {
            response.status(404).json({ error: "Member not found" });
            return;
        }

        response.status(200).json({ userId: member.user_id, role: member.role });
        return;
    }

    response.status(405).json({ error: "Method not allowed" });
});
