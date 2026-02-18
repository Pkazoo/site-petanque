"use client";

import Link from "next/link";
import { Plus, Search, Filter, Calendar, MapPin, Users, Trophy, Trash2, Shuffle, Lock, Award } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/Dialog";
import {
    formatDate,
    getTournamentTypeLabel,
} from "@/lib/mock/data";
import { useTournament } from "@/lib/context/TournamentContext";
import { useAuth } from "@/lib/context/AuthContext";
import { useState } from "react";

export default function TournoisPage() {
    const { tournaments, leagues, leagueMatches, getPlayer, getPlayerByUserId, deleteLeague, deleteTournament } = useTournament();
    const { user, isOrganisateur, isAdmin } = useAuth();
    const [activeTab, setActiveTab] = useState<'tournois' | 'nationaux' | 'ligues'>('tournois');
    const [deletingLeagueId, setDeletingLeagueId] = useState<string | null>(null);
    const [deletingTournamentId, setDeletingTournamentId] = useState<string | null>(null);

    const currentPlayer = user ? getPlayerByUserId(user.id) : null;

    // Tournois nationaux (officiels) - visibles par tous
    const officialTournaments = tournaments
        .filter(t => t.is_official)
        .sort((a, b) => a.date.getTime() - b.date.getTime());

    // Filtrer les tournois non-officiels selon le rôle
    const filteredTournaments = isAdmin
        ? tournaments.filter(t => !t.is_official)
        : isOrganisateur
            ? tournaments.filter(t => !t.is_official && t.organizerId === user?.id)
            : user && currentPlayer
                ? tournaments.filter(t =>
                    !t.is_official && (
                        t.participants.includes(currentPlayer.id) ||
                        t.organizerId === user.id
                    )
                )
                : [];

    // Filtrer les ligues selon le rôle
    const filteredLeagues = isAdmin
        ? leagues
        : isOrganisateur
            ? leagues.filter(l => l.created_by === user?.id)
            : user && currentPlayer
                ? leagues.filter(l =>
                    l.participant_ids?.includes(currentPlayer.id) ||
                    l.created_by === user.id
                )
                : [];

    // Peut supprimer : admin toujours, organisateur seulement ses propres ligues
    const canDeleteLeague = (leagueCreatedBy: string) => {
        if (isAdmin) return true;
        if (isOrganisateur && user?.id && leagueCreatedBy === user.id) return true;
        return false;
    };

    const canDeleteTournament = (organizerId: string) => {
        if (isAdmin) return true;
        if (isOrganisateur && user?.id && organizerId === user.id) return true;
        return false;
    };

    const handleDeleteTournament = async (e: React.MouseEvent, tournamentId: string, tournamentName: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm(`Supprimer le tournoi "${tournamentName}" ? Toutes les équipes et matchs associés seront également supprimés.`)) return;
        setDeletingTournamentId(tournamentId);
        try {
            await deleteTournament(tournamentId);
        } catch (err) {
            console.error("Error deleting tournament:", err);
            alert("Erreur lors de la suppression du tournoi.");
        } finally {
            setDeletingTournamentId(null);
        }
    };

    const handleDeleteLeague = async (e: React.MouseEvent, leagueId: string, leagueName: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm(`Supprimer la ligue "${leagueName}" ? Tous les matchs associés seront également supprimés.`)) return;
        setDeletingLeagueId(leagueId);
        try {
            await deleteLeague(leagueId);
        } catch (err) {
            console.error("Error deleting league:", err);
            alert("Erreur lors de la suppression de la ligue.");
        } finally {
            setDeletingLeagueId(null);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">
                        {isOrganisateur && !isAdmin ? "Mes Tournois" : "Tournois & Ligues"}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {isOrganisateur && !isAdmin
                            ? "Gérez vos tournois et suivez les inscriptions"
                            : "Découvrez les tournois et ligues entre amis"}
                    </p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button className="gap-2 w-full sm:w-auto">
                                <Plus className="h-4 w-4" />
                                Créer
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Que souhaitez-vous créer ?</DialogTitle>
                                <DialogDescription>
                                    Choisissez le type d&apos;organisation qui vous convient le mieux.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid grid-cols-1 gap-4 py-4">
                                <Link href="/tournois/creer">
                                    <Button variant="outline" className="w-full justify-start h-auto py-4 px-6 gap-4">
                                        <div className="bg-primary/10 p-2 rounded-full">
                                            <Calendar className="h-6 w-6 text-primary" />
                                        </div>
                                        <div className="text-left">
                                            <div className="font-semibold text-lg">Compétition</div>
                                            <div className="text-sm text-muted-foreground italic">Un tournoi ponctuel avec élimination.</div>
                                        </div>
                                    </Button>
                                </Link>
                                <Link href="/tournois/ligue/creer">
                                    <Button variant="outline" className="w-full justify-start h-auto py-4 px-6 gap-4">
                                        <div className="bg-secondary/10 p-2 rounded-full">
                                            <Users className="h-6 w-6 text-secondary" />
                                        </div>
                                        <div className="text-left">
                                            <div className="font-semibold text-lg">Ligue entre amis</div>
                                            <div className="text-sm text-muted-foreground italic">Un championnat à long terme avec classement.</div>
                                        </div>
                                    </Button>
                                </Link>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-muted p-1 rounded-lg w-fit">
                <button
                    onClick={() => setActiveTab('tournois')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'tournois'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <span className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Compétitions
                        {filteredTournaments.length > 0 && (
                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{filteredTournaments.length}</Badge>
                        )}
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('ligues')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'ligues'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <span className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Ligues entre amis
                        {filteredLeagues.length > 0 && (
                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{filteredLeagues.length}</Badge>
                        )}
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('nationaux')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'nationaux'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <span className="flex items-center gap-2">
                        <Award className="h-4 w-4" />
                        Tournois nationaux
                        {officialTournaments.length > 0 && (
                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{officialTournaments.length}</Badge>
                        )}
                    </span>
                </button>
            </div>

            {/* Tournaments Tab */}
            {activeTab === 'tournois' && (
                <>
                    {/* Filters */}
                    <Card className="mb-8">
                        <CardContent className="py-4">
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Rechercher un tournoi..."
                                        className="pl-10"
                                    />
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    <Button variant="outline" size="sm" className="gap-2">
                                        <Filter className="h-4 w-4" />
                                        Type
                                    </Button>
                                    <Button variant="outline" size="sm" className="gap-2">
                                        <Calendar className="h-4 w-4" />
                                        Date
                                    </Button>
                                    <Button variant="outline" size="sm" className="gap-2">
                                        <MapPin className="h-4 w-4" />
                                        Lieu
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Results count */}
                    <p className="text-sm text-muted-foreground mb-4">
                        {filteredTournaments.length} tournoi{filteredTournaments.length > 1 ? 's' : ''} trouvé{filteredTournaments.length > 1 ? 's' : ''}
                        {isOrganisateur && !isAdmin && " (mes tournois)"}
                    </p>

                    {/* Tournament Grid */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredTournaments.map((tournament) => {
                            const showDeleteTournament = canDeleteTournament(tournament.organizerId);
                            return (
                            <Link key={tournament.id} href={`/tournois/${tournament.id}`}>
                                <Card className={`h-full group hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden ${deletingTournamentId === tournament.id ? 'opacity-50' : ''}`}>
                                    {tournament.coverImage ? (
                                        <div className="relative h-44 overflow-hidden">
                                            <img
                                                src={tournament.coverImage}
                                                alt={tournament.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                            <div className="absolute bottom-3 left-3 right-3">
                                                <h3 className="text-lg font-semibold text-white line-clamp-1">
                                                    {tournament.name}
                                                </h3>
                                            </div>
                                            <div className="absolute top-3 right-3 flex gap-2">
                                                <Badge variant="secondary">
                                                    {getTournamentTypeLabel(tournament.type)}
                                                </Badge>
                                                {showDeleteTournament && (
                                                    <button
                                                        onClick={(e) => handleDeleteTournament(e, tournament.id, tournament.name)}
                                                        disabled={deletingTournamentId === tournament.id}
                                                        className="p-1.5 rounded-md bg-black/40 text-white/80 hover:text-white hover:bg-destructive/80 transition-colors"
                                                        title="Supprimer le tournoi"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <CardHeader>
                                            <div className="flex justify-between items-start gap-2">
                                                <CardTitle className="text-lg line-clamp-1">
                                                    {tournament.name}
                                                </CardTitle>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <Badge variant="secondary">
                                                        {getTournamentTypeLabel(tournament.type)}
                                                    </Badge>
                                                    {showDeleteTournament && (
                                                        <button
                                                            onClick={(e) => handleDeleteTournament(e, tournament.id, tournament.name)}
                                                            disabled={deletingTournamentId === tournament.id}
                                                            className="p-1.5 rounded-md text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
                                                            title="Supprimer le tournoi"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </CardHeader>
                                    )}
                                    <CardContent className={tournament.coverImage ? "pt-4" : ""}>
                                        <CardDescription className="line-clamp-2 mb-4">
                                            {tournament.description}
                                        </CardDescription>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Calendar className="h-4 w-4 text-primary shrink-0" />
                                                <span>{formatDate(tournament.date)}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <MapPin className="h-4 w-4 text-primary shrink-0" />
                                                <span className="truncate">
                                                    {tournament.location.address}, {tournament.location.city}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Users className="h-4 w-4 text-primary shrink-0" />
                                                <span>
                                                    {tournament.participants.length}/{tournament.maxParticipants}{" "}
                                                    participants
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                                            <div className="flex -space-x-2">
                                                {tournament.participants.slice(0, 4).map((pId) => {
                                                    const user = getPlayer(pId);
                                                    return user ? (
                                                        <Avatar
                                                            key={pId}
                                                            src={user.avatar}
                                                            fallback={`${user.firstName[0]}${user.lastName[0]}`}
                                                            size="sm"
                                                            className="border-2 border-background"
                                                        />
                                                    ) : null;
                                                })}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                        })}
                    </div>

                    {/* Empty state */}
                    {filteredTournaments.length === 0 && (
                        <Card className="py-16 text-center">
                            <CardContent>
                                <div className="text-6xl mb-4">🎯</div>
                                <h3 className="text-xl font-semibold text-foreground mb-2">
                                    {isOrganisateur && !isAdmin
                                        ? "Vous n'avez pas encore de tournoi"
                                        : "Aucun tournoi trouvé"}
                                </h3>
                                <p className="text-muted-foreground mb-6">
                                    {isOrganisateur && !isAdmin
                                        ? "Créez votre premier tournoi pour commencer"
                                        : "Modifiez vos filtres ou créez votre propre tournoi"}
                                </p>
                                <Link href="/tournois/creer">
                                    <Button className="gap-2">
                                        <Plus className="h-4 w-4" />
                                        Créer un tournoi
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}

            {/* Tournois Nationaux Tab */}
            {activeTab === 'nationaux' && (
                <>
                    <p className="text-sm text-muted-foreground mb-4">
                        {officialTournaments.length} tournoi{officialTournaments.length > 1 ? 's' : ''} nationau{officialTournaments.length > 1 ? 'x' : ''}
                    </p>

                    <div className="space-y-2">
                        {officialTournaments.map((tournament) => (
                            <Link key={tournament.id} href={`/tournois/${tournament.id}`}>
                                <Card className="group hover:shadow-md transition-all duration-200 cursor-pointer">
                                    <CardContent className="py-3 px-4">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-blue-600/10 p-2 rounded-lg shrink-0">
                                                <Award className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <h3 className="font-semibold text-foreground text-sm line-clamp-1">
                                                        {tournament.name}
                                                    </h3>
                                                    <Badge variant="secondary" className="text-[10px] shrink-0">
                                                        {getTournamentTypeLabel(tournament.type)}
                                                    </Badge>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3 text-blue-600" />
                                                        {formatDate(tournament.date)}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="h-3 w-3 text-blue-600" />
                                                        {tournament.location.city}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Users className="h-3 w-3 text-blue-600" />
                                                        {tournament.maxParticipants} places
                                                    </span>
                                                </div>
                                                {tournament.description && (
                                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                                        {tournament.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>

                    {officialTournaments.length === 0 && (
                        <Card className="py-16 text-center">
                            <CardContent>
                                <div className="text-6xl mb-4">🏆</div>
                                <h3 className="text-xl font-semibold text-foreground mb-2">
                                    Aucun tournoi national
                                </h3>
                                <p className="text-muted-foreground">
                                    Les tournois nationaux officiels apparaîtront ici.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}

            {/* Leagues Tab */}
            {activeTab === 'ligues' && (
                <>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredLeagues.map((league) => {
                            const matchCount = leagueMatches.filter(m => m.league_id === league.id).length;
                            const completedCount = leagueMatches.filter(m => m.league_id === league.id && m.status === 'completed').length;
                            const participantCount = league.participant_ids?.length || 0;
                            const showDelete = canDeleteLeague(league.created_by);
                            const isFrozen = league.mode === 'free' && league.end_date && new Date(league.end_date).getTime() < Date.now();
                            const isRoundRobinComplete = league.mode === 'round_robin' && matchCount > 0 && completedCount === matchCount;
                            const isClosed = isFrozen || isRoundRobinComplete;

                            return (
                                <Link key={league.id} href={`/tournois/ligue/${league.id}`}>
                                    <Card className={`h-full group hover:shadow-lg transition-all duration-300 cursor-pointer relative overflow-hidden ${deletingLeagueId === league.id ? 'opacity-50' : ''} ${isClosed ? 'opacity-60 grayscale bg-gray-300/60' : ''}`}>
                                        {isClosed && (
                                            <div className="absolute top-3 left-0 right-0 z-10 flex justify-center">
                                                <div className="bg-red-600 text-white text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                                                    <Lock className="h-3.5 w-3.5" />
                                                    Tournoi clos
                                                </div>
                                            </div>
                                        )}
                                        <CardHeader className={isClosed ? 'pt-12' : ''}>
                                            <div className="flex justify-between items-start gap-2">
                                                <CardTitle className="text-lg line-clamp-1">
                                                    {league.name}
                                                </CardTitle>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    {league.mode === 'round_robin' ? (
                                                        <Badge variant="default" className="gap-1 text-[10px]">
                                                            <Shuffle className="h-3 w-3" />
                                                            Tous vs tous
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="gap-1 text-[10px]">
                                                            <Calendar className="h-3 w-3" />
                                                            Durée
                                                        </Badge>
                                                    )}
                                                    {isFrozen && (
                                                        <Badge variant="destructive" className="gap-1 text-[10px]">
                                                            <Lock className="h-3 w-3" />
                                                        </Badge>
                                                    )}
                                                    {showDelete && (
                                                        <button
                                                            onClick={(e) => handleDeleteLeague(e, league.id, league.name)}
                                                            disabled={deletingLeagueId === league.id}
                                                            className="p-1.5 rounded-md text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
                                                            title="Supprimer la ligue"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <CardDescription className="line-clamp-2">
                                                {league.description || "Ligue entre amis"}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Users className="h-4 w-4 text-primary shrink-0" />
                                                    <span>{participantCount} participant{participantCount > 1 ? 's' : ''}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Trophy className="h-4 w-4 text-primary shrink-0" />
                                                    <span>{completedCount} match{completedCount > 1 ? 's' : ''} joué{completedCount > 1 ? 's' : ''}</span>
                                                    {matchCount > completedCount && (
                                                        <Badge variant="warning" className="text-[10px] h-5">
                                                            {matchCount - completedCount} en cours
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Calendar className="h-4 w-4 text-primary shrink-0" />
                                                    <span>Créée le {new Date(league.created_at).toLocaleDateString('fr-FR')}</span>
                                                </div>
                                            </div>
                                            <div className="flex -space-x-2 mt-4 pt-4 border-t border-border">
                                                {(league.participant_ids || []).slice(0, 6).map((pId) => {
                                                    const p = getPlayer(pId);
                                                    return p ? (
                                                        <Avatar
                                                            key={pId}
                                                            src={p.avatar}
                                                            fallback={p.firstName[0]}
                                                            size="sm"
                                                            className="border-2 border-background"
                                                        />
                                                    ) : null;
                                                })}
                                                {participantCount > 6 && (
                                                    <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium text-muted-foreground">
                                                        +{participantCount - 6}
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Empty state */}
                    {filteredLeagues.length === 0 && (
                        <Card className="py-16 text-center">
                            <CardContent>
                                <div className="text-6xl mb-4">👥</div>
                                <h3 className="text-xl font-semibold text-foreground mb-2">
                                    Aucune ligue pour le moment
                                </h3>
                                <p className="text-muted-foreground mb-6">
                                    Créez votre première ligue entre amis pour commencer à jouer !
                                </p>
                                <Link href="/tournois/ligue/creer">
                                    <Button className="gap-2">
                                        <Plus className="h-4 w-4" />
                                        Créer une ligue
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}
