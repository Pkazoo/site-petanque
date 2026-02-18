"use client";

import Link from "next/link";
import { MapPin, Trophy, Filter, Search, List, Users, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Tournament, User } from "@/types";

export default function CartePage() {
    const supabase = createClient();
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [players, setPlayers] = useState<any[]>([]); // Using any for tournament_players view
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'tournaments' | 'players'>('all');
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch upcoming tournaments
                const { data: tournamentsData, error: tournamentsError } = await supabase
                    .from("tournaments")
                    .select("*")
                    .eq("status", "upcoming")
                    .order("date", { ascending: true });

                if (tournamentsError) {
                    console.error("Error fetching tournaments:", tournamentsError);
                } else {
                    setTournaments(tournamentsData || []);
                }

                // Fetch players (limit to 50 for performance)
                const { data: playersData, error: playersError } = await supabase
                    .from("tournament_players")
                    .select("*")
                    .limit(50);

                if (playersError) {
                    console.error("Error fetching players:", playersError);
                } else {
                    setPlayers(playersData || []);
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Helper to format date
    const formatDate = (date: any) => {
        if (!date) return "";
        return new Date(date).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });
    };

    // Helper for tournament type label
    const getTournamentTypeLabel = (type: string) => {
        const types: Record<string, string> = {
            triplettes: "Triplette",
            doublettes: "Doublette",
            "tete-a-tete": "Tête-à-tête",
        };
        return types[type] || type;
    };

    // Filtering logic
    const filteredTournaments = tournaments.filter(t => {
        if (filter === 'players') return false;
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return t.name.toLowerCase().includes(query) ||
            (t.location?.city || '').toLowerCase().includes(query);
    });

    const filteredPlayers = players.filter(p => {
        if (filter === 'tournaments') return false;
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (p.first_name + ' ' + p.last_name).toLowerCase().includes(query) ||
            (p.city || '').toLowerCase().includes(query);
    });

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem-5rem)] md:h-[calc(100vh-4rem)]">
            {/* Sidebar */}
            <div className="w-full lg:w-96 bg-background border-b lg:border-b-0 lg:border-r border-border overflow-y-auto">
                <div className="p-4 space-y-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Rechercher un lieu, un tournoi..."
                            className="pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Filters */}
                    <div className="flex gap-2 flex-wrap">
                        <Button
                            variant={filter === 'tournaments' ? "default" : "secondary"}
                            size="sm"
                            className="gap-2"
                            onClick={() => setFilter(filter === 'tournaments' ? 'all' : 'tournaments')}
                        >
                            <Trophy className="h-4 w-4" />
                            Tournois
                        </Button>
                        <Button
                            variant={filter === 'players' ? "default" : "outline"}
                            size="sm"
                            className="gap-2"
                            onClick={() => setFilter(filter === 'players' ? 'all' : 'players')}
                        >
                            <Users className="h-4 w-4" />
                            Joueurs
                        </Button>
                        <Button variant="outline" size="sm" className="gap-2">
                            <Filter className="h-4 w-4" />
                            Filtres
                        </Button>
                    </div>

                    {/* Results */}
                    {loading ? (
                        <div className="p-4 text-center text-muted-foreground">Chargement...</div>
                    ) : (
                        <div className="space-y-3">
                            {/* Tournaments Section */}
                            {(filter === 'all' || filter === 'tournaments') && (
                                <>
                                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                                        <Trophy className="h-4 w-4 text-primary" />
                                        Tournois à proximité ({filteredTournaments.length})
                                    </h3>
                                    {filteredTournaments.length === 0 && (
                                        <p className="text-sm text-muted-foreground pl-6">Aucun tournoi trouvé.</p>
                                    )}
                                    {filteredTournaments.map((tournament) => (
                                        <Link key={tournament.id} href={`/tournois/${tournament.id}`}>
                                            <Card className="hover:shadow-md transition-all cursor-pointer relative overflow-hidden">
                                                {/* Official Badge Strip */}
                                                {tournament.is_official && (
                                                    <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-bl-lg font-bold flex items-center gap-1 z-10">
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        FFPJP
                                                    </div>
                                                )}

                                                <CardContent className="py-4">
                                                    <div className="flex gap-3">
                                                        {tournament.coverImage ? (
                                                            <img
                                                                src={tournament.coverImage}
                                                                alt={tournament.name}
                                                                className="w-16 h-16 rounded-lg object-cover shrink-0"
                                                            />
                                                        ) : (
                                                            <div className={`w-16 h-16 rounded-lg ${tournament.is_official ? 'bg-blue-600/10' : 'bg-primary/10'} flex items-center justify-center shrink-0`}>
                                                                <Trophy className={`h-6 w-6 ${tournament.is_official ? 'text-blue-600' : 'text-primary'}`} />
                                                            </div>
                                                        )}
                                                        <div className="min-w-0 flex-1">
                                                            <h4 className="font-medium text-foreground line-clamp-1 pr-12">
                                                                {tournament.name}
                                                            </h4>
                                                            <p className="text-sm text-muted-foreground">
                                                                {formatDate(tournament.date)}
                                                            </p>
                                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                                <Badge variant="outline" className="text-[10px]">
                                                                    {getTournamentTypeLabel(tournament.type)}
                                                                </Badge>
                                                                <span className="text-xs text-muted-foreground truncate">
                                                                    {tournament.location?.city}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </Link>
                                    ))}
                                </>
                            )}

                            {/* Players Section */}
                            {(filter === 'all' || filter === 'players') && (
                                <>
                                    <h3 className="font-semibold text-foreground flex items-center gap-2 pt-4">
                                        <Users className="h-4 w-4 text-primary" />
                                        Joueurs à proximité ({filteredPlayers.length})
                                    </h3>
                                    {filteredPlayers.length === 0 && (
                                        <p className="text-sm text-muted-foreground pl-6">Aucun joueur trouvé.</p>
                                    )}
                                    {filteredPlayers.map((player) => (
                                        <Link key={player.id} href={`/profil/${player.user_id || player.id}`}>
                                            <Card className="hover:shadow-md transition-all cursor-pointer">
                                                <CardContent className="py-3">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar
                                                            src={player.avatar_url} // Supabase column might be different? Using generic fallback
                                                            fallback={`${(player.first_name || '?')[0]}${(player.last_name || '')[0]}`}
                                                            className="h-10 w-10"
                                                        />
                                                        <div className="min-w-0 flex-1">
                                                            <h4 className="font-medium text-foreground">
                                                                {player.first_name} {player.last_name}
                                                            </h4>
                                                            <p className="text-sm text-muted-foreground">
                                                                {player.city || 'Ville inconnue'}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="font-semibold text-primary">
                                                                {player.elo_rating || 1000}
                                                            </div>
                                                            <div className="text-[10px] text-muted-foreground">
                                                                ELO
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </Link>
                                    ))}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Map Area */}
            <div className="flex-1 bg-muted/30 relative min-h-[300px] lg:min-h-0">
                {/* Placeholder Map */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center p-8">
                        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                            <MapPin className="h-12 w-12 text-primary" />
                        </div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">
                            Carte Interactive
                        </h3>
                        <p className="text-muted-foreground max-w-sm">
                            Cette fonctionnalité nécessite une clé API Mapbox ou Google Maps
                            pour afficher la carte en temps réel.
                        </p>

                        {/* Dynamic Map Pins (using real data) */}
                        <div className="mt-6 flex flex-wrap gap-3 justify-center max-w-md mx-auto">
                            {filteredTournaments.slice(0, 5).map((t, i) => (
                                <div
                                    key={t.id}
                                    className="bg-background rounded-lg shadow-lg p-2.5 flex items-center gap-2 animate-in fade-in zoom-in duration-500"
                                    style={{
                                        transform: `rotate(${(i - 2) * 3}deg)`,
                                        animationDelay: `${i * 100}ms`
                                    }}
                                >
                                    <MapPin className={`h-4 w-4 ${t.is_official ? 'text-blue-600' : 'text-primary'}`} />
                                    <span className="text-xs font-medium">{t.location?.city}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Map Controls (placeholder) */}
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                    <Button size="icon" variant="secondary" className="shadow-lg">
                        <List className="h-4 w-4" />
                    </Button>
                </div>

                {/* Zoom Controls (placeholder) */}
                <div className="absolute bottom-4 right-4 flex flex-col gap-1 bg-background rounded-lg shadow-lg overflow-hidden">
                    <Button
                        size="icon"
                        variant="ghost"
                        className="rounded-none border-b border-border"
                    >
                        +
                    </Button>
                    <Button size="icon" variant="ghost" className="rounded-none">
                        −
                    </Button>
                </div>
            </div>
        </div>
    );
}
