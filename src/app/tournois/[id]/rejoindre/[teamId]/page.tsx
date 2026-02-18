"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    Users,
    UserPlus,
    Loader2,
    CheckCircle,
    AlertCircle,
    Calendar,
    MapPin,
    Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { useTournament } from "@/lib/context/TournamentContext";
import { useAuth } from "@/lib/context/AuthContext";
import { formatDate, getTournamentTypeLabel } from "@/lib/mock/data";

function getRequiredTeamSize(type: string): number {
    switch (type) {
        case 'tete-a-tete': return 1;
        case 'doublettes': return 2;
        case 'triplettes': return 3;
        default: return 2;
    }
}

export default function RejoindreEquipePage({ params }: { params: Promise<{ id: string; teamId: string }> }) {
    const { id, teamId } = use(params);
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { getTournament, getTeam, getPlayer, getPlayerByUserId, addPlayerToTeam, addPlayer } = useTournament();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const tournament = getTournament(id);
    const team = getTeam(teamId);

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!authLoading && !user) {
            router.push(`/connexion?redirect=/tournois/${id}/rejoindre/${teamId}`);
        }
    }, [authLoading, user, router, id, teamId]);

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) return null;

    if (!tournament || !team) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-lg text-center">
                <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Tournoi ou équipe introuvable</h2>
                <p className="text-muted-foreground mb-4">Le lien que vous avez scanné n&apos;est plus valide.</p>
                <Link href="/tournois">
                    <Button>Voir les tournois</Button>
                </Link>
            </div>
        );
    }

    const requiredSize = getRequiredTeamSize(tournament.type);
    const isTeamFull = team.playerIds.length >= requiredSize;
    const existingPlayer = getPlayerByUserId(user.id);
    const isAlreadyInTeam = existingPlayer && team.playerIds.includes(existingPlayer.id);
    const isAlreadyInTournament = existingPlayer && tournament.participants.includes(existingPlayer.id);

    const teamPlayers = team.playerIds.map(pid => getPlayer(pid)).filter(Boolean);

    const handleJoin = async () => {
        setError(null);
        setLoading(true);

        try {
            let playerId = existingPlayer?.id;

            // Create player if not exists
            if (!playerId) {
                const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Joueur';
                const [fName, ...lNameParts] = displayName.split(' ');
                playerId = await addPlayer({
                    firstName: fName || 'Joueur',
                    lastName: lNameParts.join(' ') || '',
                    username: user.email?.split('@')[0] || 'joueur',
                    email: user.email || '',
                    location: { city: tournament.location.city, lat: 0, lng: 0 },
                }, user.id);
            }

            await addPlayerToTeam(teamId, playerId);
            setSuccess(true);
            setTimeout(() => {
                router.push('/mes-tournois');
            }, 2000);
        } catch (err: any) {
            setError(err?.message || "Erreur lors de l'inscription");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-lg">
            <Link
                href={`/tournois/${tournament.id}`}
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
            >
                <ArrowLeft className="h-4 w-4" />
                Détail du tournoi
            </Link>

            {/* Tournament Info */}
            <Card className="mb-6">
                <CardContent className="py-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">{getTournamentTypeLabel(tournament.type)}</Badge>
                        <Badge variant={tournament.status === 'upcoming' ? 'success' : 'warning'}>
                            {tournament.status === 'upcoming' ? 'Inscriptions ouvertes' : 'En cours'}
                        </Badge>
                    </div>
                    <h2 className="text-xl font-bold mb-2">{tournament.name}</h2>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(tournament.date)}
                        </span>
                        <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {tournament.location.city}
                        </span>
                    </div>
                </CardContent>
            </Card>

            {/* Team Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        Rejoindre l&apos;équipe
                    </CardTitle>
                    <CardDescription>
                        {team.name || 'Équipe'} • {team.playerIds.length}/{requiredSize} joueurs
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Current team members */}
                    <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Membres actuels</p>
                        <div className="space-y-2">
                            {teamPlayers.map(player => player && (
                                <div key={player.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                                    <Avatar
                                        src={player.avatar}
                                        fallback={player.firstName[0]}
                                        size="sm"
                                    />
                                    <div>
                                        <p className="font-medium text-sm">{player.firstName} {player.lastName}</p>
                                        <p className="text-xs text-muted-foreground">{player.location?.city || ''}</p>
                                    </div>
                                </div>
                            ))}
                            {/* Empty slots */}
                            {Array.from({ length: requiredSize - team.playerIds.length }).map((_, i) => (
                                <div key={`empty-${i}`} className="flex items-center gap-3 p-2 rounded-lg border-2 border-dashed border-orange-300 bg-orange-50/50">
                                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                                        <UserPlus className="h-4 w-4 text-orange-500" />
                                    </div>
                                    <p className="text-sm text-orange-600 font-medium">Place disponible</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Status messages */}
                    {success && (
                        <div className="p-3 bg-green-100 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-sm">
                            <CheckCircle className="h-4 w-4 shrink-0" />
                            Vous avez rejoint l&apos;équipe ! Redirection...
                        </div>
                    )}

                    {error && (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive text-sm">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    {!success && (
                        <>
                            {isAlreadyInTeam ? (
                                <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-sm text-primary">
                                    <CheckCircle className="h-4 w-4 inline mr-2" />
                                    Vous faites déjà partie de cette équipe
                                </div>
                            ) : isAlreadyInTournament ? (
                                <div className="p-3 bg-orange-100 border border-orange-200 rounded-lg text-sm text-orange-700">
                                    <AlertCircle className="h-4 w-4 inline mr-2" />
                                    Vous êtes déjà inscrit dans une autre équipe de ce tournoi
                                </div>
                            ) : isTeamFull ? (
                                <div className="p-3 bg-muted border border-border rounded-lg text-sm text-muted-foreground">
                                    <Users className="h-4 w-4 inline mr-2" />
                                    Cette équipe est déjà complète ({requiredSize}/{requiredSize})
                                </div>
                            ) : tournament.status !== 'upcoming' ? (
                                <div className="p-3 bg-muted border border-border rounded-lg text-sm text-muted-foreground">
                                    <AlertCircle className="h-4 w-4 inline mr-2" />
                                    Les inscriptions sont fermées pour ce tournoi
                                </div>
                            ) : (
                                <Button
                                    className="w-full gap-2"
                                    size="lg"
                                    onClick={handleJoin}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Inscription...
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus className="h-4 w-4" />
                                            Rejoindre cette équipe
                                        </>
                                    )}
                                </Button>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
