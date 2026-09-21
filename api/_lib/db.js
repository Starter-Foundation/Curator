import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

export async function query(text, params) {
    return sql.query(text, params);
}

// Builds "UPDATE <table> SET col = $2, ... WHERE id = $1 RETURNING <returningColumns>"
// from a { column: value } map, skipping any keys whose value is undefined.
// Column names in `fields` must always come from a fixed whitelist written
// in the calling route, never directly from request body keys, since they
// are interpolated into the query text.
export async function updateById(table, id, fields, returningColumns) {
    const keys = Object.keys(fields).filter((key) => fields[key] !== undefined);

    if (keys.length === 0) {
        return null;
    }

    const setClause = keys.map((key, index) => `${key} = $${index + 2}`).join(", ");
    const values = keys.map((key) => fields[key]);

    const rows = await query(
        `UPDATE ${table} SET ${setClause} WHERE id = $1 RETURNING ${returningColumns}`,
        [id, ...values]
    );

    return rows[0] || null;
}

// Returns the campaign plus the caller's role on it ("owner", "dm", or
// "player"), or throws 404 if the caller has no access at all (owner, or a
// row in campaign_members). Every campaign-scoped route starts from this.
export async function getAccessibleCampaign(campaignId, userId) {
    const rows = await query(
        `SELECT campaigns.id, campaigns.name, campaigns.map_image_url, campaigns.created_at,
                campaigns.user_id AS owner_id,
                CASE WHEN campaigns.user_id = $2 THEN 'owner' ELSE campaign_members.role END AS role
         FROM campaigns
         LEFT JOIN campaign_members
             ON campaign_members.campaign_id = campaigns.id AND campaign_members.user_id = $2
         WHERE campaigns.id = $1
           AND (campaigns.user_id = $2 OR campaign_members.user_id = $2)`,
        [campaignId, userId]
    );

    if (!rows[0]) {
        throw notFound("Campaign not found");
    }

    return rows[0];
}

// Mirrors getAccessibleCampaign() above, but for a single note (joining
// through its campaign for the access check + role).
export async function getAccessibleNote(noteId, userId) {
    const rows = await query(
        `SELECT notes.*,
                campaigns.user_id AS owner_id,
                CASE WHEN campaigns.user_id = $2 THEN 'owner' ELSE campaign_members.role END AS role
         FROM notes
         JOIN campaigns ON campaigns.id = notes.campaign_id
         LEFT JOIN campaign_members
             ON campaign_members.campaign_id = campaigns.id AND campaign_members.user_id = $2
         WHERE notes.id = $1
           AND (campaigns.user_id = $2 OR campaign_members.user_id = $2)`,
        [noteId, userId]
    );

    if (!rows[0]) {
        throw notFound("Note not found");
    }

    return rows[0];
}

// Players are read-only for now (no edit/visibility settings yet - see
// campaign_members.role). Owners and DMs can both edit content.
export function requireEditorRole(role) {
    if (role !== "owner" && role !== "dm") {
        throw forbidden("You don't have permission to edit this campaign");
    }
}

// Campaign management (rename/delete, members, invites) stays owner-only.
export function requireOwnerRole(role) {
    if (role !== "owner") {
        throw forbidden("Only the campaign owner can do this");
    }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Invite tokens are UUID columns (see db/schema.sql) - a malformed token in
// the URL would otherwise reach Postgres and throw a raw "invalid input
// syntax for type uuid" 500 instead of a clean "not found".
export function isUuid(value) {
    return typeof value === "string" && UUID_PATTERN.test(value);
}

function notFound(message) {
    return Object.assign(new Error(message), { statusCode: 404 });
}

function forbidden(message) {
    return Object.assign(new Error(message), { statusCode: 403 });
}
