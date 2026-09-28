import { query, isUuid } from "./db.js";

// Loot can be owned by a player character or an NPC.
const OWNER_CATEGORIES = ["characters", "npcs"];

// Validates a loot item's owner (a note id, or null/"" for unowned) and
// returns the value to store. Throws 400 unless the owner is a character
// or NPC note in the same campaign.
export async function parseLootOwner(value, campaignId) {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    if (!isUuid(value)) {
        throw badRequest("ownedBy must be a note id");
    }

    const [owner] = await query(
        `SELECT category FROM notes WHERE id = $1 AND campaign_id = $2`,
        [value, campaignId]
    );

    if (!owner || !OWNER_CATEGORIES.includes(owner.category || "characters")) {
        throw badRequest("Loot can only be owned by a character or NPC in this campaign");
    }

    return value;
}

function badRequest(message) {
    return Object.assign(new Error(message), { statusCode: 400 });
}
