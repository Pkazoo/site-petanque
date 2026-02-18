-- 1. Ajout explicite de la colonne participant_ids si elle manque
-- C'est l'étape CRUCIALE car 'CREATE TABLE IF NOT EXISTS' ne modifie pas les tables existantes
ALTER TABLE leagues 
ADD COLUMN IF NOT EXISTS participant_ids TEXT[] DEFAULT '{}';

-- 2. Création des autres tables si nécessaire
CREATE TABLE IF NOT EXISTS league_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
    player_id TEXT REFERENCES tournament_players(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(league_id, player_id)
);

CREATE TABLE IF NOT EXISTS league_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('tete-a-tete', 'doublette', 'triplettes')),
    team1_player_ids TEXT[] NOT NULL,
    team2_player_ids TEXT[] NOT NULL,
    score1 INTEGER,
    score2 INTEGER,
    winner_team_index INTEGER,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'ongoing', 'completed')),
    team1_proposed_score1 INTEGER,
    team1_proposed_score2 INTEGER,
    team1_validated BOOLEAN DEFAULT false,
    team2_proposed_score1 INTEGER,
    team2_proposed_score2 INTEGER,
    team2_validated BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Mise à jour de la politique de sécurité pour la création
DROP POLICY IF EXISTS "Leagues are insertable by everyone" ON leagues;
CREATE POLICY "Leagues are insertable by everyone" ON leagues FOR INSERT WITH CHECK ((created_by IS NULL) OR (auth.uid() = created_by));

-- Fin de la mise à jour
