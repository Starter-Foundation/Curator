import * as api from "./api.js";

// Unsaved notes ("drafts") are kept in two places, so closing the tab, a
// crash, shutting the machine down or losing the connection never loses
// what was typed:
//
// - This browser's localStorage, written on every edit. It only holds
//   changes the server hasn't confirmed yet, and survives all of the above.
// - The server (see saveDraft() in api.js), synced shortly after each edit
//   and retried until it lands, so drafts also follow you to other devices.
//   Saves are upserts on a client-generated id, so a retry of a save that
//   did reach the server just saves it again rather than duplicating it.
//
// Anything left over locally (the tab was closed before it synced, or the
// connection was down) is synced the next time Curator is opened here.
// Discarding works the same way: the draft goes at once, and deleting it
// from the server is queued and retried like a save.

const STORAGE_PREFIX = "curator.pendingDrafts.";
const SYNC_DELAY_MS = 1500;
const RETRY_DELAY_MS = 30000;

let userId = null;
let syncTimer = null;
let syncInFlight = null;
let syncAgain = false;
let onSyncFinished = null;
// Drafts known to exist on the server (listed by it, or saved to it this
// session). Discarding one that isn't - and isn't mid-save - needs no
// server call at all.
const draftsOnServer = new Set();

function storageKey() {
    return STORAGE_PREFIX + userId;
}

// { [draftId]: { ...draft, campaignId, savedAt } } for a save, or
// { id, campaignId, savedAt, deleted: true } for a discard.
function readPending() {
    if (!userId) {
        return {};
    }

    try {
        const pending = JSON.parse(localStorage.getItem(storageKey()) || "{}");
        return pending && typeof pending === "object" ? pending : {};
    } catch (error) {
        return {};
    }
}

function writePending(pending) {
    try {
        if (Object.keys(pending).length === 0) {
            localStorage.removeItem(storageKey());
        } else {
            localStorage.setItem(storageKey(), JSON.stringify(pending));
        }
    } catch (error) {
        // Storage full or blocked (e.g. some private windows): the server
        // sync still runs, there's just no local safety net.
        console.warn("Couldn't keep a local copy of a draft", error);
    }
}

// Removes a draft from local storage, unless it's been edited again since
// `savedAt` (then the newer version still needs syncing).
function removePending(draftId, savedAt) {
    const pending = readPending();

    if (pending[draftId] && (savedAt === undefined || pending[draftId].savedAt === savedAt)) {
        delete pending[draftId];
        writePending(pending);
    }
}

// Drafts are kept per user, so someone else signing in on this browser
// doesn't see (or sync) them.
export function setDraftUser(id) {
    userId = id;
    clearTimeout(syncTimer);
}

// Called after each sync pass, e.g. to refresh "not synced yet" labels.
export function setDraftSyncListener(listener) {
    onSyncFinished = listener;
}

// Merges the drafts the server returned for a campaign with what's still
// waiting on this device: newer local versions win, and discarded ones
// are left out.
export function mergeWithPendingDrafts(campaignId, serverDrafts) {
    serverDrafts.forEach((draft) => draftsOnServer.add(draft.id));

    const pending = Object.values(readPending()).filter(function(change) {
        return change.campaignId === campaignId;
    });
    const deletedIds = new Set(pending.filter((change) => change.deleted).map((change) => change.id));
    const byId = new Map();

    serverDrafts.forEach(function(draft) {
        if (!deletedIds.has(draft.id)) {
            byId.set(draft.id, draft);
        }
    });

    pending.forEach(function(change) {
        if (!change.deleted) {
            const { savedAt, ...draft } = change;
            byId.set(draft.id, { ...byId.get(draft.id), ...draft });
        }
    });

    return Array.from(byId.values());
}

export function isDraftPending(draftId) {
    const change = readPending()[draftId];
    return Boolean(change && !change.deleted);
}

// Records the latest version of a draft ({ id, campaignId, title,
// description, content, category, parentId, completed, draftOf }) and
// schedules a sync. Synchronous, so it's safe right up to the page closing.
export function recordDraft(draft) {
    if (!userId) {
        return;
    }

    const pending = readPending();
    pending[draft.id] = { ...draft, savedAt: Date.now() };
    writePending(pending);

    scheduleSync(SYNC_DELAY_MS);
}

// Drops a draft (it's been published or discarded): it stops syncing at
// once, and is deleted from the server in the background if it got there.
// Queued behind any save in flight, so that save can't recreate it.
export function discardDraft(draft) {
    const pending = readPending();

    if (draftsOnServer.has(draft.id) || syncInFlight) {
        pending[draft.id] = { id: draft.id, campaignId: draft.campaignId, deleted: true, savedAt: Date.now() };
        writePending(pending);
        scheduleSync(0);
    } else if (pending[draft.id]) {
        delete pending[draft.id];
        writePending(pending);
    }
}

function scheduleSync(delay) {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(syncPendingDrafts, delay);
}

// Syncs every pending draft now. `keepalive` is for when the page is being
// hidden or closed, so the requests can finish after it's gone.
export function flushDrafts(options) {
    clearTimeout(syncTimer);
    return syncPendingDrafts(options);
}

async function syncPendingDrafts(options = {}) {
    if (!userId) {
        return;
    }

    if (syncInFlight) {
        syncAgain = true;
        return syncInFlight;
    }

    syncInFlight = (async function() {
        let failed = false;

        for (const draft of Object.values(readPending())) {
            const { campaignId, savedAt, deleted, ...fields } = draft;

            try {
                if (deleted) {
                    await deleteFromServer(draft.id, options);
                    draftsOnServer.delete(draft.id);
                } else {
                    await api.saveDraft(campaignId, fields, options);
                    draftsOnServer.add(draft.id);
                }

                removePending(draft.id, savedAt);
            } catch (error) {
                if (error.status >= 400 && error.status < 500) {
                    // Refused for good (the campaign is gone, you're no
                    // longer an editor there, ...): retrying can't help.
                    console.warn(`Dropping draft "${draft.title}": ${error.message}`);
                    removePending(draft.id, savedAt);
                } else {
                    failed = true;
                }
            }
        }

        return failed;
    })();

    let failed = false;

    try {
        failed = await syncInFlight;
    } finally {
        syncInFlight = null;
    }

    if (onSyncFinished) {
        onSyncFinished();
    }

    if (syncAgain) {
        syncAgain = false;
        return syncPendingDrafts(options);
    }

    if (failed) {
        scheduleSync(RETRY_DELAY_MS);
    }
}

async function deleteFromServer(draftId, options) {
    try {
        await api.deleteNote(draftId, options);
    } catch (error) {
        // Already gone (or never got there): that's the goal anyway.
        if (error.status !== 404) {
            throw error;
        }
    }
}

// Back online: don't wait for the retry timer.
window.addEventListener("online", function() {
    flushDrafts();
});
