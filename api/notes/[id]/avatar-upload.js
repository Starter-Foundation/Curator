import { handleUpload } from "@vercel/blob/client";
import { getAccessibleNote, requireEditorRole } from "../../_lib/db.js";
import { verifyAccessToken } from "../../_lib/auth.js";
import { withHandler } from "../../_lib/respond.js";

// Mirrors campaigns/[id]/map-upload.js — see its comments for why the DB
// write happens afterward via PATCH /api/notes/:id (src/api.js) rather than
// in onUploadCompleted below.
export default withHandler(async function handler(request, response) {
    if (request.method !== "POST") {
        response.status(405).json({ error: "Method not allowed" });
        return;
    }

    const { id: noteId } = request.query;
    const body = request.body;

    const jsonResponse = await handleUpload({
        body,
        request,
        onBeforeGenerateToken: async (pathname, clientPayload) => {
            let token = null;

            try {
                token = JSON.parse(clientPayload || "{}").token;
            } catch (error) {
                token = null;
            }

            const userId = await verifyAccessToken(token);
            const note = await getAccessibleNote(noteId, userId);

            requireEditorRole(note.role);

            return {
                allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
                addRandomSuffix: true,
                maximumSizeInBytes: 4 * 1024 * 1024
            };
        },
        onUploadCompleted: async () => {}
    });

    response.status(200).json(jsonResponse);
});
