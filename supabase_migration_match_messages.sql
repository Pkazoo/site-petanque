-- ==========================================
-- Migration: Match Chat System (Final Version)
-- ==========================================

-- 1. Nettoyage
DROP TABLE IF EXISTS match_messages CASCADE;

-- 2. Table des messages de match
CREATE TABLE match_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id TEXT NOT NULL, 
    sender_id TEXT NOT NULL, 
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_by TEXT[] DEFAULT ARRAY[]::TEXT[]
);

-- 3. Index
CREATE INDEX idx_match_msg_match ON match_messages(match_id);
CREATE INDEX idx_match_msg_created ON match_messages(created_at);

-- 4. Temps Réel
ALTER TABLE match_messages REPLICA IDENTITY FULL;

-- 5. Fonctions d'aide
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM user_accounts WHERE id = user_uuid AND role = 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_user_in_match(m_id TEXT, u_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN is_admin(u_id) OR EXISTS (
        SELECT 1 FROM tournament_matches match_row
        JOIN tournament_teams t ON (t.id::text = match_row.team1_id OR t.id::text = match_row.team2_id)
        WHERE match_row.id::text = m_id
        AND EXISTS (
            SELECT 1 FROM tournament_players p
            WHERE p.user_id = u_id
            AND p.id::text = ANY(t.player_ids)
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RLS Policies
ALTER TABLE match_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "MatchMessages_Select" ON match_messages FOR SELECT 
USING (is_user_in_match(match_id, auth.uid()));

CREATE POLICY "MatchMessages_Insert" ON match_messages FOR INSERT 
WITH CHECK (is_admin(auth.uid()) OR (EXISTS (SELECT 1 FROM tournament_players WHERE id::text = sender_id AND user_id = auth.uid()) AND is_user_in_match(match_id, auth.uid())));

CREATE POLICY "MatchMessages_Update" ON match_messages FOR UPDATE 
USING (is_user_in_match(match_id, auth.uid()));

-- Fin du script
SELECT 'Migration Match Messages terminée avec succès' as result;
