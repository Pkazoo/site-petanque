"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { User, Tournament, TournamentStatus, MatchStatus, League, LeagueMatch, TournamentPhase } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { generateRoundRobinMatches } from "@/lib/utils/roundRobinGenerator";
import { distributeTeamsIntoPools, generatePoolRoundRobin, calculatePoolStandings, getPoolName } from "@/lib/utils/poolGenerator";

interface Team {
    id: string;
    name?: string;
    playerIds: string[];
    tournamentId: string;
    createdAt: Date;
}

export interface Match {
    id: string;
    tournamentId: string;
    round: number;
    matchNumber: number;
    team1Id?: string;
    team2Id?: string;
    score1?: number;
    score2?: number;
    winnerId?: string;
    status: MatchStatus;
    nextMatchId?: string;
    nextMatchSlot?: 1 | 2;
    isPlayIn?: boolean;
    terrainNumber?: number;
    team1ProposedScore1?: number;
    team1ProposedScore2?: number;
    team2ProposedScore1?: number;
    team2ProposedScore2?: number;
    team1Validated?: boolean;
    team2Validated?: boolean;
    poolId?: string;
    phase?: TournamentPhase;
    isConsolation?: boolean;
}

interface TournamentContextType {
    tournaments: Tournament[];
    players: User[];
    teams: Team[];
    matches: Match[];
    leagues: League[];
    leagueMatches: LeagueMatch[];
    addTournament: (tournament: Omit<Tournament, "id" | "createdAt" | "participants">) => Promise<string>;
    addPlayer: (player: Omit<User, "id" | "createdAt" | "stats" | "eloRating" | "badges" | "userId">, userId?: string) => Promise<string>;
    updatePlayer: (playerId: string, data: Partial<Pick<User, "firstName" | "lastName" | "bio" | "avatar" | "location">>) => Promise<void>;
    createTeam: (tournamentId: string, playerIds: string[], name?: string) => Promise<string>;
    addPlayerToTeam: (teamId: string, playerId: string) => Promise<void>;
    startTournament: (tournamentId: string) => Promise<void>;
    updateMatchScore: (matchId: string, score1: number, score2: number) => Promise<void>;
    validateMatch: (matchId: string) => Promise<void>;
    proposeMatchScore: (matchId: string, teamId: string, score1: number, score2: number) => Promise<void>;
    addLeague: (league: Omit<League, "id" | "created_at">) => Promise<string>;
    addLeagueMatch: (match: Omit<LeagueMatch, "id" | "created_at" | "team1_validated" | "team2_validated">) => Promise<string>;
    validateLeagueMatch: (matchId: string, score1: number, score2: number) => Promise<void>;
    proposeLeagueMatchScore: (matchId: string, teamIndex: 1 | 2, score1: number, score2: number) => Promise<void>;
    updateLeagueMatchScore: (matchId: string, score1: number, score2: number) => Promise<void>;
    getTournament: (id: string) => Tournament | undefined;
    getTournamentTeams: (tournamentId: string) => Team[];
    getTournamentMatches: (tournamentId: string) => Match[];
    getPlayer: (id: string) => User | undefined;
    getPlayerByUserId: (userId: string) => User | undefined;
    getTeam: (id: string) => Team | undefined;
    resetTournament: (tournamentId: string) => Promise<void>;
    deletePlayer: (playerId: string) => Promise<void>;
    deleteTeam: (teamId: string) => Promise<void>;
    deleteTournament: (tournamentId: string) => Promise<void>;
    deleteLeague: (leagueId: string) => Promise<void>;
    error: string | null;
    clearError: () => void;
}

const TournamentContext = createContext<TournamentContextType | undefined>(undefined);

export function TournamentProvider({ children }: { children: React.ReactNode }) {
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [players, setPlayers] = useState<User[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [matches, setMatches] = useState<Match[]>([]);
    const [leagues, setLeagues] = useState<League[]>([]);
    const [leagueMatches, setLeagueMatches] = useState<LeagueMatch[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const clearError = () => setError(null);
    const supabase = useMemo(() => createClient(), []);

    const loadData = useCallback(async () => {
        try {
            const [tournamentsRes, playersRes, teamsRes, matchesRes, leaguesRes, leagueMatchesRes] = await Promise.all([
                supabase.from('tournaments').select('*'),
                supabase.from('tournament_players').select('*'),
                supabase.from('tournament_teams').select('*'),
                supabase.from('tournament_matches').select('*'),
                supabase.from('leagues').select('*'),
                supabase.from('league_matches').select('*')
            ]);

            if (teamsRes.data) {
                setTeams(teamsRes.data.map((t) => ({
                    id: t.id,
                    tournamentId: t.tournament_id,
                    name: t.name,
                    playerIds: t.player_ids || [],
                    createdAt: new Date(t.created_at),
                })));
            }

            if (tournamentsRes.data) {
                setTournaments(tournamentsRes.data.map((t) => ({
                    id: t.id,
                    name: t.name,
                    description: t.description || '',
                    organizerId: t.organizer_id || '',
                    date: new Date(t.date),
                    location: {
                        address: t.location_address || '',
                        city: t.location_city || '',
                        lat: t.location_lat || 0,
                        lng: t.location_lng || 0,
                    },
                    type: t.type as Tournament['type'],
                    maxParticipants: t.max_participants || 16,
                    status: t.status as Tournament['status'],
                    coverImage: t.cover_image,
                    terrainCount: t.terrain_count ?? undefined,
                    participants: t.participant_ids || [],
                    createdAt: new Date(t.created_at),
                    is_official: t.is_official || false,
                    format: t.format || 'elimination',
                    poolSize: t.pool_size ?? undefined,
                    qualifiersPerPool: t.qualifiers_per_pool ?? undefined,
                    consolationEnabled: t.consolation_enabled ?? false,
                })));
            }

            if (playersRes.data) {
                setPlayers(playersRes.data.map((p) => ({
                    id: p.id,
                    firstName: p.first_name,
                    lastName: p.last_name,
                    username: p.username,
                    email: p.email || '',
                    location: { city: p.city || '', lat: 0, lng: 0 },
                    stats: { wins: 0, losses: 0, tournamentsPlayed: 0, tournamentsWon: 0 },
                    eloRating: 1000,
                    badges: [],
                    createdAt: new Date(p.created_at),
                    userId: (p.user_id && p.user_id !== 'null' && p.user_id !== 'undefined') ? p.user_id : undefined,
                    avatar: p.avatar || undefined,
                    bio: p.bio || undefined,
                })));
            }

            if (matchesRes.data) {
                setMatches(matchesRes.data.map((m) => ({
                    id: m.id,
                    tournamentId: m.tournament_id,
                    round: m.round,
                    matchNumber: m.match_number,
                    team1Id: m.team1_id || undefined,
                    team2Id: m.team2_id || undefined,
                    score1: m.score1 ?? undefined,
                    score2: m.score2 ?? undefined,
                    winnerId: m.winner_id || undefined,
                    status: m.status as MatchStatus,
                    nextMatchId: m.next_match_id || undefined,
                    nextMatchSlot: m.next_match_slot as 1 | 2 | undefined,
                    isPlayIn: m.is_play_in || false,
                    terrainNumber: m.terrain_number ?? undefined,
                    team1ProposedScore1: m.team1_proposed_score1 ?? undefined,
                    team1ProposedScore2: m.team1_proposed_score2 ?? undefined,
                    team2ProposedScore1: m.team2_proposed_score1 ?? undefined,
                    team2ProposedScore2: m.team2_proposed_score2 ?? undefined,
                    team1Validated: m.team1_validated ?? false,
                    team2Validated: m.team2_validated ?? false,
                    poolId: m.pool_id || undefined,
                    phase: m.phase || undefined,
                    isConsolation: m.is_consolation || false,
                })));
            }

            if (leaguesRes.data) {
                setLeagues(leaguesRes.data.map(l => ({
                    ...l,
                    mode: l.mode || 'free',
                    match_format: l.match_format || undefined,
                    end_date: l.end_date || undefined,
                })));
            }

            if (leagueMatchesRes.data) {
                setLeagueMatches(leagueMatchesRes.data.map(m => ({
                    id: m.id,
                    league_id: m.league_id,
                    type: m.type as LeagueMatch['type'],
                    team1_player_ids: m.team1_player_ids,
                    team2_player_ids: m.team2_player_ids,
                    score1: m.score1 ?? undefined,
                    score2: m.score2 ?? undefined,
                    winner_team_index: m.winner_team_index as 1 | 2 | undefined,
                    status: m.status as LeagueMatch['status'],
                    team1_proposed_score1: m.team1_proposed_score1 ?? undefined,
                    team1_proposed_score2: m.team1_proposed_score2 ?? undefined,
                    team1_validated: m.team1_validated ?? false,
                    team2_proposed_score1: m.team2_proposed_score1 ?? undefined,
                    team2_proposed_score2: m.team2_proposed_score2 ?? undefined,
                    team2_validated: m.team2_validated ?? false,
                    round_number: m.round_number ?? undefined,
                    created_at: m.created_at
                })));
            }

            setIsInitialized(true);
        } catch (err) {
            console.error("Error loading data:", err);
        }
    }, [supabase]);

    const initRef = useRef(false);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);
    const loadingRef = useRef(false);

    // Guarded loadData to prevent concurrent calls
    const safeLoadData = useCallback(async () => {
        if (loadingRef.current) return;
        loadingRef.current = true;
        try {
            await loadData();
        } finally {
            loadingRef.current = false;
        }
    }, [loadData]);

    useEffect(() => {
        // Guard against double-mount in React StrictMode
        if (initRef.current) return;
        initRef.current = true;

        safeLoadData();

        // Debounced reload: multiple rapid realtime events trigger only one reload
        const debouncedReload = () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => safeLoadData(), 500);
        };

        // Single channel with all table listeners (instead of 6 separate channels)
        const channel = supabase.channel('all_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments' }, debouncedReload)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_players' }, debouncedReload)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_teams' }, debouncedReload)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_matches' }, debouncedReload)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'leagues' }, debouncedReload)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'league_matches' }, debouncedReload)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [safeLoadData, supabase]);

    const addTournament = async (data: Omit<Tournament, "id" | "createdAt" | "participants">) => {
        const tempId = crypto.randomUUID();
        const insertData: Record<string, unknown> = {
            id: tempId,
            name: data.name,
            description: data.description || '',
            organizer_id: data.organizerId,
            date: data.date.toISOString(),
            location_address: data.location.address,
            location_city: data.location.city,
            location_lat: data.location.lat,
            location_lng: data.location.lng,
            type: data.type,
            max_participants: data.maxParticipants,
            status: 'upcoming',
        };
        if (data.coverImage) {
            insertData.cover_image = data.coverImage;
        }
        console.log('Inserting tournament data:', JSON.stringify(insertData, null, 2));
        const { error } = await supabase.from('tournaments').insert(insertData);
        if (error) {
            console.error('Error saving tournament:', error.message, error.details, error.hint, error.code);
            throw new Error(error.message || 'Erreur lors de la sauvegarde du tournoi');
        }
        // Sauvegarder terrain_count séparément (la colonne peut ne pas exister)
        if (data.terrainCount) {
            await supabase.from('tournaments').update({ terrain_count: data.terrainCount } as Record<string, unknown>).eq('id', tempId);
        }
        // Sauvegarder les champs format séparément (colonnes peuvent ne pas exister)
        if (data.format || data.consolationEnabled) {
            await supabase.from('tournaments').update({
                format: data.format || 'elimination',
                pool_size: data.poolSize ?? null,
                qualifiers_per_pool: data.qualifiersPerPool ?? null,
                consolation_enabled: data.consolationEnabled ?? false,
            } as Record<string, unknown>).eq('id', tempId);
        }
        await loadData();
        return tempId;
    };

    const addPlayer = async (data: Omit<User, "id" | "createdAt" | "stats" | "eloRating" | "badges" | "userId">, userId?: string) => {
        const tempId = crypto.randomUUID();
        let finalUserId = userId || null;
        if (!finalUserId && data.email) {
            const { data: userAcc } = await supabase.from('user_accounts').select('id').eq('email', data.email).maybeSingle();
            if (userAcc) finalUserId = userAcc.id;
        }
        const { error } = await supabase.from('tournament_players').insert({
            id: tempId,
            first_name: data.firstName,
            last_name: data.lastName,
            username: data.username,
            email: data.email,
            city: data.location.city,
            user_id: finalUserId,
        });
        if (error) throw error;
        loadData();
        return tempId;
    };

    const updatePlayer = async (playerId: string, data: Partial<Pick<User, "firstName" | "lastName" | "bio" | "avatar" | "location">>) => {
        const updateData: any = {};
        if (data.firstName !== undefined) updateData.first_name = data.firstName;
        if (data.lastName !== undefined) updateData.last_name = data.lastName;
        if (data.bio !== undefined) updateData.bio = data.bio;
        if (data.avatar !== undefined) updateData.avatar = data.avatar;
        if (data.location?.city !== undefined) updateData.city = data.location.city;

        const { error } = await supabase.from('tournament_players').update(updateData).eq('id', playerId);
        if (error) {
            console.error('Error updating player:', error);
            throw error;
        }

        // Also update display_name in user_accounts if name changed
        if (data.firstName !== undefined || data.lastName !== undefined) {
            const player = players.find(p => p.id === playerId);
            if (player?.userId) {
                const newFirst = data.firstName ?? player.firstName;
                const newLast = data.lastName ?? player.lastName;
                const displayName = `${newFirst} ${newLast}`.trim();
                await supabase.from('user_accounts').update({
                    display_name: displayName,
                    updated_at: new Date().toISOString(),
                }).eq('id', player.userId);
            }
        }

        loadData();
    };

    const createTeam = async (tournamentId: string, playerIds: string[], name?: string) => {
        const tempId = crypto.randomUUID();
        const { error } = await supabase.from('tournament_teams').insert({
            id: tempId,
            tournament_id: tournamentId,
            name,
            player_ids: playerIds,
        });
        if (error) throw error;

        // Also add player IDs to the tournament's participant_ids
        const tournament = tournaments.find(t => t.id === tournamentId);
        if (tournament) {
            const currentParticipants = tournament.participants || [];
            const newParticipants = [...new Set([...currentParticipants, ...playerIds])];
            await supabase.from('tournaments').update({ participant_ids: newParticipants }).eq('id', tournamentId);
        }

        loadData();
        return tempId;
    };

    const addPlayerToTeam = async (teamId: string, playerId: string) => {
        const team = teams.find(t => t.id === teamId);
        if (!team) throw new Error('Équipe introuvable');
        if (team.playerIds.includes(playerId)) throw new Error('Ce joueur est déjà dans cette équipe');

        const newPlayerIds = [...team.playerIds, playerId];
        const { error } = await supabase.from('tournament_teams').update({ player_ids: newPlayerIds }).eq('id', teamId);
        if (error) throw error;

        // Also update tournament participant_ids
        const tournament = tournaments.find(t => t.id === team.tournamentId);
        if (tournament) {
            const currentParticipants = tournament.participants || [];
            const newParticipants = [...new Set([...currentParticipants, playerId])];
            await supabase.from('tournaments').update({ participant_ids: newParticipants }).eq('id', team.tournamentId);
        }

        loadData();
    };

    // Helper: assigner les terrains aux matchs
    const assignTerrains = async (matchInserts: { id: string }[], terrainCount: number) => {
        if (terrainCount <= 0) return;
        const terrainNumbers = matchInserts.map((_, idx) => (idx % terrainCount) + 1);
        for (let i = terrainNumbers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [terrainNumbers[i], terrainNumbers[j]] = [terrainNumbers[j], terrainNumbers[i]];
        }
        for (let i = 0; i < matchInserts.length; i++) {
            await supabase.from('tournament_matches')
                .update({ terrain_number: terrainNumbers[i] })
                .eq('id', matchInserts[i].id);
        }
    };

    const startTournament = async (tournamentId: string) => {
        try {
        const tournament = tournaments.find(t => t.id === tournamentId);
        const tournamentTeams = teams.filter(t => t.tournamentId === tournamentId);
        console.log('startTournament called:', { tournamentId, teamsFound: tournamentTeams.length, tournamentExists: !!tournament });

        // Guard: don't create matches if tournament already started or matches exist
        const existingMatches = matches.filter(m => m.tournamentId === tournamentId);
        if (existingMatches.length > 0) {
            console.warn('Tournament already has matches, skipping match creation');
            await supabase.from('tournaments').update({ status: 'ongoing' }).eq('id', tournamentId);
            await loadData();
            return;
        }

        if (tournamentTeams.length < 2) {
            console.error('Not enough teams to start tournament:', tournamentTeams.length);
            alert(`Impossible de lancer le tournoi : seulement ${tournamentTeams.length} équipe(s) inscrite(s). Il en faut au moins 2.`);
            return;
        }

        // Shuffle teams randomly (tirage au sort) using Fisher-Yates
        const shuffled = [...tournamentTeams];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        const terrainCount = tournament?.terrainCount || 0;
        const format = tournament?.format || 'elimination';

        if (format === 'pools_elimination') {
            // === FORMAT POULES + ELIMINATION ===
            const poolSize = tournament?.poolSize || 3;
            const teamIds = shuffled.map(t => t.id);
            const pools = distributeTeamsIntoPools(teamIds, poolSize);

            const allMatchInserts: Record<string, unknown>[] = [];
            let globalMatchNumber = 0;

            for (let poolIndex = 0; poolIndex < pools.length; poolIndex++) {
                const poolName = getPoolName(poolIndex);
                const poolTeamIds = pools[poolIndex];
                const poolMatches = generatePoolRoundRobin(poolTeamIds);

                for (const pm of poolMatches) {
                    allMatchInserts.push({
                        id: crypto.randomUUID(),
                        tournament_id: tournamentId,
                        round: pm.round,
                        match_number: globalMatchNumber++,
                        team1_id: pm.team1Id,
                        team2_id: pm.team2Id,
                        status: 'ongoing',
                        winner_id: null,
                        score1: 0,
                        score2: 0,
                        pool_id: poolName,
                        phase: 'pools',
                        is_consolation: false,
                    });
                }
            }

            const { error } = await supabase.from('tournament_matches').insert(allMatchInserts);
            if (error) {
                console.error('Error creating pool matches:', error.message, error.details, error.hint);
                return;
            }

            await assignTerrains(allMatchInserts as { id: string }[], terrainCount);
        } else {
            // === FORMAT ELIMINATION DIRECTE ===
            // Calculer la puissance de 2 supérieure pour éviter les doubles byes
            const n = shuffled.length;
            const nextPow2 = Math.pow(2, Math.ceil(Math.log2(n)));
            const numByes = nextPow2 - n;
            const totalFirstRoundMatches = nextPow2 / 2;

            const matchPairs: { team1Id: string; team2Id: string | null }[] = [];
            // Les premières places sont des byes (avance automatique au tour 2)
            for (let i = 0; i < numByes; i++) {
                matchPairs.push({ team1Id: shuffled[i].id, team2Id: null });
            }
            // Les matchs restants sont de vrais matchs
            for (let i = 0; i < totalFirstRoundMatches - numByes; i++) {
                const idx = numByes + i * 2;
                matchPairs.push({ team1Id: shuffled[idx].id, team2Id: shuffled[idx + 1].id });
            }

            const matchInserts = matchPairs.map((pair, idx) => ({
                id: crypto.randomUUID(),
                tournament_id: tournamentId,
                round: 1,
                match_number: idx,
                team1_id: pair.team1Id,
                team2_id: pair.team2Id || null,
                status: pair.team2Id ? 'ongoing' : 'completed',
                winner_id: pair.team2Id ? null : pair.team1Id,
                score1: 0,
                score2: 0,
                phase: 'knockout',
                is_consolation: false,
            }));

            const { error } = await supabase.from('tournament_matches').insert(matchInserts);
            if (error) {
                console.error('Error creating first round matches:', error.message, error.details, error.hint);
                return;
            }

            await assignTerrains(matchInserts, terrainCount);
        }

        await supabase.from('tournaments').update({ status: 'ongoing' }).eq('id', tournamentId);
        await loadData();
        } catch (err) {
            console.error('startTournament error:', err);
            alert('Erreur lors du lancement du tournoi : ' + (err instanceof Error ? err.message : String(err)));
        }
    };

    const updateMatchScore = async (matchId: string, score1: number, score2: number) => {
        await supabase.from('tournament_matches').update({ score1, score2 }).eq('id', matchId);
        loadData();
    };

    // Helper: generer le tour suivant d'elimination a partir des vainqueurs
    const generateNextEliminationRound = async (
        tournamentId: string,
        winners: string[],
        nextRound: number,
        terrainCount: number,
        phase: string,
        isConsolation: boolean,
    ) => {
        // Calculer la puissance de 2 supérieure pour éviter les doubles byes
        const nw = winners.length;
        const nextPow2 = Math.pow(2, Math.ceil(Math.log2(nw)));
        const numByes = nextPow2 - nw;
        const totalMatches = nextPow2 / 2;

        const nextMatchPairs: { team1Id: string; team2Id: string | null }[] = [];
        // Byes en premier (avance automatique)
        for (let i = 0; i < numByes; i++) {
            nextMatchPairs.push({ team1Id: winners[i], team2Id: null });
        }
        // Vrais matchs
        for (let i = 0; i < totalMatches - numByes; i++) {
            const idx = numByes + i * 2;
            nextMatchPairs.push({ team1Id: winners[idx], team2Id: winners[idx + 1] });
        }

        const nextInserts = nextMatchPairs.map((pair, idx) => ({
            id: crypto.randomUUID(),
            tournament_id: tournamentId,
            round: nextRound,
            match_number: idx,
            team1_id: pair.team1Id,
            team2_id: pair.team2Id,
            status: pair.team2Id ? 'ongoing' : 'completed',
            winner_id: pair.team2Id ? null : pair.team1Id,
            score1: 0,
            score2: 0,
            phase,
            is_consolation: isConsolation,
        }));

        const { error: nextError } = await supabase.from('tournament_matches').insert(nextInserts);
        if (nextError) {
            console.error('Error creating next round matches:', nextError.message, nextError.details, nextError.hint);
        }
        if (!nextError) {
            await assignTerrains(nextInserts, terrainCount);
        }
        return nextInserts;
    };

    const validateMatch = async (matchId: string) => {
        const { data: match } = await supabase.from('tournament_matches').select('*').eq('id', matchId).single();
        if (!match || match.score1 === null || match.score2 === null) return;

        const winner_id = match.score1 > match.score2 ? match.team1_id : match.team2_id;
        await supabase.from('tournament_matches').update({ winner_id, status: 'completed' }).eq('id', matchId);

        const tournament = tournaments.find(t => t.id === match.tournament_id);
        const terrainCount = tournament?.terrainCount || 0;
        const matchPhase = match.phase || 'knockout';

        // === PHASE POULES ===
        if (matchPhase === 'pools') {
            // Verifier si TOUTES les poules sont terminees
            const { data: allPoolMatches } = await supabase.from('tournament_matches')
                .select('*')
                .eq('tournament_id', match.tournament_id)
                .eq('phase', 'pools');

            if (allPoolMatches) {
                const allCompleted = allPoolMatches.every(m => m.id === matchId ? true : m.status === 'completed');

                if (allCompleted) {
                    // Toutes les poules sont terminees -> transition vers elimination
                    const qualifiersPerPool = tournament?.qualifiersPerPool || 1;

                    // Identifier les poules uniques
                    const poolIds = [...new Set(allPoolMatches.map(m => m.pool_id).filter(Boolean))] as string[];
                    poolIds.sort();

                    // Calculer les classements et collecter les qualifies
                    const qualifiedTeams: { teamId: string; poolIndex: number; rank: number }[] = [];

                    for (let i = 0; i < poolIds.length; i++) {
                        const poolId = poolIds[i];
                        // Preparer les matchs pour le calcul (avec le match courant mis a jour)
                        const poolMatchesForCalc = allPoolMatches
                            .filter(m => m.pool_id === poolId)
                            .map(m => ({
                                team1Id: m.team1_id as string,
                                team2Id: m.team2_id as string,
                                score1: m.id === matchId ? match.score1 : m.score1,
                                score2: m.id === matchId ? match.score2 : m.score2,
                                winnerId: m.id === matchId ? winner_id : m.winner_id,
                                status: m.id === matchId ? 'completed' : m.status,
                                poolId: poolId,
                            }));

                        const standings = calculatePoolStandings(poolMatchesForCalc, poolId);

                        for (let rank = 0; rank < Math.min(qualifiersPerPool, standings.length); rank++) {
                            qualifiedTeams.push({
                                teamId: standings[rank].teamId,
                                poolIndex: i,
                                rank: rank + 1,
                            });
                        }
                    }

                    // Cross-seeding : #1 poule A vs #2 poule B, etc.
                    const knockoutTeams: string[] = [];
                    if (qualifiersPerPool === 2 && poolIds.length >= 2) {
                        // Alterner #1 et #2 de poules opposees
                        const firsts = qualifiedTeams.filter(q => q.rank === 1).sort((a, b) => a.poolIndex - b.poolIndex);
                        const seconds = qualifiedTeams.filter(q => q.rank === 2).sort((a, b) => a.poolIndex - b.poolIndex);
                        for (let i = 0; i < firsts.length; i++) {
                            knockoutTeams.push(firsts[i].teamId);
                            // Cross: #1 poule i vs #2 poule (n-1-i)
                            const crossIdx = seconds.length - 1 - i;
                            if (crossIdx >= 0 && crossIdx < seconds.length) {
                                knockoutTeams.push(seconds[crossIdx].teamId);
                            }
                        }
                        // Ajouter les seconds restants s'il y en a
                        const usedSeconds = new Set(knockoutTeams);
                        for (const s of seconds) {
                            if (!usedSeconds.has(s.teamId)) knockoutTeams.push(s.teamId);
                        }
                    } else {
                        // Qualifiersperpool === 1 : juste les premiers de chaque poule
                        for (const q of qualifiedTeams.sort((a, b) => a.poolIndex - b.poolIndex)) {
                            knockoutTeams.push(q.teamId);
                        }
                    }

                    // Generer le tableau d'elimination avec les qualifies
                    if (knockoutTeams.length >= 2) {
                        await generateNextEliminationRound(
                            match.tournament_id,
                            knockoutTeams,
                            1,
                            terrainCount,
                            'knockout',
                            false,
                        );
                    } else if (knockoutTeams.length === 1) {
                        await supabase.from('tournaments').update({ status: 'completed' }).eq('id', match.tournament_id);
                    }
                }
            }

            loadData();
            return;
        }

        // === PHASE KNOCKOUT ou CONSOLATION ===
        const { data: roundMatches } = await supabase.from('tournament_matches')
            .select('*')
            .eq('tournament_id', match.tournament_id)
            .eq('round', match.round)
            .eq('phase', matchPhase);

        if (roundMatches) {
            const allCompleted = roundMatches.every(m => m.id === matchId ? true : m.status === 'completed');

            if (allCompleted) {
                const winners = roundMatches.map(m => {
                    if (m.id === matchId) return winner_id;
                    return m.winner_id;
                }).filter(Boolean) as string[];

                if (winners.length > 1) {
                    await generateNextEliminationRound(
                        match.tournament_id,
                        winners,
                        match.round + 1,
                        terrainCount,
                        matchPhase,
                        match.is_consolation || false,
                    );
                } else if (winners.length === 1) {
                    // Bracket termine
                    if (matchPhase === 'knockout' && match.round === 1 && tournament?.consolationEnabled) {
                        // Generer la consolante avec les perdants du tour 1
                        const losers = roundMatches.map(m => {
                            const w = m.id === matchId ? winner_id : m.winner_id;
                            return w === m.team1_id ? m.team2_id : m.team1_id;
                        }).filter(Boolean) as string[];

                        if (losers.length >= 2) {
                            await generateNextEliminationRound(
                                match.tournament_id,
                                losers,
                                1,
                                terrainCount,
                                'consolation',
                                true,
                            );
                        }
                    }

                    // Verifier si tous les brackets sont termines
                    const { data: allMatches } = await supabase.from('tournament_matches')
                        .select('*')
                        .eq('tournament_id', match.tournament_id);

                    if (allMatches) {
                        const knockoutDone = allMatches
                            .filter(m => m.phase === 'knockout')
                            .every(m => m.id === matchId ? true : m.status === 'completed');

                        const hasConsolation = allMatches.some(m => m.phase === 'consolation');
                        const consolationDone = !hasConsolation || allMatches
                            .filter(m => m.phase === 'consolation')
                            .every(m => m.id === matchId ? true : m.status === 'completed');

                        if (knockoutDone && consolationDone) {
                            await supabase.from('tournaments').update({ status: 'completed' }).eq('id', match.tournament_id);
                        }
                    }
                }

                // Consolante : generer au tour 1 du knockout si tous les matchs du tour 1 sont finis
                if (matchPhase === 'knockout' && match.round === 1 && tournament?.consolationEnabled) {
                    const hasConsolation = matches.some(m => m.tournamentId === match.tournament_id && m.phase === 'consolation');
                    if (!hasConsolation) {
                        const losers = roundMatches.map(m => {
                            const w = m.id === matchId ? winner_id : m.winner_id;
                            return w === m.team1_id ? m.team2_id : m.team1_id;
                        }).filter(Boolean) as string[];

                        if (losers.length >= 2) {
                            await generateNextEliminationRound(
                                match.tournament_id,
                                losers,
                                1,
                                terrainCount,
                                'consolation',
                                true,
                            );
                        }
                    }
                }
            }
        }

        loadData();
    };

    const proposeMatchScore = async (matchId: string, teamId: string, score1: number, score2: number) => {
        const { data: match } = await supabase.from('tournament_matches').select('*').eq('id', matchId).single();
        if (!match) return;
        const isTeam1 = match.team1_id === teamId;
        const updates: any = isTeam1
            ? { team1_proposed_score1: score1, team1_proposed_score2: score2, team1_validated: true }
            : { team2_proposed_score1: score1, team2_proposed_score2: score2, team2_validated: true };

        await supabase.from('tournament_matches').update(updates).eq('id', matchId);

        // Re-fetch the match to check if both teams have now validated
        const { data: updatedMatch } = await supabase.from('tournament_matches').select('*').eq('id', matchId).single();
        if (updatedMatch && updatedMatch.team1_validated && updatedMatch.team2_validated) {
            // Both teams validated - check if scores match
            const scoresMatch =
                updatedMatch.team1_proposed_score1 === updatedMatch.team2_proposed_score1 &&
                updatedMatch.team1_proposed_score2 === updatedMatch.team2_proposed_score2;

            if (scoresMatch) {
                // Scores match! Auto-complete the match with the agreed scores
                const finalScore1 = updatedMatch.team1_proposed_score1;
                const finalScore2 = updatedMatch.team1_proposed_score2;
                await supabase.from('tournament_matches').update({
                    score1: finalScore1,
                    score2: finalScore2,
                }).eq('id', matchId);

                // Call validateMatch to set winner, generate next round, etc.
                await validateMatch(matchId);
                return; // validateMatch already calls loadData
            }
            // If scores don't match → litige (dispute), shown in MatchCard
        }

        loadData();
    };

    const addLeague = async (data: Omit<League, "id" | "created_at">) => {
        const tempId = crypto.randomUUID();
        const { error: leagueError } = await supabase.from('leagues').insert({
            id: tempId,
            name: data.name,
            description: data.description,
            created_by: (data.created_by === 'anonymous' || !data.created_by) ? null : data.created_by,
            participant_ids: data.participant_ids,
            mode: data.mode || 'free',
            match_format: data.match_format || null,
            end_date: data.end_date || null,
        });

        if (leagueError) {
            console.error('Error saving league to Supabase:', leagueError);
            throw leagueError;
        }

        // Insert participants into league_participants table for RLS
        if (data.participant_ids && data.participant_ids.length > 0) {
            const participantsData = data.participant_ids.map(pId => ({
                league_id: tempId,
                player_id: pId
            }));

            const { error: participantsError } = await supabase
                .from('league_participants')
                .insert(participantsData);

            if (participantsError) {
                console.error('Error saving league participants to Supabase:', participantsError);
            }
        }

        // Auto-generate matches for round_robin mode
        if (data.mode === 'round_robin' && data.match_format && data.participant_ids && data.participant_ids.length >= 2) {
            const generatedMatches = generateRoundRobinMatches(data.participant_ids, data.match_format);
            const matchInserts = generatedMatches.map(m => ({
                id: crypto.randomUUID(),
                league_id: tempId,
                type: m.type,
                team1_player_ids: m.team1_player_ids,
                team2_player_ids: m.team2_player_ids,
                status: 'pending',
                round_number: m.round_number,
            }));

            if (matchInserts.length > 0) {
                const { error: matchError } = await supabase
                    .from('league_matches')
                    .insert(matchInserts);
                if (matchError) {
                    console.error('Error generating round-robin matches:', matchError);
                }
            }
        }

        loadData();
        return tempId;
    };

    const addLeagueMatch = async (data: Omit<LeagueMatch, "id" | "created_at" | "team1_validated" | "team2_validated">) => {
        // Guard: block if league is frozen (free mode with past end_date)
        const league = leagues.find(l => l.id === data.league_id);
        if (league?.end_date && new Date(league.end_date) < new Date()) {
            throw new Error("Cette ligue est terminée. Aucun nouveau match ne peut être ajouté.");
        }

        const tempId = crypto.randomUUID();
        const { error } = await supabase.from('league_matches').insert({
            id: tempId,
            league_id: data.league_id,
            type: data.type,
            team1_player_ids: data.team1_player_ids,
            team2_player_ids: data.team2_player_ids,
            score1: data.score1,
            score2: data.score2,
            winner_team_index: data.winner_team_index,
            status: data.status || 'pending'
        });

        if (error) {
            console.error('Error saving league match to Supabase:', error);
            throw error;
        }

        loadData();
        return tempId;
    };

    const validateLeagueMatch = async (matchId: string, score1: number, score2: number) => {
        const winner_team_index = score1 > score2 ? 1 : 2;
        const { error } = await supabase.from('league_matches').update({
            score1, score2, winner_team_index, status: 'completed'
        }).eq('id', matchId);
        if (error) {
            console.error('Error validating league match:', error);
            throw error;
        }
        setLeagueMatches(prev => prev.map(m =>
            m.id === matchId ? { ...m, score1, score2, winner_team_index, status: 'completed' as const } : m
        ));
    };

    const updateLeagueMatchScore = async (matchId: string, score1: number, score2: number) => {
        const { error } = await supabase.from('league_matches').update({ score1, score2 }).eq('id', matchId);
        if (error) {
            console.error('Error updating league match score:', error);
            throw error;
        }
        // Update local state without reloading all data
        setLeagueMatches(prev => prev.map(m =>
            m.id === matchId ? { ...m, score1, score2 } : m
        ));
    };

    const proposeLeagueMatchScore = async (matchId: string, teamIndex: 1 | 2, score1: number, score2: number) => {
        const updates: any = teamIndex === 1
            ? { team1_proposed_score1: score1, team1_proposed_score2: score2, team1_validated: true }
            : { team2_proposed_score1: score1, team2_proposed_score2: score2, team2_validated: true };
        await supabase.from('league_matches').update(updates).eq('id', matchId);
        loadData();
    };

    const getTournament = (id: string) => tournaments.find(t => t.id === id);
    const getTournamentTeams = (tournamentId: string) => teams.filter(t => t.tournamentId === tournamentId);
    const getTournamentMatches = (tournamentId: string) => matches.filter(m => m.tournamentId === tournamentId);
    const getPlayer = (id: string) => players.find(p => p.id === id);
    const getPlayerByUserId = (userId: string) => players.find(p => p.userId === userId);
    const getTeam = (id: string) => teams.find(t => t.id === id);

    const resetTournament = async (tournamentId: string) => {
        await supabase.from('tournament_matches').delete().eq('tournament_id', tournamentId);
        await supabase.from('tournaments').update({ status: 'upcoming' }).eq('id', tournamentId);
        loadData();
    };

    const deletePlayer = async (playerId: string) => {
        await supabase.from('tournament_players').delete().eq('id', playerId);
        loadData();
    };

    const deleteTeam = async (teamId: string) => {
        await supabase.from('tournament_teams').delete().eq('id', teamId);
        loadData();
    };

    const deleteTournament = async (tournamentId: string) => {
        setTournaments(prev => prev.filter(t => t.id !== tournamentId));
        setMatches(prev => prev.filter(m => m.tournamentId !== tournamentId));
        setTeams(prev => prev.filter(t => t.tournamentId !== tournamentId));

        await supabase.from('tournament_matches').delete().eq('tournament_id', tournamentId);
        await supabase.from('tournament_teams').delete().eq('tournament_id', tournamentId);
        const { error } = await supabase.from('tournaments').delete().eq('id', tournamentId);
        if (error) {
            console.warn('Error deleting tournament:', error);
            loadData();
            throw error;
        }
    };

    const deleteLeague = async (leagueId: string) => {
        // Optimistic: remove from UI immediately
        setLeagues(prev => prev.filter(l => l.id !== leagueId));
        setLeagueMatches(prev => prev.filter(m => m.league_id !== leagueId));

        // league_matches and league_participants have ON DELETE CASCADE
        const { error } = await supabase.from('leagues').delete().eq('id', leagueId);
        if (error) {
            console.warn('Error deleting league:', error);
            // Reload to restore state on failure
            loadData();
            throw error;
        }
    };

    return (
        <TournamentContext.Provider value={{
            tournaments, players, teams, matches, leagues, leagueMatches,
            addTournament, addPlayer, updatePlayer, createTeam, addPlayerToTeam,
            startTournament, updateMatchScore, validateMatch, proposeMatchScore,
            addLeague, addLeagueMatch, validateLeagueMatch, proposeLeagueMatchScore, updateLeagueMatchScore,
            getTournament, getTournamentTeams, getTournamentMatches,
            getPlayer, getPlayerByUserId, getTeam, resetTournament,
            deletePlayer, deleteTeam, deleteTournament, deleteLeague, error, clearError
        }}>
            {children}
        </TournamentContext.Provider>
    );
}

export const useTournament = () => {
    const context = useContext(TournamentContext);
    if (context === undefined) throw new Error("useTournament must be used within a TournamentProvider");
    return context;
};
