"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Trophy,
    Calendar,
    MapPin,
    Users,
    ChevronRight,
    Medal,
    Clock,
    CheckCircle,
    AlertCircle,
    Swords,
    Shuffle,
    UserPlus,
    QrCode,
    Search,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/lib/context/AuthContext";
import { useTournament } from "@/lib/context/TournamentContext";
import { formatDate, getTournamentTypeLabel } from "@/lib/mock/data";
import { getMobileUrl } from "@/lib/utils/getMobileUrl";
import { Tournament, League } from "@/types";

function getRequiredTeamSize(type: string): number {
    switch (type) {
        case 'tete-a-tete': return 1;
        case 'doublettes': return 2;
        case 'triplettes': return 3;
        default: return 2;
    }
}

interface PlayerTournament {
    tournament: Tournament;
    teamId: string;
    teamName?: string;
    teamPlayerIds: string[];
    currentMatch?: {
        id: string;
        round: number;
        opponentTeamName?: string;
        score1?: number;
        score2?: number;
        status: string;
    };
    finalPosition?: number;
}

export default function MesTournoisPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { tournaments, teams, matches, leagues, leagueMatches, players, getPlayerByUserId, getTeam, getPlayer, addPlayerToTeam } = useTournament();

    const [playerTournaments, setPlayerTournaments] = useState<PlayerTournament[]>([]);
    const [playerLeagues, setPlayerLeagues] = useState<League[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchOpen, setSearchOpen] = useState<string | null>(null); // teamId when open
    const [searchQuery, setSearchQuery] = useState('');
    const [addingPlayer, setAddingPlayer] = useState(false);

    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            router.push('/connexion?redirect=/mes-tournois');
            return;
        }

        // Find player linked to this user
        const player = getPlayerByUserId(user.id);

        if (!player) {
            setPlayerTournaments([]);
            setPlayerLeagues([]);
            setLoading(false);
            return;
        }

        // Find leagues containing this player
        const myLeagues = leagues.filter(l =>
            l.participant_ids?.includes(player.id)
        );
        setPlayerLeagues(myLeagues);

        // Find teams containing this player
        const playerTeams = teams.filter(t => t.playerIds.includes(player.id));

        // Find tournaments for these teams
        const tournamentData: PlayerTournament[] = playerTeams.map(team => {
            const tournament = tournaments.find(t => t.id === team.tournamentId);
            if (!tournament) return null;

            // Find current match for this team
            const teamMatches = matches.filter(
                m => m.tournamentId === tournament.id &&
                    (m.team1Id === team.id || m.team2Id === team.id)
            ).sort((a, b) => b.round - a.round);

            let currentMatch = undefined;
            let finalPosition = undefined;

            if (tournament.status === 'ongoing') {
                // Find ongoing or latest match
                const ongoingMatch = teamMatches.find(m => m.status === 'ongoing');
                const latestMatch = teamMatches[0];
                const matchToShow = ongoingMatch || latestMatch;

                if (matchToShow) {
                    const opponentTeamId = matchToShow.team1Id === team.id
                        ? matchToShow.team2Id
                        : matchToShow.team1Id;
                    const opponentTeam = opponentTeamId ? getTeam(opponentTeamId) : undefined;

                    // Get opponent team name
                    let opponentTeamName = opponentTeam?.name;
                    if (!opponentTeamName && opponentTeam) {
                        const firstPlayer = opponentTeam.playerIds[0] ? getPlayer(opponentTeam.playerIds[0]) : undefined;
                        opponentTeamName = firstPlayer ? `${firstPlayer.firstName} ${firstPlayer.lastName}` : 'Équipe adverse';
                    }

                    currentMatch = {
                        id: matchToShow.id,
                        round: matchToShow.round,
                        opponentTeamName,
                        score1: matchToShow.team1Id === team.id ? matchToShow.score1 : matchToShow.score2,
                        score2: matchToShow.team1Id === team.id ? matchToShow.score2 : matchToShow.score1,
                        status: matchToShow.status,
                    };
                }
            } else if (tournament.status === 'completed') {
                // Calculate final position
                const lastMatch = teamMatches[0];
                if (lastMatch) {
                    if (lastMatch.winnerId === team.id) {
                        // Check if this was the final
                        const allTournamentMatches = matches.filter(m => m.tournamentId === tournament.id);
                        const maxRound = Math.max(...allTournamentMatches.map(m => m.round));
                        if (lastMatch.round === maxRound) {
                            finalPosition = 1; // Winner
                        } else {
                            // Estimate position based on round eliminated
                            finalPosition = Math.pow(2, maxRound - lastMatch.round) + 1;
                        }
                    } else {
                        // Lost their last match
                        const allTournamentMatches = matches.filter(m => m.tournamentId === tournament.id);
                        const maxRound = Math.max(...allTournamentMatches.map(m => m.round));
                        if (lastMatch.round === maxRound) {
                            finalPosition = 2; // Finalist
                        } else {
                            finalPosition = Math.pow(2, maxRound - lastMatch.round + 1);
                        }
                    }
                }
            }

            return {
                tournament,
                teamId: team.id,
                teamName: team.name,
                teamPlayerIds: team.playerIds,
                currentMatch,
                finalPosition,
            };
        }).filter(Boolean) as PlayerTournament[];

        // Deduplicate by tournament ID (keep last team entry)
        const seen = new Set<string>();
        const deduped: PlayerTournament[] = [];
        for (const pt of tournamentData.reverse()) {
            if (!seen.has(pt.tournament.id)) {
                seen.add(pt.tournament.id);
                deduped.push(pt);
            }
        }

        setPlayerTournaments(deduped.reverse());
        setLoading(false);
    }, [user, authLoading, tournaments, teams, matches, leagues, leagueMatches, getPlayerByUserId, getTeam, getPlayer, router]);

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Chargement...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return null; // Will redirect
    }

    const upcomingTournaments = playerTournaments.filter(pt => pt.tournament.status === 'upcoming');
    const ongoingTournaments = playerTournaments.filter(pt => pt.tournament.status === 'ongoing');
    const completedTournaments = playerTournaments.filter(pt => pt.tournament.status === 'completed');

    const getPositionLabel = (position: number) => {
        if (position === 1) return '1er';
        if (position === 2) return '2ème';
        if (position === 3) return '3ème';
        return `${position}ème`;
    };

    const getPositionIcon = (position: number) => {
        if (position === 1) return '🥇';
        if (position === 2) return '🥈';
        if (position === 3) return '🥉';
        return '🏅';
    };

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">Mes Tournois</h1>
                <p className="text-muted-foreground">
                    Suivez vos inscriptions et votre progression
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Trophy className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{playerTournaments.length + playerLeagues.length}</p>
                                <p className="text-xs text-muted-foreground">Total</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <Swords className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{playerLeagues.length}</p>
                                <p className="text-xs text-muted-foreground">Ligues</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-100 rounded-lg">
                                <Swords className="h-5 w-5 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{ongoingTournaments.length}</p>
                                <p className="text-xs text-muted-foreground">En cours</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{completedTournaments.length}</p>
                                <p className="text-xs text-muted-foreground">Terminés</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {playerTournaments.length === 0 && playerLeagues.length === 0 ? (
                <Card className="text-center py-12">
                    <CardContent>
                        <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-xl font-semibold mb-2">Aucun tournoi</h3>
                        <p className="text-muted-foreground mb-6">
                            Vous n&apos;êtes inscrit à aucun tournoi ou ligue pour le moment.
                        </p>
                        <Link href="/tournois">
                            <Button>Découvrir les tournois</Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-8">
                    {/* Ongoing Tournaments */}
                    {ongoingTournaments.length > 0 && (
                        <section>
                            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                <Swords className="h-5 w-5 text-orange-500" />
                                En cours
                            </h2>
                            <div className="grid gap-4">
                                {ongoingTournaments.map(({ tournament, teamId, teamName, currentMatch }) => (
                                    <Link key={teamId} href={`/mes-tournois/${tournament.id}`}>
                                        <Card className="hover:shadow-lg transition-all cursor-pointer border-orange-200 bg-orange-50/50">
                                            <CardContent className="py-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Badge variant="warning">En cours</Badge>
                                                            <Badge variant="outline">{getTournamentTypeLabel(tournament.type)}</Badge>
                                                        </div>
                                                        <h3 className="font-semibold text-lg mb-1">{tournament.name}</h3>
                                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                            <span className="flex items-center gap-1">
                                                                <Calendar className="h-4 w-4" />
                                                                {formatDate(tournament.date)}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <MapPin className="h-4 w-4" />
                                                                {tournament.location.city}
                                                            </span>
                                                        </div>
                                                        {teamName && (
                                                            <p className="text-sm text-muted-foreground mt-1">
                                                                <Users className="h-4 w-4 inline mr-1" />
                                                                {teamName}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="text-right">
                                                        {currentMatch && (
                                                            <div className="bg-white rounded-lg p-3 border">
                                                                <p className="text-xs text-muted-foreground mb-1">
                                                                    {currentMatch.status === 'ongoing' ? 'Match en cours' : 'Dernier match'}
                                                                </p>
                                                                <p className="font-medium text-sm">
                                                                    vs {currentMatch.opponentTeamName || 'Adversaire'}
                                                                </p>
                                                                {currentMatch.score1 !== undefined && (
                                                                    <p className="text-lg font-bold text-primary">
                                                                        {currentMatch.score1} - {currentMatch.score2}
                                                                    </p>
                                                                )}
                                                                <p className="text-xs text-muted-foreground">
                                                                    Niveau {currentMatch.round}
                                                                </p>
                                                            </div>
                                                        )}
                                                        <ChevronRight className="h-5 w-5 text-muted-foreground mt-2 ml-auto" />
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Upcoming Tournaments */}
                    {upcomingTournaments.length > 0 && (
                        <section>
                            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                <Clock className="h-5 w-5 text-blue-500" />
                                À venir
                            </h2>
                            <div className="grid gap-4">
                                {upcomingTournaments.map(({ tournament, teamId, teamName, teamPlayerIds }) => {
                                    const requiredSize = getRequiredTeamSize(tournament.type);
                                    const isTeamIncomplete = teamPlayerIds.length < requiredSize;
                                    const slotsRemaining = requiredSize - teamPlayerIds.length;

                                    // Available players for search (not already in this tournament)
                                    const availableForTeam = players.filter(p =>
                                        !tournament.participants.includes(p.id) &&
                                        !teamPlayerIds.includes(p.id)
                                    );
                                    const filteredPlayers = searchOpen === teamId && searchQuery
                                        ? availableForTeam.filter(p =>
                                            `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
                                        )
                                        : availableForTeam;

                                    return (
                                        <Card key={teamId} className={`transition-all ${isTeamIncomplete ? 'border-orange-300 bg-orange-50/30' : ''}`}>
                                            <CardContent className="py-4">
                                                <Link href={`/mes-tournois/${tournament.id}`}>
                                                    <div className="flex items-center justify-between cursor-pointer hover:opacity-80">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                {isTeamIncomplete ? (
                                                                    <Badge className="bg-orange-500 text-white">À compléter</Badge>
                                                                ) : (
                                                                    <Badge variant="success">Inscrit</Badge>
                                                                )}
                                                                <Badge variant="outline">{getTournamentTypeLabel(tournament.type)}</Badge>
                                                            </div>
                                                            <h3 className="font-semibold text-lg mb-1">{tournament.name}</h3>
                                                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                                <span className="flex items-center gap-1">
                                                                    <Calendar className="h-4 w-4" />
                                                                    {formatDate(tournament.date)}
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <MapPin className="h-4 w-4" />
                                                                    {tournament.location.city}
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <Users className="h-4 w-4" />
                                                                    {tournament.participants.length}/{tournament.maxParticipants}
                                                                </span>
                                                            </div>
                                                            {teamName && (
                                                                <p className="text-sm text-muted-foreground mt-1">
                                                                    Équipe: {teamName} ({teamPlayerIds.length}/{requiredSize})
                                                                </p>
                                                            )}
                                                        </div>
                                                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                                    </div>
                                                </Link>

                                                {/* Team completion section for incomplete teams */}
                                                {isTeamIncomplete && (
                                                    <div className="mt-4 pt-4 border-t border-orange-200">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <UserPlus className="h-4 w-4 text-orange-500" />
                                                            <span className="text-sm font-medium text-orange-700">
                                                                {slotsRemaining} joueur{slotsRemaining > 1 ? 's' : ''} manquant{slotsRemaining > 1 ? 's' : ''}
                                                            </span>
                                                        </div>

                                                        {/* Current team members */}
                                                        <div className="flex items-center gap-2 mb-3">
                                                            {teamPlayerIds.map(pid => {
                                                                const p = getPlayer(pid);
                                                                return p ? (
                                                                    <div key={pid} className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-full border text-xs">
                                                                        <Avatar src={p.avatar} fallback={p.firstName[0]} size="sm" />
                                                                        <span>{p.firstName}</span>
                                                                    </div>
                                                                ) : null;
                                                            })}
                                                            {Array.from({ length: slotsRemaining }).map((_, i) => (
                                                                <div key={`empty-${i}`} className="flex items-center gap-1.5 px-2 py-1 rounded-full border-2 border-dashed border-orange-300 text-xs text-orange-500">
                                                                    <UserPlus className="h-3 w-3" />
                                                                    <span>?</span>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        <div className="flex gap-2">
                                                            {/* QR Code button */}
                                                            <a
                                                                href={getMobileUrl(`/tournois/${tournament.id}/rejoindre/${teamId}`)}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <div className="w-14 h-14 rounded-lg bg-white p-1 flex items-center justify-center shadow-sm border cursor-pointer hover:shadow-md transition-shadow">
                                                                    <img
                                                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=50x50&data=${encodeURIComponent(getMobileUrl(`/tournois/${tournament.id}/rejoindre/${teamId}`))}`}
                                                                        alt="QR Code"
                                                                        className="w-12 h-12"
                                                                    />
                                                                </div>
                                                            </a>

                                                            {/* Search player button */}
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="gap-2 border-orange-300 text-orange-700 hover:bg-orange-100"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    setSearchOpen(searchOpen === teamId ? null : teamId);
                                                                    setSearchQuery('');
                                                                }}
                                                            >
                                                                <Search className="h-4 w-4" />
                                                                Chercher un joueur
                                                            </Button>
                                                        </div>

                                                        {/* Player search panel */}
                                                        {searchOpen === teamId && (
                                                            <div className="mt-3 p-3 bg-white rounded-lg border border-orange-200" onClick={(e) => e.stopPropagation()}>
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <div className="relative flex-1">
                                                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                                        <Input
                                                                            placeholder="Rechercher un joueur..."
                                                                            className="pl-8 h-9"
                                                                            value={searchQuery}
                                                                            onChange={(e) => setSearchQuery(e.target.value)}
                                                                            autoFocus
                                                                        />
                                                                    </div>
                                                                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setSearchOpen(null)}>
                                                                        <X className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                                <div className="max-h-48 overflow-y-auto space-y-1">
                                                                    {filteredPlayers.length > 0 ? (
                                                                        filteredPlayers.slice(0, 10).map(p => (
                                                                            <button
                                                                                key={p.id}
                                                                                className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 text-left transition-colors"
                                                                                disabled={addingPlayer}
                                                                                onClick={async () => {
                                                                                    setAddingPlayer(true);
                                                                                    try {
                                                                                        await addPlayerToTeam(teamId, p.id);
                                                                                        setSearchOpen(null);
                                                                                    } catch (err) {
                                                                                        console.error(err);
                                                                                    } finally {
                                                                                        setAddingPlayer(false);
                                                                                    }
                                                                                }}
                                                                            >
                                                                                <Avatar src={p.avatar} fallback={p.firstName[0]} size="sm" />
                                                                                <div className="flex-1 min-w-0">
                                                                                    <p className="text-sm font-medium truncate">{p.firstName} {p.lastName}</p>
                                                                                    <p className="text-xs text-muted-foreground truncate">{p.location?.city || ''}</p>
                                                                                </div>
                                                                                <UserPlus className="h-4 w-4 text-primary shrink-0" />
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
                                                )}
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* Completed Tournaments */}
                    {completedTournaments.length > 0 && (
                        <section>
                            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                <Medal className="h-5 w-5 text-green-500" />
                                Terminés
                            </h2>
                            <div className="grid gap-4">
                                {completedTournaments.map(({ tournament, teamId, teamName, finalPosition }) => (
                                    <Link key={teamId} href={`/mes-tournois/${tournament.id}`}>
                                        <Card className="hover:shadow-lg transition-all cursor-pointer">
                                            <CardContent className="py-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Badge variant="secondary">Terminé</Badge>
                                                            <Badge variant="outline">{getTournamentTypeLabel(tournament.type)}</Badge>
                                                        </div>
                                                        <h3 className="font-semibold text-lg mb-1">{tournament.name}</h3>
                                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                            <span className="flex items-center gap-1">
                                                                <Calendar className="h-4 w-4" />
                                                                {formatDate(tournament.date)}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <MapPin className="h-4 w-4" />
                                                                {tournament.location.city}
                                                            </span>
                                                        </div>
                                                        {teamName && (
                                                            <p className="text-sm text-muted-foreground mt-1">
                                                                Équipe: {teamName}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="text-right">
                                                        {finalPosition && (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-2xl">{getPositionIcon(finalPosition)}</span>
                                                                <div>
                                                                    <p className="font-bold text-lg">{getPositionLabel(finalPosition)}</p>
                                                                    <p className="text-xs text-muted-foreground">place</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                        <ChevronRight className="h-5 w-5 text-muted-foreground mt-2 ml-auto" />
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Leagues */}
                    {playerLeagues.length > 0 && (
                        <section>
                            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                <Swords className="h-5 w-5 text-purple-500" />
                                Mes Ligues entre amis
                            </h2>
                            <div className="grid gap-4">
                                {playerLeagues.map(league => {
                                    const matchCount = leagueMatches.filter(m => m.league_id === league.id).length;
                                    const completedCount = leagueMatches.filter(m => m.league_id === league.id && m.status === 'completed').length;
                                    const isExpired = league.end_date && new Date(league.end_date) < new Date();

                                    return (
                                        <Link key={league.id} href={`/tournois/ligue/${league.id}`}>
                                            <Card className="hover:shadow-lg transition-all cursor-pointer border-purple-200 bg-purple-50/50">
                                                <CardContent className="py-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                {isExpired ? (
                                                                    <Badge variant="secondary">Terminée</Badge>
                                                                ) : (
                                                                    <Badge className="bg-purple-600">Ligue</Badge>
                                                                )}
                                                                {league.mode === 'round_robin' ? (
                                                                    <Badge variant="outline" className="gap-1">
                                                                        <Shuffle className="h-3 w-3" />
                                                                        Tous contre tous
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="outline" className="gap-1">
                                                                        <Calendar className="h-3 w-3" />
                                                                        Sur durée
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <h3 className="font-semibold text-lg mb-1">{league.name}</h3>
                                                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                                <span className="flex items-center gap-1">
                                                                    <Users className="h-4 w-4" />
                                                                    {league.participant_ids?.length || 0} joueurs
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <Trophy className="h-4 w-4" />
                                                                    {completedCount}/{matchCount} matchs
                                                                </span>
                                                                {league.end_date && (
                                                                    <span className="flex items-center gap-1">
                                                                        <Clock className="h-4 w-4" />
                                                                        {isExpired ? 'Terminée' : `Fin ${new Date(league.end_date).toLocaleDateString('fr-FR')}`}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </Link>
                                    );
                                })}
                            </div>
                        </section>
                    )}
                </div>
            )}

            {/* CTA */}
            <div className="mt-8 text-center">
                <Link href="/tournois">
                    <Button variant="outline" className="gap-2">
                        <Trophy className="h-4 w-4" />
                        Découvrir d&apos;autres tournois
                    </Button>
                </Link>
            </div>
        </div>
    );
}
