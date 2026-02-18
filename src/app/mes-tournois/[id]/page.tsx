"use client";

import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { useTournament } from "@/lib/context/TournamentContext";
import { useMemo, useEffect, useState } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    Trophy,
    Calendar,
    MapPin,
    Users,
    Swords,
    CheckCircle,
    Clock,
    AlertCircle,
    MessageCircle,
    GitBranch,
    ChevronUp,
    ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { formatDate, getTournamentTypeLabel } from "@/lib/mock/data";
import { TournamentBracket } from "@/components/tournois/TournamentBracket";

export default function PlayerTournamentDetailPage() {
    const params = useParams();
    const router = useRouter();
    const tournamentId = params.id as string;
    const { user: authUser, loading: authLoading } = useAuth();
    const {
        getTournament,
        getTournamentTeams,
        getTournamentMatches,
        getTeam,
        getPlayer,
        getPlayerByUserId,
        proposeMatchScore,
        teams,
        players,
    } = useTournament();

    const tournament = getTournament(tournamentId);
    const tournamentTeams = getTournamentTeams(tournamentId);
    const tournamentMatches = getTournamentMatches(tournamentId);

    // Redirect if not logged in
    useEffect(() => {
        if (!authLoading && !authUser) {
            router.push('/connexion');
        }
    }, [authUser, authLoading, router]);

    // Get player profile from auth user
    const playerProfile = useMemo(() => {
        if (!authUser) return null;
        return getPlayerByUserId(authUser.id);
    }, [authUser, getPlayerByUserId, players]);

    // Find player's team in this tournament (with email fallback)
    const myTeam = useMemo(() => {
        if (!authUser) return null;
        // 1. By player profile (userId match)
        if (playerProfile) {
            const teamByProfile = tournamentTeams.find(t => t.playerIds.includes(playerProfile.id));
            if (teamByProfile) return teamByProfile;
        }
        // 2. Fallback by email
        const userEmail = authUser.email?.toLowerCase();
        if (userEmail) {
            const allTeamPlayerIds = tournamentTeams.flatMap(t => t.playerIds);
            const matchingPlayer = players.find(p =>
                p.email?.toLowerCase() === userEmail && allTeamPlayerIds.includes(p.id)
            );
            if (matchingPlayer) {
                return tournamentTeams.find(t => t.playerIds.includes(matchingPlayer.id)) || null;
            }
        }
        return null;
    }, [authUser, playerProfile, tournamentTeams, players]);

    // Get all matches involving my team
    const myMatches = useMemo(() => {
        if (!myTeam) return [];
        return tournamentMatches
            .filter(m => m.team1Id === myTeam.id || m.team2Id === myTeam.id)
            .sort((a, b) => a.round - b.round);
    }, [myTeam, tournamentMatches]);

    // Find current/next match (first pending or ongoing match)
    const currentMatch = useMemo(() => {
        return myMatches.find(m => m.status === 'pending' || m.status === 'ongoing');
    }, [myMatches]);

    // Get opponent team for current match
    const currentOpponent = useMemo(() => {
        if (!currentMatch || !myTeam) return null;
        const opponentId = currentMatch.team1Id === myTeam.id ? currentMatch.team2Id : currentMatch.team1Id;
        return opponentId ? getTeam(opponentId) : null;
    }, [currentMatch, myTeam, getTeam]);

    // Calculate my position in tournament
    const myPosition = useMemo(() => {
        if (!myTeam || tournamentMatches.length === 0) return null;

        const completedMatches = myMatches.filter(m => m.status === 'completed');
        const wins = completedMatches.filter(m => m.winnerId === myTeam.id).length;
        const losses = completedMatches.filter(m => m.winnerId && m.winnerId !== myTeam.id).length;

        // Check if eliminated
        const isEliminated = losses > 0 && !currentMatch;

        // Check if won tournament
        const maxRound = Math.max(...tournamentMatches.map(m => m.round), 0);
        const finalMatch = tournamentMatches.find(m => m.round === maxRound);
        const isWinner = finalMatch?.status === 'completed' && finalMatch?.winnerId === myTeam.id;

        return { wins, losses, isEliminated, isWinner, currentRound: currentMatch?.round };
    }, [myTeam, myMatches, currentMatch, tournamentMatches]);

    // Score entry state
    const [ourScore, setOurScore] = useState(0);
    const [theirScore, setTheirScore] = useState(0);
    const [isSubmittingScore, setIsSubmittingScore] = useState(false);

    const handleSubmitScore = async () => {
        if (!currentMatch || !myTeam) return;
        setIsSubmittingScore(true);
        try {
            const isTeam1 = currentMatch.team1Id === myTeam.id;
            if (isTeam1) {
                await proposeMatchScore(currentMatch.id, myTeam.id, ourScore, theirScore);
            } else {
                await proposeMatchScore(currentMatch.id, myTeam.id, theirScore, ourScore);
            }
            alert("Score envoyé !");
        } catch (e) {
            console.error("Erreur envoi score:", e);
            alert("Erreur lors de l'envoi du score");
        } finally {
            setIsSubmittingScore(false);
        }
    };

    if (authLoading) {
        return (
            <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!authUser) return null;

    if (!tournament) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center py-12">
                    <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Tournoi non trouvé</h2>
                    <Link href="/mes-tournois">
                        <Button>Retour à mes tournois</Button>
                    </Link>
                </div>
            </div>
        );
    }

    if (!myTeam) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center py-12">
                    <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Vous n'êtes pas inscrit à ce tournoi</h2>
                    <Link href="/mes-tournois">
                        <Button>Retour à mes tournois</Button>
                    </Link>
                </div>
            </div>
        );
    }

    // Calculer le nombre total de rounds attendu basé sur le nombre d'équipes
    const expectedTotalRounds = tournamentTeams.length > 1 ? Math.ceil(Math.log2(tournamentTeams.length)) : 1;
    const maxRound = Math.max(...tournamentMatches.map(m => m.round), 0);

    const getRoundName = (round: number) => {
        // Utiliser expectedTotalRounds pour nommer correctement les rounds
        const totalRounds = Math.max(expectedTotalRounds, maxRound);
        const diff = totalRounds - round;
        if (diff === 0) return "Finale";
        if (diff === 1) return "Demi-finale";
        if (diff === 2) return "Quart de finale";
        return `Tour ${round} (Qualifications)`;
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            {/* Back button */}
            <Link
                href="/mon-profil"
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
            >
                <ArrowLeft className="h-4 w-4" />
                Retour à mon profil
            </Link>

            {/* Tournament Header */}
            <Card className="mb-6 overflow-hidden">
                {tournament.coverImage && (
                    <div className="h-32 bg-gradient-to-r from-primary/20 to-secondary/20">
                        <img
                            src={tournament.coverImage}
                            alt={tournament.name}
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}
                <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <h1 className="text-2xl font-bold">{tournament.name}</h1>
                                <Badge variant={tournament.status === 'ongoing' ? 'default' : 'outline'}>
                                    {tournament.status === 'ongoing' ? 'En cours' : 'À venir'}
                                </Badge>
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
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
                                    {getTournamentTypeLabel(tournament.type)}
                                </span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* My Status */}
            <Card className="mb-6 border-primary/50 bg-primary/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-primary" />
                        Mon équipe : {myTeam.name}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center mb-4">
                        <div>
                            <div className="text-2xl font-bold text-green-600">{myPosition?.wins || 0}</div>
                            <div className="text-sm text-muted-foreground">Victoires</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-red-500">{myPosition?.losses || 0}</div>
                            <div className="text-sm text-muted-foreground">Défaites</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-primary">
                                {myPosition?.isWinner ? '🏆' : myPosition?.isEliminated ? '❌' : myPosition?.currentRound !== undefined ? getRoundName(myPosition.currentRound) : '-'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                                {myPosition?.isWinner ? 'Champion' : myPosition?.isEliminated ? 'Éliminé' : 'Position'}
                            </div>
                        </div>
                    </div>

                    {/* Team members */}
                    <div className="flex items-center gap-2 pt-4 border-t">
                        <span className="text-sm text-muted-foreground">Membres :</span>
                        <div className="flex -space-x-2">
                            {myTeam.playerIds.map(playerId => {
                                const player = getPlayer(playerId);
                                return (
                                    <Avatar
                                        key={playerId}
                                        src={player?.avatar}
                                        fallback={player ? `${player.firstName[0]}${player.lastName[0]}` : '?'}
                                        size="sm"
                                        className="border-2 border-background"
                                    />
                                );
                            })}
                        </div>
                        <span className="text-sm">
                            {myTeam.playerIds.map(id => {
                                const p = getPlayer(id);
                                return p ? `${p.firstName} ${p.lastName}` : 'Inconnu';
                            }).join(', ')}
                        </span>
                    </div>
                </CardContent>
            </Card>

            {/* Current Match */}
            {currentMatch && currentOpponent && (() => {
                const isTeam1 = currentMatch.team1Id === myTeam.id;
                const isTeam2 = currentMatch.team2Id === myTeam.id;
                const alreadyValidated = (isTeam1 && currentMatch.team1Validated) || (isTeam2 && currentMatch.team2Validated);
                const canSubmitScore = (ourScore === 13 || theirScore === 13) && ourScore !== theirScore;

                return (
                    <Card id="match-en-cours" className="mb-6 border-2 border-orange-400 bg-orange-50 dark:bg-orange-950/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-orange-600">
                                <Swords className="h-5 w-5" />
                                Prochain match - {getRoundName(currentMatch.round)}
                            </CardTitle>
                            {currentMatch.terrainNumber && (
                                <div className="flex items-center gap-2 mt-2">
                                    <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 text-sm px-3 py-1 font-bold">
                                        <MapPin className="h-4 w-4 mr-1" />
                                        Terrain {currentMatch.terrainNumber}
                                    </Badge>
                                </div>
                            )}
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex-1 text-center">
                                    <div className="font-bold text-lg text-primary">{myTeam.name}</div>
                                    <div className="text-sm text-muted-foreground">Mon équipe</div>
                                </div>
                                <div className="px-4">
                                    <Badge variant="outline" className="text-lg px-4 py-2">VS</Badge>
                                </div>
                                <div className="flex-1 text-center">
                                    <div className="font-bold text-lg text-orange-600">{currentOpponent.name}</div>
                                    <div className="text-sm text-muted-foreground">Adversaire</div>
                                    <div className="flex justify-center -space-x-1 mt-2">
                                        {currentOpponent.playerIds.map(playerId => {
                                            const player = getPlayer(playerId);
                                            return (
                                                <Avatar
                                                    key={playerId}
                                                    src={player?.avatar}
                                                    fallback={player ? `${player.firstName[0]}${player.lastName[0]}` : '?'}
                                                    size="sm"
                                                    className="border-2 border-background"
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Score entry controls */}
                            {currentMatch.status === 'ongoing' && !alreadyValidated && (
                                <div className="border-t pt-4 mt-2">
                                    <div className="text-sm font-medium mb-3 text-center">Entrez vos scores :</div>
                                    <div className="grid grid-cols-2 gap-6 mb-4">
                                        {/* Our score */}
                                        <div className="flex flex-col items-center">
                                            <span className="text-xs font-bold text-primary mb-2">Nous</span>
                                            <div className="flex flex-col items-center bg-primary/10 rounded-xl p-2 w-20">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-10 w-10 p-0"
                                                    onClick={() => setOurScore(Math.min(13, ourScore + 1))}
                                                >
                                                    <ChevronUp className="h-6 w-6" />
                                                </Button>
                                                <span className="text-3xl font-black my-1">{ourScore}</span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-10 w-10 p-0"
                                                    onClick={() => setOurScore(Math.max(0, ourScore - 1))}
                                                >
                                                    <ChevronDown className="h-6 w-6" />
                                                </Button>
                                            </div>
                                        </div>
                                        {/* Their score */}
                                        <div className="flex flex-col items-center">
                                            <span className="text-xs font-bold text-orange-600 mb-2">Eux</span>
                                            <div className="flex flex-col items-center bg-orange-500/10 rounded-xl p-2 w-20">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-10 w-10 p-0"
                                                    onClick={() => setTheirScore(Math.min(13, theirScore + 1))}
                                                >
                                                    <ChevronUp className="h-6 w-6" />
                                                </Button>
                                                <span className="text-3xl font-black my-1">{theirScore}</span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-10 w-10 p-0"
                                                    onClick={() => setTheirScore(Math.max(0, theirScore - 1))}
                                                >
                                                    <ChevronDown className="h-6 w-6" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        className="w-full"
                                        disabled={!canSubmitScore || isSubmittingScore}
                                        onClick={handleSubmitScore}
                                    >
                                        {isSubmittingScore ? "Envoi..." : "Valider le score"}
                                    </Button>
                                    {!canSubmitScore && (ourScore > 0 || theirScore > 0) && (
                                        <p className="text-xs text-muted-foreground text-center mt-2">
                                            Le premier à 13 points gagne
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Already validated message */}
                            {currentMatch.status === 'ongoing' && alreadyValidated && (
                                <div className="border-t pt-4 mt-2">
                                    <div className="text-sm text-green-600 font-medium text-center py-2">
                                        Score validé - En attente de l&apos;autre équipe
                                    </div>
                                </div>
                            )}

                            {/* Chat button */}
                            <div className="flex justify-center pt-4 border-t mt-4">
                                <Link href={`/messages?matchId=${currentMatch.id}`}>
                                    <Button variant="outline" className="gap-2">
                                        <MessageCircle className="h-4 w-4" />
                                        Contacter l&apos;équipe adverse
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                );
            })()}

            {/* My Match History */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-primary" />
                        Mon parcours
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {myMatches.length > 0 ? (
                        <div className="space-y-3">
                            {myMatches.map((match) => {
                                const opponentId = match.team1Id === myTeam.id ? match.team2Id : match.team1Id;
                                const opponent = opponentId ? getTeam(opponentId) : null;
                                const isWin = match.winnerId === myTeam.id;
                                const isLoss = match.winnerId && match.winnerId !== myTeam.id;
                                const myScore = match.team1Id === myTeam.id ? match.score1 : match.score2;
                                const opponentScore = match.team1Id === myTeam.id ? match.score2 : match.score1;

                                return (
                                    <div
                                        key={match.id}
                                        className={`flex items-center gap-4 p-3 rounded-lg ${match.status === 'completed'
                                                ? isWin
                                                    ? 'bg-green-50 dark:bg-green-950/20'
                                                    : 'bg-red-50 dark:bg-red-950/20'
                                                : match === currentMatch
                                                    ? 'bg-orange-50 dark:bg-orange-950/20 ring-2 ring-orange-400'
                                                    : 'bg-muted/50'
                                            }`}
                                    >
                                        <div className="w-24 text-sm font-medium text-muted-foreground">
                                            {getRoundName(match.round)}
                                        </div>
                                        <div className="flex-1">
                                            <span className="font-medium">{myTeam.name}</span>
                                            <span className="text-muted-foreground"> vs </span>
                                            <span className="font-medium">{opponent?.name || 'En attente'}</span>
                                        </div>
                                        {match.status === 'completed' ? (
                                            <div className="flex items-center gap-2">
                                                <span className={`font-bold ${isWin ? 'text-green-600' : 'text-red-500'}`}>
                                                    {myScore} - {opponentScore}
                                                </span>
                                                {isWin ? (
                                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                                ) : (
                                                    <AlertCircle className="h-5 w-5 text-red-500" />
                                                )}
                                            </div>
                                        ) : match === currentMatch ? (
                                            <Badge variant="outline" className="bg-orange-100 text-orange-600">
                                                À jouer
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline">En attente</Badge>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-center py-4">
                            Le tournoi n'a pas encore commencé
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Tournament Bracket */}
            {tournament.status !== 'upcoming' && tournamentMatches.length > 0 && (
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <GitBranch className="h-5 w-5 text-primary" />
                            Arbre du tournoi
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <TournamentBracket tournamentId={tournamentId} />
                    </CardContent>
                </Card>
            )}

            {/* All Teams */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        Équipes participantes ({tournamentTeams.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-3">
                        {tournamentTeams.map((team) => {
                            const isMyTeam = team.id === myTeam.id;
                            const isCurrentOpponent = team.id === currentOpponent?.id;

                            return (
                                <div
                                    key={team.id}
                                    className={`flex items-center gap-3 p-3 rounded-lg ${isMyTeam
                                            ? 'bg-primary/10 ring-2 ring-primary'
                                            : isCurrentOpponent
                                                ? 'bg-orange-100 dark:bg-orange-950/30 ring-2 ring-orange-400'
                                                : 'bg-muted/30'
                                        }`}
                                >
                                    <div className="flex -space-x-2">
                                        {team.playerIds.map(playerId => {
                                            const player = getPlayer(playerId);
                                            return (
                                                <Avatar
                                                    key={playerId}
                                                    src={player?.avatar}
                                                    fallback={player ? `${player.firstName[0]}${player.lastName[0]}` : '?'}
                                                    size="sm"
                                                    className="border-2 border-background"
                                                />
                                            );
                                        })}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-medium flex items-center gap-2">
                                            {team.name}
                                            {isMyTeam && (
                                                <Badge variant="default" className="text-xs">Mon équipe</Badge>
                                            )}
                                            {isCurrentOpponent && (
                                                <Badge variant="outline" className="text-xs bg-orange-100 text-orange-600">
                                                    Prochain adversaire
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {team.playerIds.map(id => {
                                                const p = getPlayer(id);
                                                return p ? `${p.firstName} ${p.lastName}` : 'Inconnu';
                                            }).join(', ')}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
