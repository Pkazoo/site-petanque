-- Fix RLS policies for leagues and league_matches
-- Run this in the Supabase SQL Editor

-- ============================================
-- 1. Fix league_matches INSERT/UPDATE policies
-- ============================================

DROP POLICY IF EXISTS "League matches are insertable by league participants" ON league_matches;
DROP POLICY IF EXISTS "League matches are updatable by league participants" ON league_matches;
DROP POLICY IF EXISTS "League matches are insertable" ON league_matches;
DROP POLICY IF EXISTS "League matches are updatable" ON league_matches;

-- Allow inserts: by league participants OR league creator OR anonymous
CREATE POLICY "League matches are insertable" ON league_matches
    FOR INSERT WITH CHECK (
        auth.uid() IS NULL
        OR
        EXISTS (
            SELECT 1 FROM leagues
            WHERE leagues.id = league_matches.league_id
            AND (leagues.created_by = auth.uid() OR leagues.created_by IS NULL)
        )
        OR
        EXISTS (
            SELECT 1 FROM league_participants
            JOIN tournament_players ON tournament_players.id = league_participants.player_id
            WHERE league_participants.league_id = league_matches.league_id
            AND tournament_players.user_id::uuid = auth.uid()
        )
    );

-- Allow updates: by league participants OR league creator OR anonymous
CREATE POLICY "League matches are updatable" ON league_matches
    FOR UPDATE USING (
        auth.uid() IS NULL
        OR
        EXISTS (
            SELECT 1 FROM leagues
            WHERE leagues.id = league_matches.league_id
            AND (leagues.created_by = auth.uid() OR leagues.created_by IS NULL)
        )
        OR
        EXISTS (
            SELECT 1 FROM league_participants
            JOIN tournament_players ON tournament_players.id = league_participants.player_id
            WHERE league_participants.league_id = league_matches.league_id
            AND tournament_players.user_id::uuid = auth.uid()
        )
    );

-- ============================================
-- 2. Fix leagues DELETE policy
-- ============================================

DROP POLICY IF EXISTS "Leagues are deletable by owners" ON leagues;
DROP POLICY IF EXISTS "Leagues are deletable" ON leagues;

-- Allow delete: by league creator OR admin (via user_accounts role)
CREATE POLICY "Leagues are deletable" ON leagues
    FOR DELETE USING (
        -- Creator can delete their own league
        (auth.uid() = created_by)
        OR
        -- League with no creator (anonymous) can be deleted by anyone
        (created_by IS NULL)
        OR
        -- Admin can delete any league
        EXISTS (
            SELECT 1 FROM user_accounts
            WHERE user_accounts.id = auth.uid()
            AND user_accounts.role = 'admin'
        )
    );
