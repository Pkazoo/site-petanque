"use client";

import { use, useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useTournament } from "@/lib/context/TournamentContext";
import { useAuth } from "@/lib/context/AuthContext";
import Link from "next/link";
import { ArrowLeft, Minus, Plus, Trophy, Users, CheckCircle2, Circle, Lock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";

export default function MatchDetailWrapper({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return <MatchDetailClient id={id} />;
}

function MatchDetailClient({ id }: { id: string }) {
    const { leagueMatches, leagues, getPlayer, updateLeagueMatchScore, validateLeagueMatch } = useTournament();
    const { isOrganisateur } = useAuth();

    const match = useMemo(() => leagueMatches.find(m => m.id === id), [leagueMatches, id]);
    const league = useMemo(() => match ? leagues.find(l => l.id === match.league_id) : undefined, [match, leagues]);

    // Local scores for instant UI updates
    const [localScore1, setLocalScore1] = useState(0);
    const [localScore2, setLocalScore2] = useState(0);
    const [initialized, setInitialized] = useState(false);
    const [saving, setSaving] = useState(false);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Initialize local scores from match data
    useEffect(() => {
        if (match && !initialized) {
            setLocalScore1(match.score1 ?? 0);
            setLocalScore2(match.score2 ?? 0);
            setInitialized(true);
        }
    }, [match, initialized]);

    const isCompleted = match?.status === 'completed';

    // Check if the league is frozen (free mode with past end_date)
    const isLeagueFrozen = useMemo(() => {
        if (!league) return false;
        if (league.mode === 'free' && league.end_date) {
            return new Date(league.end_date).getTime() < Date.now();
        }
        return false;
    }, [league]);

    // Admin can override locks
    const isLocked = (isCompleted || isLeagueFrozen) && !isOrganisateur;
    const adminMode = (isCompleted || isLeagueFrozen) && isOrganisateur;

    // Debounced save to DB
    const saveToDb = useCallback((s1: number, s2: number) => {
        if (!match || isLocked) return;
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(async () => {
            try {
                await updateLeagueMatchScore(match.id, s1, s2);
            } catch (err) {
                console.error("Error saving score:", err);
            }
        }, 300);
    }, [match, isLocked, updateLeagueMatchScore]);

    const MAX_SCORE = 13;

    const updateScore = (team: 1 | 2, delta: number) => {
        if (!match || isLocked) return;
        const newScore1 = team === 1 ? Math.min(MAX_SCORE, Math.max(0, localScore1 + delta)) : localScore1;
        const newScore2 = team === 2 ? Math.min(MAX_SCORE, Math.max(0, localScore2 + delta)) : localScore2;
        setLocalScore1(newScore1);
        setLocalScore2(newScore2);
        saveToDb(newScore1, newScore2);
    };

    const handleValidate = async () => {
        if (!match || isLocked) return;
        if (localScore1 !== MAX_SCORE && localScore2 !== MAX_SCORE) {
            alert("Une des deux équipes doit avoir atteint 13 points pour valider le match.");
            return;
        }
        if (localScore1 === localScore2) {
            alert("Le score ne peut pas être à égalité. Continuez la partie !");
            return;
        }
        // Clear any pending save
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        setSaving(true);
        try {
            // Single DB call: save score + mark completed
            await validateLeagueMatch(match.id, localScore1, localScore2);
        } catch (err) {
            console.error("Error validating match:", err);
        } finally {
            setSaving(false);
        }
    };

    if (!match) {
        return (
            <div className="container mx-auto px-4 py-12 text-center">
                <Circle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-semibold">Match introuvable</h2>
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

    const score1 = isCompleted ? (match.score1 ?? 0) : localScore1;
    const score2 = isCompleted ? (match.score2 ?? 0) : localScore2;
    const team1Won = isCompleted && score1 > score2;
    const team2Won = isCompleted && score2 > score1;

    return (
        <div className="container mx-auto px-4 py-4 sm:py-8 max-w-2xl">
            {/* Header */}
            <div className="mb-4 sm:mb-8">
                {league && (
                    <Link
                        href={`/tournois/ligue/${league.id}`}
                        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        {league.name}
                    </Link>
                )}
                <div className="flex items-center justify-between">
                    <h1 className="text-lg sm:text-2xl font-bold text-foreground">
                        {isCompleted ? 'Résultat du match' : 'Match en cours'}
                    </h1>
                    <div className="flex gap-2">
                        {adminMode && (
                            <Badge variant="destructive" className="items-center gap-1">
                                <ShieldAlert className="h-3 w-3" />
                                Mode Admin
                            </Badge>
                        )}
                        <Badge variant={isCompleted ? 'secondary' : 'warning'} className="text-[10px]">
                            {isCompleted ? 'Terminé' : 'En cours'}
                        </Badge>
                    </div>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>{formatType(match.type)}</span>
                    <span>·</span>
                    <span>{new Date(match.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                </div>
            </div>

            {/* Score Board */}
            <Card className="mb-4 sm:mb-6 overflow-hidden">
                <CardContent className="p-0">
                    {/* Score central */}
                    <div className="flex items-center justify-center gap-4 py-4 bg-muted/30">
                        <div className="text-center">
                            <span className={`text-xs font-bold ${team1Won ? 'text-green-600' : 'text-primary'}`}>Éq. 1</span>
                            <div className={`text-4xl sm:text-5xl font-black tabular-nums ${team1Won ? 'text-green-600' : ''}`}>{score1}</div>
                        </div>
                        <span className="text-2xl text-muted-foreground font-light">-</span>
                        <div className="text-center">
                            <span className={`text-xs font-bold ${team2Won ? 'text-green-600' : 'text-orange-600'}`}>Éq. 2</span>
                            <div className={`text-4xl sm:text-5xl font-black tabular-nums ${team2Won ? 'text-green-600' : ''}`}>{score2}</div>
                        </div>
                    </div>

                    {/* Teams */}
                    <div className="grid grid-cols-2 divide-x">
                        <div className={`p-3 sm:p-4 ${team1Won ? 'bg-green-50 dark:bg-green-950/20' : ''}`}>
                            <div className="space-y-1.5">
                                {match.team1_player_ids.map(pid => {
                                    const p = getPlayer(pid);
                                    return (
                                        <div key={pid} className="flex items-center gap-1.5">
                                            <Avatar src={p?.avatar} fallback={p?.firstName?.[0] || "?"} className="h-5 w-5 shrink-0" />
                                            <span className="text-xs font-medium truncate">{p?.firstName} {p?.lastName?.[0]}.</span>
                                        </div>
                                    );
                                })}
                            </div>
                            {team1Won && (
                                <Badge className="mt-2 bg-green-100 text-green-700 border-green-300 dark:bg-green-900 dark:text-green-300 text-[10px]">
                                    <Trophy className="h-2.5 w-2.5 mr-0.5" /> Vainqueur
                                </Badge>
                            )}
                        </div>
                        <div className={`p-3 sm:p-4 ${team2Won ? 'bg-green-50 dark:bg-green-950/20' : ''}`}>
                            <div className="space-y-1.5">
                                {match.team2_player_ids.map(pid => {
                                    const p = getPlayer(pid);
                                    return (
                                        <div key={pid} className="flex items-center gap-1.5">
                                            <Avatar src={p?.avatar} fallback={p?.firstName?.[0] || "?"} className="h-5 w-5 shrink-0" />
                                            <span className="text-xs font-medium truncate">{p?.firstName} {p?.lastName?.[0]}.</span>
                                        </div>
                                    );
                                })}
                            </div>
                            {team2Won && (
                                <Badge className="mt-2 bg-green-100 text-green-700 border-green-300 dark:bg-green-900 dark:text-green-300 text-[10px]">
                                    <Trophy className="h-2.5 w-2.5 mr-0.5" /> Vainqueur
                                </Badge>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Frozen League Banner */}
            {isLeagueFrozen && !isCompleted && (
                <Card className="mb-4 sm:mb-6 bg-destructive/5 border-destructive/20">
                    <CardContent className="p-4 flex items-center gap-3">
                        <Lock className="h-5 w-5 text-destructive shrink-0" />
                        <div>
                            <p className="text-sm font-medium text-destructive">Ligue terminée</p>
                            <p className="text-xs text-muted-foreground">Le classement est figé. Les scores ne peuvent plus être modifiés.</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Score Controls */}
            {!isLocked && (
                <Card className="mb-4 sm:mb-6">
                    <CardHeader className="pb-2 px-4 pt-4">
                        <CardTitle className="text-sm">Compteur de points</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <div className="space-y-4">
                            {/* Team 1 Controls */}
                            <div className="flex items-center justify-between bg-primary/5 rounded-xl p-3">
                                <div className="flex flex-col max-w-[120px] sm:max-w-none">
                                    <span className="text-xs font-bold text-primary mb-1">Équipe 1</span>
                                    <div className="flex flex-col gap-1">
                                        {match.team1_player_ids.map(pid => {
                                            const p = getPlayer(pid);
                                            if (!p) return null;
                                            return (
                                                <div key={pid} className="flex items-center gap-1.5 overflow-hidden">
                                                    <Avatar src={p.avatar} fallback={p.firstName?.[0] || "?"} className="h-5 w-5 shrink-0" />
                                                    <span className="text-[10px] text-muted-foreground truncate">
                                                        {p.firstName} {p.lastName?.[0] || ''}.
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-10 w-10 rounded-full"
                                        onClick={() => updateScore(1, -1)}
                                        disabled={localScore1 === 0}
                                    >
                                        <Minus className="h-4 w-4" />
                                    </Button>
                                    <span className="text-3xl font-black w-12 text-center tabular-nums">{localScore1}</span>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-10 w-10 rounded-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                                        onClick={() => updateScore(1, 1)}
                                        disabled={localScore1 >= MAX_SCORE}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Team 2 Controls */}
                            <div className="flex items-center justify-between bg-orange-50 dark:bg-orange-950/20 rounded-xl p-3">
                                <div className="flex flex-col max-w-[120px] sm:max-w-none">
                                    <span className="text-xs font-bold text-orange-600 mb-1">Équipe 2</span>
                                    <div className="flex flex-col gap-1">
                                        {match.team2_player_ids.map(pid => {
                                            const p = getPlayer(pid);
                                            if (!p) return null;
                                            return (
                                                <div key={pid} className="flex items-center gap-1.5 overflow-hidden">
                                                    <Avatar src={p.avatar} fallback={p.firstName?.[0] || "?"} className="h-5 w-5 shrink-0" />
                                                    <span className="text-[10px] text-muted-foreground truncate">
                                                        {p.firstName} {p.lastName?.[0] || ''}.
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-10 w-10 rounded-full"
                                        onClick={() => updateScore(2, -1)}
                                        disabled={localScore2 === 0}
                                    >
                                        <Minus className="h-4 w-4" />
                                    </Button>
                                    <span className="text-3xl font-black w-12 text-center tabular-nums">{localScore2}</span>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-10 w-10 rounded-full border-orange-400 text-orange-600 hover:bg-orange-500 hover:text-white"
                                        onClick={() => updateScore(2, 1)}
                                        disabled={localScore2 >= MAX_SCORE}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t">
                            <Button
                                onClick={handleValidate}
                                disabled={saving || (localScore1 !== MAX_SCORE && localScore2 !== MAX_SCORE) || localScore1 === localScore2}
                                className={`w-full gap-2 ${adminMode ? 'bg-destructive hover:bg-destructive/90' : ''}`}
                            >
                                <CheckCircle2 className="h-4 w-4" />
                                {saving ? "Enregistrement..." : (isCompleted ? "Mettre à jour le résultat" : "Terminer le match")}
                            </Button>
                            {localScore1 !== MAX_SCORE && localScore2 !== MAX_SCORE && (localScore1 > 0 || localScore2 > 0) && (
                                <p className="text-[10px] text-muted-foreground text-center mt-1.5">
                                    Une équipe doit atteindre 13 points pour terminer le match.
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Completed Summary */}
            {isCompleted && (
                <Card className="bg-green-50/50 dark:bg-green-950/10 border-green-200 dark:border-green-900">
                    <CardContent className="p-6 text-center">
                        <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                        <p className="text-lg font-semibold">Match terminé</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Victoire de l&apos;{team1Won ? 'Équipe 1' : 'Équipe 2'} — {score1} à {score2}
                        </p>
                        {league && (
                            <Link href={`/tournois/ligue/${league.id}`}>
                                <Button variant="outline" className="mt-4 gap-2">
                                    <ArrowLeft className="h-4 w-4" />
                                    Retour au classement
                                </Button>
                            </Link>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
