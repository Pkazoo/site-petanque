-- ==========================================
-- Migration: Direct Messages System (Final Version)
-- ==========================================

-- 1. Nettoyage
DROP TABLE IF EXISTS direct_messages CASCADE;
DROP TABLE IF EXISTS direct_conversations CASCADE;

-- 2. Table des conversations
CREATE TABLE direct_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant1_id TEXT NOT NULL,
    participant2_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_conversation UNIQUE(participant1_id, participant2_id)
);

-- 3. Table des messages
CREATE TABLE direct_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES direct_conversations(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_by TEXT[] DEFAULT ARRAY[]::TEXT[]
);

-- 4. Index
CREATE INDEX idx_dm_conversation ON direct_messages(conversation_id);
CREATE INDEX idx_dm_created ON direct_messages(created_at);
CREATE INDEX idx_conv_participant1 ON direct_conversations(participant1_id);
CREATE INDEX idx_conv_participant2 ON direct_conversations(participant2_id);

-- 5. Temps Réel
ALTER TABLE direct_messages REPLICA IDENTITY FULL;
ALTER TABLE direct_conversations REPLICA IDENTITY FULL;

-- 6. Fonctions d'aide (Security Definier pour bypasser RLS)
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM user_accounts WHERE id = user_uuid AND role = 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_user_in_conversation(c_id UUID, u_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN is_admin(u_id) OR EXISTS (
        SELECT 1 FROM direct_conversations c
        WHERE c.id = c_id
        AND EXISTS (
            SELECT 1 FROM tournament_players p
            WHERE p.user_id = u_id
            AND (p.id::text = c.participant1_id OR p.id::text = c.participant2_id)
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RLS Policies
ALTER TABLE direct_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- Conversations
CREATE POLICY "Conversations_Select" ON direct_conversations FOR SELECT 
USING (is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM tournament_players p WHERE p.user_id = auth.uid() AND (p.id::text = participant1_id OR p.id::text = participant2_id)));

CREATE POLICY "Conversations_Insert" ON direct_conversations FOR INSERT 
WITH CHECK (is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM tournament_players p WHERE p.user_id = auth.uid() AND (p.id::text = participant1_id OR p.id::text = participant2_id)));

-- Messages
CREATE POLICY "Messages_Select" ON direct_messages FOR SELECT 
USING (is_user_in_conversation(conversation_id, auth.uid()));

CREATE POLICY "Messages_Insert" ON direct_messages FOR INSERT 
WITH CHECK (is_admin(auth.uid()) OR (EXISTS (SELECT 1 FROM tournament_players WHERE id::text = sender_id AND user_id = auth.uid()) AND is_user_in_conversation(conversation_id, auth.uid())));

CREATE POLICY "Messages_Update" ON direct_messages FOR UPDATE 
USING (is_user_in_conversation(conversation_id, auth.uid()));

-- Fin du script
SELECT 'Migration Direct Messages terminée avec succès' as result;
