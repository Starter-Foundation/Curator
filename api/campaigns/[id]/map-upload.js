import { handleUpload } from "@vercel/blob/client";
import { getOwnedCampaign } from "../../_lib/db.js";
import { verifyAccessToken } from "../../_lib/auth.js";
import { withHandler } from "../../_lib/respond.js";

// Generates short-lived tokens so the browser can upload map images
// directly to Vercel Blob, bypassing the ~4.5MB body limit on serverless
// functions. The actual campaigns.map_image_url write happens afterward,
// client-side, via the existing PATCH /api/campaigns/:id route (see
// src/api.js's uploadMapImage()) — that route also has more reliable
// access to the caller's identity, and runs in every environment,
// including local dev where Vercel can't reach onUploadCompleted below.
export default withHandler(async function handler(request, response) {
    if (request.method !== "POST") {
        response.status(405).json({ error: "Method not allowed" });
        return;
    }

    const { id: campaignId } = request.query;
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

            await getOwnedCampaign(campaignId, userId);

            return {
                allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
                addRandomSuffix: true,
                maximumSizeInBytes: 8 * 1024 * 1024
            };
        },
        onUploadCompleted: async () => {
            // No DB write here — see comment above. This only runs at all
            // in deployed environments (Vercel calls back over the public
            // internet), so it can't be the source of truth.
        }
    });

    response.status(200).json(jsonResponse);
});
