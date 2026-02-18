import { User, Tournament, Match, TournamentType, TournamentStatus } from '@/types';

// Utilisateurs mockés
export const mockUsers: User[] = [
    {
        id: '1',
        email: 'jean.dupont@email.com',
        username: 'jeandupont',
        firstName: 'Jean',
        lastName: 'Dupont',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jean',
        bio: 'Passionné de pétanque depuis 20 ans. Champion régional 2023.',
        location: { lat: 43.2965, lng: 5.3698, city: 'Marseille', region: 'PACA' },
        stats: { wins: 156, losses: 42, tournamentsPlayed: 89, tournamentsWon: 12 },
        eloRating: 1850,
        badges: ['champion-regional', 'veteran', '100-victoires'],
        createdAt: new Date('2022-03-15'),
    },
    {
        id: '2',
        email: 'marie.martin@email.com',
        username: 'mariemartin',
        firstName: 'Marie',
        lastName: 'Martin',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=marie',
        bio: 'Joueuse de doublettes, toujours partante pour un concours !',
        location: { lat: 43.6047, lng: 1.4442, city: 'Toulouse', region: 'Occitanie' },
        stats: { wins: 87, losses: 35, tournamentsPlayed: 54, tournamentsWon: 5 },
        eloRating: 1620,
        badges: ['premiere-victoire', '50-victoires'],
        createdAt: new Date('2023-01-20'),
    },
    {
        id: '3',
        email: 'pierre.bernard@email.com',
        username: 'pierrebernard',
        firstName: 'Pierre',
        lastName: 'Bernard',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=pierre',
        bio: 'Débutant enthousiaste, je cherche des partenaires pour progresser.',
        location: { lat: 45.764, lng: 4.8357, city: 'Lyon', region: 'Auvergne-Rhône-Alpes' },
        stats: { wins: 12, losses: 18, tournamentsPlayed: 8, tournamentsWon: 0 },
        eloRating: 1150,
        badges: ['premiere-partie'],
        createdAt: new Date('2024-06-10'),
    },
    {
        id: '4',
        email: 'sophie.petit@email.com',
        username: 'sophiepetit',
        firstName: 'Sophie',
        lastName: 'Petit',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sophie',
        bio: 'Vice-championne de France 2024. Spécialiste du tir.',
        location: { lat: 43.7102, lng: 7.262, city: 'Nice', region: 'PACA' },
        stats: { wins: 203, losses: 51, tournamentsPlayed: 112, tournamentsWon: 18 },
        eloRating: 1920,
        badges: ['champion-france', 'tireur-elite', '200-victoires'],
        createdAt: new Date('2021-09-05'),
    },
    {
        id: '5',
        email: 'luc.moreau@email.com',
        username: 'lucmoreau',
        firstName: 'Luc',
        lastName: 'Moreau',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=luc',
        bio: 'Organisateur de tournois locaux. Amateur de triplettes.',
        location: { lat: 44.8378, lng: -0.5792, city: 'Bordeaux', region: 'Nouvelle-Aquitaine' },
        stats: { wins: 45, losses: 38, tournamentsPlayed: 32, tournamentsWon: 2 },
        eloRating: 1380,
        badges: ['organisateur', 'premiere-victoire'],
        createdAt: new Date('2023-08-12'),
    },
];

// Tournois mockés
export const mockTournaments: Tournament[] = [
    {
        id: '1',
        name: 'Grand Tournoi de Marseille',
        description: 'Le tournoi annuel de Marseille revient pour sa 15ème édition ! Venez nombreux pour cette compétition légendaire au bord de la mer.',
        organizerId: '1',
        date: new Date('2026-02-15T09:00:00'),
        location: { lat: 43.2965, lng: 5.3698, address: 'Boulodrome du Prado', city: 'Marseille' },
        type: 'triplettes',
        maxParticipants: 48,
        status: 'upcoming',
        participants: ['1', '2', '4'],
        coverImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
        createdAt: new Date('2025-12-01'),
    },
    {
        id: '2',
        name: 'Concours de Lyon - Été 2026',
        description: 'Tournoi amical ouvert à tous les niveaux dans le parc de la Tête d\'Or.',
        organizerId: '3',
        date: new Date('2026-07-20T10:00:00'),
        location: { lat: 45.7772, lng: 4.8555, address: 'Parc de la Tête d\'Or', city: 'Lyon' },
        type: 'doublettes',
        maxParticipants: 32,
        status: 'upcoming',
        participants: ['3', '5'],
        createdAt: new Date('2026-01-10'),
    },
    {
        id: '3',
        name: 'Championnat Régional PACA',
        description: 'Sélection régionale pour le championnat de France. Niveau expert requis.',
        organizerId: '4',
        date: new Date('2026-03-08T08:30:00'),
        location: { lat: 43.7102, lng: 7.262, address: 'Boulodrome Municipal', city: 'Nice' },
        type: 'triplettes',
        maxParticipants: 24,
        status: 'upcoming',
        participants: ['1', '4'],
        coverImage: 'https://images.unsplash.com/photo-1566041510632-30055e21a9f5?w=800',
        createdAt: new Date('2025-11-15'),
    },
    {
        id: '4',
        name: 'Tournoi des Quais de Bordeaux',
        description: 'Ambiance festive au bord de la Garonne. Barbecue et buvette sur place !',
        organizerId: '5',
        date: new Date('2026-05-01T11:00:00'),
        location: { lat: 44.8412, lng: -0.5706, address: 'Quai des Chartrons', city: 'Bordeaux' },
        type: 'tete-a-tete',
        maxParticipants: 16,
        status: 'upcoming',
        participants: ['2', '5'],
        createdAt: new Date('2026-01-05'),
    },
    {
        id: '5',
        name: 'Concours du Dimanche - Toulouse',
        description: 'Rendez-vous hebdomadaire des pétanqueurs toulousains.',
        organizerId: '2',
        date: new Date('2026-01-26T14:00:00'),
        location: { lat: 43.6047, lng: 1.4442, address: 'Place du Capitole', city: 'Toulouse' },
        type: 'doublettes',
        maxParticipants: 24,
        status: 'upcoming',
        participants: ['2', '3', '5'],
        createdAt: new Date('2026-01-15'),
    },
];

// Matchs mockés
export const mockMatches: Match[] = [
    {
        id: '1',
        tournamentId: '1',
        round: 1,
        team1: ['1'],
        team2: ['2'],
        status: 'pending',
    },
    {
        id: '2',
        tournamentId: '1',
        round: 1,
        team1: ['4'],
        team2: ['5'],
        status: 'pending',
    },
];

// Helpers
export function getUserById(id: string): User | undefined {
    return mockUsers.find((u) => u.id === id);
}

export function getTournamentById(id: string): Tournament | undefined {
    return mockTournaments.find((t) => t.id === id);
}

export function getUpcomingTournaments(): Tournament[] {
    return mockTournaments
        .filter((t) => t.status === 'upcoming')
        .sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function getTopPlayers(limit: number = 10): User[] {
    return [...mockUsers]
        .sort((a, b) => b.eloRating - a.eloRating)
        .slice(0, limit);
}

export function getTournamentTypeLabel(type: TournamentType): string {
    const labels: Record<TournamentType, string> = {
        triplettes: 'Triplettes',
        doublettes: 'Doublettes',
        'tete-a-tete': 'Tête-à-tête',
    };
    return labels[type];
}

export function getStatusLabel(status: TournamentStatus): string {
    const labels: Record<TournamentStatus, string> = {
        upcoming: 'À venir',
        ongoing: 'En cours',
        completed: 'Terminé',
        cancelled: 'Annulé',
    };
    return labels[status];
}

export function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(date);
}

export function formatDateTime(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}
