import { del } from "@vercel/blob";
import { query, updateById, getAccessibleNote, requireEditorRole } from "../_lib/db.js";
import { requireUserId } from "../_lib/auth.js";
import { withHandler } from "../_lib/respond.js";

const RETURNING =
    "id, campaign_id, title, description, content, category, parent_id, completed, sort_order, avatar_url, created_at";

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

        const note = await updateById("notes", id, fields, RETURNING);

        if (!note) {
            response.status(400).json({ error: "Nothing to update" });
            return;
        }

        // Clean up the avatar this one replaced or removed, so old uploads
        // don't pile up in Blob storage.
        const previousAvatarUrl = existingNote.avatar_url;

        if (
            Object.prototype.hasOwnProperty.call(fields, "avatar_url") &&
            previousAvatarUrl &&
            previousAvatarUrl !== fields.avatar_url &&
            previousAvatarUrl.startsWith("https://")
        ) {
            await del(previousAvatarUrl).catch(function() {});
        }

        response.status(200).json(note);
        return;
    }

    if (request.method === "DELETE") {
        // Re-parent orphaned children to top-level rather than cascade
        // deleting them, matching deleteNote() in the current script.js.
        await query(`UPDATE notes SET parent_id = NULL WHERE parent_id = $1`, [id]);
        await query(`DELETE FROM notes WHERE id = $1`, [id]);

        if (existingNote.avatar_url && existingNote.avatar_url.startsWith("https://")) {
            await del(existingNote.avatar_url).catch(function() {});
        }

        response.status(204).end();
        return;
    }

    response.status(405).json({ error: "Method not allowed" });
});
