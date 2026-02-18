'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { useTournament } from '@/lib/context/TournamentContext';
import { createClient } from '@/lib/supabase/client';
import { UserAccount, UserRole, Tournament } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';
import { Shield, Users, Crown, AlertCircle, Trophy, Trash2, ArrowUp, ArrowDown, MapPin, Calendar, RefreshCcw, CheckCircle2, UserPlus, Link as LinkIcon, ExternalLink, Swords } from 'lucide-react';
import toast from 'react-hot-toast';
import { PlayerForm } from '@/components/tournois/PlayerForm';
import { CreateAccountDialog } from '@/components/tournois/CreateAccountDialog';
import { User as PlayerType } from '@/types';

const roleLabels: Record<UserRole, string> = {
  joueur: 'Joueur',
  organisateur: 'Organisateur',
  admin: 'Administrateur',
  organizer: 'Organisateur',
  player: 'Joueur',
  user: 'Joueur',
};

const roleColors: Record<UserRole, string> = {
  joueur: 'bg-blue-100 text-blue-800',
  organisateur: 'bg-orange-100 text-orange-800',
  admin: 'bg-red-100 text-red-800',
  organizer: 'bg-orange-100 text-orange-800',
  player: 'bg-blue-100 text-blue-800',
  user: 'bg-blue-100 text-blue-800',
};

function AuthStatus({ playerLinked }: { playerLinked: boolean }) {
  if (playerLinked) {
    return (
      <Badge className="bg-green-100 text-green-700 border-none text-[10px] font-bold py-0.5 px-2 flex items-center gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Profil lié
      </Badge>
    );
  }
  return (
    <Badge className="bg-amber-100 text-amber-700 border-none text-[10px] font-bold py-0.5 px-2 flex items-center gap-1">
      <AlertCircle className="h-3 w-3" />
      Profil manquant
    </Badge>
  );
}

export default function AdminPage() {
  const { user, userAccount, isAdmin, loading: authLoading } = useAuth();
  const { tournaments, players, deletePlayer, leagues, leagueMatches, deleteLeague } = useTournament();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('utilisateurs');
  const [deletingTournament, setDeletingTournament] = useState<string | null>(null);
  const [sortedTournaments, setSortedTournaments] = useState<Tournament[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [createAccountPlayer, setCreateAccountPlayer] = useState<PlayerType | null>(null);

  const supabase = createClient();

  // Initialiser les tournois triés
  useEffect(() => {
    setSortedTournaments([...tournaments].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    ));
  }, [tournaments]);

  const deleteTournament = async (tournamentId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce tournoi ? Cette action est irréversible.')) {
      return;
    }

    setDeletingTournament(tournamentId);

    // Supprimer les matches associés
    await supabase
      .from('tournament_matches')
      .delete()
      .eq('tournament_id', tournamentId);

    // Supprimer les équipes associées
    await supabase
      .from('tournament_teams')
      .delete()
      .eq('tournament_id', tournamentId);

    // Supprimer le tournoi
    const { error } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', tournamentId);

    if (error) {
      toast.error('Erreur lors de la suppression');
      console.error(error);
    } else {
      toast.success('Tournoi supprimé');
      setSortedTournaments(prev => prev.filter(t => t.id !== tournamentId));
    }

    setDeletingTournament(null);
  };

  const moveTournament = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sortedTournaments.length) return;

    const newSorted = [...sortedTournaments];
    [newSorted[index], newSorted[newIndex]] = [newSorted[newIndex], newSorted[index]];
    setSortedTournaments(newSorted);
    toast.success('Ordre mis à jour');
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('user_accounts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setError('Erreur lors du chargement des utilisateurs');
      console.error(error);
    } else {
      setUsers(data as UserAccount[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading && isAdmin) {
      fetchUsers();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, isAdmin]);

  const syncPlayers = async () => {
    setSyncing(true);
    let createdCount = 0;
    let linkedCount = 0;

    try {
      // 1. Get all players and users
      const { data: allPlayers } = await supabase.from('tournament_players').select('id, email, user_id');
      const { data: allUsers } = await supabase.from('user_accounts').select('*');

      if (!allUsers) return;

      for (const u of allUsers) {
        const linkedPlayer = allPlayers?.find(p => p.user_id === u.id);
        const unlinkedPlayerByEmail = allPlayers?.find(p => !p.user_id && p.email?.toLowerCase() === u.email?.toLowerCase());

        if (!linkedPlayer) {
          if (unlinkedPlayerByEmail) {
            // Link existing
            console.log('Linking user', u.id, 'to player', unlinkedPlayerByEmail.id);
            const { error: linkError } = await supabase.from('tournament_players').update({ user_id: u.id }).eq('id', unlinkedPlayerByEmail.id);
            if (linkError) {
              console.error('Error linking player:', linkError);
              throw linkError;
            }
            linkedCount++;
          } else {
            // Check if ANYONE already has this email linked (to avoid double profile)
            const alreadyTaken = allPlayers?.some(p => p.email?.toLowerCase() === u.email?.toLowerCase());
            if (alreadyTaken) {
              console.log('Email', u.email, 'already taken by another linked profile, skipping creation');
              continue;
            }

            // Create new
            console.log('Creating new player for user', u.id);
            const nameParts = u.display_name.trim().split(/\s+/);
            const firstName = nameParts[0] || 'Joueur';
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

            const { error: createError } = await supabase.from('tournament_players').insert({
              id: crypto.randomUUID(),
              user_id: u.id,
              email: u.email,
              first_name: firstName,
              last_name: lastName,
              username: u.display_name.toLowerCase().replace(/\s/g, '_') + '_' + Math.random().toString(36).substring(2, 5), // Avoid collision
              city: '',
              created_at: new Date().toISOString(),
            });
            if (createError) {
              console.error('Error creating player:', createError);
              throw createError;
            }
            createdCount++;
          }
        }
      }

      toast.success(`${createdCount} profils créés, ${linkedCount} profils liés`);
      fetchUsers(); // Refresh
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la synchronisation');
    } finally {
      setSyncing(false);
    }
  };

  const updateRole = async (userId: string, newRole: UserRole) => {
    setUpdating(userId);
    setError(null);

    const { error } = await supabase
      .from('user_accounts')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      setError('Erreur lors de la mise a jour du role');
      console.error(error);
    } else {
      setUsers(users.map(u =>
        u.id === userId ? { ...u, role: newRole } : u
      ));
    }

    setUpdating(null);
  };

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3">Chargement...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-md mx-auto">
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Acces refuse</h2>
            <p className="text-muted-foreground">
              Vous devez etre connecte pour acceder a cette page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-md mx-auto">
          <CardContent className="py-8 text-center">
            <Shield className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Acces reserve aux administrateurs</h2>
            <p className="text-muted-foreground">
              Votre role actuel : <Badge className={roleColors[userAccount?.role || 'joueur']}>
                {roleLabels[userAccount?.role || 'joueur']}
              </Badge>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <Badge className="mb-3 bg-primary/10 text-primary hover:bg-primary/20 border-none px-3 py-1 font-bold uppercase tracking-wider text-[10px]">
            Espace Reservé
          </Badge>
          <h1 className="text-4xl font-black flex items-center gap-4 tracking-tight">
            <Shield className="h-10 w-10 text-primary" />
            Administration
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Pilotez l'ensemble de la plateforme Pétanque Manager.
          </p>
        </div>
        <div className="flex gap-4">
          <Button
            onClick={syncPlayers}
            disabled={syncing}
            variant="outline"
            className="group hover:border-primary/50 transition-all font-bold"
          >
            <RefreshCcw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
            Synchroniser
          </Button>
        </div>
      </div>

      {error && (
        <Card className="mb-8 border-destructive/50 bg-destructive/5 shadow-xl">
          <CardContent className="py-4">
            <p className="text-destructive flex items-center gap-3 font-medium">
              <AlertCircle className="h-5 w-5" />
              {error}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tabs Navigation */}
      <div className="flex p-1.5 bg-muted/50 rounded-2xl mb-8 w-fit border border-border/40 overflow-x-auto max-w-full">
        <button
          onClick={() => setActiveTab('utilisateurs')}
          className={`flex items-center gap-2 px-8 py-3 text-sm font-bold transition-all rounded-xl whitespace-nowrap ${activeTab === 'utilisateurs'
            ? 'bg-background text-primary shadow-lg shadow-black/5'
            : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          <Users className="h-4 w-4" />
          Membres
          <Badge variant="secondary" className="ml-2 bg-muted/80">{users.length}</Badge>
        </button>
        <button
          onClick={() => setActiveTab('profils')}
          className={`flex items-center gap-2 px-8 py-3 text-sm font-bold transition-all rounded-xl whitespace-nowrap ${activeTab === 'profils'
            ? 'bg-background text-primary shadow-lg shadow-black/5'
            : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          <UserPlus className="h-4 w-4" />
          Joueurs (Tous)
          <Badge variant="secondary" className="ml-2 bg-muted/80">{players.length}</Badge>
        </button>
        <button
          onClick={() => setActiveTab('tournois')}
          className={`flex items-center gap-2 px-8 py-3 text-sm font-bold transition-all rounded-xl whitespace-nowrap ${activeTab === 'tournois'
            ? 'bg-background text-primary shadow-lg shadow-black/5'
            : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          <Trophy className="h-4 w-4" />
          Tournois
          <Badge variant="secondary" className="ml-2 bg-muted/80">{sortedTournaments.length}</Badge>
        </button>
        <button
          onClick={() => setActiveTab('ligues')}
          className={`flex items-center gap-2 px-8 py-3 text-sm font-bold transition-all rounded-xl whitespace-nowrap ${activeTab === 'ligues'
            ? 'bg-background text-primary shadow-lg shadow-black/5'
            : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          <Swords className="h-4 w-4" />
          Ligues
          <Badge variant="secondary" className="ml-2 bg-muted/80">{leagues.length}</Badge>
        </button>
      </div>

      {/* Joueurs Tab Content */}
      {activeTab === 'utilisateurs' && (
        <div className="grid gap-4">
          <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 mb-4">
            <h3 className="font-bold flex items-center gap-2 text-primary">
              <Shield className="h-5 w-5" />
              Comptes de connexion ({users.length})
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Utilisateurs inscrits sur la plateforme via email/mot de passe. Ils peuvent gérer leurs tournois et messages.
            </p>
          </div>
          {users.map((u) => {
            const linkedPlayer = players.find(p => p.userId === u.id);
            return (
              <Card
                key={u.id}
                className="group border-border/40 bg-card/50 hover:bg-card transition-all duration-300 hover:shadow-xl hover:shadow-primary/5"
              >
                <CardContent className="flex flex-col md:flex-row items-center justify-between p-6 gap-6">
                  <div className="flex-1 flex items-center gap-4">
                    {linkedPlayer ? (
                      <Link href={`/profil/${linkedPlayer.id}`} title="Voir le profil complet">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl uppercase shadow-inner hover:bg-primary/20 transition-all">
                          {u.display_name?.[0] || u.email?.[0] || '?'}
                        </div>
                      </Link>
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl uppercase shadow-inner">
                        {u.display_name?.[0] || u.email?.[0] || '?'}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-3">
                        {linkedPlayer ? (
                          <Link
                            href={`/profil/${linkedPlayer.id}`}
                            className="group/link flex items-center gap-2 hover:text-primary transition-colors"
                            title="Voir le profil complet"
                          >
                            <p className="font-bold text-lg">{u.display_name || 'Utilisateur sans nom'}</p>
                            <ExternalLink className="h-4 w-4 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                          </Link>
                        ) : (
                          <p className="font-bold text-lg">{u.display_name || 'Utilisateur sans nom'}</p>
                        )}
                        {u.id === user.id && (
                          <Badge className="bg-primary/20 text-primary border-none text-[10px] font-black uppercase">Vous</Badge>
                        )}
                        <AuthStatus playerLinked={!!linkedPlayer} />
                      </div>
                      <p className="text-sm text-muted-foreground font-medium">{u.email}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 p-1 bg-muted rounded-xl border border-border/40">
                      {(['joueur', 'organisateur', 'admin'] as UserRole[]).map((role) => (
                        <Button
                          key={role}
                          size="sm"
                          variant={u.role === role ? 'default' : 'ghost'}
                          className={`h-9 px-4 rounded-lg font-bold text-xs transition-all ${u.role === role ? 'shadow-md' : 'text-muted-foreground'
                            } ${u.id === user.id ? 'pointer-events-none opacity-50' : ''}`}
                          onClick={() => updateRole(u.id, role)}
                          disabled={updating === u.id || u.id === user.id}
                        >
                          {roleLabels[role]}
                        </Button>
                      ))}
                    </div>

                    <div className="w-[120px] text-right hidden sm:block">
                      <Badge className={`${roleColors[u.role]} border-none font-bold uppercase text-[10px] tracking-widest px-2.5 py-1 shadow-sm`}>
                        {u.role === 'admin' && <Crown className="h-3 w-3 mr-1.5" />}
                        {roleLabels[u.role]}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Profils Tab Content */}
      {activeTab === 'profils' && (
        <div className="grid gap-4">
          <div className="bg-secondary/5 border border-secondary/10 rounded-2xl p-6 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h3 className="font-bold flex items-center gap-2 text-secondary-foreground">
                <Users className="h-5 w-5" />
                Liste complète des Joueurs ({players.length})
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Tous les profils présents en base de données, qu'ils disposent d'un compte de connexion ou qu'ils aient été créés manuellement.
              </p>
            </div>
            <PlayerForm onSuccess={() => toast.success('Joueur créé avec succès !')} />
          </div>
          {players.map((p) => (
            <Card
              key={p.id}
              className="group border-border/40 bg-card/50 hover:bg-card transition-all duration-300 hover:shadow-xl hover:shadow-primary/5"
            >
              <CardContent className="flex flex-col md:flex-row items-center justify-between p-6 gap-6">
                <div className="flex-1 flex items-center gap-4">
                  <Link href={`/profil/${p.id}`} className="shrink-0 hover:opacity-80 transition-opacity">
                    <img
                      src={p.avatar}
                      alt=""
                      className="h-12 w-12 rounded-full border border-border/50 object-cover shadow-sm"
                    />
                  </Link>
                  <div>
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/profil/${p.id}`}
                        className="group/link flex items-center gap-2 hover:text-primary transition-colors"
                        title="Voir le profil complet"
                      >
                        <p className="font-bold text-lg flex items-center gap-2">
                          {p.firstName} {p.lastName}
                        </p>
                        <ExternalLink className="h-4 w-4 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                      </Link>
                      {p.userId && p.userId !== 'null' && p.userId !== 'undefined' && (
                        <span title={`Lié au compte ID: ${p.userId}`}>
                          <LinkIcon className="h-4 w-4 text-primary" />
                        </span>
                      )}
                      {p.userId ? (
                        <Badge className="bg-green-100 text-green-700 border-none text-[10px] font-bold py-0.5 px-2">Membre</Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-500 border-none text-[10px] font-bold py-0.5 px-2">Manuel</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground font-medium truncate max-w-[200px]">{p.email || 'Pas d\'email'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-center hidden sm:block">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">Inscrit le</p>
                    <p className="text-xs font-bold">{new Date(p.createdAt).toLocaleDateString()}</p>
                  </div>

                  <div className="flex items-center gap-2 pl-4 border-l border-border/40">
                    {!p.userId && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 rounded-lg text-xs font-bold gap-1.5 border-primary/30 text-primary hover:bg-primary/10 transition-all"
                        onClick={() => setCreateAccountPlayer(p)}
                        title="Créer un compte utilisateur pour ce joueur"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Créer un compte
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 rounded-lg text-destructive hover:bg-destructive/10 transition-all"
                      onClick={async () => {
                        if (confirm(`Supprimer définitivement le profil de ${p.firstName} ${p.lastName} ?`)) {
                          try {
                            await deletePlayer(p.id);
                            toast.success('Joueur supprimé');
                          } catch (err: any) {
                            toast.error(err.message || 'Erreur lors de la suppression');
                          }
                        }
                      }}
                      title="Supprimer le joueur"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {createAccountPlayer && (
            <CreateAccountDialog
              player={createAccountPlayer}
              open={!!createAccountPlayer}
              onOpenChange={(open) => { if (!open) setCreateAccountPlayer(null); }}
              onSuccess={() => {
                setCreateAccountPlayer(null);
                toast.success('Compte créé et lié au joueur !');
              }}
            />
          )}
        </div>
      )}

      {/* Tournois Tab Content */}
      {activeTab === 'tournois' && (
        <div className="grid gap-4">
          {sortedTournaments.map((tournament, index) => (
            <Card
              key={tournament.id}
              className="group border-border/40 bg-card/50 hover:bg-card transition-all duration-300 hover:shadow-xl hover:shadow-primary/5"
            >
              <CardContent className="flex flex-col md:flex-row items-center justify-between p-6 gap-6">
                <Link href={`/tournois/${tournament.id}/gestion`} className="flex-1 min-w-0 flex items-center gap-4 cursor-pointer">
                  <div className="h-12 w-12 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary-foreground">
                    <Trophy className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg truncate group-hover:text-primary transition-colors">{tournament.name}</h3>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-1.5 font-medium">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-primary" />
                        {new Date(tournament.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-secondary-foreground" />
                        {tournament.location.city}
                      </span>
                    </div>
                  </div>
                </Link>

                <div className="flex items-center gap-6">
                  <Badge
                    variant="outline"
                    className={`border-none font-black uppercase text-[10px] tracking-widest px-3 py-1.5 shadow-sm ${tournament.status === 'upcoming' ? 'bg-blue-100 text-blue-700' :
                      tournament.status === 'ongoing' ? 'bg-green-100 text-green-700 animate-pulse' :
                        tournament.status === 'completed' ? 'bg-gray-100 text-gray-700' : 'bg-red-100 text-red-700'
                      }`}
                  >
                    {tournament.status === 'upcoming' ? 'À venir' :
                      tournament.status === 'ongoing' ? 'En cours' :
                        tournament.status === 'completed' ? 'Terminé' : 'Annulé'}
                  </Badge>

                  <div className="flex items-center gap-2 p-1 bg-muted/80 rounded-xl border border-border/40">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 rounded-lg hover:bg-background hover:text-primary transition-all"
                      onClick={() => moveTournament(index, 'up')}
                      disabled={index === 0}
                      title="Monter"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 rounded-lg hover:bg-background hover:text-primary transition-all"
                      onClick={() => moveTournament(index, 'down')}
                      disabled={index === sortedTournaments.length - 1}
                      title="Descendre"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <div className="w-px h-4 bg-border/60 mx-1" />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 rounded-lg text-destructive hover:bg-destructive/10 transition-all"
                      onClick={() => deleteTournament(tournament.id)}
                      disabled={deletingTournament === tournament.id}
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {sortedTournaments.length === 0 && (
            <div className="text-center py-20 bg-muted/20 rounded-3xl border border-dashed border-border/60">
              <Trophy className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">Aucun tournoi trouvé</p>
            </div>
          )}
        </div>
      )}

      {/* Ligues Tab Content */}
      {activeTab === 'ligues' && (
        <div className="grid gap-4">
          <div className="bg-purple-50 border border-purple-100 rounded-2xl p-6 mb-4">
            <h3 className="font-bold flex items-center gap-2 text-purple-800">
              <Swords className="h-5 w-5" />
              Ligues entre amis ({leagues.length})
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Toutes les ligues créées par les utilisateurs. Chaque ligue contient ses propres matchs et classements.
            </p>
          </div>
          {leagues.map((league) => {
            const matchCount = leagueMatches.filter(m => m.league_id === league.id).length;
            const completedMatchCount = leagueMatches.filter(m => m.league_id === league.id && m.status === 'completed').length;
            const participantCount = league.participant_ids?.length || 0;
            const creator = players.find(p => p.userId === league.created_by);

            return (
              <Card
                key={league.id}
                className="group border-border/40 bg-card/50 hover:bg-card transition-all duration-300 hover:shadow-xl hover:shadow-primary/5"
              >
                <CardContent className="flex flex-col md:flex-row items-center justify-between p-6 gap-6">
                  <Link href={`/tournois/ligue/${league.id}`} className="flex-1 min-w-0 flex items-center gap-4 cursor-pointer">
                    <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
                      <Swords className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg truncate group-hover:text-primary transition-colors">{league.name}</h3>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-1.5 font-medium">
                        <span className="flex items-center gap-1.5">
                          <Users className="h-4 w-4 text-purple-600" />
                          {participantCount} joueur{participantCount > 1 ? 's' : ''}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Trophy className="h-4 w-4 text-primary" />
                          {completedMatchCount}/{matchCount} match{matchCount > 1 ? 's' : ''}
                        </span>
                        {creator && (
                          <span className="flex items-center gap-1.5">
                            <Crown className="h-4 w-4 text-amber-500" />
                            {creator.firstName} {creator.lastName}
                          </span>
                        )}
                        {!creator && league.created_by && (
                          <span className="flex items-center gap-1.5 text-muted-foreground/60">
                            <Crown className="h-4 w-4" />
                            Anonyme
                          </span>
                        )}
                      </div>
                      {league.description && (
                        <p className="text-xs text-muted-foreground mt-1 truncate max-w-[400px]">{league.description}</p>
                      )}
                    </div>
                  </Link>

                  <div className="flex items-center gap-6">
                    <div className="text-center hidden sm:block">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">Créée le</p>
                      <p className="text-xs font-bold">{new Date(league.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</p>
                    </div>

                    <Badge
                      variant="outline"
                      className={`border-none font-black uppercase text-[10px] tracking-widest px-3 py-1.5 shadow-sm ${
                        matchCount === 0 ? 'bg-gray-100 text-gray-600' :
                        completedMatchCount === matchCount ? 'bg-green-100 text-green-700' :
                        'bg-blue-100 text-blue-700 animate-pulse'
                      }`}
                    >
                      {matchCount === 0 ? 'Vide' :
                        completedMatchCount === matchCount ? 'Terminée' : 'En cours'}
                    </Badge>

                    <div className="flex items-center gap-2 p-1 bg-muted/80 rounded-xl border border-border/40">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 rounded-lg text-destructive hover:bg-destructive/10 transition-all"
                        onClick={async () => {
                          if (confirm(`Supprimer la ligue "${league.name}" et tous ses matchs ?`)) {
                            try {
                              await deleteLeague(league.id);
                              toast.success('Ligue supprimée');
                            } catch {
                              toast.error('Erreur lors de la suppression');
                            }
                          }
                        }}
                        title="Supprimer la ligue"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {leagues.length === 0 && (
            <div className="text-center py-20 bg-muted/20 rounded-3xl border border-dashed border-border/60">
              <Swords className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">Aucune ligue trouvée</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
