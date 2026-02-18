-- Migration: League Modes (round_robin + free)
-- Run this in the Supabase SQL Editor

-- 1. Add mode column with default 'free' for backward compatibility
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS mode text DEFAULT 'free'
  CHECK (mode IN ('round_robin', 'free'));

-- 2. Add match_format column (only relevant for round_robin mode)
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS match_format text
  CHECK (match_format IN ('tete-a-tete', 'doublette', 'triplettes'));

-- 3. Add end_date column (only relevant for free mode)
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS end_date timestamp with time zone;

-- 4. Add round_number to league_matches for round-robin match grouping
ALTER TABLE league_matches ADD COLUMN IF NOT EXISTS round_number integer;

-- 5. Backfill existing leagues
UPDATE leagues SET mode = 'free' WHERE mode IS NULL;
