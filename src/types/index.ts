export type UserRole = 'joueur' | 'organisateur' | 'admin' | 'organizer' | 'player' | 'user';

export interface UserLocation {
    lat: number;
    lng: number;
    city: string;
    region?: string;
}

export interface UserStats {
    wins: number;
    losses: number;
    tournamentsPlayed: number;
    tournamentsWon: number;
}

export interface User {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    bio?: string;
    location: UserLocation;
    stats: UserStats;
    eloRating: number;
    badges: string[];
    createdAt: Date;
    userId?: string; // Supabase Auth user ID (for authenticated players)
}

export type TournamentType = 'triplettes' | 'doublettes' | 'tete-a-tete';
export type TournamentStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
export type TournamentFormat = 'elimination' | 'pools_elimination';
export type TournamentPhase = 'pools' | 'knockout' | 'consolation';

export interface TournamentLocation {
    lat: number;
    lng: number;
    address: string;
    city: string;
}

export interface Tournament {
    id: string;
    name: string;
    description: string;
    organizerId: string;
    date: Date;
    location: TournamentLocation;
    type: TournamentType;
    maxParticipants: number;
    status: TournamentStatus;
    participants: string[];
    coverImage?: string;
    terrainCount?: number;
    createdAt: Date;
    is_official?: boolean;
    format?: TournamentFormat;
    poolSize?: 3 | 4;
    qualifiersPerPool?: 1 | 2;
    consolationEnabled?: boolean;
}

export type MatchStatus = 'pending' | 'ongoing' | 'completed';

export interface Match {
    id: string;
    tournamentId: string;
    round: number;
    team1: string[];
    team2: string[];
    score1?: number;
    score2?: number;
    winnerId?: string;
    status: MatchStatus;
}

export type MessageType = 'text' | 'image' | 'location';

export interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    type: MessageType;
    createdAt: Date;
    readBy: string[];
}

export interface Conversation {
    id: string;
    participants: string[];
    lastMessage?: Message;
    createdAt: Date;
}

// Supabase user_accounts table
export interface UserAccount {
    id: string;
    email: string;
    display_name: string;
    role: UserRole;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// Leagues
export type LeagueMode = 'round_robin' | 'free';

export interface League {
    id: string;
    name: string;
    description?: string;
    participant_ids?: string[];
    created_by: string;
    created_at: string;
    mode: LeagueMode;
    match_format?: 'tete-a-tete' | 'doublette' | 'triplettes';
    end_date?: string;
}

export interface LeagueParticipant {
    id: string;
    league_id: string;
    player_id: string;
    created_at: string;
}

export interface LeagueMatch {
    id: string;
    league_id: string;
    type: 'tete-a-tete' | 'doublette' | 'triplettes';
    team1_player_ids: string[];
    team2_player_ids: string[];
    score1?: number;
    score2?: number;
    winner_team_index?: 1 | 2 | null;
    status: 'pending' | 'in_progress' | 'ongoing' | 'completed';

    // Validation
    team1_proposed_score1?: number;
    team1_proposed_score2?: number;
    team1_validated: boolean;
    team2_proposed_score1?: number;
    team2_proposed_score2?: number;
    team2_validated: boolean;

    round_number?: number;
    created_at: string;
}
