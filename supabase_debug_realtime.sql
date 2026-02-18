-- FIX REALTIME AND RLS
-- Run this in Supabase SQL Editor

-- 1. Check admin role (diagnostic only - should not error)
DO $$
BEGIN
    RAISE NOTICE 'Starting Realtime configuration for Admin...';
END $$;

-- 2. Force Realtime publication (Resetting standard tables)
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE 
    direct_messages, 
    direct_conversations, 
    match_messages, 
    user_accounts,
    tournaments, 
    tournament_matches, 
    tournament_players,
    tournament_teams;

-- 3. Set Replica Identity (Required for correct updates)
ALTER TABLE direct_messages REPLICA IDENTITY FULL;
ALTER TABLE direct_conversations REPLICA IDENTITY FULL;
ALTER TABLE match_messages REPLICA IDENTITY FULL;
ALTER TABLE user_accounts REPLICA IDENTITY FULL;
ALTER TABLE tournaments REPLICA IDENTITY FULL;
ALTER TABLE tournament_matches REPLICA IDENTITY FULL;
ALTER TABLE tournament_players REPLICA IDENTITY FULL;
ALTER TABLE tournament_teams REPLICA IDENTITY FULL;


-- 4. Fix is_admin function (Permissive check)
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_accounts 
        WHERE id = user_uuid 
        AND (role = 'admin' OR role = 'organisateur')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. Admin Policies for Messages (Universal access)
DROP POLICY IF EXISTS "Admin_Select_DirectMessages" ON direct_messages;
CREATE POLICY "Admin_Select_DirectMessages" ON direct_messages
    FOR SELECT
    USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin_Select_Conversations" ON direct_conversations;
CREATE POLICY "Admin_Select_Conversations" ON direct_conversations
    FOR SELECT
    USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin_Select_MatchMessages" ON match_messages;
CREATE POLICY "Admin_Select_MatchMessages" ON match_messages
    FOR SELECT
    USING (is_admin(auth.uid()));


-- 6. User Accounts Policies (Visibility fix)
DROP POLICY IF EXISTS "Users can view own account" ON user_accounts;
CREATE POLICY "Users can view own account" ON user_accounts
    FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all accounts" ON user_accounts;
CREATE POLICY "Admins can view all accounts" ON user_accounts
    FOR SELECT
    USING (is_admin(auth.uid()));


SELECT 'Success: Realtime configuration complete' as status;
