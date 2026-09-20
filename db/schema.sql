-- Curator database schema.
-- Run this once against your Neon database (via the Neon SQL Editor in the
-- dashboard, or `psql "$DATABASE_URL" -f db/schema.sql`).

CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    map_image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);

CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL,
    parent_id UUID REFERENCES notes(id) ON DELETE SET NULL,
    completed BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notes_campaign_id ON notes(campaign_id);
CREATE INDEX idx_notes_parent_id ON notes(parent_id);

CREATE TABLE map_pins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    -- Nullable + SET NULL (not CASCADE): deleting the note this pin points to
    -- should orphan the pin, matching the current app's "Deleted location"
    -- behavior (script.js: findNoteById / renderMapPins), not delete the pin.
    note_id UUID REFERENCES notes(id) ON DELETE SET NULL,
    x DOUBLE PRECISION NOT NULL,
    y DOUBLE PRECISION NOT NULL
);

CREATE INDEX idx_map_pins_campaign_id ON map_pins(campaign_id);

-- campaigns.user_id is plain TEXT for now, not a foreign key, because the
-- exact Neon Auth user table/column isn't confirmed yet (see step 5). Once
-- that's wired up, this can be tightened to
-- REFERENCES neon_auth.users_sync(id) if that table/shape still applies.
