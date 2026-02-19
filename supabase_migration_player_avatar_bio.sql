-- Migration: Ajouter les colonnes avatar et bio à tournament_players
-- Exécuter dans le SQL Editor de Supabase

-- 1. Ajouter les colonnes
ALTER TABLE tournament_players ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE tournament_players ADD COLUMN IF NOT EXISTS bio TEXT;

-- 2. Corriger la politique RLS d'update (cast user_id en UUID)
DROP POLICY IF EXISTS "Players can update own profile" ON tournament_players;
CREATE POLICY "Players can update own profile" ON tournament_players
    FOR UPDATE
    USING (auth.uid() = user_id::uuid)
    WITH CHECK (auth.uid() = user_id::uuid);
