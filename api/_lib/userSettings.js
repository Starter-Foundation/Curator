import { query } from "./db.js";

const THEMES = ["dark", "light"];

// The signed-in user's account preferences: GET /api/campaigns?view=settings
// and PATCH /api/campaigns (see api/campaigns.js). They live on that route
// rather than their own because the Hobby plan caps a deployment at 12
// serverless functions.
export async function getUserSettings(userId, response) {
    const [settings] = await query(`SELECT theme FROM user_settings WHERE user_id = $1`, [userId]);

    response.status(200).json({ theme: settings ? settings.theme : null });
}

export async function updateUserSettings(userId, body, response) {
    if (!THEMES.includes(body.theme)) {
        response.status(400).json({ error: `theme must be one of: ${THEMES.join(", ")}` });
        return;
    }

    const [settings] = await query(
        `INSERT INTO user_settings (user_id, theme) VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET theme = EXCLUDED.theme, updated_at = now()
         RETURNING theme`,
        [userId, body.theme]
    );

    response.status(200).json({ theme: settings.theme });
}
