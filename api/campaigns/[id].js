import { del } from "@vercel/blob";
import { query, updateById, getAccessibleCampaign, requireEditorRole, requireOwnerRole } from "../_lib/db.js";
import { requireUserId } from "../_lib/auth.js";
import { withHandler } from "../_lib/respond.js";
import { parseGame } from "../_lib/game.js";
import { requireConfirmation, DELETE_CAMPAIGN_PHRASE } from "../_lib/confirm.js";
import { transferCampaign } from "../_lib/transferCampaign.js";

const RETURNING = "id, name, map_image_url, game, party_name, created_at";

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

        // The party is run by the DMs, so any editor can rename it. An
        // empty name resets it to the default (stored as NULL).
        if (typeof body.partyName === "string") {
            requireEditorRole(existingCampaign.role);
            fields.party_name = body.partyName.trim().slice(0, 80) || null;
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

    // An explicit action (rather than any POST) so a stray request can't be
    // mistaken for a transfer.
    if (request.method === "POST" && (request.body || {}).action === "transfer") {
        await transferCampaign(existingCampaign, userId, request.body, response);
        return;
    }

    if (request.method === "DELETE") {
        requireOwnerRole(existingCampaign.role);
        requireConfirmation(request.body, DELETE_CAMPAIGN_PHRASE);

        // Deleting the campaign cascades to its notes, pins, members and
        // invite (see db/schema.sql). The notes' uploaded avatars are
        // collected first so they can be removed from Blob storage too.
        const avatarRows = await query(
            `SELECT avatar_url FROM notes WHERE campaign_id = $1 AND avatar_url IS NOT NULL`,
            [id]
        );

        await query(`DELETE FROM campaigns WHERE id = $1`, [id]);

        const blobUrls = avatarRows
            .map((row) => row.avatar_url)
            .concat(existingCampaign.map_image_url || [])
            .filter((url) => url.startsWith("https://"));

        if (blobUrls.length > 0) {
            await del(blobUrls).catch(function() {});
        }

        response.status(204).end();
        return;
    }

    response.status(405).json({ error: "Method not allowed" });
});
