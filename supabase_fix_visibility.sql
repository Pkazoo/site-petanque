-- FIX VISIBILITY - TOURNAMENT DATA
-- Run this in Supabase SQL Editor to Ensure Admins and Users can SEE data

-- 1. Enable RLS on tables (Security Best Practice)
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_players ENABLE ROW LEVEL SECURITY;

-- 2. Create "Public Read" policies
-- This allows ANYONE (authenticated or anon if public) to VIEW tournaments and matches
-- Essential for the "Match en cours" header to work on all pages

-- Tournaments
DROP POLICY IF EXISTS "Public Read Tournaments" ON tournaments;
CREATE POLICY "Public Read Tournaments" ON tournaments
    FOR SELECT USING (true);

-- Matches
DROP POLICY IF EXISTS "Public Read Matches" ON tournament_matches;
CREATE POLICY "Public Read Matches" ON tournament_matches
    FOR SELECT USING (true);

-- Teams
DROP POLICY IF EXISTS "Public Read Teams" ON tournament_teams;
CREATE POLICY "Public Read Teams" ON tournament_teams
    FOR SELECT USING (true);

-- Players
DROP POLICY IF EXISTS "Public Read Players" ON tournament_players;
CREATE POLICY "Public Read Players" ON tournament_players
    FOR SELECT USING (true);

-- 3. Explicit Admin Policies (Full Access)
-- Ensure admins can do EVERYTHING (Insert, Update, Delete)

CREATE OR REPLACE FUNCTION is_admin_check()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_accounts 
        WHERE id = auth.uid() 
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tournaments (Admin)
DROP POLICY IF EXISTS "Admin Full Access Tournaments" ON tournaments;
CREATE POLICY "Admin Full Access Tournaments" ON tournaments
    FOR ALL
    USING (is_admin_check());

-- Matches (Admin)
DROP POLICY IF EXISTS "Admin Full Access Matches" ON tournament_matches;
CREATE POLICY "Admin Full Access Matches" ON tournament_matches
    FOR ALL
    USING (is_admin_check());

-- Teams (Admin)
DROP POLICY IF EXISTS "Admin Full Access Teams" ON tournament_teams;
CREATE POLICY "Admin Full Access Teams" ON tournament_teams
    FOR ALL
    USING (is_admin_check());

-- Players (Admin)
DROP POLICY IF EXISTS "Admin Full Access Players" ON tournament_players;
CREATE POLICY "Admin Full Access Players" ON tournament_players
    FOR ALL
    USING (is_admin_check());

SELECT 'Visibility fixed: Public Read + Admin Full Access' as status;
