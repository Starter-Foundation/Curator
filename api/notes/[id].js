import { del } from "@vercel/blob";
import { query, updateById, getAccessibleNote, requireEditorRole } from "../_lib/db.js";
import { requireUserId } from "../_lib/auth.js";
import { withHandler } from "../_lib/respond.js";
import { parseLootOwner } from "../_lib/loot.js";

const RETURNING =
    "id, campaign_id, title, description, content, category, parent_id, completed, sort_order, avatar_url, played_by, in_party, owned_by, draft_by, draft_of, map_image_url, created_at";

export default withHandler(async function handler(request, response) {
    const userId = await requireUserId(request);
    const { id } = request.query;

    const existingNote = await getAccessibleNote(id, userId);

    requireEditorRole(existingNote.role);

    if (request.method === "PATCH") {
        const body = request.body || {};
        const fields = {};

        if (typeof body.title === "string" && body.title.trim()) {
            fields.title = body.title.trim();
        }
        if (typeof body.description === "string") {
            fields.description = body.description;
        }
        if (typeof body.content === "string") {
            fields.content = body.content;
        }
        if (Object.prototype.hasOwnProperty.call(body, "parentId")) {
            fields.parent_id = body.parentId;
        }
        if (typeof body.completed === "boolean") {
            fields.completed = body.completed;
        }
        if (typeof body.sortOrder === "number") {
            fields.sort_order = body.sortOrder;
        }
        // avatarUrl can be explicitly set to null (removing the avatar), so
        // it's checked for presence rather than truthiness.
        if (Object.prototype.hasOwnProperty.call(body, "avatarUrl")) {
            fields.avatar_url = body.avatarUrl;
        }
        // playedBy can be explicitly set to null (unassigning), so it's
        // checked for presence rather than truthiness.
        if (Object.prototype.hasOwnProperty.call(body, "playedBy")) {
            fields.played_by = body.playedBy;
        }
        if (typeof body.inParty === "boolean") {
            fields.in_party = body.inParty;
        }
        // A location's own map (null removes it).
        if (Object.prototype.hasOwnProperty.call(body, "mapImageUrl") && existingNote.category === "locations") {
            fields.map_image_url = body.mapImageUrl;
        }
        // Only loot has an owner; null (or "") makes it unowned.
        if (Object.prototype.hasOwnProperty.call(body, "ownedBy") && existingNote.category === "loot") {
            fields.owned_by = await parseLootOwner(body.ownedBy, existingNote.campaign_id);
        }

        // Drafts only hold text, parent and completion (see createDraft() in
        // api/campaigns/[id]/notes.js).
        if (existingNote.draft_by) {
            delete fields.avatar_url;
            delete fields.played_by;
            delete fields.in_party;
            delete fields.owned_by;
            delete fields.map_image_url;
        }

        const note = await updateById("notes", id, fields, RETURNING);

        if (!note) {
            response.status(400).json({ error: "Nothing to update" });
            return;
        }

        // Clean up the avatar or map this replaced or removed, so old
        // uploads don't pile up in Blob storage.
        for (const column of ["avatar_url", "map_image_url"]) {
            const previousUrl = existingNote[column];

            if (
                Object.prototype.hasOwnProperty.call(fields, column) &&
                previousUrl &&
                previousUrl !== fields[column] &&
                previousUrl.startsWith("https://")
            ) {
                await del(previousUrl).catch(function() {});
            }
        }

        response.status(200).json(note);
        return;
    }

    if (request.method === "DELETE") {
        // Re-parent orphaned children to top-level rather than cascade
        // deleting them, matching deleteNote() in the current script.js.
        await query(`UPDATE notes SET parent_id = NULL WHERE parent_id = $1`, [id]);
        await query(`DELETE FROM notes WHERE id = $1`, [id]);

        const blobUrls = [existingNote.avatar_url, existingNote.map_image_url]
            .filter((url) => url && url.startsWith("https://"));

        if (blobUrls.length > 0) {
            await del(blobUrls).catch(function() {});
        }

        response.status(204).end();
        return;
    }

    response.status(405).json({ error: "Method not allowed" });
});
