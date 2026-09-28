// Phrases the owner must type, word for word, before a campaign can be
// deleted or handed over. Checked here as well as in the UI (see
// DANGER_PHRASES in src/script.js - keep the two in sync), so a request that
// skips the page can't bypass the confirmation.
export const DELETE_CAMPAIGN_PHRASE = "I want to delete this campaign";
export const TRANSFER_CAMPAIGN_PHRASE = "I want to transfer this campaign";

export function requireConfirmation(body, phrase) {
    const typed = body && typeof body.confirmation === "string" ? body.confirmation.trim() : "";

    if (typed !== phrase) {
        throw Object.assign(new Error(`To confirm, type "${phrase}" exactly.`), { statusCode: 400 });
    }
}
