-- Fix: Allow players to update their own profile (avatar, bio, level, etc.)
-- Run this in the Supabase SQL Editor

-- Allow authenticated users to update their own tournament_players row
DROP POLICY IF EXISTS "Players can update own profile" ON tournament_players;
CREATE POLICY "Players can update own profile" ON tournament_players
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
