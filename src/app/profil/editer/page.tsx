"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    Camera,
    User,
    Save,
    Loader2,
    MapPin,
    AlertCircle,
    CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/lib/context/AuthContext";
import { useTournament } from "@/lib/context/TournamentContext";

export default function EditProfilePage() {
    const router = useRouter();
    const { user: authUser, loading: authLoading } = useAuth();
    const { getPlayerByUserId, updatePlayer } = useTournament();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const formInitialized = useRef(false);

    const playerProfile = authUser ? getPlayerByUserId(authUser.id) : null;

    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        bio: "",
        city: "",
        avatar: "",
    });

    // Initialiser le formulaire UNE SEULE FOIS quand le profil est chargé
    useEffect(() => {
        if (playerProfile && !formInitialized.current) {
            formInitialized.current = true;
            setFormData({
                firstName: playerProfile.firstName || "",
                lastName: playerProfile.lastName || "",
                bio: playerProfile.bio || "",
                city: playerProfile.location?.city || "",
                avatar: playerProfile.avatar || "",
            });
        }
    }, [playerProfile]);

    useEffect(() => {
        if (!authLoading && !authUser) {
            router.push('/connexion');
        }
    }, [authUser, authLoading, router]);

    const compressImage = (file: File, maxSizeKB: number = 300): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const maxDimension = 800;
                    if (width > maxDimension || height > maxDimension) {
                        if (width > height) {
                            height = (height / width) * maxDimension;
                            width = maxDimension;
                        } else {
                            width = (width / height) * maxDimension;
                            height = maxDimension;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) { reject(new Error('Canvas context error')); return; }
                    ctx.drawImage(img, 0, 0, width, height);
                    let quality = 0.9;
                    let result = canvas.toDataURL('image/jpeg', quality);
                    while (result.length > maxSizeKB * 1024 * 1.37 && quality > 0.1) {
                        quality -= 0.1;
                        result = canvas.toDataURL('image/jpeg', quality);
                    }
                    resolve(result);
                };
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = e.target?.result as string;
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    };

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            setError("La photo ne doit pas dépasser 10 Mo");
            return;
        }

        try {
            const compressed = await compressImage(file, 300);
            setFormData(prev => ({ ...prev, avatar: compressed }));
        } catch {
            setError("Erreur lors du traitement de la photo");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        if (!formData.firstName.trim() || !formData.lastName.trim()) {
            setError("Le prénom et le nom sont requis");
            return;
        }

        if (!playerProfile) {
            setError("Profil joueur introuvable");
            return;
        }

        setLoading(true);

        try {
            await updatePlayer(playerProfile.id, {
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim(),
                bio: formData.bio.trim(),
                avatar: formData.avatar || undefined,
                location: {
                    city: formData.city.trim(),
                    lat: playerProfile.location?.lat || 0,
                    lng: playerProfile.location?.lng || 0,
                },
            });

            setSuccess(true);
            setTimeout(() => {
                router.push('/mon-profil');
            }, 1500);
        } catch {
            setError("Erreur lors de la mise à jour du profil");
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-lg flex justify-center items-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!authUser) return null;

    return (
        <div className="container mx-auto px-4 py-8 max-w-lg">
            <Link
                href="/mon-profil"
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
            >
                <ArrowLeft className="h-4 w-4" />
                Retour au profil
            </Link>

            <Card>
                <CardHeader>
                    <CardTitle>Modifier mon profil</CardTitle>
                    <CardDescription>
                        Mettez à jour vos informations personnelles
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {error && (
                        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive text-sm">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-4 p-3 bg-green-100 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-sm">
                            <CheckCircle className="h-4 w-4 shrink-0" />
                            Profil mis à jour avec succès !
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Photo de profil */}
                        <div className="flex flex-col items-center">
                            <div className="relative">
                                <div className="w-28 h-28 rounded-full bg-muted border-4 border-background shadow-lg flex items-center justify-center overflow-hidden">
                                    {formData.avatar ? (
                                        <img
                                            src={formData.avatar}
                                            alt="Photo de profil"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <User className="h-12 w-12 text-muted-foreground" />
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
                                    disabled={loading}
                                >
                                    <Camera className="h-5 w-5" />
                                </button>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoChange}
                                className="hidden"
                                disabled={loading}
                            />
                            <p className="text-xs text-muted-foreground mt-3">
                                Cliquez pour changer la photo
                            </p>
                        </div>

                        {/* Nom et prénom */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Prénom *
                                </label>
                                <Input
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    placeholder="Prénom"
                                    disabled={loading}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Nom *
                                </label>
                                <Input
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                    placeholder="Nom"
                                    disabled={loading}
                                    required
                                />
                            </div>
                        </div>

                        {/* Ville */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Ville
                            </label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    placeholder="Votre ville"
                                    className="pl-10"
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        {/* Bio */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Bio
                            </label>
                            <textarea
                                className="flex min-h-[100px] w-full rounded-lg border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                                value={formData.bio}
                                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                placeholder="Parlez-nous de vous..."
                                disabled={loading}
                                maxLength={500}
                            />
                            <p className="text-xs text-muted-foreground mt-1 text-right">
                                {formData.bio.length}/500
                            </p>
                        </div>

                        {/* Bouton de soumission */}
                        <Button type="submit" className="w-full" size="lg" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Enregistrement...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Enregistrer les modifications
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
