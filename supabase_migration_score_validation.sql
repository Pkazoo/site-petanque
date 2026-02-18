-- Migration: Ajouter les colonnes pour la validation des scores par équipe
-- À exécuter dans Supabase SQL Editor

ALTER TABLE tournament_matches
ADD COLUMN IF NOT EXISTS team1_proposed_score1 INTEGER,
ADD COLUMN IF NOT EXISTS team1_proposed_score2 INTEGER,
ADD COLUMN IF NOT EXISTS team2_proposed_score1 INTEGER,
ADD COLUMN IF NOT EXISTS team2_proposed_score2 INTEGER,
ADD COLUMN IF NOT EXISTS team1_validated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS team2_validated BOOLEAN DEFAULT false;

-- Commentaires pour documentation
COMMENT ON COLUMN tournament_matches.team1_proposed_score1 IS 'Score que team1 dit avoir fait';
COMMENT ON COLUMN tournament_matches.team1_proposed_score2 IS 'Score que team1 dit que team2 a fait';
COMMENT ON COLUMN tournament_matches.team2_proposed_score1 IS 'Score que team2 dit que team1 a fait';
COMMENT ON COLUMN tournament_matches.team2_proposed_score2 IS 'Score que team2 dit avoir fait';
COMMENT ON COLUMN tournament_matches.team1_validated IS 'Team1 a validé son score';
COMMENT ON COLUMN tournament_matches.team2_validated IS 'Team2 a validé son score';
