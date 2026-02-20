import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { userId, newPassword } = await request.json();

  if (!userId || !newPassword) {
    return NextResponse.json({ error: 'userId et newPassword sont requis' }, { status: 400 });
  }

  if (newPassword.length < 8) {
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

  // Use the service role client for admin operations
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

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la réinitialisation du mot de passe' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
