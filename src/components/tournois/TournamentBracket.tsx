"use client";

import { useMemo } from "react";
import { useTournament, Match } from "@/lib/context/TournamentContext";
import { MatchCard } from "./MatchCard";
import { calculatePoolStandings } from "@/lib/utils/poolGenerator";

interface TournamentBracketProps {
    tournamentId: string;
    currentUserTeamId?: string;
}

function PoolStageDisplay({ matches, tournamentId, currentUserTeamId }: { matches: Match[]; tournamentId: string; currentUserTeamId?: string }) {
    const { getTeam } = useTournament();

    const poolIds = useMemo(() => {
        const ids = [...new Set(matches.map(m => m.poolId).filter(Boolean))] as string[];
        return ids.sort();
    }, [matches]);

    return (
        <div className="space-y-6">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                Phase de poules
                {matches.every(m => m.status === 'completed') && (
                    <span className="text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Terminée</span>
                )}
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
                {poolIds.map(poolId => {
                    const poolMatches = matches.filter(m => m.poolId === poolId);
                    const standings = calculatePoolStandings(poolMatches, poolId);
                    const allDone = poolMatches.every(m => m.status === 'completed');

                    return (
                        <div key={poolId} className={`border rounded-xl overflow-hidden ${allDone ? 'border-green-200 bg-green-50/30' : 'border-border'}`}>
                            <div className={`px-4 py-2.5 font-bold text-sm ${allDone ? 'bg-green-100 text-green-800' : 'bg-primary text-primary-foreground'}`}>
                                Poule {poolId}
                                <span className="ml-2 font-normal text-xs opacity-80">
                                    ({poolMatches.filter(m => m.status === 'completed').length}/{poolMatches.length} matchs)
                                </span>
                            </div>

                            {/* Classement */}
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b bg-muted/30">
                                        <th className="px-2 py-1.5 text-center w-8">#</th>
                                        <th className="px-2 py-1.5 text-left">Équipe</th>
                                        <th className="px-2 py-1.5 text-right">V</th>
                                        <th className="px-2 py-1.5 text-right">D</th>
                                        <th className="px-2 py-1.5 text-right">Diff</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {standings.map((s, idx) => {
                                        const team = getTeam(s.teamId);
                                        const isMyTeam = currentUserTeamId === s.teamId;
                                        return (
                                            <tr key={s.teamId} className={isMyTeam ? 'bg-primary/5 font-bold' : ''}>
                                                <td className="px-2 py-1.5 text-center font-semibold">
                                                    {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx + 1}
                                                </td>
                                                <td className="px-2 py-1.5 truncate max-w-[120px]">{team?.name || '—'}</td>
                                                <td className="px-2 py-1.5 text-right text-green-600">{s.wins}</td>
                                                <td className="px-2 py-1.5 text-right text-red-600">{s.losses}</td>
                                                <td className="px-2 py-1.5 text-right font-mono">
                                                    {s.pointDiff > 0 ? `+${s.pointDiff}` : s.pointDiff}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {/* Matchs de la poule */}
                            <div className="p-2 space-y-2 border-t">
                                {poolMatches
                                    .sort((a, b) => a.round - b.round || a.matchNumber - b.matchNumber)
                                    .map(match => (
                                        <MatchCard key={match.id} match={match} currentUserTeamId={currentUserTeamId} />
                                    ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function BracketDisplay({ matches, title, colorClass, currentUserTeamId }: {
    matches: Match[];
    title: string;
    colorClass: string;
    currentUserTeamId?: string;
}) {
    const { getTeam, getTournament } = useTournament();

    const rounds = useMemo(() =>
        Array.from(new Set(matches.map(m => m.round))).sort((a, b) => a - b),
        [matches]
    );
    const maxRound = Math.max(...rounds);

    const getRoundName = (roundNum: number) => {
        const matchesInRound = matches.filter(m => m.round === roundNum);
        if (matchesInRound.length === 1 && roundNum === maxRound) return "Finale";
        if (matchesInRound.length === 2) return "Demi-finales";
        return `Tour ${roundNum}`;
    };

    if (matches.length === 0) return null;

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">{title}</h2>
            <div className="overflow-x-auto pb-4">
                <div className="flex gap-8 min-w-max px-2">
                    {rounds.map((round) => (
                        <div key={round} className="flex flex-col gap-4">
                            <div className={`text-center font-bold text-sm sticky top-0 py-2.5 z-10 w-64 uppercase tracking-wide rounded-lg text-white shadow-md ${colorClass}`}>
                                {getRoundName(round)}
                            </div>
                            <div className="flex flex-col justify-around flex-grow gap-8">
                                {matches
                                    .filter(m => m.round === round)
                                    .sort((a, b) => a.matchNumber - b.matchNumber)
                                    .map(match => (
                                        <div key={match.id} className="relative flex items-center">
                                            <MatchCard match={match} currentUserTeamId={currentUserTeamId} />
                                            {round < maxRound && (
                                                <div className="absolute -right-4 top-1/2 w-4 h-px bg-border" />
                                            )}
                                        </div>
                                    ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export function TournamentBracket({ tournamentId, currentUserTeamId }: TournamentBracketProps) {
    const { getTournamentMatches, getTeam, getTournament, getTournamentTeams } = useTournament();
    const tournament = getTournament(tournamentId);
    const allMatches = getTournamentMatches(tournamentId);
    const allTournamentTeams = getTournamentTeams(tournamentId);

    if (!allMatches || allMatches.length === 0) {
        return (
            <div id="no-matches-placeholder" className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                <p>Aucun match généré pour ce tournoi.</p>
                <p className="text-sm">Assurez-vous d&apos;avoir lancé le tournoi avec des équipes inscrites.</p>
            </div>
        );
    }

    // Separer les matchs par phase
    const poolMatches = allMatches.filter(m => m.phase === 'pools');
    const knockoutMatches = allMatches.filter(m => m.phase === 'knockout' || (!m.phase && !m.isConsolation));
    const consolationMatches = allMatches.filter(m => m.phase === 'consolation' || m.isConsolation);

    const hasPoolPhase = poolMatches.length > 0;
    const hasConsolation = consolationMatches.length > 0;

    // Pour le podium : utiliser les matchs knockout
    const isTournamentFinished = tournament?.status === 'completed';
    const knockoutRounds = Array.from(new Set(knockoutMatches.map(m => m.round))).sort((a, b) => a - b);
    const maxKnockoutRound = knockoutRounds.length > 0 ? Math.max(...knockoutRounds) : 0;
    const knockoutLastMatches = knockoutMatches.filter(m => m.round === maxKnockoutRound);
    const finalMatch = (isTournamentFinished && knockoutLastMatches.length === 1) ? knockoutLastMatches[0] : null;
    const winnerTeam = finalMatch?.winnerId ? getTeam(finalMatch.winnerId) : null;

    return (
        <div className="flex flex-col gap-8">
            {/* Podium */}
            {isTournamentFinished && winnerTeam && (() => {
                const rankings: { teamId: string; rank: number; eliminatedRound: number; score: number }[] = [];
                const ranked = new Set<string>();

                if (finalMatch?.winnerId) {
                    const winnerScore = finalMatch.team1Id === finalMatch.winnerId ? (finalMatch.score1 ?? 0) : (finalMatch.score2 ?? 0);
                    rankings.push({ teamId: finalMatch.winnerId, rank: 1, eliminatedRound: maxKnockoutRound, score: winnerScore });
                    ranked.add(finalMatch.winnerId);
                }

                const finalistLoser = finalMatch?.team1Id === finalMatch?.winnerId ? finalMatch?.team2Id : finalMatch?.team1Id;
                if (finalistLoser) {
                    const loserScore = finalMatch?.team1Id === finalMatch?.winnerId ? (finalMatch?.score2 ?? 0) : (finalMatch?.score1 ?? 0);
                    rankings.push({ teamId: finalistLoser, rank: 2, eliminatedRound: maxKnockoutRound, score: loserScore });
                    ranked.add(finalistLoser);
                }

                let currentRank = 3;
                for (let r = maxKnockoutRound - 1; r >= 1; r--) {
                    const roundMatches = knockoutMatches.filter(m => m.round === r);
                    const losersWithScore: { teamId: string; score: number }[] = [];
                    for (const m of roundMatches) {
                        if (m.winnerId && m.team1Id && m.team2Id) {
                            const loser = m.team1Id === m.winnerId ? m.team2Id : m.team1Id;
                            const loserScore = m.team1Id === m.winnerId ? (m.score2 ?? 0) : (m.score1 ?? 0);
                            if (loser && !ranked.has(loser)) {
                                losersWithScore.push({ teamId: loser, score: loserScore });
                            }
                        }
                    }
                    losersWithScore.sort((a, b) => b.score - a.score);
                    for (let i = 0; i < losersWithScore.length; i++) {
                        rankings.push({ teamId: losersWithScore[i].teamId, rank: currentRank + i, eliminatedRound: r, score: losersWithScore[i].score });
                        ranked.add(losersWithScore[i].teamId);
                    }
                    currentRank += losersWithScore.length;
                }

                const first = rankings.find(r => r.rank === 1);
                const second = rankings.find(r => r.rank === 2);
                const thirds = rankings.filter(r => r.rank === 3);

                const firstTeam = first ? getTeam(first.teamId) : null;
                const secondTeam = second ? getTeam(second.teamId) : null;
                const thirdTeams = thirds.map(t => getTeam(t.teamId)).filter(Boolean);

                // Vainqueur consolante
                const consolationFinal = hasConsolation
                    ? consolationMatches
                        .filter(m => m.status === 'completed')
                        .sort((a, b) => b.round - a.round)[0]
                    : null;
                const consolationWinner = consolationFinal?.winnerId ? getTeam(consolationFinal.winnerId) : null;

                return (
                    <div className="space-y-6">
                        <div className="bg-gradient-to-b from-amber-50 to-white dark:from-amber-900/20 dark:to-transparent rounded-2xl border-2 border-amber-200 dark:border-amber-900/50 shadow-xl p-6 mx-auto max-w-2xl w-full">
                            <h2 className="text-center text-amber-600 dark:text-amber-400 font-bold text-sm uppercase tracking-widest mb-8">Classement Final</h2>

                            <div className="flex items-end justify-center gap-3 sm:gap-4 mb-6">
                                <div className="flex flex-col items-center w-24 sm:w-32">
                                    <span className="text-3xl sm:text-4xl mb-2">🥈</span>
                                    <div className="w-full bg-gradient-to-t from-gray-300 to-gray-200 dark:from-gray-600 dark:to-gray-500 rounded-t-lg h-24 sm:h-28 flex flex-col items-center justify-end pb-3">
                                        <span className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-100 text-center px-1 truncate w-full">
                                            {secondTeam?.name || "—"}
                                        </span>
                                        <span className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-300 font-semibold">2ème</span>
                                    </div>
                                </div>

                                <div className="flex flex-col items-center w-28 sm:w-36">
                                    <span className="text-4xl sm:text-5xl mb-2">🥇</span>
                                    <div className="w-full bg-gradient-to-t from-amber-400 to-amber-300 dark:from-amber-600 dark:to-amber-500 rounded-t-lg h-32 sm:h-40 flex flex-col items-center justify-end pb-3 shadow-lg">
                                        <span className="text-sm sm:text-base font-black text-amber-900 dark:text-amber-100 text-center px-1 truncate w-full">
                                            {firstTeam?.name || "—"}
                                        </span>
                                        <span className="text-xs sm:text-sm text-amber-800 dark:text-amber-200 font-bold">Champion</span>
                                    </div>
                                </div>

                                <div className="flex flex-col items-center w-24 sm:w-32">
                                    <span className="text-3xl sm:text-4xl mb-2">🥉</span>
                                    <div className="w-full bg-gradient-to-t from-orange-300 to-orange-200 dark:from-orange-700 dark:to-orange-600 rounded-t-lg h-20 sm:h-24 flex flex-col items-center justify-end pb-3">
                                        <span className="text-xs sm:text-sm font-bold text-orange-900 dark:text-orange-100 text-center px-1 truncate w-full">
                                            {thirdTeams.length === 1 ? thirdTeams[0]?.name : thirdTeams.length > 1 ? `${thirdTeams[0]?.name}...` : "—"}
                                        </span>
                                        <span className="text-[10px] sm:text-xs text-orange-700 dark:text-orange-200 font-semibold">3ème</span>
                                    </div>
                                </div>
                            </div>

                            {consolationWinner && (
                                <div className="text-center mt-4 pt-4 border-t border-amber-200">
                                    <span className="text-xs text-muted-foreground">Vainqueur de la consolante :</span>
                                    <span className="ml-2 font-bold text-sm">{consolationWinner.name}</span>
                                </div>
                            )}
                        </div>

                        {rankings.length > 0 && (
                            <div className="bg-card rounded-xl border shadow-sm mx-auto max-w-2xl w-full overflow-hidden">
                                <div className="px-4 py-3 border-b bg-muted/30">
                                    <h3 className="font-semibold text-sm">Classement complet</h3>
                                </div>
                                <div className="divide-y">
                                    {rankings.map((entry) => {
                                        const team = getTeam(entry.teamId);
                                        const isMyTeam = currentUserTeamId === entry.teamId;
                                        return (
                                            <div key={entry.teamId} className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${isMyTeam ? "bg-orange-50 border-l-4 border-orange-400 dark:bg-orange-900/20" : "hover:bg-muted/50"}`}>
                                                <div className="w-8 text-center font-bold text-sm">
                                                    {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : entry.rank}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <span className={`text-sm font-medium truncate block ${isMyTeam ? "text-orange-700 dark:text-orange-300 font-bold" : ""}`}>{team?.name || "Équipe inconnue"}</span>
                                                </div>
                                                <div className="text-xs font-semibold tabular-nums shrink-0 mr-2">
                                                    {entry.score} pts
                                                </div>
                                                <div className="text-xs text-muted-foreground shrink-0">
                                                    {entry.rank === 1 ? "Vainqueur" : entry.eliminatedRound === maxKnockoutRound ? "Finale" : `Tour ${entry.eliminatedRound}`}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* Phase de poules */}
            {hasPoolPhase && (
                <PoolStageDisplay
                    matches={poolMatches}
                    tournamentId={tournamentId}
                    currentUserTeamId={currentUserTeamId}
                />
            )}

            {/* Tableau d'elimination */}
            {knockoutMatches.length > 0 && (
                <BracketDisplay
                    matches={knockoutMatches}
                    title={hasPoolPhase ? "Phase finale" : "Tableau d'élimination"}
                    colorClass="bg-blue-600"
                    currentUserTeamId={currentUserTeamId}
                />
            )}

            {/* Consolante */}
            {hasConsolation && (
                <BracketDisplay
                    matches={consolationMatches}
                    title="Consolante"
                    colorClass="bg-gray-500"
                    currentUserTeamId={currentUserTeamId}
                />
            )}

            {tournament?.status === 'ongoing' && (
                <div id="dynamic-info-note" className="text-center text-xs text-muted-foreground italic border-t border-border pt-4 mt-4">
                    Note : Les niveaux suivants sont générés dynamiquement après la validation de tous les scores du niveau actuel.
                </div>
            )}
        </div>
    );
}
