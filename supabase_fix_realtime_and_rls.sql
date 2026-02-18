-- Migration: Real-time Activation & RLS Optimization
-- Run this SQL in your Supabase SQL editor

-- 1. Activer le temps reel pour les tables (indispensable pour l'affichage instantane)
DO $$
BEGIN
    -- On ajoute les tables a la publication 'supabase_realtime' si elle existe
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE direct_conversations;
        ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;
        ALTER PUBLICATION supabase_realtime ADD TABLE match_messages;
    ELSE
        -- Sinon on la cree
        CREATE PUBLICATION supabase_realtime FOR TABLE direct_conversations, direct_messages, match_messages;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Tables already in publication';
    WHEN others THEN
        RAISE NOTICE 'Error setting up publication: %', SQLERRM;
END $$;

-- 2. S'assurer que REPLICA IDENTITY est a FULL pour que Realtime puisse filtrer correctement
ALTER TABLE direct_conversations REPLICA IDENTITY FULL;
ALTER TABLE direct_messages REPLICA IDENTITY FULL;
ALTER TABLE match_messages REPLICA IDENTITY FULL;

-- 3. Optimisation des index pour la rapidite des RLS
CREATE INDEX IF NOT EXISTS idx_tournament_players_user_id ON tournament_players(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_teams ON tournament_matches(team1_id, team2_id);
