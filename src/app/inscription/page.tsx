"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, MapPin, ArrowRight, Loader2, AlertCircle, CheckCircle, Camera, User, Bell } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/lib/context/AuthContext";

export default function InscriptionPage() {
    const router = useRouter();
    const { signUp, user } = useAuth();

    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        city: "",
        password: "",
        acceptTerms: false,
        acceptNotifications: false,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                setError("La photo ne doit pas dépasser 10 Mo");
                return;
            }

            try {
                // Compresser l'image avant de la stocker
                const compressed = await compressImage(file);
                setProfilePhoto(compressed);
            } catch {
                setError("Erreur lors du traitement de la photo. Réessayez.");
            }
        }
    };

    const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = reject;
            reader.onload = () => {
                const img = new Image();
                img.onerror = reject;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const maxDim = 800;
                    let { width, height } = img;
                    if (width > maxDim || height > maxDim) {
                        if (width > height) {
                            height = Math.round(height * maxDim / width);
                            width = maxDim;
                        } else {
                            width = Math.round(width * maxDim / height);
                            height = maxDim;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) { reject(new Error('Canvas error')); return; }
                    ctx.drawImage(img, 0, 0, width, height);
                    let quality = 0.8;
                    let result = canvas.toDataURL('image/jpeg', quality);
                    const maxBytes = 300 * 1024 * 1.37;
                    while (result.length > maxBytes && quality > 0.1) {
                        quality -= 0.1;
                        result = canvas.toDataURL('image/jpeg', quality);
                    }
                    resolve(result);
                };
                img.src = reader.result as string;
            };
            reader.readAsDataURL(file);
        });
    };

    // Redirect if already logged in
    useEffect(() => {
        if (user) {
            router.push('/mon-profil');
        }
    }, [user, router]);

    if (user) {
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (!formData.firstName.trim() || !formData.lastName.trim()) {
            setError("Veuillez renseigner votre prénom et nom");
            return;
        }
        if (!formData.email.trim()) {
            setError("Veuillez renseigner votre email");
            return;
        }
        if (formData.password.length < 8) {
            setError("Le mot de passe doit contenir au moins 8 caractères");
            return;
        }
        if (!formData.acceptTerms) {
            setError("Vous devez accepter les conditions d'utilisation");
            return;
        }

        setLoading(true);

        try {
            const displayName = `${formData.firstName} ${formData.lastName}`;

            // Create Supabase auth account
            const { error: signUpError } = await signUp(formData.email, formData.password, displayName);

            if (signUpError) {
                if (signUpError.message.includes("already registered")) {
                    setError("Un compte existe déjà avec cet email");
                } else {
                    setError(signUpError.message || "Erreur lors de la création du compte");
                }
                setLoading(false);
                return;
            }

            setSuccess(true);

            // Request notification permission if user opted in
            if (formData.acceptNotifications && "Notification" in window) {
                try {
                    const permission = await Notification.requestPermission();
                    if (permission === "granted") {
                        console.log("Notifications enabled");
                    }
                } catch (err) {
                    console.log("Notification permission error:", err);
                }
            }

            // Redirect after a short delay to show success message
            setTimeout(() => {
                router.push('/mon-profil');
            }, 2000);
        } catch (err) {
            setError("Une erreur inattendue est survenue");
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center py-12 px-4">
                <Card className="w-full max-w-md shadow-xl">
                    <CardContent className="py-12 text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-foreground mb-2">Compte créé !</h2>
                        <p className="text-muted-foreground mb-4">
                            Bienvenue dans la communauté PétanqueManager !
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Redirection vers votre profil...
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center py-12 px-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-2">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl overflow-hidden shadow-lg">
                            <img src="/logo-fanny.png" alt="Pétanque Manager" className="h-12 w-12 object-cover" />
                        </div>
                        <span className="text-2xl font-bold text-foreground">
                            Pétanque<span className="text-primary">Manager</span>
                        </span>
                    </Link>
                </div>

                <Card className="shadow-xl">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl">Créer un compte</CardTitle>
                        <CardDescription>
                            Rejoignez la communauté des passionnés de pétanque
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {error && (
                            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive text-sm">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Photo de profil */}
                            <div className="flex flex-col items-center mb-4">
                                <div className="relative">
                                    <div className="w-24 h-24 rounded-full bg-muted border-2 border-dashed border-border flex items-center justify-center overflow-hidden">
                                        {profilePhoto ? (
                                            <img
                                                src={profilePhoto}
                                                alt="Photo de profil"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <User className="h-10 w-10 text-muted-foreground" />
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
                                        disabled={loading}
                                    >
                                        <Camera className="h-4 w-4" />
                                    </button>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    capture="user"
                                    onChange={handlePhotoChange}
                                    className="hidden"
                                    disabled={loading}
                                />
                                <p className="text-xs text-muted-foreground mt-2">
                                    Ajouter une photo (optionnel)
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Prénom *
                                    </label>
                                    <Input
                                        placeholder="Jean"
                                        value={formData.firstName}
                                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                        disabled={loading}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Nom *
                                    </label>
                                    <Input
                                        placeholder="Dupont"
                                        value={formData.lastName}
                                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                        disabled={loading}
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Email *
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input
                                        type="email"
                                        placeholder="votre@email.com"
                                        className="pl-10"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        disabled={loading}
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Ville
                                </label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input
                                        placeholder="Marseille"
                                        className="pl-10"
                                        value={formData.city}
                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        disabled={loading}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Mot de passe *
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input
                                        type="password"
                                        placeholder="••••••••"
                                        className="pl-10"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        disabled={loading}
                                        required
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Minimum 8 caractères
                                </p>
                            </div>
                            <div className="flex items-start gap-2">
                                <input
                                    type="checkbox"
                                    id="terms"
                                    className="mt-1 rounded border-border text-primary focus:ring-primary"
                                    checked={formData.acceptTerms}
                                    onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })}
                                    disabled={loading}
                                />
                                <label htmlFor="terms" className="text-sm text-muted-foreground">
                                    J&apos;accepte les{" "}
                                    <Link href="/cgu" className="text-primary hover:underline">
                                        conditions d&apos;utilisation
                                    </Link>{" "}
                                    et la{" "}
                                    <Link
                                        href="/confidentialite"
                                        className="text-primary hover:underline"
                                    >
                                        politique de confidentialité
                                    </Link>
                                </label>
                            </div>
                            <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
                                <input
                                    type="checkbox"
                                    id="notifications"
                                    className="mt-1 rounded border-border text-primary focus:ring-primary"
                                    checked={formData.acceptNotifications}
                                    onChange={(e) => setFormData({ ...formData, acceptNotifications: e.target.checked })}
                                    disabled={loading}
                                />
                                <label htmlFor="notifications" className="text-sm text-foreground">
                                    <div className="flex items-center gap-2 font-medium">
                                        <Bell className="h-4 w-4 text-primary" />
                                        Activer les notifications
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Recevez des alertes pour vos messages, tournois et résultats de matchs
                                    </p>
                                </label>
                            </div>
                            <Button type="submit" className="w-full" size="lg" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Création en cours...
                                    </>
                                ) : (
                                    <>
                                        Créer mon compte
                                        <ArrowRight className="h-4 w-4 ml-2" />
                                    </>
                                )}
                            </Button>
                        </form>

                        <p className="text-center text-sm text-muted-foreground mt-6">
                            Déjà un compte ?{" "}
                            <Link href="/connexion" className="text-primary hover:underline font-medium">
                                Connectez-vous
                            </Link>
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
