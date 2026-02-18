"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/Dialog";
import { Plus } from "lucide-react";
import { useTournament } from "@/lib/context/TournamentContext";

interface PlayerFormProps {
    onSuccess?: (playerId: string) => void;
}

export function PlayerForm({ onSuccess }: PlayerFormProps) {
    const { addPlayer } = useTournament();
    const [isOpen, setIsOpen] = useState(false);
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "", // Optionnel pour les joueurs locaux
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Générer un email factice et un username si non fournis (pour respecter le type User)
        const email = formData.email || `${formData.firstName.toLowerCase()}.${formData.lastName.toLowerCase()}@local.com`;
        const username = `${formData.firstName.toLowerCase()}${formData.lastName.toLowerCase()}`;

        const playerId = await addPlayer({
            firstName: formData.firstName,
            lastName: formData.lastName,
            email,
            username,
            location: { lat: 0, lng: 0, city: "Local" }, // Location par défaut
        });

        setFormData({ firstName: "", lastName: "", email: "" });
        setIsOpen(false);
        if (onSuccess) onSuccess(playerId);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nouveau Joueur
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Ajouter un joueur</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Prénom *</label>
                            <Input
                                required
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                placeholder="Ex: Jean"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Nom *</label>
                            <Input
                                required
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                placeholder="Ex: Dupont"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium mb-1 block">Email (optionnel)</label>
                        <Input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="Pour recevoir les notifs"
                        />
                    </div>

                    <Button type="submit" className="w-full">
                        Ajouter le joueur
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
