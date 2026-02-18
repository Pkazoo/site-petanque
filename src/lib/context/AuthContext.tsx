'use client';

import { createContext, useContext, useEffect, useRef, useState, useMemo, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { UserAccount, UserRole } from '@/types';

interface AuthContextType {
  user: User | null;
  userAccount: UserAccount | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isOrganisateur: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userAccount, setUserAccount] = useState<UserAccount | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = useMemo(() => createClient(), []);

  const fetchUserAccount = useCallback(async (userId: string, sessionUser?: User) => {
    const { data, error } = await supabase
      .from('user_accounts')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Error fetching user account:', error);
      return null;
    }

    let account = data as UserAccount;

    // If no account found but we have session user data, try to create it (auto-sync)
    if (!account && sessionUser) {
      console.log('User account missing, attempting to auto-sync...');
      const displayName = sessionUser.user_metadata?.full_name || sessionUser.email?.split('@')[0] || 'Utilisateur';
      const { data: newData, error: insertError } = await supabase
        .from('user_accounts')
        .insert({
          id: userId,
          email: sessionUser.email!,
          display_name: displayName,
          role: 'joueur',
          is_active: true,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error auto-syncing user account:', insertError);
        return null;
      }
      account = newData as UserAccount;
    }

    if (account && sessionUser) {
      // Ensure a tournament_player exists for this user
      // 1. Check if ANY profile is already linked to this userId
      const { data: linkedPlayers } = await supabase
        .from('tournament_players')
        .select('id')
        .eq('user_id', userId);

      if (linkedPlayers && linkedPlayers.length > 0) {
        // Already has at least one linked profile, skip creation/linking
        return account;
      }

      if (sessionUser.email) {
        // 2. Check if ANY profile (linked or not) already has this email
        const { data: playersWithEmail } = await supabase
          .from('tournament_players')
          .select('id, user_id')
          .ilike('email', sessionUser.email);

        const unlinkedPlayer = playersWithEmail?.find(p => !p.user_id);
        const alreadyLinkedToOther = playersWithEmail?.find(p => p.user_id && p.user_id !== userId);

        if (alreadyLinkedToOther) {
          console.warn('Email already linked to another account, skipping auto-sync');
          return account;
        }

        if (unlinkedPlayer) {
          console.log('Linking existing orphaned player to user account:', unlinkedPlayer.id);
          const { error: linkError } = await supabase
            .from('tournament_players')
            .update({ user_id: userId })
            .eq('id', unlinkedPlayer.id);

          if (linkError) console.error('Auto-link error:', linkError);
        } else if (!playersWithEmail || playersWithEmail.length === 0) {
          // Double check if a player was created while we were processing
          const { data: finalCheck } = await supabase
            .from('tournament_players')
            .select('id')
            .eq('user_id', userId);

          if (finalCheck && finalCheck.length > 0) return account;

          // Create a new player profile
          console.log('Creating new tournament_player for user:', userId);
          const nameParts = account.display_name.trim().split(/\s+/);
          const firstName = nameParts[0] || 'Joueur';
          const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

          const { error: createError } = await supabase
            .from('tournament_players')
            .insert({
              id: crypto.randomUUID(),
              user_id: userId,
              email: sessionUser.email,
              first_name: firstName,
              last_name: lastName,
              username: account.display_name.toLowerCase().replace(/\s/g, '_') + '_' + Math.random().toString(36).substring(2, 5),
              city: '',
              created_at: new Date().toISOString(),
            });

          if (createError) console.error('Auto-create error:', createError);
        }
      }
    }

    return account;
  }, [supabase]);

  const initializedRef = useRef(false);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Guard against double-mount in React StrictMode / re-renders
    if (initializedRef.current) return;
    initializedRef.current = true;

    const getSession = async () => {
      try {
        const result = await supabase.auth.getSession();
        const session = result?.data?.session ?? null;
        const error = result?.error ?? null;

        // Handle invalid refresh token error
        if (error?.message?.includes('Refresh Token') || error?.message?.includes('Invalid')) {
          console.log('Invalid session, signing out...');
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setUserAccount(null);
          setLoading(false);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);
        userIdRef.current = session?.user?.id ?? null;

        if (session?.user) {
          const account = await fetchUserAccount(session.user.id, session.user);
          setUserAccount(account);
        }
      } catch (err: any) {
        console.error('Session error:', err);
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setUserAccount(null);
      }

      setLoading(false);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Skip INITIAL_SESSION — already handled by getSession above
        if (event === 'INITIAL_SESSION') return;

        // Handle token refresh errors
        if (event === 'TOKEN_REFRESHED' && !session) {
          console.log('Token refresh failed, signing out...');
          setSession(null);
          setUser(null);
          setUserAccount(null);
          setLoading(false);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);
        userIdRef.current = session?.user?.id ?? null;

        if (session?.user) {
          const account = await fetchUserAccount(session.user.id, session.user);
          setUserAccount(account);
        } else {
          setUserAccount(null);
        }

        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchUserAccount]);

  // Separate subscription for real-time role changes — re-subscribes when user changes
  useEffect(() => {
    if (!userIdRef.current) return;

    const currentUserId = userIdRef.current;
    const userAccountSubscription = supabase
      .channel('user-accounts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_accounts',
          filter: `id=eq.${currentUserId}`
        },
        async (payload) => {
          if (payload.new && (payload.new as any).id === currentUserId) {
            setUserAccount(payload.new as UserAccount);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(userAccountSubscription);
    };
  }, [user?.id, supabase]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (!error && data.user) {
      // Create user_account entry
      await supabase.from('user_accounts').insert({
        id: data.user.id,
        email,
        display_name: displayName,
        role: 'joueur',
        is_active: true,
      });
    }

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUserAccount(null);
  };

  const isAdmin = userAccount?.role === 'admin';
  const isOrganisateur = userAccount?.role === 'organisateur' || userAccount?.role === 'organizer' || isAdmin;

  return (
    <AuthContext.Provider
      value={{
        user,
        userAccount,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        isAdmin,
        isOrganisateur,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
