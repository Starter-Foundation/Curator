import { upload } from "@vercel/blob/client";
import { getAccessToken } from "./auth.js";

async function apiFetch(path, options = {}) {
    const token = await getAccessToken();

    const response = await fetch(path, {
        ...options,
        headers: {
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            Authorization: `Bearer ${token}`,
            ...options.headers
        }
    });

    if (response.status === 204) {
        return null;
    }

    const data = await response.json().catch(function() {
        return null;
    });

    if (!response.ok) {
        throw new Error((data && data.error) || `Request failed with status ${response.status}`);
    }

    return data;
}

function toCampaign(row) {
    return {
        id: row.id,
        name: row.name,
        mapImageUrl: row.map_image_url,
        notes: [],
        mapPins: []
    };
}

function toNote(row) {
    return {
        id: row.id,
        campaignId: row.campaign_id,
        title: row.title,
        description: row.description,
        content: row.content,
        category: row.category,
        parentId: row.parent_id,
        completed: row.completed,
        sortOrder: row.sort_order
    };
}

function toPin(row) {
    return {
        id: row.id,
        campaignId: row.campaign_id,
        noteId: row.note_id,
        x: row.x,
        y: row.y
    };
}

export async function listCampaigns() {
    const rows = await apiFetch("/api/campaigns");
    return rows.map(toCampaign);
}

export async function createCampaign(name) {
    const row = await apiFetch("/api/campaigns", {
        method: "POST",
        body: JSON.stringify({ name })
    });
    return toCampaign(row);
}

export async function setCampaignMapImage(campaignId, mapImageUrl) {
    const row = await apiFetch(`/api/campaigns/${campaignId}`, {
        method: "PATCH",
        body: JSON.stringify({ mapImageUrl })
    });
    return toCampaign(row);
}

// Uploads directly from the browser to Vercel Blob (bypassing the ~4.5MB
// serverless function body limit), then persists the resulting URL via the
// normal campaign PATCH route (which also cleans up the old blob, if any).
export async function uploadCampaignMapImage(campaignId, imageBlob) {
    const token = await getAccessToken();

    const uploaded = await upload(`campaign-maps/${campaignId}.jpg`, imageBlob, {
        access: "public",
        handleUploadUrl: `/api/campaigns/${campaignId}/map-upload`,
        clientPayload: JSON.stringify({ token })
    });

    return setCampaignMapImage(campaignId, uploaded.url);
}

export async function listNotes(campaignId) {
    const rows = await apiFetch(`/api/campaigns/${campaignId}/notes`);
    return rows.map(toNote);
}

export async function createNote(campaignId, note) {
    const row = await apiFetch(`/api/campaigns/${campaignId}/notes`, {
        method: "POST",
        body: JSON.stringify(note)
    });
    return toNote(row);
}

export async function updateNote(noteId, fields) {
    const row = await apiFetch(`/api/notes/${noteId}`, {
        method: "PATCH",
        body: JSON.stringify(fields)
    });
    return toNote(row);
}

export async function deleteNote(noteId) {
    await apiFetch(`/api/notes/${noteId}`, { method: "DELETE" });
}

export async function listPins(campaignId) {
    const rows = await apiFetch(`/api/campaigns/${campaignId}/pins`);
    return rows.map(toPin);
}

export async function createPin(campaignId, pin) {
    const row = await apiFetch(`/api/campaigns/${campaignId}/pins`, {
        method: "POST",
        body: JSON.stringify(pin)
    });
    return toPin(row);
}

export async function deletePin(pinId) {
    await apiFetch(`/api/pins/${pinId}`, { method: "DELETE" });
}
