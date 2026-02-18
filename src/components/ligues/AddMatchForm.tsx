"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { League, User, LeagueMatch } from "@/types";
import { useTournament } from "@/lib/context/TournamentContext";
import { Check, Users } from "lucide-react";

interface AddMatchFormProps {
    league: League;
    players: User[];
    onTypeSelect?: (type: LeagueMatch['type']) => void;
    onSuccess?: (matchId: string) => void;
}

export function AddMatchForm({ league, players, onSuccess }: AddMatchFormProps) {
    const { addLeagueMatch } = useTournament();
    const [loading, setLoading] = useState(false);
    const [matchType, setMatchType] = useState<LeagueMatch['type']>('doublette');

    const [team1Players, setTeam1Players] = useState<string[]>([]);
    const [team2Players, setTeam2Players] = useState<string[]>([]);

    const leagueParticipants = useMemo(() => {
        const idSet = new Set(league.participant_ids || []);
        return players.filter(p => idSet.has(p.id));
    }, [players, league.participant_ids]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const requiredPlayers = matchType === 'tete-a-tete' ? 1 : matchType === 'doublette' ? 2 : 3;
        if (team1Players.length !== requiredPlayers || team2Players.length !== requiredPlayers) {
            alert(`Pour un match en ${matchType}, il faut exactement ${requiredPlayers} joueur(s) par équipe.`);
            return;
        }

        const allSelected = [...team1Players, ...team2Players];
        const uniqueSelected = new Set(allSelected);
        if (uniqueSelected.size !== allSelected.length) {
            alert("Un joueur ne peut pas être dans les deux équipes.");
            return;
        }

        setLoading(true);
        try {
            const matchId = await addLeagueMatch({
                league_id: league.id,
                type: matchType,
                team1_player_ids: team1Players,
                team2_player_ids: team2Players,
                score1: 0,
                score2: 0,
                winner_team_index: null,
                status: 'ongoing'
            });
            onSuccess?.(matchId);
        } catch (err: any) {
            console.error("Error adding match:", err);
            const msg = err.message || err.details || "Erreur inconnue.";
            alert(`Erreur lors de l'enregistrement du match : ${msg}`);
        } finally {
            setLoading(false);
        }
    };

    const togglePlayer = (playerId: string, team: 1 | 2) => {
        const maxPlayers = matchType === 'tete-a-tete' ? 1 : matchType === 'doublette' ? 2 : 3;

        if (team === 1) {
            if (team1Players.includes(playerId)) {
                setTeam1Players(prev => prev.filter(id => id !== playerId));
            } else {
                if (team1Players.length >= maxPlayers) {
                    alert(`L'équipe 1 est complète (${maxPlayers} joueur${maxPlayers > 1 ? 's' : ''} max pour ${matchType})`);
                    return;
                }
                setTeam1Players(prev => [...prev, playerId]);
                setTeam2Players(prev => prev.filter(id => id !== playerId));
            }
        } else {
            if (team2Players.includes(playerId)) {
                setTeam2Players(prev => prev.filter(id => id !== playerId));
            } else {
                if (team2Players.length >= maxPlayers) {
                    alert(`L'équipe 2 est complète (${maxPlayers} joueur${maxPlayers > 1 ? 's' : ''} max pour ${matchType})`);
                    return;
                }
                setTeam2Players(prev => [...prev, playerId]);
                setTeam1Players(prev => prev.filter(id => id !== playerId));
            }
        }
    };

    const requiredPlayers = matchType === 'tete-a-tete' ? 1 : matchType === 'doublette' ? 2 : 3;
    const isReady = team1Players.length === requiredPlayers && team2Players.length === requiredPlayers;

    return (
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 py-1 sm:py-2">
            {/* Type Selection */}
            <div>
                <label className="text-xs font-medium mb-1.5 block">Format du match</label>
                <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
                    {(['tete-a-tete', 'doublette', 'triplettes'] as LeagueMatch['type'][]).map(type => (
                        <Button
                            key={type}
                            type="button"
                            variant={matchType === type ? "default" : "outline"}
                            className="text-[10px] sm:text-xs capitalize h-7 sm:h-8 px-1 sm:px-3"
                            size="sm"
                            onClick={() => {
                                setMatchType(type);
                                setTeam1Players([]);
                                setTeam2Players([]);
                            }}
                        >
                            {type}
                        </Button>
                    ))}
                </div>
            </div>

            <div className="space-y-2 sm:space-y-3">
                {/* Team 1 */}
                <div className="bg-primary/5 p-2 sm:p-3 rounded-xl border border-primary/20">
                    <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                        <label className="text-[10px] sm:text-xs font-bold text-primary flex items-center gap-1 sm:gap-1.5">
                            <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            Équipe 1
                        </label>
                        <span className="text-[10px] text-muted-foreground">
                            {team1Players.length}/{requiredPlayers}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 sm:gap-1.5 max-h-28 sm:max-h-32 overflow-y-auto">
                        {leagueParticipants.map(p => (
                            <button
                                key={`team1-${p.id}`}
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    togglePlayer(p.id, 1);
                                }}
                                className={`flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-lg border cursor-pointer transition-all text-left ${team1Players.includes(p.id) ? "bg-primary/10 border-primary" : "hover:bg-muted"
                                    }`}
                            >
                                <Avatar src={p.avatar} fallback={p.firstName[0]} className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                                <span className="text-[10px] sm:text-[11px] truncate">{p.firstName}</span>
                                {team1Players.includes(p.id) && <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-primary ml-auto shrink-0" />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Team 2 */}
                <div className="bg-orange-50 dark:bg-orange-950/20 p-2 sm:p-3 rounded-xl border border-orange-200 dark:border-orange-800">
                    <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                        <label className="text-[10px] sm:text-xs font-bold text-orange-700 dark:text-orange-400 flex items-center gap-1 sm:gap-1.5">
                            <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            Équipe 2
                        </label>
                        <span className="text-[10px] text-muted-foreground">
                            {team2Players.length}/{requiredPlayers}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 sm:gap-1.5 max-h-28 sm:max-h-32 overflow-y-auto">
                        {leagueParticipants.map(p => (
                            <button
                                key={`team2-${p.id}`}
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    togglePlayer(p.id, 2);
                                }}
                                className={`flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-lg border cursor-pointer transition-all text-left ${team2Players.includes(p.id) ? "bg-orange-100 dark:bg-orange-900/30 border-orange-400" : "hover:bg-muted"
                                    }`}
                            >
                                <Avatar src={p.avatar} fallback={p.firstName[0]} className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                                <span className="text-[10px] sm:text-[11px] truncate">{p.firstName}</span>
                                {team2Players.includes(p.id) && <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-orange-600 ml-auto shrink-0" />}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <Button type="submit" disabled={loading || !isReady} className="w-full" size="sm">
                {loading ? "Enregistrement..." : "Enregistrer les équipes"}
            </Button>
        </form>
    );
}
