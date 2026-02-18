"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Trophy, MapPin, Search, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import { useTournament } from "@/lib/context/TournamentContext";
import { computeEloRatings, INITIAL_ELO } from "@/lib/utils/elo";

interface PlayerRanking {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    city: string;
    wins: number;
    losses: number;
    tournamentsPlayed: number;
    leaguesPlayed: number;
    totalMatches: number;
    eloRating: number;
}

export default function ClassementPage() {
    const { players, teams, matches, leagues, leagueMatches } = useTournament();
    const [searchQuery, setSearchQuery] = useState('');

    // Compute all ELO ratings once
    const eloRatings = useMemo(() => computeEloRatings(teams, matches, leagueMatches), [teams, matches, leagueMatches]);

    const rankings: PlayerRanking[] = useMemo(() => {
        return players.map(player => {
            let wins = 0;
            let losses = 0;

            // Find all teams this player is in
            const playerTeams = teams.filter(t => t.playerIds.includes(player.id));
            const playerTeamIds = new Set(playerTeams.map(t => t.id));

            // Count tournament matches
            const tournamentIds = new Set<string>();
            for (const match of matches) {
                if (match.status !== 'completed') continue;
                const isTeam1 = match.team1Id && playerTeamIds.has(match.team1Id);
                const isTeam2 = match.team2Id && playerTeamIds.has(match.team2Id);
                if (!isTeam1 && !isTeam2) continue;

                // Track tournament participation
                tournamentIds.add(match.tournamentId);

                if (match.winnerId) {
                    const playerTeamId = isTeam1 ? match.team1Id : match.team2Id;
                    if (match.winnerId === playerTeamId) {
                        wins++;
                    } else {
                        losses++;
                    }
                }
            }

            // Count league matches
            const leagueIds = new Set<string>();
            for (const lm of leagueMatches) {
                if (lm.status !== 'completed') continue;
                const inTeam1 = lm.team1_player_ids?.includes(player.id);
                const inTeam2 = lm.team2_player_ids?.includes(player.id);
                if (!inTeam1 && !inTeam2) continue;

                leagueIds.add(lm.league_id);

                if (lm.winner_team_index === 1 && inTeam1) wins++;
                else if (lm.winner_team_index === 2 && inTeam2) wins++;
                else if (lm.winner_team_index) losses++;
            }

            return {
                id: player.id,
                firstName: player.firstName,
                lastName: player.lastName,
                avatar: player.avatar,
                city: player.location?.city || '',
                wins,
                losses,
                tournamentsPlayed: tournamentIds.size,
                leaguesPlayed: leagueIds.size,
                totalMatches: wins + losses,
                eloRating: eloRatings.get(player.id) ?? INITIAL_ELO,
            };
        })
        .filter(p => p.totalMatches > 0 || p.tournamentsPlayed > 0 || p.leaguesPlayed > 0)
        .sort((a, b) => {
            // Sort by ELO first, then wins, then win rate
            if (b.eloRating !== a.eloRating) return b.eloRating - a.eloRating;
            if (b.wins !== a.wins) return b.wins - a.wins;
            const rateA = a.totalMatches > 0 ? a.wins / a.totalMatches : 0;
            const rateB = b.totalMatches > 0 ? b.wins / b.totalMatches : 0;
            if (rateB !== rateA) return rateB - rateA;
            return b.totalMatches - a.totalMatches;
        });
    }, [players, teams, matches, leagueMatches, eloRatings]);

    const filteredRankings = searchQuery
        ? rankings.filter(p =>
            `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.city.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : rankings;

    // Also show players with no matches (registered but haven't played yet)
    const inactivePlayers = useMemo(() => {
        const rankedIds = new Set(rankings.map(r => r.id));
        return players
            .filter(p => !rankedIds.has(p.id))
            .filter(p => !searchQuery ||
                `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (p.location?.city || '').toLowerCase().includes(searchQuery.toLowerCase())
            );
    }, [players, rankings, searchQuery]);

    const totalPlayers = players.length;
    const activePlayers = rankings.length;
    const totalWins = rankings.reduce((sum, p) => sum + p.wins, 0);

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground">Classement</h1>
                <p className="text-muted-foreground mt-1">
                    Classement des joueurs par score ELO
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid sm:grid-cols-3 gap-4 mb-8">
                <Card>
                    <CardContent className="py-6 text-center">
                        <div className="text-4xl mb-2">👥</div>
                        <div className="text-2xl font-bold text-foreground">{totalPlayers}</div>
                        <p className="text-sm text-muted-foreground">Joueurs inscrits</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="py-6 text-center">
                        <div className="text-4xl mb-2">🏆</div>
                        <div className="text-2xl font-bold text-foreground">{activePlayers}</div>
                        <p className="text-sm text-muted-foreground">Joueurs actifs</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="py-6 text-center">
                        <div className="text-4xl mb-2">🎯</div>
                        <div className="text-2xl font-bold text-foreground">{totalWins}</div>
                        <p className="text-sm text-muted-foreground">Matchs joués</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <Card className="mb-6">
                <CardContent className="py-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Rechercher un joueur..."
                            className="pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Ranking Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-primary" />
                        Classement Général
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {/* Table Header */}
                        <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-4 py-2 text-sm font-medium text-muted-foreground border-b border-border">
                            <div className="col-span-1">#</div>
                            <div className="col-span-3">Joueur</div>
                            <div className="col-span-1 text-center">ELO</div>
                            <div className="col-span-2">Ville</div>
                            <div className="col-span-2 text-center">V/D</div>
                            <div className="col-span-3 text-right">Compétitions</div>
                        </div>

                        {filteredRankings.length > 0 ? (
                            filteredRankings.map((player, index) => {
                                const winRate = player.totalMatches > 0
                                    ? Math.round((player.wins / player.totalMatches) * 100)
                                    : 0;

                                return (
                                    <Link key={player.id} href={`/profil/${player.id}`}>
                                        <div
                                            className={`grid sm:grid-cols-12 gap-4 px-4 py-3 rounded-lg transition-colors hover:bg-muted cursor-pointer ${index < 3 ? "bg-primary/5" : ""}`}
                                        >
                                            {/* Rank */}
                                            <div className="sm:col-span-1 flex items-center">
                                                <span className="text-lg font-bold">
                                                    {index === 0 && "🥇"}
                                                    {index === 1 && "🥈"}
                                                    {index === 2 && "🥉"}
                                                    {index > 2 && (
                                                        <span className="text-muted-foreground">{index + 1}</span>
                                                    )}
                                                </span>
                                            </div>

                                            {/* Player */}
                                            <div className="sm:col-span-3 flex items-center gap-3">
                                                <Avatar
                                                    src={player.avatar}
                                                    fallback={`${player.firstName[0]}${player.lastName[0]}`}
                                                    size="md"
                                                />
                                                <div>
                                                    <h3 className="font-semibold text-foreground">
                                                        {player.firstName} {player.lastName}
                                                    </h3>
                                                    <p className="text-sm text-muted-foreground sm:hidden">
                                                        ELO {player.eloRating} • {player.wins}V/{player.losses}D
                                                    </p>
                                                </div>
                                            </div>

                                            {/* ELO */}
                                            <div className="hidden sm:flex sm:col-span-1 items-center justify-center">
                                                <span className="font-bold text-primary">{player.eloRating}</span>
                                            </div>

                                            {/* City */}
                                            <div className="hidden sm:flex sm:col-span-2 items-center text-sm text-muted-foreground">
                                                {player.city && (
                                                    <>
                                                        <MapPin className="h-3 w-3 mr-1" />
                                                        {player.city}
                                                    </>
                                                )}
                                            </div>

                                            {/* W/L */}
                                            <div className="hidden sm:flex sm:col-span-2 items-center justify-center text-sm">
                                                <span className="text-green-600 font-medium">
                                                    {player.wins}
                                                </span>
                                                <span className="text-muted-foreground mx-1">/</span>
                                                <span className="text-red-500 font-medium">
                                                    {player.losses}
                                                </span>
                                                {player.totalMatches > 0 && (
                                                    <span className="text-muted-foreground text-xs ml-1.5">
                                                        ({winRate}%)
                                                    </span>
                                                )}
                                            </div>

                                            {/* Competitions */}
                                            <div className="hidden sm:flex sm:col-span-3 items-center justify-end gap-3 text-sm">
                                                {player.tournamentsPlayed > 0 && (
                                                    <span className="flex items-center gap-1 text-muted-foreground">
                                                        <Trophy className="h-3 w-3" />
                                                        {player.tournamentsPlayed} tournoi{player.tournamentsPlayed > 1 ? 's' : ''}
                                                    </span>
                                                )}
                                                {player.leaguesPlayed > 0 && (
                                                    <span className="flex items-center gap-1 text-muted-foreground">
                                                        <Users className="h-3 w-3" />
                                                        {player.leaguesPlayed} ligue{player.leaguesPlayed > 1 ? 's' : ''}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })
                        ) : (
                            !inactivePlayers.length && (
                                <div className="text-center py-12">
                                    <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                                    <p className="text-muted-foreground">Aucun joueur trouvé</p>
                                </div>
                            )
                        )}

                        {/* Inactive players section */}
                        {inactivePlayers.length > 0 && (
                            <>
                                <div className="pt-4 mt-4 border-t border-border">
                                    <p className="text-sm font-medium text-muted-foreground px-4 py-2">
                                        Joueurs sans match ({inactivePlayers.length})
                                    </p>
                                </div>
                                {inactivePlayers.map((player) => (
                                    <Link key={player.id} href={`/profil/${player.id}`}>
                                        <div className="grid sm:grid-cols-12 gap-4 px-4 py-3 rounded-lg transition-colors hover:bg-muted cursor-pointer">
                                            <div className="sm:col-span-1 flex items-center">
                                                <span className="text-muted-foreground">—</span>
                                            </div>
                                            <div className="sm:col-span-3 flex items-center gap-3">
                                                <Avatar
                                                    src={player.avatar}
                                                    fallback={`${player.firstName[0]}${player.lastName[0]}`}
                                                    size="md"
                                                />
                                                <div>
                                                    <h3 className="font-semibold text-foreground">
                                                        {player.firstName} {player.lastName}
                                                    </h3>
                                                    <p className="text-sm text-muted-foreground sm:hidden">
                                                        {player.location?.city || ''}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="hidden sm:flex sm:col-span-1 items-center justify-center text-sm text-muted-foreground">
                                                {INITIAL_ELO}
                                            </div>
                                            <div className="hidden sm:flex sm:col-span-2 items-center text-sm text-muted-foreground">
                                                {player.location?.city && (
                                                    <>
                                                        <MapPin className="h-3 w-3 mr-1" />
                                                        {player.location.city}
                                                    </>
                                                )}
                                            </div>
                                            <div className="hidden sm:flex sm:col-span-2 items-center justify-center text-sm text-muted-foreground">
                                                —
                                            </div>
                                            <div className="hidden sm:flex sm:col-span-3 items-center justify-end text-sm text-muted-foreground">
                                                Aucun match
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
