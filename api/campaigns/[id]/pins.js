import { query, getAccessibleCampaign, requireEditorRole } from "../../_lib/db.js";
import { requireUserId } from "../../_lib/auth.js";
import { withHandler } from "../../_lib/respond.js";

const RETURNING = "id, campaign_id, note_id, x, y, color, points, level";

const MAX_SHAPE_POINTS = 500;
const MAX_TERRITORY_SHAPES = 50;
const MAX_TERRITORY_POINTS = 5000;
const MAX_TERRITORY_LEVEL = 3;

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

            level = body.level == null ? 1 : body.level;

            if (!Number.isInteger(level) || level < 1 || level > MAX_TERRITORY_LEVEL) {
                response.status(400).json({ error: `level must be an integer from 1 to ${MAX_TERRITORY_LEVEL}` });
                return;
            }
        }

        const [pin] = await query(
            `INSERT INTO map_pins (campaign_id, note_id, x, y, color, points, level)
             VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
             RETURNING ${RETURNING}`,
            [campaignId, body.noteId, body.x, body.y, color, points ? JSON.stringify(points) : null, level]
        );

        response.status(201).json(pin);
        return;
    }

    // Updating/deleting a single pin lives here (as ?pinId=, not its own
    // /api/pins/:id route) to stay under Vercel Hobby's 12-function cap.
    //
    // PATCH replaces a territory's shapes - used to add shapes (e.g.
    // islands) to an existing territory. Ordinary pins can't be turned
    // into territories this way.
    if (request.method === "PATCH") {
        requireEditorRole(campaign.role);

        const { pinId } = request.query;
        const body = request.body || {};
        const points = parseTerritoryShapes(body.points);

        if (!points) {
            response.status(400).json({ error: SHAPES_ERROR });
            return;
        }

        const [pin] = await query(
            `UPDATE map_pins SET points = $1::jsonb
             WHERE id = $2 AND campaign_id = $3 AND points IS NOT NULL
             RETURNING ${RETURNING}`,
            [JSON.stringify(points), pinId, campaignId]
        );

        if (!pin) {
            response.status(404).json({ error: "Territory not found" });
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
