-- Curator database schema.
-- Run this once against your Neon database (via the Neon SQL Editor in the
-- dashboard, or `psql "$DATABASE_URL" -f db/schema.sql`).

CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    map_image_url TEXT,
    -- Which game system the campaign is for: 'pathfinder', 'dnd5e',
    -- 'call_of_cthulhu', 'other', or a custom game name typed in for
    -- "Other". NULL for campaigns created before this was asked.
    game TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- For databases created before the game system was tracked:
--   ALTER TABLE campaigns ADD COLUMN game TEXT;

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
    -- Only used for the characters/npcs categories, but not worth a
    -- separate table for one nullable column.
    avatar_url TEXT,
    -- Which campaign member plays this character (category = 'characters'
    -- only; not a foreign key, same reasoning as campaigns.user_id below).
    played_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notes_campaign_id ON notes(campaign_id);
CREATE INDEX idx_notes_parent_id ON notes(parent_id);
CREATE INDEX idx_notes_played_by ON notes(played_by);

CREATE TABLE map_pins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    -- Nullable + SET NULL (not CASCADE): deleting the note this pin points to
    -- should orphan the pin, matching the current app's "Deleted location"
    -- behavior (script.js: findNoteById / renderMapPins), not delete the pin.
    note_id UUID REFERENCES notes(id) ON DELETE SET NULL,
    x DOUBLE PRECISION NOT NULL,
    y DOUBLE PRECISION NOT NULL,
    color TEXT NOT NULL DEFAULT '#0057B7',
    -- NULL for an ordinary pin. For a territory, its shapes (e.g. mainland
    -- plus islands) as a JSON array of arrays of { "x": .., "y": .. }
    -- percentages; x/y above then hold its center. Territories saved before
    -- multi-shape support hold a single flat array (read as one shape).
    points JSONB,
    -- Territories only: nesting depth, 1 (outermost) to 3. NULL for pins,
    -- and for territories created before layers existed (treated as 1).
    level SMALLINT CHECK (level BETWEEN 1 AND 3)
);

-- For databases created before territories/layers existed:
--   ALTER TABLE map_pins ADD COLUMN points JSONB;
--   ALTER TABLE map_pins ADD COLUMN level SMALLINT CHECK (level BETWEEN 1 AND 3);

CREATE INDEX idx_map_pins_campaign_id ON map_pins(campaign_id);

-- campaigns.user_id is plain TEXT for now, not a foreign key, because the
-- exact Neon Auth user table/column isn't confirmed yet (see step 5). Once
-- that's wired up, this can be tightened to
-- REFERENCES neon_auth.users_sync(id) if that table/shape still applies.

-- Non-owner collaborators. The owner (campaigns.user_id) is not a row here;
-- membership + role only applies to people invited in afterward.
CREATE TABLE campaign_members (
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('dm', 'player')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (campaign_id, user_id)
);

CREATE INDEX idx_campaign_members_user_id ON campaign_members(user_id);

-- One active invite link per campaign. Regenerating (see
-- api/campaigns/[id]/invite.js) reuses the existing token/expiry while
-- still valid, and only rolls a new one once the current link has expired
-- - this is what makes the link "reusable, but only for 24 hours".
CREATE TABLE campaign_invites (
    campaign_id UUID PRIMARY KEY REFERENCES campaigns(id) ON DELETE CASCADE,
    token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
