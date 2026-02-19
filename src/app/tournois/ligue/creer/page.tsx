"use client";


import Link from "next/link";
import { ArrowLeft, Users, Plus, X, Shuffle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { useTournament } from "@/lib/context/TournamentContext";
import { useAuth } from "@/lib/context/AuthContext";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { LeagueMode } from "@/types";
import { estimateMatchCount } from "@/lib/utils/roundRobinGenerator";

export default function CreateLeaguePage() {
    const router = useRouter();
    const { addLeague, players } = useTournament();
    const { user } = useAuth();

    const [mode, setMode] = useState<LeagueMode | null>(null);
    const [matchFormat, setMatchFormat] = useState<'tete-a-tete' | 'doublette' | 'triplettes'>('doublette');
    const [endDate, setEndDate] = useState("");

    const [formData, setFormData] = useState({
        name: "",
        description: "",
    });

    const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    const minPlayers = mode === 'round_robin'
        ? (matchFormat === 'tete-a-tete' ? 2 : matchFormat === 'doublette' ? 4 : 6)
        : 2;

    // Filtrer les joueurs pour la recherche
    const filteredPlayers = useMemo(() => {
        const availablePlayers = players.filter(p => !selectedPlayerIds.includes(p.id));
        if (!searchQuery) return availablePlayers.slice(0, 10);

        return availablePlayers.filter(p =>
            (`${p.firstName} ${p.lastName} ${p.username || ""}`).toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [players, selectedPlayerIds, searchQuery]);

    const handleSelectPlayer = (playerId: string) => {
        setSelectedPlayerIds(prev => [...prev, playerId]);
        setSearchQuery("");
    };

    const handleRemovePlayer = (playerId: string) => {
        setSelectedPlayerIds(prev => prev.filter(id => id !== playerId));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!mode) {
            alert("Veuillez choisir un mode de ligue.");
            return;
        }

        if (!formData.name) {
            alert("Veuillez donner un nom à votre ligue.");
            return;
        }

        if (selectedPlayerIds.length < minPlayers) {
            alert(`Veuillez sélectionner au moins ${minPlayers} participants pour ce format.`);
            return;
        }

        setIsCreating(true);
        try {
            const leagueId = await addLeague({
                name: formData.name,
                description: formData.description,
                created_by: user?.id || 'anonymous',
                participant_ids: selectedPlayerIds,
                mode,
                match_format: mode === 'round_robin' ? matchFormat : undefined,
                end_date: mode === 'free' && endDate ? new Date(endDate).toISOString() : undefined,
            });

            if (leagueId) {
                router.push(`/tournois/ligue/${leagueId}`);
            }
        } catch (err: any) {
            console.error("Error creating league:", err);
            const errorMessage = err.message || err.details || "Une erreur inconnue est survenue.";
            alert(`Erreur lors de la création de la ligue : ${errorMessage}`);
            setIsCreating(false);
        }
    };

    return (
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-3xl">
            <Link
                href="/tournois"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 sm:mb-6 transition-colors"
            >
                <ArrowLeft className="h-3.5 w-3.5" />
                Retour aux tournois
            </Link>

            <div className="mb-5 sm:mb-8">
                <h1 className="text-xl sm:text-3xl font-bold text-foreground">Créer une Ligue entre Amis</h1>
                <p className="text-sm text-muted-foreground mt-1 sm:mt-2">
                    Un championnat à long terme avec classement automatique.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Step 1: Mode Selection */}
                <Card>
                    <CardHeader>
                        <CardTitle>Mode de la ligue</CardTitle>
                        <CardDescription>
                            Choisissez comment les matchs seront organisés.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <button
                                type="button"
                                onClick={() => setMode('round_robin')}
                                className={`p-4 sm:p-6 rounded-xl border-2 text-left transition-all ${
                                    mode === 'round_robin'
                                        ? 'border-primary bg-primary/5 shadow-md'
                                        : 'border-border hover:border-primary/40 hover:bg-muted/50'
                                }`}
                                disabled={isCreating}
                            >
                                <Shuffle className="h-6 w-6 sm:h-8 sm:w-8 text-primary mb-2 sm:mb-3" />
                                <h3 className="font-semibold text-base sm:text-lg mb-0.5 sm:mb-1">Tous contre tous</h3>
                                <p className="text-xs sm:text-sm text-muted-foreground">
                                    Matchs générés automatiquement. Équipes mélangées à chaque tour.
                                </p>
                            </button>

                            <button
                                type="button"
                                onClick={() => setMode('free')}
                                className={`p-4 sm:p-6 rounded-xl border-2 text-left transition-all ${
                                    mode === 'free'
                                        ? 'border-primary bg-primary/5 shadow-md'
                                        : 'border-border hover:border-primary/40 hover:bg-muted/50'
                                }`}
                                disabled={isCreating}
                            >
                                <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-primary mb-2 sm:mb-3" />
                                <h3 className="font-semibold text-base sm:text-lg mb-0.5 sm:mb-1">Ligue sur durée</h3>
                                <p className="text-xs sm:text-sm text-muted-foreground">
                                    Matchs créés librement par les joueurs. Définissez une date de fin.
                                </p>
                            </button>
                        </div>
                    </CardContent>
                </Card>

                {mode && (
                    <>
                        {/* Basic Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Informations de la ligue</CardTitle>
                                <CardDescription>
                                    Définissez le nom et l&apos;objectif de votre ligue.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Nom de la ligue *
                                    </label>
                                    <Input
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Ex: Les Boulomanes du Dimanche"
                                        disabled={isCreating}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        className="flex min-h-[100px] w-full rounded-lg border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200 resize-none"
                                        placeholder="Ex: Championnat annuel entre collègues..."
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        disabled={isCreating}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Round-Robin: Format Selection */}
                        {mode === 'round_robin' && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Format des matchs</CardTitle>
                                    <CardDescription>
                                        Tous les matchs utiliseront ce format. Les équipes seront mélangées à chaque tour.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                                        {([
                                            { value: 'tete-a-tete' as const, label: 'Tête-à-tête', sub: '1 vs 1' },
                                            { value: 'doublette' as const, label: 'Doublette', sub: '2 vs 2' },
                                            { value: 'triplettes' as const, label: 'Triplettes', sub: '3 vs 3' },
                                        ]).map(fmt => (
                                            <Button
                                                key={fmt.value}
                                                type="button"
                                                variant={matchFormat === fmt.value ? "default" : "outline"}
                                                onClick={() => setMatchFormat(fmt.value)}
                                                className="h-auto py-2 sm:py-3 flex-col gap-0.5 text-xs sm:text-sm px-1 sm:px-4"
                                                disabled={isCreating}
                                            >
                                                <span className="font-semibold">{fmt.label}</span>
                                                <span className="text-[10px] sm:text-xs opacity-70">{fmt.sub}</span>
                                            </Button>
                                        ))}
                                    </div>
                                    {selectedPlayerIds.length >= minPlayers && (
                                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm">
                                            <span className="font-semibold text-primary">
                                                {estimateMatchCount(selectedPlayerIds.length, matchFormat)} matchs
                                            </span>
                                            {' '}seront générés pour {selectedPlayerIds.length} joueurs
                                        </div>
                                    )}
                                    {selectedPlayerIds.length > 0 && selectedPlayerIds.length < minPlayers && (
                                        <p className="text-sm text-destructive">
                                            Minimum {minPlayers} joueurs requis pour le format {matchFormat}
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Free Mode: End Date */}
                        {mode === 'free' && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Date de fin</CardTitle>
                                    <CardDescription>
                                        Après cette date, le classement sera figé et aucun nouveau match ne pourra être ajouté.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        min={new Date().toISOString().split('T')[0]}
                                        disabled={isCreating}
                                    />
                                </CardContent>
                            </Card>
                        )}

                        {/* Participants Selection */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Participants</CardTitle>
                                <CardDescription>
                                    Sélectionnez les joueurs qui rejoindront cette ligue
                                    {mode === 'round_robin' && ` (minimum ${minPlayers})`}.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Selected Players */}
                                <div className="flex flex-wrap gap-2">
                                    {selectedPlayerIds.map(id => {
                                        const p = players.find(player => player.id === id);
                                        if (!p) return null;
                                        return (
                                            <Badge key={id} variant="secondary" className="pl-1 pr-1 py-1 gap-2 h-9">
                                                <Avatar
                                                    className="h-7 w-7"
                                                    src={p.avatar}
                                                    fallback={p.firstName[0]}
                                                />
                                                <span className="max-w-[120px] truncate">{p.firstName} {p.lastName}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemovePlayer(id)}
                                                    className="hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
                                                    disabled={isCreating}
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </Badge>
                                        );
                                    })}
                                    {selectedPlayerIds.length === 0 && (
                                        <p className="text-sm text-muted-foreground italic">Aucun participant sélectionné.</p>
                                    )}
                                </div>

                                {/* Search & Suggestions */}
                                <div className="space-y-4">
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Input
                                                placeholder="Rechercher un joueur..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="pl-10"
                                                disabled={isCreating}
                                            />
                                            <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        </div>
                                    </div>

                                    <div className="border rounded-lg overflow-hidden">
                                        <div className="bg-muted/50 px-4 py-2 text-xs font-medium border-b flex justify-between items-center">
                                            <span>Joueurs disponibles</span>
                                            {searchQuery && <span>Résultats pour &quot;{searchQuery}&quot;</span>}
                                        </div>
                                        <div className="max-h-[300px] overflow-y-auto divide-y bg-background">
                                            {filteredPlayers.length > 0 ? (
                                                filteredPlayers.map(p => (
                                                    <button
                                                        key={p.id}
                                                        type="button"
                                                        onClick={() => handleSelectPlayer(p.id)}
                                                        className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left"
                                                        disabled={isCreating}
                                                    >
                                                        <Avatar
                                                            className="h-8 w-8"
                                                            src={p.avatar}
                                                            fallback={p.firstName[0]}
                                                        />
                                                        <div className="flex-1">
                                                            <div className="font-medium text-sm">{p.firstName} {p.lastName}</div>
                                                            <div className="text-xs text-muted-foreground">@{p.username || p.firstName.toLowerCase()}</div>
                                                        </div>
                                                        <Plus className="h-4 w-4 text-primary" />
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="p-8 text-center text-sm text-muted-foreground">
                                                    Aucun joueur trouvé.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-primary/5 border border-primary/20 p-3 sm:p-4 rounded-lg flex items-start gap-2 sm:gap-3">
                                    <Plus className="h-4 w-4 sm:h-5 sm:w-5 text-primary mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium">Un joueur manque ?</p>
                                        <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1">
                                            Demandez-lui de créer un compte sur la plateforme.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Submit */}
                        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-4 sm:justify-end">
                            <Link href="/tournois" className="w-full sm:w-auto">
                                <Button variant="outline" type="button" disabled={isCreating} className="w-full sm:w-auto">
                                    Annuler
                                </Button>
                            </Link>
                            <Button type="submit" size="lg" disabled={selectedPlayerIds.length < minPlayers || isCreating} className="w-full sm:w-auto">
                                {isCreating ? "Création en cours..." : "Créer la ligue"}
                            </Button>
                        </div>
                    </>
                )}
            </form>
        </div>
    );
}
