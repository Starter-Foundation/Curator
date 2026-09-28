import { del } from "@vercel/blob";
import { query, updateById, getAccessibleCampaign, requireEditorRole, requireOwnerRole } from "../_lib/db.js";
import { requireUserId } from "../_lib/auth.js";
import { withHandler } from "../_lib/respond.js";
import { parseGame } from "../_lib/game.js";

const RETURNING = "id, name, map_image_url, game, created_at";

export default withHandler(async function handler(request, response) {
    const userId = await requireUserId(request);
    const { id } = request.query;

    const existingCampaign = await getAccessibleCampaign(id, userId);

    if (request.method === "PATCH") {
        const body = request.body || {};
        const fields = {};

        // Renaming and changing the game are campaign management
        // (owner-only); changing the map
        // image is regular content editing (owner or DM).
        if (typeof body.name === "string" && body.name.trim()) {
            requireOwnerRole(existingCampaign.role);
            fields.name = body.name.trim();
        }

        if (Object.prototype.hasOwnProperty.call(body, "game")) {
            requireOwnerRole(existingCampaign.role);

            const game = parseGame(body.game);

            if (!game) {
                response.status(400).json({ error: "game must be a non-empty string" });
                return;
            }

            fields.game = game;
        }

        // mapImageUrl can be explicitly set to null (removing the map), so
        // it's checked for presence rather than truthiness.
        if (Object.prototype.hasOwnProperty.call(body, "mapImageUrl")) {
            requireEditorRole(existingCampaign.role);
            fields.map_image_url = body.mapImageUrl;
        }

        const campaign = await updateById("campaigns", id, fields, RETURNING);

        if (!campaign) {
            response.status(400).json({ error: "Nothing to update" });
            return;
        }

        // Clean up the map image this one replaced or removed, so old
        // uploads don't pile up in Blob storage. Only real Blob URLs
        // (https://...) are deletable this way — a legacy base64 data URL
        // (from before Blob storage was added) isn't a blob to delete.
        const previousMapImageUrl = existingCampaign.map_image_url;

        if (
            Object.prototype.hasOwnProperty.call(fields, "map_image_url") &&
            previousMapImageUrl &&
            previousMapImageUrl !== fields.map_image_url &&
            previousMapImageUrl.startsWith("https://")
        ) {
            await del(previousMapImageUrl).catch(function() {});
        }

        response.status(200).json(campaign);
        return;
    }

    if (request.method === "DELETE") {
        requireOwnerRole(existingCampaign.role);

        await query(`DELETE FROM campaigns WHERE id = $1`, [id]);

        if (existingCampaign.map_image_url && existingCampaign.map_image_url.startsWith("https://")) {
            await del(existingCampaign.map_image_url).catch(function() {});
        }

        response.status(204).end();
        return;
    }

    response.status(405).json({ error: "Method not allowed" });
});
