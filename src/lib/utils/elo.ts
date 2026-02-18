import type { Match } from "@/lib/context/TournamentContext";
import type { LeagueMatch } from "@/types";

const INITIAL_ELO = 1000;
const K_FACTOR = 32;

interface Team {
    id: string;
    playerIds: string[];
    tournamentId: string;
}

/**
 * Compute the expected score for player A against player B.
 * E_A = 1 / (1 + 10^((R_B - R_A) / 400))
 */
function expectedScore(ratingA: number, ratingB: number): number {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Get the average ELO of a group of players.
 */
function avgElo(playerIds: string[], ratings: Map<string, number>): number {
    if (playerIds.length === 0) return INITIAL_ELO;
    const sum = playerIds.reduce((acc, id) => acc + (ratings.get(id) ?? INITIAL_ELO), 0);
    return sum / playerIds.length;
}

/**
 * Update ELO ratings for all players in a match between two teams.
 * Each player's rating is updated individually based on the team's average ELO vs opponent team's average ELO.
 */
function processMatch(
    team1PlayerIds: string[],
    team2PlayerIds: string[],
    winnerTeamIndex: 1 | 2,
    ratings: Map<string, number>
): void {
    const team1Avg = avgElo(team1PlayerIds, ratings);
    const team2Avg = avgElo(team2PlayerIds, ratings);

    const e1 = expectedScore(team1Avg, team2Avg);
    const e2 = expectedScore(team2Avg, team1Avg);

    const s1 = winnerTeamIndex === 1 ? 1 : 0;
    const s2 = winnerTeamIndex === 2 ? 1 : 0;

    // Update each player in team 1
    for (const pid of team1PlayerIds) {
        const current = ratings.get(pid) ?? INITIAL_ELO;
        ratings.set(pid, Math.round(current + K_FACTOR * (s1 - e1)));
    }

    // Update each player in team 2
    for (const pid of team2PlayerIds) {
        const current = ratings.get(pid) ?? INITIAL_ELO;
        ratings.set(pid, Math.round(current + K_FACTOR * (s2 - e2)));
    }
}

/**
 * Compute ELO ratings for all players from match history.
 * Returns a Map<playerId, eloRating>.
 */
export function computeEloRatings(
    teams: Team[],
    matches: Match[],
    leagueMatches: LeagueMatch[]
): Map<string, number> {
    const ratings = new Map<string, number>();

    // Build team lookup
    const teamMap = new Map<string, Team>();
    for (const t of teams) {
        teamMap.set(t.id, t);
    }

    // Process tournament matches: completed matches with a winner
    // Group by tournament, then sort by round within each tournament
    const completedTournamentMatches = matches
        .filter(m => m.status === 'completed' && m.winnerId && m.team1Id && m.team2Id)
        .sort((a, b) => a.round - b.round);

    for (const match of completedTournamentMatches) {
        const team1 = teamMap.get(match.team1Id!);
        const team2 = teamMap.get(match.team2Id!);
        if (!team1 || !team2) continue;

        const winnerTeamIndex: 1 | 2 = match.winnerId === match.team1Id ? 1 : 2;

        // Initialize ratings for new players
        for (const pid of [...team1.playerIds, ...team2.playerIds]) {
            if (!ratings.has(pid)) ratings.set(pid, INITIAL_ELO);
        }

        processMatch(team1.playerIds, team2.playerIds, winnerTeamIndex, ratings);
    }

    // Process league matches: completed matches with a winner
    const completedLeagueMatches = leagueMatches
        .filter(m => m.status === 'completed' && m.winner_team_index)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    for (const lm of completedLeagueMatches) {
        if (!lm.team1_player_ids?.length || !lm.team2_player_ids?.length) continue;

        // Initialize ratings for new players
        for (const pid of [...lm.team1_player_ids, ...lm.team2_player_ids]) {
            if (!ratings.has(pid)) ratings.set(pid, INITIAL_ELO);
        }

        processMatch(
            lm.team1_player_ids,
            lm.team2_player_ids,
            lm.winner_team_index as 1 | 2,
            ratings
        );
    }

    return ratings;
}

export { INITIAL_ELO };
