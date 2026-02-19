'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { useTournament } from '@/lib/context/TournamentContext';
import { createClient } from '@/lib/supabase/client';
import { UserAccount, UserRole, Tournament } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';
import { Shield, Users, Crown, AlertCircle, Trophy, Trash2, ArrowUp, ArrowDown, MapPin, Calendar, CheckCircle2, UserPlus, ExternalLink, Swords, X, Eye, EyeOff, Loader2, Pencil, Camera, Save } from 'lucide-react';
import toast from 'react-hot-toast';

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

export default function AdminPage() {
  const { user, userAccount, isAdmin, loading: authLoading } = useAuth();
  const { tournaments, players, deletePlayer, updatePlayer, leagues, leagueMatches, deleteLeague } = useTournament();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('utilisateurs');
  const [deletingTournament, setDeletingTournament] = useState<string | null>(null);
  const [sortedTournaments, setSortedTournaments] = useState<Tournament[]>([]);

  // Dialog "Ajouter un utilisateur"
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createForm, setCreateForm] = useState({ email: '', password: '', firstName: '', lastName: '', role: 'joueur' as UserRole });
  const [creating, setCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Edition de profil
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', bio: '', city: '', avatar: '' });
  const [saving, setSaving] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  // Vue unifiée : chaque user_account avec son profil joueur lié
  const unifiedUsers = useMemo(() => {
    return users.map(u => {
      const linkedPlayer = players.find(p => p.userId === u.id);
      return { ...u, player: linkedPlayer };
    });
  }, [users, players]);

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

    await supabase
      .from('tournament_matches')
      .delete()
      .eq('tournament_id', tournamentId);

    await supabase
      .from('tournament_teams')
      .delete()
      .eq('tournament_id', tournamentId);

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

  const createUser = async () => {
    if (!createForm.email || !createForm.password || !createForm.firstName || !createForm.lastName) {
      toast.error('Tous les champs sont requis');
      return;
    }
    if (createForm.password.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: createForm.email,
          password: createForm.password,
          firstName: createForm.firstName,
          lastName: createForm.lastName,
          role: createForm.role,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erreur lors de la création');
        return;
      }

      toast.success('Utilisateur créé avec succès !');
      setShowCreateUser(false);
      setCreateForm({ email: '', password: '', firstName: '', lastName: '', role: 'joueur' });
      fetchUsers();
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setCreating(false);
    }
  };

  const startEditing = (u: typeof unifiedUsers[0]) => {
    setEditingUserId(u.id);
    setEditForm({
      firstName: u.player?.firstName || u.display_name?.split(' ')[0] || '',
      lastName: u.player?.lastName || u.display_name?.split(' ').slice(1).join(' ') || '',
      bio: u.player?.bio || '',
      city: u.player?.location?.city || '',
      avatar: u.player?.avatar || '',
    });
  };

  const compressImage = (file: File, maxSizeKB: number = 300): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDimension = 800;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) { height = (height / width) * maxDimension; width = maxDimension; }
            else { width = (width / height) * maxDimension; height = maxDimension; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, width, height);
          let quality = 0.9;
          let result = canvas.toDataURL('image/jpeg', quality);
          while (result.length > maxSizeKB * 1024 && quality > 0.1) {
            quality -= 0.1;
            result = canvas.toDataURL('image/jpeg', quality);
          }
          resolve(result);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleEditPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 300);
      setEditForm(f => ({ ...f, avatar: compressed }));
    } catch {
      toast.error('Erreur lors du chargement de l\'image');
    }
  };

  const saveEdit = async () => {
    const editUser = unifiedUsers.find(u => u.id === editingUserId);
    if (!editUser?.player) {
      toast.error('Profil joueur introuvable');
      return;
    }
    if (!editForm.firstName.trim() || !editForm.lastName.trim()) {
      toast.error('Le prénom et le nom sont requis');
      return;
    }

    setSaving(true);
    try {
      await updatePlayer(editUser.player.id, {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        bio: editForm.bio.trim(),
        avatar: editForm.avatar || undefined,
        location: {
          city: editForm.city.trim(),
          lat: editUser.player.location?.lat || 0,
          lng: editUser.player.location?.lng || 0,
        },
      });

      // Mettre à jour display_name dans user_accounts
      await supabase.from('user_accounts').update({
        display_name: `${editForm.firstName.trim()} ${editForm.lastName.trim()}`.trim(),
        updated_at: new Date().toISOString(),
      }).eq('id', editingUserId);

      toast.success('Profil mis à jour !');
      setEditingUserId(null);
      fetchUsers();
    } catch {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
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
          Utilisateurs
          <Badge variant="secondary" className="ml-2 bg-muted/80">{unifiedUsers.length}</Badge>
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

      {/* Utilisateurs Tab Content (Unifié) */}
      {activeTab === 'utilisateurs' && (
        <div className="grid gap-4">
          <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h3 className="font-bold flex items-center gap-2 text-primary">
                <Users className="h-5 w-5" />
                Utilisateurs ({unifiedUsers.length})
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Tous les membres inscrits sur la plateforme avec leur profil joueur.
              </p>
            </div>
            <Button
              onClick={() => setShowCreateUser(true)}
              className="font-bold gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Ajouter un utilisateur
            </Button>
          </div>

          {/* Dialog Ajouter un utilisateur */}
          {showCreateUser && (
            <Card className="border-primary/20 bg-primary/5 shadow-xl mb-4">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-primary" />
                    Nouvel utilisateur
                  </h3>
                  <Button size="icon" variant="ghost" onClick={() => setShowCreateUser(false)} className="h-8 w-8">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Prénom</label>
                    <input
                      type="text"
                      value={createForm.firstName}
                      onChange={e => setCreateForm(f => ({ ...f, firstName: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="Jean"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Nom</label>
                    <input
                      type="text"
                      value={createForm.lastName}
                      onChange={e => setCreateForm(f => ({ ...f, lastName: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="Dupont"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Email</label>
                    <input
                      type="email"
                      value={createForm.email}
                      onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="jean.dupont@email.com"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Mot de passe</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={createForm.password}
                        onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                        className="w-full px-3 py-2 pr-10 rounded-lg border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                        placeholder="Min. 8 caractères"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Rôle</label>
                    <select
                      value={createForm.role}
                      onChange={e => setCreateForm(f => ({ ...f, role: e.target.value as UserRole }))}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="joueur">Joueur</option>
                      <option value="organisateur">Organisateur</option>
                      <option value="admin">Administrateur</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end mt-6">
                  <Button onClick={createUser} disabled={creating} className="font-bold gap-2">
                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {creating ? 'Création...' : 'Créer l\'utilisateur'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {unifiedUsers.map((u) => (
            <Card
              key={u.id}
              className="group border-border/40 bg-card/50 hover:bg-card transition-all duration-300 hover:shadow-xl hover:shadow-primary/5"
            >
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex-1 flex items-center gap-4">
                    {u.player ? (
                      <Link href={`/profil/${u.player.id}`} title="Voir le profil complet" className="shrink-0">
                        {u.player.avatar ? (
                          <img src={u.player.avatar} alt="" className="h-12 w-12 rounded-full object-cover shadow-inner hover:opacity-80 transition-all" />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl uppercase shadow-inner hover:bg-primary/20 transition-all">
                            {u.player.firstName?.[0] || u.display_name?.[0] || '?'}
                          </div>
                        )}
                      </Link>
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl uppercase shadow-inner shrink-0">
                        {u.display_name?.[0] || u.email?.[0] || '?'}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        {u.player ? (
                          <Link
                            href={`/profil/${u.player.id}`}
                            className="group/link flex items-center gap-2 hover:text-primary transition-colors"
                            title="Voir le profil complet"
                          >
                            <p className="font-bold text-lg">{u.player.firstName} {u.player.lastName}</p>
                            <ExternalLink className="h-4 w-4 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                          </Link>
                        ) : (
                          <p className="font-bold text-lg">{u.display_name || 'Utilisateur sans nom'}</p>
                        )}
                        {u.id === user.id && (
                          <Badge className="bg-primary/20 text-primary border-none text-[10px] font-black uppercase">Vous</Badge>
                        )}
                        {!u.player && (
                          <Badge className="bg-amber-100 text-amber-700 border-none text-[10px] font-bold py-0.5 px-2 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Profil manquant
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground font-medium">{u.email}</p>
                      {u.player?.location?.city && u.player.location.city !== 'Non renseigné' && (
                        <p className="text-xs text-muted-foreground/70 flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" />
                          {u.player.location.city}
                        </p>
                      )}
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

                    <div className="flex items-center gap-1">
                      {u.player && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9 rounded-lg text-primary hover:bg-primary/10 transition-all"
                          onClick={() => editingUserId === u.id ? setEditingUserId(null) : startEditing(u)}
                          title="Modifier le profil"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {u.player && u.id !== user.id && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9 rounded-lg text-destructive hover:bg-destructive/10 transition-all"
                          onClick={async () => {
                            if (confirm(`Supprimer définitivement ${u.player!.firstName} ${u.player!.lastName} ?`)) {
                              try {
                                await deletePlayer(u.player!.id);
                                toast.success('Profil supprimé');
                              } catch (err: any) {
                                toast.error(err.message || 'Erreur lors de la suppression');
                              }
                            }
                          }}
                          title="Supprimer le profil joueur"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Formulaire d'édition inline */}
                {editingUserId === u.id && u.player && (
                  <div className="mt-6 pt-6 border-t border-border/40">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="relative">
                        {editForm.avatar ? (
                          <img src={editForm.avatar} alt="" className="h-16 w-16 rounded-full object-cover border-2 border-primary/30" />
                        ) : (
                          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl uppercase">
                            {editForm.firstName?.[0] || '?'}
                          </div>
                        )}
                        <button
                          onClick={() => editFileInputRef.current?.click()}
                          className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
                        >
                          <Camera className="h-3.5 w-3.5" />
                        </button>
                        <input
                          ref={editFileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleEditPhotoChange}
                          className="hidden"
                        />
                      </div>
                      <div>
                        <p className="font-bold text-sm">Modifier le profil</p>
                        <p className="text-xs text-muted-foreground">Cliquez sur l'appareil photo pour changer l'avatar</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Prénom</label>
                        <input
                          type="text"
                          value={editForm.firstName}
                          onChange={e => setEditForm(f => ({ ...f, firstName: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Nom</label>
                        <input
                          type="text"
                          value={editForm.lastName}
                          onChange={e => setEditForm(f => ({ ...f, lastName: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Ville</label>
                        <input
                          type="text"
                          value={editForm.city}
                          onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                          placeholder="Non renseigné"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Bio</label>
                        <input
                          type="text"
                          value={editForm.bio}
                          onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                          placeholder="Courte description..."
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-4">
                      <Button variant="outline" size="sm" onClick={() => setEditingUserId(null)} className="font-bold">
                        Annuler
                      </Button>
                      <Button size="sm" onClick={saveEdit} disabled={saving} className="font-bold gap-2">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {saving ? 'Enregistrement...' : 'Enregistrer'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {unifiedUsers.length === 0 && (
            <div className="text-center py-20 bg-muted/20 rounded-3xl border border-dashed border-border/60">
              <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">Aucun utilisateur trouvé</p>
            </div>
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
