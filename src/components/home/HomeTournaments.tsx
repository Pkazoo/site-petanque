"use client";

import { useAuth } from "@/lib/context/AuthContext";
import { useTournament } from "@/lib/context/TournamentContext";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Calendar, MapPin, Trophy, Settings, ChevronRight } from "lucide-react";
import Link from "next/link";
import { formatDate, getTournamentTypeLabel } from "@/lib/mock/data";
import { getMobileUrl } from "@/lib/utils/getMobileUrl";

function TournamentQrCode({ tournamentId }: { tournamentId: string }) {
    const qrCodeUrl = typeof window !== 'undefined'
        ? `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(getMobileUrl(`/tournois/${tournamentId}/inscription`))}`
        : '';

    return (
        <div
            className="bg-white p-1.5 rounded-lg shadow-md border"
            onClick={(e) => e.stopPropagation()}
        >
            <img
                src={qrCodeUrl}
                alt="QR Code inscription"
                className="w-14 h-14"
            />
        </div>
    );
}

export function HomeTournaments() {
    const { user, isOrganisateur } = useAuth();
    const { tournaments } = useTournament();

    const upcomingTournaments = tournaments
        .filter(t => t.status === 'upcoming')
        .sort((a, b) => a.date.getTime() - b.date.getTime());

    // Filter logic: If organizer, ONLY show my tournaments. Else show all.
    const displayedTournaments = isOrganisateur && user
        ? upcomingTournaments.filter(t => t.organizerId === user.id)
        : upcomingTournaments.slice(0, 5); // Show up to 5 in list view

    if (displayedTournaments.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="inline-flex items-center justify-center p-4 bg-muted rounded-full mb-4">
                    <Trophy className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Aucun tournoi trouvé</h3>
                <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                    {isOrganisateur
                        ? "Vous n'avez pas encore créé de tournoi. Lancez-vous dès maintenant !"
                        : "Il n'y a pas de tournois à venir pour le moment. Revenez plus tard !"}
                </p>
                {isOrganisateur && (
                    <Link href="/tournois/creer">
                        <Button className="gap-2">
                            <Trophy className="h-4 w-4" />
                            Créer un tournoi
                        </Button>
                    </Link>
                )}
            </div>
        );
    }

    return (
        <section className="pt-16 md:pt-24 pb-24 md:pb-32 relative overflow-hidden">
            {/* Subtle background decoration */}
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />
            <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/3 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-3xl -z-10" />

            <div className="container mx-auto px-4">
                <div className="text-center mb-12 animate-fade-in">
                    <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/80 to-accent">
                            Mes tournois
                        </span>
                    </h2>
                    <div className="h-1 w-20 bg-primary/30 mx-auto rounded-full" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
                    {displayedTournaments.map((tournament) => (
                        <Link key={tournament.id} href={`/tournois/${tournament.id}`} className="group block">
                            <Card className="overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] hover:-translate-y-2 hover:border-primary/30 h-full flex flex-col sm:flex-row">
                                {/* Image Section - Fixed width on desktop */}
                                <div className="relative w-full sm:w-48 h-48 sm:h-full overflow-hidden bg-muted flex-shrink-0">
                                    {tournament.coverImage ? (
                                        <>
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10 opacity-60 group-hover:opacity-40 transition-opacity" />
                                            <img
                                                src={tournament.coverImage}
                                                alt=""
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                                            />
                                        </>
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-primary/10 to-secondary/20 flex items-center justify-center">
                                            <Trophy className="h-10 w-10 text-primary/20" />
                                        </div>
                                    )}
                                    {/* Badges on image */}
                                    <div className="absolute top-3 left-3 flex flex-col gap-2 z-20">
                                        <Badge variant={tournament.status === 'upcoming' ? 'default' : 'secondary'} className="shadow-lg backdrop-blur-md bg-primary/90 border-none px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-bold">
                                            {tournament.status === 'upcoming' ? 'Ouvert' : 'En cours'}
                                        </Badge>
                                    </div>
                                </div>

                                {/* Content Section */}
                                <div className="p-5 flex-1 flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 text-[10px] uppercase tracking-widest px-2 py-0 border">
                                                {getTournamentTypeLabel(tournament.type)}
                                            </Badge>
                                            <TournamentQrCode tournamentId={tournament.id} />
                                        </div>
                                        <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors line-clamp-1">
                                            {tournament.name}
                                        </h3>
                                        <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground mb-4">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1 rounded-md bg-primary/10">
                                                    <Calendar className="h-3.5 w-3.5 text-primary" />
                                                </div>
                                                <span className="font-medium text-foreground/80">{formatDate(tournament.date)}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="p-1 rounded-md bg-secondary/10">
                                                    <MapPin className="h-3.5 w-3.5 text-secondary-foreground" />
                                                </div>
                                                <span className="truncate">{tournament.location.city}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between text-xs font-semibold">
                                                <span className="text-muted-foreground uppercase tracking-tighter">Inscrits</span>
                                                <span className="text-primary">{tournament.participants.length} / {tournament.maxParticipants}</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-1000 ease-out rounded-full"
                                                    style={{ width: `${(tournament.participants.length / tournament.maxParticipants) * 100}%` }}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-end pt-2 border-t border-border/50">
                                            {isOrganisateur && tournament.organizerId === user?.id ? (
                                                <Button size="sm" className="w-full sm:w-auto h-9 px-4 rounded-xl gap-2 font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all">
                                                    <Settings className="h-4 w-4" />
                                                    Tableau de bord
                                                </Button>
                                            ) : (
                                                <div className="flex items-center text-primary font-bold text-sm uppercase tracking-widest group-hover:gap-3 gap-2 transition-all">
                                                    Détails
                                                    <ChevronRight className="h-4 w-4" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
