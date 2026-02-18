"use client";

import { use, useMemo, useState } from "react";
import { useTournament } from "@/lib/context/TournamentContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trophy, History, Plus, AlertCircle, Play, Shuffle, Calendar, Clock, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/Dialog";
import { AddMatchForm } from "@/components/ligues/AddMatchForm";

function LeagueCountdown({ endDate }: { endDate: string }) {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) {
        return (
            <div className="flex items-center gap-2 text-destructive">
                <Lock className="h-4 w-4" />
                <span className="text-sm font-medium">Ligue terminée</span>
            </div>
        );
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    return (
        <div className="flex items-center gap-2 text-primary">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">
                {days > 0 ? `${days}j ${hours}h restantes` : `${hours}h restantes`}
            </span>
        </div>
    );
}

export default function LeagueDetailWrapper({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return <LeagueDetailClient id={id} />;
}

function LeagueDetailClient({ id }: { id: string }) {
    const { leagues, leagueMatches, players, getPlayer } = useTournament();
    const router = useRouter();
    const [dialogOpen, setDialogOpen] = useState(false);

    const league = useMemo(() => leagues.find(l => l.id === id), [leagues, id]);

    // Cache player lookups in a Map for O(1) access
    const playerMap = useMemo(() => {
        const map = new Map<string, ReturnType<typeof getPlayer>>();
        players.forEach(p => map.set(p.id, p));
        return map;
    }, [players]);

    const getCachedPlayer = (pid: string) => playerMap.get(pid);

    const matches = useMemo(() =>
        leagueMatches.filter(m => m.league_id === id)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
        [leagueMatches, id]);

    // Check if league is frozen (free mode with past end_date)
    const isLeagueFrozen = useMemo(() => {
        if (!league) return false;
        if (league.mode === 'free' && league.end_date) {
            return new Date(league.end_date).getTime() < Date.now();
        }
        return false;
    }, [league]);

    // Group matches by round for round_robin mode
    const matchesByRound = useMemo(() => {
        if (!league || league.mode !== 'round_robin') return null;
        const grouped = new Map<number, typeof matches>();
        matches.forEach(m => {
            const round = m.round_number ?? 0;
            if (!grouped.has(round)) grouped.set(round, []);
            grouped.get(round)!.push(m);
        });
        // Sort rounds ascending
        return Array.from(grouped.entries()).sort((a, b) => a[0] - b[0]);
    }, [league, matches]);

    // Can add new matches?
    const canAddMatch = league?.mode === 'free' && !isLeagueFrozen;

    // Calculate Rankings
    const rankings = useMemo(() => {
        if (!league || !league.participant_ids) return [];

        const statsMap = new Map<string, {
            playerId: string,
            points: number,
            played: number,
            won: number,
            lost: number,
            pointsScored: number,
            pointsConceded: number,
            diff: number
        }>();

        league.participant_ids.forEach(pId => {
            statsMap.set(pId, {
                playerId: pId,
                points: 0,
                played: 0,
                won: 0,
                lost: 0,
                pointsScored: 0,
                pointsConceded: 0,
                diff: 0
            });
        });

        matches.filter(m => m.status === 'completed').forEach(m => {
            const team1Won = (m.score1 || 0) > (m.score2 || 0);

            m.team1_player_ids.forEach(pId => {
                const stats = statsMap.get(pId);
                if (stats) {
                    stats.played += 1;
                    stats.pointsScored += (m.score1 || 0);
                    stats.pointsConceded += (m.score2 || 0);
                    if (team1Won) {
                        stats.won += 1;
                        stats.points += 3;
                    } else {
                        stats.lost += 1;
                    }
                }
            });

            m.team2_player_ids.forEach(pId => {
                const stats = statsMap.get(pId);
                if (stats) {
                    stats.played += 1;
                    stats.pointsScored += (m.score2 || 0);
                    stats.pointsConceded += (m.score1 || 0);
                    if (!team1Won) {
                        stats.won += 1;
                        stats.points += 3;
                    } else {
                        stats.lost += 1;
                    }
                }
            });
        });

        return Array.from(statsMap.values())
            .map(s => ({ ...s, diff: s.pointsScored - s.pointsConceded }))
            .sort((a, b) => {
                if (b.points !== a.points) return b.points - a.points;
                if (b.diff !== a.diff) return b.diff - a.diff;
                return b.pointsScored - a.pointsScored;
            });
    }, [league, matches]);

    if (!league) {
        return (
            <div className="container mx-auto px-4 py-12 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-semibold">Ligue introuvable</h2>
                <Link href="/tournois" className="text-primary hover:underline mt-4 inline-block">
                    Retour aux tournois
                </Link>
            </div>
        );
    }

    const formatType = (type: string) => {
        switch (type) {
            case 'tete-a-tete': return 'Tête-à-tête';
            case 'doublette': return 'Doublette';
            case 'triplettes': return 'Triplettes';
            default: return type;
        }
    };

    const handleMatchCreated = (matchId: string) => {
        setDialogOpen(false);
        router.push(`/tournois/ligue/match/${matchId}`);
    };

    const completedMatchCount = matches.filter(m => m.status === 'completed').length;
    const totalMatchCount = matches.length;

    return (
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-5xl">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:gap-4 mb-6 sm:mb-8">
                <div>
                    <Link
                        href="/tournois"
                        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Retour aux tournois
                    </Link>
                    <h1 className="text-xl sm:text-3xl font-bold text-foreground">{league.name}</h1>
                    <p className="text-sm text-muted-foreground mt-1">{league.description || "Ligue entre amis"}</p>
                    {/* Mode & Format Badges */}
                    <div className="flex items-center gap-1.5 sm:gap-2 mt-2 sm:mt-3 flex-wrap">
                        {league.mode === 'round_robin' ? (
                            <Badge variant="default" className="gap-1 text-[10px] sm:text-xs">
                                <Shuffle className="h-3 w-3" />
                                Tous contre tous
                            </Badge>
                        ) : (
                            <Badge variant="secondary" className="gap-1 text-[10px] sm:text-xs">
                                <Calendar className="h-3 w-3" />
                                Ligue sur durée
                            </Badge>
                        )}
                        {league.match_format && (
                            <Badge variant="outline" className="text-[10px] sm:text-xs">{formatType(league.match_format)}</Badge>
                        )}
                        {isLeagueFrozen && (
                            <Badge variant="destructive" className="gap-1 text-[10px] sm:text-xs">
                                <Lock className="h-3 w-3" />
                                Classement figé
                            </Badge>
                        )}
                    </div>
                </div>
                {canAddMatch && (
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2 w-full sm:w-auto">
                                <Plus className="h-4 w-4" />
                                Nouveau Match
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Enregistrer un match</DialogTitle>
                                <DialogDescription>
                                    Sélectionnez le format et composez les équipes. Vous pourrez ensuite marquer les points.
                                </DialogDescription>
                            </DialogHeader>
                            <AddMatchForm
                                league={league}
                                players={players}
                                onSuccess={handleMatchCreated}
                            />
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <div className="grid lg:grid-cols-3 gap-4 sm:gap-8">
                {/* Left: Rankings Table */}
                <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                    <Card>
                        <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
                            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                                <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                                Classement
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs sm:text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/50">
                                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-center font-medium w-8 sm:w-12">#</th>
                                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-medium">Joueur</th>
                                            <th className="px-1.5 sm:px-4 py-2 sm:py-3 text-right font-medium">Pts</th>
                                            <th className="px-1.5 sm:px-4 py-2 sm:py-3 text-right font-medium hidden sm:table-cell">J</th>
                                            <th className="px-1.5 sm:px-4 py-2 sm:py-3 text-right font-medium">G</th>
                                            <th className="px-1.5 sm:px-4 py-2 sm:py-3 text-right font-medium">P</th>
                                            <th className="px-1.5 sm:px-4 py-2 sm:py-3 text-right font-medium">Diff</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {rankings.map((stat, index) => {
                                            const p = getCachedPlayer(stat.playerId);
                                            return (
                                                <tr key={stat.playerId} className="hover:bg-muted/50 transition-colors">
                                                    <td className="px-2 sm:px-4 py-2 sm:py-3 font-semibold text-center">
                                                        {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                                                    </td>
                                                    <td className="px-2 sm:px-4 py-2 sm:py-3">
                                                        <div className="flex items-center gap-1.5 sm:gap-2">
                                                            <Avatar
                                                                src={p?.avatar}
                                                                fallback={p?.firstName[0] || "?"}
                                                                size="sm"
                                                            />
                                                            <span className="font-medium truncate max-w-[80px] sm:max-w-none">{p?.firstName} {p?.lastName[0]}.</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-1.5 sm:px-4 py-2 sm:py-3 text-right font-bold text-primary">{stat.points}</td>
                                                    <td className="px-1.5 sm:px-4 py-2 sm:py-3 text-right hidden sm:table-cell">{stat.played}</td>
                                                    <td className="px-1.5 sm:px-4 py-2 sm:py-3 text-right text-success">{stat.won}</td>
                                                    <td className="px-1.5 sm:px-4 py-2 sm:py-3 text-right text-destructive">{stat.lost}</td>
                                                    <td className="px-1.5 sm:px-4 py-2 sm:py-3 text-right font-mono text-muted-foreground">
                                                        {stat.diff > 0 ? `+${stat.diff}` : stat.diff}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {rankings.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-8 sm:py-12 text-center text-muted-foreground italic text-sm">
                                                    Aucun participant dans cette ligue.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Round-Robin: Matches grouped by round */}
                    {league.mode === 'round_robin' && matchesByRound && (
                        <div className="space-y-3 sm:space-y-4">
                            {matchesByRound.map(([round, roundMatches]) => (
                                <Card key={round}>
                                    <CardHeader className="pb-2 px-3 sm:px-6">
                                        <CardTitle className="text-sm flex items-center justify-between">
                                            <span>Tour {round}</span>
                                            <Badge variant={roundMatches.every(m => m.status === 'completed') ? 'secondary' : 'warning'} className="text-[10px]">
                                                {roundMatches.filter(m => m.status === 'completed').length}/{roundMatches.length} terminé{roundMatches.filter(m => m.status === 'completed').length > 1 ? 's' : ''}
                                            </Badge>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2 px-3 sm:px-6">
                                        {roundMatches.map(m => {
                                            const isInProgress = m.status === 'in_progress' || m.status === 'ongoing';
                                            return (
                                                <Link
                                                    key={m.id}
                                                    href={`/tournois/ligue/match/${m.id}`}
                                                    className="block p-2 sm:p-3 rounded-lg border bg-card hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-1.5 sm:gap-2">
                                                        {/* Team 1 */}
                                                        <div className="flex-1 min-w-0 overflow-hidden">
                                                            <div className="space-y-0.5 sm:space-y-1">
                                                                {m.team1_player_ids.map(pid => {
                                                                    const p = getCachedPlayer(pid);
                                                                    return (
                                                                        <div key={pid} className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                                                                            <Avatar src={p?.avatar} fallback={p?.firstName?.[0] || "?"} className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                                                                            <span className="text-[10px] sm:text-[11px] font-medium truncate">{p?.firstName}</span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>

                                                        {/* Score */}
                                                        <div className="flex flex-col items-center gap-0.5 sm:gap-1 shrink-0">
                                                            <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-muted rounded font-bold text-sm sm:text-base">
                                                                <span className={m.status === 'completed' && (m.score1 ?? 0) > (m.score2 ?? 0) ? 'text-green-600' : ''}>
                                                                    {m.score1 ?? 0}
                                                                </span>
                                                                <span className="text-muted-foreground text-[10px] sm:text-xs">-</span>
                                                                <span className={m.status === 'completed' && (m.score2 ?? 0) > (m.score1 ?? 0) ? 'text-green-600' : ''}>
                                                                    {m.score2 ?? 0}
                                                                </span>
                                                            </div>
                                                            {isInProgress && (
                                                                <span className="text-[9px] sm:text-[10px] text-primary flex items-center gap-0.5">
                                                                    <Play className="h-2 w-2 sm:h-2.5 sm:w-2.5" fill="currentColor" />
                                                                    Suivre
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Team 2 */}
                                                        <div className="flex-1 min-w-0 overflow-hidden">
                                                            <div className="space-y-0.5 sm:space-y-1">
                                                                {m.team2_player_ids.map(pid => {
                                                                    const p = getCachedPlayer(pid);
                                                                    return (
                                                                        <div key={pid} className="flex items-center gap-1 sm:gap-1.5 justify-end min-w-0">
                                                                            <span className="text-[10px] sm:text-[11px] font-medium truncate">{p?.firstName}</span>
                                                                            <Avatar src={p?.avatar} fallback={p?.firstName?.[0] || "?"} className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right: History & Info */}
                <div className="space-y-4 sm:space-y-6">
                    {/* Stats summary - horizontal on mobile, vertical on desktop */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-1">
                        <Card className="bg-primary/5 border-primary/20">
                            <CardContent className="p-3 sm:p-4 text-center lg:text-left">
                                <p className="text-[10px] sm:text-xs text-muted-foreground">Matchs joués</p>
                                <p className="text-lg sm:text-xl font-bold text-primary">{completedMatchCount}</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-muted/50">
                            <CardContent className="p-3 sm:p-4 text-center lg:text-left">
                                <p className="text-[10px] sm:text-xs text-muted-foreground">En cours</p>
                                <p className="text-lg sm:text-xl font-bold">{totalMatchCount - completedMatchCount}</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-muted/50">
                            <CardContent className="p-3 sm:p-4 text-center lg:text-left">
                                <p className="text-[10px] sm:text-xs text-muted-foreground">Participants</p>
                                <p className="text-lg sm:text-xl font-bold">{league.participant_ids?.length || 0}</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Countdown for free mode with end_date */}
                    {league.mode === 'free' && league.end_date && (
                        <Card className={isLeagueFrozen ? 'bg-destructive/5 border-destructive/20' : 'bg-primary/5 border-primary/20'}>
                            <CardContent className="p-3 sm:p-4">
                                <LeagueCountdown endDate={league.end_date} />
                                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 sm:mt-2">
                                    {isLeagueFrozen
                                        ? 'Le classement est figé. Aucun nouveau match ne peut être ajouté.'
                                        : `Fin prévue le ${new Date(league.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
                                    }
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Progress for round_robin */}
                    {league.mode === 'round_robin' && totalMatchCount > 0 && (
                        <Card className="bg-primary/5 border-primary/20">
                            <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium">Progression</span>
                                    <span className="text-primary font-bold">{completedMatchCount}/{totalMatchCount}</span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-2 sm:h-2.5 overflow-hidden">
                                    <div
                                        className="bg-primary h-2 sm:h-2.5 rounded-full transition-all duration-500"
                                        style={{ width: `${(completedMatchCount / totalMatchCount) * 100}%` }}
                                    />
                                </div>
                                {completedMatchCount === totalMatchCount && (
                                    <p className="text-xs text-primary font-medium">Tous les matchs sont terminés !</p>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Recent Matches (for free mode or as fallback) */}
                    {league.mode !== 'round_robin' && (
                        <Card>
                            <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
                                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                                    <History className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                                    Matchs récents
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 sm:space-y-4 px-3 sm:px-6">
                                {matches.slice(0, 5).map(m => {
                                    const isInProgress = m.status === 'in_progress' || m.status === 'ongoing';
                                    return (
                                        <Link
                                            key={m.id}
                                            href={`/tournois/ligue/match/${m.id}`}
                                            className="block p-2 sm:p-3 rounded-lg border bg-card hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
                                        >
                                            <div className="flex justify-between items-center mb-1.5 sm:mb-2">
                                                <div className="flex items-center gap-1 sm:gap-2">
                                                    <Badge variant={m.status === 'completed' ? 'secondary' : 'warning'} className="text-[9px] sm:text-[10px]">
                                                        {m.status === 'completed' ? 'Terminé' : 'En cours'}
                                                    </Badge>
                                                    <Badge variant="outline" className="text-[9px] sm:text-[10px]">
                                                        {formatType(m.type)}
                                                    </Badge>
                                                </div>
                                                <span className="text-[9px] sm:text-[10px] text-muted-foreground">
                                                    {new Date(m.created_at).toLocaleDateString('fr-FR')}
                                                </span>
                                            </div>

                                            {/* Teams with all players */}
                                            <div className="flex items-center gap-1.5 sm:gap-2">
                                                {/* Team 1 */}
                                                <div className="flex-1 min-w-0 overflow-hidden">
                                                    <div className="space-y-0.5 sm:space-y-1">
                                                        {m.team1_player_ids.map(pid => {
                                                            const p = getCachedPlayer(pid);
                                                            return (
                                                                <div key={pid} className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                                                                    <Avatar src={p?.avatar} fallback={p?.firstName?.[0] || "?"} className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                                                                    <span className="text-[10px] sm:text-[11px] font-medium truncate">{p?.firstName}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Score */}
                                                <div className="flex flex-col items-center gap-0.5 sm:gap-1 shrink-0">
                                                    <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-muted rounded font-bold text-sm sm:text-base">
                                                        <span className={m.status === 'completed' && (m.score1 ?? 0) > (m.score2 ?? 0) ? 'text-green-600' : ''}>
                                                            {m.score1 ?? 0}
                                                        </span>
                                                        <span className="text-muted-foreground text-[10px] sm:text-xs">-</span>
                                                        <span className={m.status === 'completed' && (m.score2 ?? 0) > (m.score1 ?? 0) ? 'text-green-600' : ''}>
                                                            {m.score2 ?? 0}
                                                        </span>
                                                    </div>
                                                    {isInProgress && (
                                                        <span className="text-[9px] sm:text-[10px] text-primary flex items-center gap-0.5">
                                                            <Play className="h-2 w-2 sm:h-2.5 sm:w-2.5" fill="currentColor" />
                                                            Suivre
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Team 2 */}
                                                <div className="flex-1 min-w-0 overflow-hidden">
                                                    <div className="space-y-0.5 sm:space-y-1">
                                                        {m.team2_player_ids.map(pid => {
                                                            const p = getCachedPlayer(pid);
                                                            return (
                                                                <div key={pid} className="flex items-center gap-1 sm:gap-1.5 justify-end min-w-0">
                                                                    <span className="text-[10px] sm:text-[11px] font-medium truncate">{p?.firstName}</span>
                                                                    <Avatar src={p?.avatar} fallback={p?.firstName?.[0] || "?"} className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                                {matches.length === 0 && (
                                    <p className="text-center text-sm text-muted-foreground py-4 italic">
                                        Aucun match enregistré.
                                    </p>
                                )}
                                {matches.length > 5 && (
                                    <Button variant="ghost" className="w-full text-xs">Voir tout l&apos;historique</Button>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Format info for round_robin */}
                    {league.mode === 'round_robin' && league.match_format && (
                        <Card className="bg-muted/30">
                            <CardContent className="p-3 sm:p-4 flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Format</span>
                                <span className="font-semibold">{formatType(league.match_format)}</span>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
