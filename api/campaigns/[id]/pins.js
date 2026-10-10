import { query, isUuid, getAccessibleCampaign, requireEditorRole } from "../../_lib/db.js";
import { requireUserId } from "../../_lib/auth.js";
import { withHandler } from "../../_lib/respond.js";

const RETURNING = "id, campaign_id, note_id, x, y, color, points, level, map_note_id";

const MAX_SHAPE_POINTS = 500;
const MAX_TERRITORY_SHAPES = 50;
const MAX_TERRITORY_POINTS = 5000;
const MAX_TERRITORY_LEVEL = 3;

const COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

const SHAPES_ERROR = `points must be 1-${MAX_TERRITORY_SHAPES} shapes, each 3-${MAX_SHAPE_POINTS} { x, y } percentages`;

// One closed outline: at least 3 { x, y } points, each a percentage
// (0-100) of the map image like a pin's own x/y. Returns null if invalid.
function parseShape(points) {
    if (!Array.isArray(points) || points.length < 3 || points.length > MAX_SHAPE_POINTS) {
        return null;
    }

    const isPercentage = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;

    if (!points.every((point) => point && isPercentage(point.x) && isPercentage(point.y))) {
        return null;
    }

    return points.map((point) => ({ x: point.x, y: point.y }));
}

// A territory is a list of shapes (e.g. a mainland plus islands), stored
// as a JSON array of point arrays. A single flat point array (the format
// before multi-shape territories) is accepted as one shape. Returns null
// if invalid.
function parseTerritoryShapes(points) {
    if (!Array.isArray(points) || points.length === 0) {
        return null;
    }

    const rawShapes = Array.isArray(points[0]) ? points : [points];

    if (rawShapes.length > MAX_TERRITORY_SHAPES) {
        return null;
    }

    const shapes = rawShapes.map(parseShape);

    if (shapes.some((shape) => !shape)) {
        return null;
    }

    const totalPoints = shapes.reduce((sum, shape) => sum + shape.length, 0);

    return totalPoints <= MAX_TERRITORY_POINTS ? shapes : null;
}

export default withHandler(async function handler(request, response) {
    const userId = await requireUserId(request);
    const { id: campaignId } = request.query;

    const campaign = await getAccessibleCampaign(campaignId, userId);

    if (request.method === "GET") {
        const pins = await query(
            `SELECT ${RETURNING} FROM map_pins WHERE campaign_id = $1`,
            [campaignId]
        );
        response.status(200).json(pins);
        return;
    }

    if (request.method === "POST") {
        requireEditorRole(campaign.role);

        const body = request.body || {};

        if (typeof body.x !== "number" || typeof body.y !== "number" || !body.noteId) {
            response.status(400).json({ error: "x, y, and noteId are required" });
            return;
        }

        const color = typeof body.color === "string" && body.color.trim() ? body.color.trim() : "#0057B7";

        // A pin or territory on a location's own map rather than the world
        // map. Those maps have a single territory layer.
        const mapNoteId = body.mapNoteId || null;

        if (mapNoteId) {
            const [mapNote] = isUuid(mapNoteId)
                ? await query(
                    `SELECT id FROM notes
                     WHERE id = $1 AND campaign_id = $2 AND category = 'locations' AND draft_by IS NULL`,
                    [mapNoteId, campaignId]
                )
                : [];

            if (!mapNote) {
                response.status(400).json({ error: "mapNoteId must be a location in this campaign" });
                return;
            }
        }

        // Omitted/null points = an ordinary pin; otherwise a territory,
        // with a nesting level (1 = outermost) that defaults to 1.
        let points = null;
        let level = null;

        if (body.points != null) {
            points = parseTerritoryShapes(body.points);

            if (!points) {
                response.status(400).json({ error: SHAPES_ERROR });
                return;
            }

            level = body.level == null || mapNoteId ? 1 : body.level;

            if (!Number.isInteger(level) || level < 1 || level > MAX_TERRITORY_LEVEL) {
                response.status(400).json({ error: `level must be an integer from 1 to ${MAX_TERRITORY_LEVEL}` });
                return;
            }
        }

        const [pin] = await query(
            `INSERT INTO map_pins (campaign_id, note_id, x, y, color, points, level, map_note_id)
             VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
             RETURNING ${RETURNING}`,
            [campaignId, body.noteId, body.x, body.y, color, points ? JSON.stringify(points) : null, level, mapNoteId]
        );

        response.status(201).json(pin);
        return;
    }

    // Updating/deleting a single pin lives here (as ?pinId=, not its own
    // /api/pins/:id route) to stay under Vercel Hobby's 12-function cap.
    //
    // PATCH changes a pin's or territory's color, and/or replaces a
    // territory's shapes (used to add shapes, e.g. islands, to it).
    // Ordinary pins can't be turned into territories this way.
    if (request.method === "PATCH") {
        requireEditorRole(campaign.role);

        const { pinId } = request.query;
        const body = request.body || {};
        const sets = [];
        const values = [pinId, campaignId];

        if (body.points !== undefined) {
            const points = parseTerritoryShapes(body.points);

            if (!points) {
                response.status(400).json({ error: SHAPES_ERROR });
                return;
            }

            values.push(JSON.stringify(points));
            sets.push(`points = $${values.length}::jsonb`);
        }

        if (body.color !== undefined) {
            if (typeof body.color !== "string" || !COLOR_PATTERN.test(body.color)) {
                response.status(400).json({ error: "color must be a hex color like #0057B7" });
                return;
            }

            values.push(body.color);
            sets.push(`color = $${values.length}`);
        }

        if (sets.length === 0) {
            response.status(400).json({ error: "Nothing to update" });
            return;
        }

        const [pin] = await query(
            `UPDATE map_pins SET ${sets.join(", ")}
             WHERE id = $1 AND campaign_id = $2${body.points !== undefined ? " AND points IS NOT NULL" : ""}
             RETURNING ${RETURNING}`,
            values
        );

        if (!pin) {
            response.status(404).json({ error: body.points !== undefined ? "Territory not found" : "Pin not found" });
            return;
        }

        response.status(200).json(pin);
        return;
    }

    if (request.method === "DELETE") {
        requireEditorRole(campaign.role);

        const { pinId } = request.query;

        const rows = await query(
            `DELETE FROM map_pins WHERE id = $1 AND campaign_id = $2 RETURNING id`,
            [pinId, campaignId]
        );

        if (!rows[0]) {
            response.status(404).json({ error: "Pin not found" });
            return;
        }

        response.status(204).end();
        return;
    }

    response.status(405).json({ error: "Method not allowed" });
});
