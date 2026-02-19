
"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Trophy, MoreVertical, PlayCircle, Trash2, UserPlus, AlertCircle, Search, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { useTournament } from "@/lib/context/TournamentContext";
import { useAuth } from "@/lib/context/AuthContext";

import { TeamComposition } from "@/components/tournois/TeamComposition";
import { TournamentBracket } from "@/components/tournois/TournamentBracket";
import { getTournamentTypeLabel } from "@/lib/mock/data";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { useState } from "react";

export default function TournamentManagementPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { getTournament, getTournamentTeams, startTournament, players, getPlayer, resetTournament, deletePlayer, deleteTeam, addPlayerToTeam, error, clearError } = useTournament();
    const { isOrganisateur, isAdmin, loading: authLoading } = useAuth();
    const canDeletePlayers = isOrganisateur || isAdmin;
    const tournament = getTournament(id);
    const [playerToDelete, setPlayerToDelete] = useState<{ id: string; name: string } | null>(null);
    const [teamToDelete, setTeamToDelete] = useState<{ id: string; name: string } | null>(null);
    const [completingTeamId, setCompletingTeamId] = useState<string | null>(null);
    const [teamSearchQuery, setTeamSearchQuery] = useState('');
    const [addingPlayerToTeam, setAddingPlayerToTeam] = useState(false);

    if (!tournament) {
        // Si pas trouvé dans le contexte (pas encore chargé ou n'existe pas), on peut gérer un loading ou notfound
        // Pour l'instant on suppose que le contexte est chargé ou vide
        return <div className="p-8 text-center">Chargement du tournoi ou tournoi introuvable... <Link href="/tournois" className="text-primary underline">Retour</Link></div>;
    }

    const teams = getTournamentTeams(tournament.id);

    const getRequiredTeamSize = (type: string): number => {
        switch (type) {
            case 'tete-a-tete': return 1;
            case 'doublettes': return 2;
            case 'triplettes': return 3;
            default: return 2;
        }
    };

    const requiredSize = getRequiredTeamSize(tournament.type);

    // Joueurs pas encore dans une équipe de ce tournoi
    const availablePlayers = players.filter(p => !tournament.participants.includes(p.id));

    // For team completion: players not in any team of this tournament
    const getPlayersAvailableForTeam = (teamId: string) => {
        const team = teams.find(t => t.id === teamId);
        const allTeamPlayerIds = teams.flatMap(t => t.playerIds);
        return players.filter(p =>
            !allTeamPlayerIds.includes(p.id) &&
            (!teamSearchQuery || `${p.firstName} ${p.lastName}`.toLowerCase().includes(teamSearchQuery.toLowerCase()))
        );
    };

    const handleStart = async () => {
        if (confirm("Lancer le tournoi ? Cela générera les matchs et bloquera les inscriptions.")) {
            await startTournament(tournament.id);
        }
    };

    const isStarted = tournament.status === 'ongoing' || tournament.status === 'completed';

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <Link
                        href={`/tournois/${tournament.id}`}
                        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-2 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Retour au détail
                    </Link>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        Gestion : {tournament.name}
                        <Badge variant="outline">{getTournamentTypeLabel(tournament.type)}</Badge>
                        {isStarted && <Badge variant="success">En cours</Badge>}
                    </h1>
                    <p className="text-muted-foreground">
                        {teams.length} équipes inscrites • {tournament.maxParticipants} max
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            if (confirm("Attention: Réinitialiser va effacer tous les matchs et scores !")) {
                                resetTournament(tournament.id);
                            }
                        }}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                        Reset (Debug)
                    </Button>
                    {!isStarted && (
                        <Button
                            className="gap-2 bg-green-600 hover:bg-green-700"
                            onClick={handleStart}
                            disabled={teams.length < 2}
                        >
                            <PlayCircle className="h-4 w-4" />
                            Lancer le tournoi
                        </Button>
                    )}
                </div>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
                    <strong className="font-bold">Erreur : </strong>
                    <span className="block sm:inline">{error}</span>
                    <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={clearError}>
                        <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Fermer</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z" /></svg>
                    </span>
                </div>
            )}

            {isStarted ? (
                <div className="mb-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Arbre de Compétition</CardTitle>
                            <CardDescription>Gérez les matchs et validez les scores</CardDescription>
                        </CardHeader>
                        <CardContent className="overflow-hidden">
                            <TournamentBracket tournamentId={tournament.id} />
                        </CardContent>
                    </Card>
                </div>
            ) : null}

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Main: Liste des équipes */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className={isStarted ? "opacity-75 pointer-events-none" : ""}>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Équipes inscrites</CardTitle>
                                <CardDescription>Gérez les équipes participantes</CardDescription>
                            </div>
                            {!isStarted && (
                                <TeamComposition
                                    tournamentId={tournament.id}
                                    type={tournament.type}
                                    availablePlayers={availablePlayers}
                                    onTeamCreated={() => { }}
                                />
                            )}
                        </CardHeader>
                        <CardContent>
                            {teams.length > 0 ? (
                                <div className="space-y-3">
                                    {teams.map((team, index) => {
                                        const isIncomplete = team.playerIds.length < requiredSize;
                                        const slotsRemaining = requiredSize - team.playerIds.length;
                                        const teamAvailablePlayers = getPlayersAvailableForTeam(team.id);

                                        return (
                                        <div key={team.id} className={`p-3 border rounded-lg transition-colors ${isIncomplete ? 'border-orange-300 bg-orange-50/50' : 'border-border bg-card hover:bg-muted/50'}`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex -space-x-2">
                                                        {team.playerIds.map(pid => {
                                                            const p = getPlayer(pid);
                                                            return p ? (
                                                                <Avatar
                                                                    key={pid}
                                                                    src={p.avatar}
                                                                    fallback={p.firstName[0]}
                                                                    className="border-2 border-background"
                                                                />
                                                            ) : null;
                                                        })}
                                                        {/* Empty slots */}
                                                        {Array.from({ length: slotsRemaining }).map((_, i) => (
                                                            <div key={`empty-${i}`} className="w-8 h-8 rounded-full border-2 border-dashed border-orange-300 bg-orange-50 flex items-center justify-center -ml-2 first:ml-0">
                                                                <UserPlus className="h-3 w-3 text-orange-400" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-semibold">
                                                                {team.name || `Équipe ${index + 1}`}
                                                            </h4>
                                                            {isIncomplete && (
                                                                <Badge className="bg-orange-500 text-white text-[10px] px-1.5 py-0">
                                                                    À compléter ({team.playerIds.length}/{requiredSize})
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-muted-foreground">
                                                            {team.playerIds.map(pid => getPlayer(pid)?.firstName).join(", ")}
                                                            {isIncomplete && <span className="text-orange-500"> • {slotsRemaining} place{slotsRemaining > 1 ? 's' : ''} restante{slotsRemaining > 1 ? 's' : ''}</span>}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {isIncomplete && !isStarted && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-orange-500 hover:text-orange-600 hover:bg-orange-50"
                                                            onClick={() => {
                                                                setCompletingTeamId(completingTeamId === team.id ? null : team.id);
                                                                setTeamSearchQuery('');
                                                            }}
                                                            title="Ajouter un joueur"
                                                        >
                                                            <UserPlus className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    <Button variant="ghost" size="icon">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                    {(canDeletePlayers || authLoading) && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setTeamToDelete({
                                                                    id: team.id,
                                                                    name: team.name || `Équipe ${index + 1}`
                                                                });
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Player search panel for team completion */}
                                            {completingTeamId === team.id && !isStarted && (
                                                <div className="mt-3 pt-3 border-t border-orange-200">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="relative flex-1">
                                                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                            <Input
                                                                placeholder="Rechercher un joueur à ajouter..."
                                                                className="pl-8 h-9"
                                                                value={teamSearchQuery}
                                                                onChange={(e) => setTeamSearchQuery(e.target.value)}
                                                                autoFocus
                                                            />
                                                        </div>
                                                        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setCompletingTeamId(null)}>
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                    <div className="max-h-48 overflow-y-auto space-y-1">
                                                        {teamAvailablePlayers.length > 0 ? (
                                                            teamAvailablePlayers.slice(0, 10).map(p => (
                                                                <button
                                                                    key={p.id}
                                                                    className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-orange-100/50 text-left transition-colors"
                                                                    disabled={addingPlayerToTeam}
                                                                    onClick={async () => {
                                                                        setAddingPlayerToTeam(true);
                                                                        try {
                                                                            await addPlayerToTeam(team.id, p.id);
                                                                            // Close if team is now full
                                                                            if (team.playerIds.length + 1 >= requiredSize) {
                                                                                setCompletingTeamId(null);
                                                                            }
                                                                        } catch (err) {
                                                                            console.error(err);
                                                                        } finally {
                                                                            setAddingPlayerToTeam(false);
                                                                        }
                                                                    }}
                                                                >
                                                                    <Avatar src={p.avatar} fallback={p.firstName[0]} size="sm" />
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm font-medium truncate">{p.firstName} {p.lastName}</p>
                                                                        <p className="text-xs text-muted-foreground truncate">{p.location?.city || ''}</p>
                                                                    </div>
                                                                    <UserPlus className="h-4 w-4 text-orange-500 shrink-0" />
                                                                </button>
                                                            ))
                                                        ) : (
                                                            <p className="text-sm text-muted-foreground text-center py-3">
                                                                Aucun joueur disponible
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
                                    <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                                    <h3 className="font-medium text-lg mb-1">Aucune équipe inscrite</h3>
                                    <p className="text-muted-foreground mb-4">Commencez par créer des équipes pour le tournoi</p>
                                    {!isStarted && (
                                        <TeamComposition
                                            tournamentId={tournament.id}
                                            type={tournament.type}
                                            availablePlayers={availablePlayers}
                                            onTeamCreated={() => { }}
                                        />
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar: Joueurs disponibles */}
                <div className="space-y-6">
                    <Card className={isStarted ? "opacity-75 pointer-events-none" : ""}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-lg">Joueurs disponibles</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="border border-border rounded-lg max-h-[500px] overflow-y-auto divide-y divide-border">
                                {availablePlayers.length > 0 ? (
                                    availablePlayers.map(player => (
                                        <div key={player.id} className="flex items-center gap-3 p-3 hover:bg-muted/50 group">
                                            <Avatar
                                                src={player.avatar}
                                                fallback={player.firstName[0]}
                                                size="sm"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="font-medium truncate">{player.firstName} {player.lastName}</p>
                                                <p className="text-xs text-muted-foreground truncate">{player.location?.city || ''}</p>
                                            </div>
                                            {(canDeletePlayers || authLoading) && (
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setPlayerToDelete({
                                                            id: player.id,
                                                            name: `${player.firstName} ${player.lastName}`
                                                        });
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 transition-all"
                                                    title="Supprimer le joueur"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                        Aucun joueur disponible. <br />Ajoutez-en un nouveau !
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
            {/* Delete Confirmation Dialog */}
            <Dialog open={!!playerToDelete} onOpenChange={(open) => !open && setPlayerToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmer la suppression</DialogTitle>
                        <DialogDescription>
                            Êtes-vous sûr de vouloir supprimer le joueur <strong>{playerToDelete?.name}</strong> ?
                            <br />
                            Cette action est irréversible.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setPlayerToDelete(null)}>
                            Annuler
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (playerToDelete) {
                                    deletePlayer(playerToDelete.id);
                                    setPlayerToDelete(null);
                                }
                            }}
                        >
                            Supprimer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* Team Delete Confirmation Dialog */}
            <Dialog open={!!teamToDelete} onOpenChange={(open) => !open && setTeamToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Supprimer l'équipe</DialogTitle>
                        <DialogDescription>
                            Êtes-vous sûr de vouloir supprimer l'équipe <strong>{teamToDelete?.name}</strong> ?
                            <br />
                            Les joueurs seront retirés de cette équipe mais resteront disponibles.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setTeamToDelete(null)}>
                            Annuler
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (teamToDelete) {
                                    deleteTeam(teamToDelete.id);
                                    setTeamToDelete(null);
                                }
                            }}
                        >
                            Supprimer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

