"use client";

import Link from "next/link";
import { ArrowLeft, Calendar, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTournament } from "@/lib/context/TournamentContext";
import { useAuth } from "@/lib/context/AuthContext";
import { TournamentType, TournamentFormat } from "@/types";
import { Swords, Grid3X3 } from "lucide-react";

export default function CreateTournamentPage() {
    console.log("Rendering CreateTournamentPage");
    const router = useRouter();
    const { addTournament } = useTournament();
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        date: "",
        time: "",
        address: "",
        city: "",
        zipCode: "",
        type: "triplettes" as TournamentType,
        maxParticipants: "32",
        visibility: "public",
        terrainEnabled: false,
        terrainCount: "4",
        format: "elimination" as TournamentFormat,
        poolSize: "3",
        qualifiersPerPool: "1",
        consolationEnabled: false,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Validation des champs obligatoires
            if (!formData.name.trim()) {
                alert("Veuillez saisir un nom pour le tournoi.");
                return;
            }
            if (!formData.date || !formData.time) {
                alert("Veuillez saisir une date et une heure.");
                return;
            }

            // Combiner date et heure
            const fullDate = new Date(`${formData.date}T${formData.time}`);
            if (isNaN(fullDate.getTime())) {
                alert("La date ou l'heure saisie est invalide.");
                return;
            }

            const tournamentId = await addTournament({
                name: formData.name,
                description: formData.description,
                date: fullDate,
                location: {
                    lat: 0, lng: 0, // Placeholder
                    address: formData.address,
                    city: formData.city
                },
                type: formData.type,
                maxParticipants: Number(formData.maxParticipants) || 32,
                status: 'upcoming',
                organizerId: user?.id || '',
                terrainCount: formData.terrainEnabled ? Number(formData.terrainCount) || 4 : undefined,
                format: formData.format,
                poolSize: formData.format === 'pools_elimination' ? (Number(formData.poolSize) as 3 | 4) : undefined,
                qualifiersPerPool: formData.format === 'pools_elimination' ? (Number(formData.qualifiersPerPool) as 1 | 2) : undefined,
                consolationEnabled: formData.format === 'elimination' ? formData.consolationEnabled : false,
            });



            if (!tournamentId) throw new Error("ID tournoi manquant");

            const url = `/tournois/${tournamentId}/gestion`;


            router.push(url);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Erreur inconnue";
            alert("Erreur lors de la création : " + message);
            console.error(err);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-3xl">
            {/* Back button */}
            <Link
                href="/tournois"
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
            >
                <ArrowLeft className="h-4 w-4" />
                Retour aux tournois
            </Link>

            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground">Créer un tournoi</h1>
                <p className="text-muted-foreground mt-2">
                    Remplissez les informations pour créer votre tournoi
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                {/* Basic Info */}
                <Card>
                    <CardHeader>
                        <CardTitle>Informations générales</CardTitle>
                        <CardDescription>
                            Les informations principales de votre tournoi
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Nom du tournoi *
                            </label>
                            <Input
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ex: Grand Tournoi de Marseille"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Description
                            </label>
                            <textarea
                                className="flex min-h-[120px] w-full rounded-lg border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200 resize-none"
                                placeholder="Décrivez votre tournoi..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Date & Location */}
                <Card>
                    <CardHeader>
                        <CardTitle>Date et lieu</CardTitle>
                        <CardDescription>
                            Quand et où se déroule votre tournoi
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    <Calendar className="h-4 w-4 inline mr-2" />
                                    Date *
                                </label>
                                <Input
                                    type="date"
                                    required
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Heure *
                                </label>
                                <Input
                                    type="time"
                                    required
                                    value={formData.time}
                                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                <MapPin className="h-4 w-4 inline mr-2" />
                                Adresse *
                            </label>
                            <Input
                                required
                                placeholder="Ex: Boulodrome du Prado"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            />
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Ville *
                                </label>
                                <Input
                                    required
                                    placeholder="Ex: Marseille"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Code postal
                                </label>
                                <Input
                                    placeholder="Ex: 13008"
                                    value={formData.zipCode}
                                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Tournament Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle>Paramètres du tournoi</CardTitle>
                        <CardDescription>
                            Définissez le format et les règles
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Type de tournoi *
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { value: "triplettes", label: "Triplettes", desc: "3 joueurs" },
                                    { value: "doublettes", label: "Doublettes", desc: "2 joueurs" },
                                    { value: "tete-a-tete", label: "Tête-à-tête", desc: "1 joueur" },
                                ].map((type) => (
                                    <div
                                        key={type.value}
                                        onClick={() => setFormData({ ...formData, type: type.value as TournamentType })}
                                        className={`border-2 rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors ${formData.type === type.value
                                            ? "border-primary bg-primary/5"
                                            : "border-border"
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="type"
                                            value={type.value}
                                            className="hidden"
                                            checked={formData.type === type.value}
                                            readOnly
                                        />
                                        <p className="font-medium text-foreground">{type.label}</p>
                                        <p className="text-xs text-muted-foreground">{type.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                <Users className="h-4 w-4 inline mr-2" />
                                Nombre max d&apos;équipes (environ)
                            </label>
                            <Input
                                type="number"
                                min="4"
                                max="128"
                                placeholder="Ex: 32"
                                value={formData.maxParticipants}
                                onChange={(e) => setFormData({ ...formData, maxParticipants: e.target.value })}
                                onBlur={() => { if (!formData.maxParticipants || Number(formData.maxParticipants) < 4) setFormData({ ...formData, maxParticipants: "4" }); }}
                            />
                        </div>

                        {/* Format de competition */}
                        <div className="border-t border-border pt-4">
                            <label className="block text-sm font-medium text-foreground mb-3">
                                Format de compétition *
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <div
                                    onClick={() => setFormData({ ...formData, format: 'elimination' })}
                                    className={`border-2 rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-colors ${formData.format === 'elimination' ? 'border-primary bg-primary/5' : 'border-border'}`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <Swords className="h-5 w-5 text-primary" />
                                        <p className="font-medium text-foreground">Élimination directe</p>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Chaque match perdu = éliminé</p>
                                </div>
                                <div
                                    onClick={() => setFormData({ ...formData, format: 'pools_elimination' })}
                                    className={`border-2 rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-colors ${formData.format === 'pools_elimination' ? 'border-primary bg-primary/5' : 'border-border'}`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <Grid3X3 className="h-5 w-5 text-primary" />
                                        <p className="font-medium text-foreground">Poules + Élimination</p>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Phase de groupes puis tableau final</p>
                                </div>
                            </div>

                            {/* Options elimination directe */}
                            {formData.format === 'elimination' && (
                                <div className="mt-4 flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                                    <div>
                                        <label className="text-sm font-medium text-foreground">
                                            Consolante
                                        </label>
                                        <p className="text-xs text-muted-foreground">
                                            Les perdants du 1er tour jouent entre eux
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={formData.consolationEnabled}
                                        onClick={() => setFormData({ ...formData, consolationEnabled: !formData.consolationEnabled })}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.consolationEnabled ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.consolationEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                            )}

                            {/* Options poules */}
                            {formData.format === 'pools_elimination' && (
                                <div className="mt-4 space-y-3 p-3 rounded-lg bg-muted/50 border">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-1.5">
                                                Taille des poules
                                            </label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {["3", "4"].map(v => (
                                                    <div
                                                        key={v}
                                                        onClick={() => setFormData({ ...formData, poolSize: v })}
                                                        className={`border-2 rounded-lg py-2 text-center cursor-pointer text-sm font-medium transition-colors ${formData.poolSize === v ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground hover:border-primary/30'}`}
                                                    >
                                                        {v} équipes
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-1.5">
                                                Qualifiés par poule
                                            </label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {["1", "2"].map(v => (
                                                    <div
                                                        key={v}
                                                        onClick={() => setFormData({ ...formData, qualifiersPerPool: v })}
                                                        className={`border-2 rounded-lg py-2 text-center cursor-pointer text-sm font-medium transition-colors ${formData.qualifiersPerPool === v ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground hover:border-primary/30'}`}
                                                    >
                                                        Top {v}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    {Number(formData.maxParticipants) >= Number(formData.poolSize) && (
                                        <p className="text-xs text-muted-foreground bg-background/50 rounded px-2 py-1.5">
                                            Avec {formData.maxParticipants} équipes en poules de {formData.poolSize},{" "}
                                            <span className="font-medium text-foreground">
                                                {Math.ceil(Number(formData.maxParticipants) / Number(formData.poolSize))} poules
                                            </span> seront créées et{" "}
                                            <span className="font-medium text-foreground">
                                                {Math.ceil(Number(formData.maxParticipants) / Number(formData.poolSize)) * Number(formData.qualifiersPerPool)} équipes
                                            </span> se qualifieront pour l&apos;élimination.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Terrain management toggle */}
                        <div className="border-t border-border pt-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <label className="text-sm font-medium text-foreground">
                                        Gestion des terrains
                                    </label>
                                    <p className="text-xs text-muted-foreground">
                                        Assignez automatiquement les terrains aux matchs
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={formData.terrainEnabled}
                                    onClick={() => setFormData({ ...formData, terrainEnabled: !formData.terrainEnabled })}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.terrainEnabled ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.terrainEnabled ? 'translate-x-6' : 'translate-x-1'}`}
                                    />
                                </button>
                            </div>

                            {formData.terrainEnabled && (
                                <div className="mt-3">
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Nombre de terrains disponibles
                                    </label>
                                    <Input
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={formData.terrainCount}
                                        onChange={(e) => setFormData({ ...formData, terrainCount: e.target.value })}
                                        onBlur={() => { if (!formData.terrainCount || Number(formData.terrainCount) < 1) setFormData({ ...formData, terrainCount: "1" }); }}
                                    />
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Submit */}
                <div className="flex gap-4 justify-end">
                    <Link href="/tournois">
                        <Button variant="outline" type="button">
                            Annuler
                        </Button>
                    </Link>
                    <Button type="submit" size="lg">
                        Créer le tournoi
                    </Button>
                </div>
            </form>
        </div>
    );
}
