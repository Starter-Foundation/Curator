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

export async function getOwnedCampaign(campaignId, userId) {
    const rows = await query(
        `SELECT id, name, map_image_url, created_at
         FROM campaigns
         WHERE id = $1 AND user_id = $2`,
        [campaignId, userId]
    );

    if (!rows[0]) {
        throw notFound("Campaign not found");
    }

    return rows[0];
}

export async function getOwnedNote(noteId, userId) {
    const rows = await query(
        `SELECT notes.*
         FROM notes
         JOIN campaigns ON campaigns.id = notes.campaign_id
         WHERE notes.id = $1 AND campaigns.user_id = $2`,
        [noteId, userId]
    );

    if (!rows[0]) {
        throw notFound("Note not found");
    }

    return rows[0];
}

function notFound(message) {
    return Object.assign(new Error(message), { statusCode: 404 });
}
