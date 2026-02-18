"use client";

import { useState } from "react";
import { User, TournamentType } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/Dialog";
import { Users, Check } from "lucide-react";
import { useTournament } from "@/lib/context/TournamentContext";
import { Avatar } from "@/components/ui/Avatar";

interface TeamCompositionProps {
    tournamentId: string;
    type: TournamentType;
    availablePlayers: User[];
    onTeamCreated: () => void;
}

export function TeamComposition({ tournamentId, type, availablePlayers, onTeamCreated }: TeamCompositionProps) {
    const { createTeam } = useTournament();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
    const [teamName, setTeamName] = useState("");

    const maxPlayers = type === "triplettes" ? 3 : type === "doublettes" ? 2 : 1;

    const togglePlayer = (playerId: string) => {
        if (selectedPlayers.includes(playerId)) {
            setSelectedPlayers(selectedPlayers.filter((id) => id !== playerId));
        } else {
            if (selectedPlayers.length < maxPlayers) {
                setSelectedPlayers([...selectedPlayers, playerId]);
            }
        }
    };

    const handleSubmit = () => {
        if (selectedPlayers.length !== maxPlayers) return;

        createTeam(tournamentId, selectedPlayers, teamName);
        setSelectedPlayers([]);
        setTeamName("");
        setIsOpen(false);
        onTeamCreated();
    };

    const isComplete = selectedPlayers.length === maxPlayers;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Users className="h-4 w-4" />
                    Créer une équipe
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Composer une équipe ({type})</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Nom de l'équipe (Optionnel) */}
                    <div>
                        <label className="text-sm font-medium mb-1 block">Nom de l&apos;équipe (Optionnel)</label>
                        <Input
                            placeholder="Ex: Les Zinzins de l'Espace"
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                        />
                    </div>

                    {/* Sélection des joueurs */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-medium block">
                                Sélectionner {maxPlayers} joueurs ({selectedPlayers.length}/{maxPlayers})
                            </label>
                            <Input
                                placeholder="Rechercher un joueur..."
                                className="w-48 h-8 text-xs"
                            />
                        </div>

                        <div className="border border-border rounded-lg max-h-[300px] overflow-y-auto p-2 grid sm:grid-cols-2 gap-2">
                            {availablePlayers.length > 0 ? (
                                availablePlayers.map((player) => {
                                    const isSelected = selectedPlayers.includes(player.id);
                                    return (
                                        <div
                                            key={player.id}
                                            onClick={() => togglePlayer(player.id)}
                                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer border-2 transition-all ${isSelected
                                                ? "border-primary bg-primary/5"
                                                : "border-transparent hover:bg-muted"
                                                }`}
                                        >
                                            <div className="relative">
                                                <Avatar
                                                    src={player.avatar}
                                                    fallback={`${player.firstName[0]}${player.lastName[0]}`}
                                                    size="md"
                                                />
                                                {isSelected && (
                                                    <div className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                                                        <Check className="h-3 w-3" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium truncate">
                                                    {player.firstName} {player.lastName}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="col-span-2 text-center py-8 text-muted-foreground">
                                    Aucun joueur disponible. Commencez par en ajouter !
                                </div>
                            )}
                        </div>
                    </div>

                    <Button
                        onClick={handleSubmit}
                        className="w-full"
                        disabled={!isComplete}
                    >
                        Valider l&apos;équipe {isComplete ? `(${maxPlayers}/${maxPlayers})` : ""}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
