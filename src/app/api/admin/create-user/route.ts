import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { email, password, playerId } = await request.json();

  if (!email || !password || !playerId) {
    return NextResponse.json({ error: 'Email, mot de passe et playerId sont requis' }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 8 caractères' }, { status: 400 });
  }

  // Verify the caller is an admin via their session
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    }
  );

  const { data: { user: caller } } = await supabaseAuth.auth.getUser();
  if (!caller) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const { data: callerAccount } = await supabaseAuth
    .from('user_accounts')
    .select('role')
    .eq('id', caller.id)
    .single();

  if (!callerAccount || callerAccount.role !== 'admin') {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 });
  }

  // Use the service role client for admin operations (bypasses RLS)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // Check the player exists and is not already linked
  const { data: player, error: playerError } = await supabaseAdmin
    .from('tournament_players')
    .select('id, first_name, last_name, user_id')
    .eq('id', playerId)
    .single();

  if (playerError || !player) {
    return NextResponse.json({ error: 'Joueur introuvable' }, { status: 404 });
  }

  if (player.user_id) {
    return NextResponse.json({ error: 'Ce joueur a déjà un compte lié' }, { status: 409 });
  }

  // Check email not already used
  const { data: existingUser } = await supabaseAdmin
    .from('user_accounts')
    .select('id')
    .ilike('email', email)
    .maybeSingle();

  if (existingUser) {
    return NextResponse.json({ error: 'Un compte existe déjà avec cet email' }, { status: 409 });
  }

  // Create auth user (does NOT affect the admin's session)
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: authError?.message || 'Erreur lors de la création du compte' },
      { status: 500 }
    );
  }

  const newUserId = authData.user.id;
  const displayName = `${player.first_name} ${player.last_name}`.trim();

  // Create or update user_accounts entry (upsert handles previous auto-sync or partial attempts)
  const { error: accountError } = await supabaseAdmin.from('user_accounts').upsert({
    id: newUserId,
    email,
    display_name: displayName,
    role: 'joueur',
    is_active: true,
  });

  if (accountError) {
    console.error('Error creating user_accounts entry:', accountError);
    // Rollback: delete the auth user
    await supabaseAdmin.auth.admin.deleteUser(newUserId);
    return NextResponse.json(
      { error: `Erreur lors de la création du profil utilisateur: ${accountError.message}` },
      { status: 500 }
    );
  }

  // Link tournament_players to the new user
  const { error: linkError } = await supabaseAdmin
    .from('tournament_players')
    .update({ user_id: newUserId, email })
    .eq('id', playerId);

  if (linkError) {
    return NextResponse.json(
      { error: 'Compte créé mais erreur lors de la liaison au joueur' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, userId: newUserId });
}
