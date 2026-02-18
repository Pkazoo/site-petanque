-- Migration: Ajout de la gestion des terrains de pétanque

-- 1. Ajouter le nombre de terrains au tournoi
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS terrain_count INTEGER;

-- 2. Ajouter le numéro de terrain assigné à chaque match
ALTER TABLE tournament_matches
ADD COLUMN IF NOT EXISTS terrain_number INTEGER;
