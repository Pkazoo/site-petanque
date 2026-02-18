-- Migration: Tournament format support (poules + elimination, consolante)

-- 1. Tournament format fields
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS format TEXT DEFAULT 'elimination';
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS pool_size INTEGER;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS qualifiers_per_pool INTEGER;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS consolation_enabled BOOLEAN DEFAULT false;

-- 2. Match fields for pools and consolation
ALTER TABLE tournament_matches ADD COLUMN IF NOT EXISTS pool_id TEXT;
ALTER TABLE tournament_matches ADD COLUMN IF NOT EXISTS phase TEXT DEFAULT 'knockout';
ALTER TABLE tournament_matches ADD COLUMN IF NOT EXISTS is_consolation BOOLEAN DEFAULT false;
