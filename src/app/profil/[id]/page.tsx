"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    MapPin,
    Calendar,
    Trophy,
    BarChart3,
    MessageCircle,
    QrCode,
    Award,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
} from "@/components/ui/Dialog";
import {
    formatDate,
} from "@/lib/mock/data";
import { useTournament } from "@/lib/context/TournamentContext";
import { getMobileUrl } from "@/lib/utils/getMobileUrl";
import { computeEloRatings, INITIAL_ELO } from "@/lib/utils/elo";

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { getPlayer, teams, matches, tournaments, leagueMatches } = useTournament();
    const user = getPlayer(id);

    // Compute real stats for this player
    const stats = useMemo(() => {
        if (!user) return { wins: 0, losses: 0, tournamentsPlayed: 0, tournamentsWon: 0 };

        const playerTeams = teams.filter(t => t.playerIds.includes(user.id));
        const playerTeamIds = playerTeams.map(t => t.id);

        let wins = 0;
        let losses = 0;

        // Tournament matches
        for (const match of matches) {
            if (match.status !== 'completed' || !match.winnerId) continue;
            const isTeam1 = match.team1Id && playerTeamIds.includes(match.team1Id);
            const isTeam2 = match.team2Id && playerTeamIds.includes(match.team2Id);
            if (!isTeam1 && !isTeam2) continue;

            if (isTeam1 && match.winnerId === match.team1Id) wins++;
            else if (isTeam2 && match.winnerId === match.team2Id) wins++;
            else losses++;
        }

        // League matches
        for (const lm of leagueMatches) {
            if (lm.status !== 'completed' || !lm.winner_team_index) continue;
            const inTeam1 = lm.team1_player_ids?.includes(user.id);
            const inTeam2 = lm.team2_player_ids?.includes(user.id);
            if (!inTeam1 && !inTeam2) continue;

            if (lm.winner_team_index === 1 && inTeam1) wins++;
            else if (lm.winner_team_index === 2 && inTeam2) wins++;
            else losses++;
        }

        // Tournaments played & won
        const playerTournamentIds = [...new Set(playerTeams.map(t => t.tournamentId))];
        let tournamentsWon = 0;
        for (const tid of playerTournamentIds) {
            const tournament = tournaments.find(t => t.id === tid);
            if (tournament?.status === 'completed') {
                const tMatches = matches.filter(m => m.tournamentId === tid);
                const finalMatch = tMatches.find(m => m.round === Math.max(...tMatches.map(tm => tm.round)));
                if (finalMatch?.winnerId && playerTeamIds.includes(finalMatch.winnerId)) {
                    tournamentsWon++;
                }
            }
        }

        return { wins, losses, tournamentsPlayed: playerTournamentIds.length, tournamentsWon };
    }, [user, teams, matches, tournaments, leagueMatches]);

    // Compute ELO rating
    const eloRating = useMemo(() => {
        if (!user) return INITIAL_ELO;
        const ratings = computeEloRatings(teams, matches, leagueMatches);
        return ratings.get(user.id) ?? INITIAL_ELO;
    }, [user, teams, matches, leagueMatches]);

    if (!user) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-4xl text-center">
                <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">Profil introuvable</h2>
                <p className="text-muted-foreground mb-4">
                    Ce joueur n'existe pas ou a été supprimé.
                </p>
                <Link href="/classement">
                    <Button>Retour au classement</Button>
                </Link>
            </div>
        );
    }

    // Real tournaments this player participated in
    const userTournaments = useMemo(() => {
        if (!user) return [];
        const playerTeams = teams.filter(t => t.playerIds.includes(user.id));
        const tournamentIds = [...new Set(playerTeams.map(t => t.tournamentId))];
        return tournaments.filter(t => tournamentIds.includes(t.id));
    }, [user, teams, tournaments]);

    const winRate =
        stats.wins + stats.losses > 0
            ? Math.round(
                (stats.wins / (stats.wins + stats.losses)) * 100
            )
            : 0;

    const badges = [
        { id: "champion-regional", label: "Champion Régional", icon: "🏆" },
        { id: "veteran", label: "Vétéran", icon: "⭐" },
        { id: "100-victoires", label: "100 Victoires", icon: "💯" },
        { id: "200-victoires", label: "200 Victoires", icon: "🔥" },
        { id: "champion-france", label: "Champion de France", icon: "🇫🇷" },
        { id: "tireur-elite", label: "Tireur d'Élite", icon: "🎯" },
        { id: "premiere-victoire", label: "Première Victoire", icon: "🌟" },
        { id: "premiere-partie", label: "Première Partie", icon: "🎱" },
        { id: "organisateur", label: "Organisateur", icon: "📋" },
        { id: "50-victoires", label: "50 Victoires", icon: "🎉" },
    ];

    const userBadges = badges.filter((b) => user.badges.includes(b.id));

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            {/* Back button */}
            <Link
                href="/classement"
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
            >
                <ArrowLeft className="h-4 w-4" />
                Retour au classement
            </Link>

            {/* Profile Header */}
            <Card className="mb-6 overflow-hidden">
                <div className="h-32 bg-gradient-to-r from-primary to-accent" />
                <CardContent className="relative pt-0">
                    <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-16 sm:-mt-12">
                        <Avatar
                            src={user.avatar}
                            fallback={`${user.firstName[0]}${user.lastName[0]}`}
                            size="xl"
                            className="h-28 w-28 border-4 border-background shadow-lg"
                        />
                        <div className="flex-1 pb-2">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                <h1 className="text-2xl font-bold text-foreground">
                                    {user.firstName} {user.lastName}
                                </h1>
                            </div>
                            <p className="text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {user.location.city}, {user.location.region}
                            </p>
                        </div>
                        <div className="flex gap-2 sm:pb-2">
                            <Button className="gap-2" onClick={() => router.push(`/messages?userId=${user.id}`)}>
                                <MessageCircle className="h-4 w-4" />
                                Message
                            </Button>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="icon">
                                        <QrCode className="h-4 w-4" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle className="flex items-center gap-2">
                                            <QrCode className="h-5 w-5" />
                                            QR Code du profil
                                        </DialogTitle>
                                        <DialogDescription>
                                            Scannez ce QR code pour accéder à ce profil
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="flex flex-col items-center gap-4 py-4">
                                        <div className="bg-white p-4 rounded-lg shadow-inner">
                                            <img
                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(getMobileUrl(`/profil/${user.id}`))}`}
                                                alt="QR Code du profil"
                                                className="w-48 h-48"
                                            />
                                        </div>
                                        <p className="text-sm text-muted-foreground text-center">
                                            {user.firstName} {user.lastName}
                                        </p>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>

                    {user.bio && (
                        <p className="mt-6 text-foreground">{user.bio}</p>
                    )}
                </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <Card>
                    <CardContent className="py-4 text-center">
                        <div className="text-3xl font-bold text-primary">
                            {eloRating}
                        </div>
                        <p className="text-sm text-muted-foreground">ELO</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="py-4 text-center">
                        <div className="text-3xl font-bold text-foreground">{winRate}%</div>
                        <p className="text-sm text-muted-foreground">Victoires</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="py-4 text-center">
                        <div className="text-3xl font-bold text-foreground">
                            {stats.tournamentsPlayed}
                        </div>
                        <p className="text-sm text-muted-foreground">Tournois</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="py-4 text-center">
                        <div className="text-3xl font-bold text-foreground">
                            {stats.tournamentsWon}
                        </div>
                        <p className="text-sm text-muted-foreground">Victoires T.</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Badges */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Award className="h-5 w-5 text-primary" />
                            Badges ({userBadges.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {userBadges.length > 0 ? (
                            <div className="flex flex-wrap gap-3">
                                {userBadges.map((badge) => (
                                    <div
                                        key={badge.id}
                                        className="flex items-center gap-2 bg-muted rounded-full px-4 py-2"
                                    >
                                        <span className="text-xl">{badge.icon}</span>
                                        <span className="text-sm font-medium">{badge.label}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-center py-4">
                                Aucun badge pour le moment
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Statistics */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-primary" />
                            Statistiques
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Victoires</span>
                            <span className="font-semibold text-green-600">
                                {stats.wins}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Défaites</span>
                            <span className="font-semibold text-red-500">
                                {stats.losses}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Parties jouées</span>
                            <span className="font-semibold">
                                {stats.wins + stats.losses}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Membre depuis</span>
                            <span className="font-semibold">{formatDate(user.createdAt)}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Tournaments */}
            <Card className="mt-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-primary" />
                        Tournois récents
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {userTournaments.length > 0 ? (
                        <div className="space-y-3">
                            {userTournaments.map((tournament) => (
                                <Link key={tournament.id} href={`/tournois/${tournament.id}`}>
                                    <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                                        {tournament.coverImage ? (
                                            <img
                                                src={tournament.coverImage}
                                                alt={tournament.name}
                                                className="w-16 h-16 rounded-lg object-cover"
                                            />
                                        ) : (
                                            <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <Trophy className="h-6 w-6 text-primary" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-foreground truncate">
                                                {tournament.name}
                                            </h4>
                                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {formatDate(tournament.date)}
                                            </p>
                                        </div>
                                        <Badge variant="outline">{tournament.location.city}</Badge>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-center py-8">
                            Aucun tournoi pour le moment
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
