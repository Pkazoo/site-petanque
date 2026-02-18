-- Enable RLS on tables (if not already enabled)
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_matches ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for all users" ON leagues;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON leagues;
DROP POLICY IF EXISTS "Enable update for creators" ON leagues;
DROP POLICY IF EXISTS "Enable delete for creators" ON leagues;

DROP POLICY IF EXISTS "Enable read access for all users" ON league_participants;
DROP POLICY IF EXISTS "Enable insert for creators/participants" ON league_participants;
DROP POLICY IF EXISTS "Enable delete for creators" ON league_participants;

DROP POLICY IF EXISTS "Enable read access for all users" ON league_matches;
DROP POLICY IF EXISTS "Enable insert for participants" ON league_matches;
DROP POLICY IF EXISTS "Enable update for participants" ON league_matches;

-- Policies for LEAGUES
-- Everyone can view leagues
CREATE POLICY "Enable read access for all users" ON leagues
    FOR SELECT USING (true);

-- Authenticated users can create leagues
CREATE POLICY "Enable insert for authenticated users" ON leagues
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Creators can update their leagues
CREATE POLICY "Enable update for creators" ON leagues
    FOR UPDATE USING (auth.uid() = created_by);

-- Creators can delete their leagues
CREATE POLICY "Enable delete for creators" ON leagues
    FOR DELETE USING (auth.uid() = created_by);


-- Policies for LEAGUE_PARTICIPANTS
-- Everyone can view participants
CREATE POLICY "Enable read access for all users" ON league_participants
    FOR SELECT USING (true);

-- League creators can add participants
CREATE POLICY "Enable insert for league creators" ON league_participants
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM leagues
            WHERE id = league_id
            AND created_by = auth.uid()
        )
    );

-- League creators can remove participants
CREATE POLICY "Enable delete for league creators" ON league_participants
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM leagues
            WHERE id = league_id
            AND created_by = auth.uid()
        )
    );


-- Policies for LEAGUE_MATCHES
-- Everyone can view matches
CREATE POLICY "Enable read access for all users" ON league_matches
    FOR SELECT USING (true);

-- Participants can create matches (for free mode)
CREATE POLICY "Enable insert for participants" ON league_matches
    FOR INSERT WITH CHECK (
        -- User must be a participant in the league OR the creator
        EXISTS (
            SELECT 1 FROM leagues
            WHERE id = league_id
            AND (
                created_by = auth.uid() OR
                auth.uid() = ANY(participant_ids)
            )
        )
    );

-- Participants can update matches (scoring)
CREATE POLICY "Enable update for participants" ON league_matches
    FOR UPDATE USING (
        -- User must be a participant in the match (team1 or team2) OR the league creator
        EXISTS (
            SELECT 1 FROM leagues
            WHERE id = league_id
            AND created_by = auth.uid()
        ) OR
        auth.uid() = ANY(team1_player_ids) OR
        auth.uid() = ANY(team2_player_ids)
    );
