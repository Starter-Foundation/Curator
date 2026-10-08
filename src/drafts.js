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

const STORAGE_PREFIX = "curator.pendingDrafts.";
const SYNC_DELAY_MS = 1500;
const RETRY_DELAY_MS = 30000;

let userId = null;
let syncTimer = null;
let syncInFlight = null;
let syncAgain = false;
let onSyncFinished = null;

function storageKey() {
    return STORAGE_PREFIX + userId;
}

// { [draftId]: { ...draft, campaignId, savedAt } }
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

// Drafts for a campaign that haven't reached the server yet. These are
// newer than whatever the server returned for the same id.
export function getPendingDrafts(campaignId) {
    return Object.values(readPending()).filter(function(draft) {
        return draft.campaignId === campaignId;
    });
}

export function isDraftPending(draftId) {
    return Boolean(readPending()[draftId]);
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

// Stops a draft from syncing (it's been published or discarded). Await
// waitForDraftSync() before deleting it from the server, so a save already
// in flight can't recreate it afterward.
export function forgetDraft(draftId) {
    removePending(draftId);
}

export function waitForDraftSync() {
    return syncInFlight || Promise.resolve();
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
            const { campaignId, savedAt, ...fields } = draft;

            try {
                await api.saveDraft(campaignId, fields, options);
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

// Back online: don't wait for the retry timer.
window.addEventListener("online", function() {
    flushDrafts();
});
