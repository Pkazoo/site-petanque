'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from "next/link";
import { Mail, Lock, ArrowRight, Loader2, AlertCircle, Shield, Users, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/lib/context/AuthContext";

// Comptes de démonstration
const DEMO_ACCOUNTS = {
    admin: { email: 'admin@petanque.fr', password: 'admin123', label: 'Administrateur', icon: Shield, color: 'bg-red-500 hover:bg-red-600' },
    organisateur: { email: 'organisateur@petanque.fr', password: 'orga123', label: 'Organisateur', icon: Users, color: 'bg-blue-500 hover:bg-blue-600' },
    joueur: { email: 'joueur@petanque.fr', password: 'joueur123', label: 'Joueur', icon: User, color: 'bg-green-500 hover:bg-green-600' },
};

function ConnexionForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const { signIn, user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectUrl = searchParams.get('redirect') || '/mon-profil';

    // Redirect if already logged in
    useEffect(() => {
        if (user) {
            router.push(redirectUrl);
        }
    }, [user, router, redirectUrl]);

    if (user) {
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const { error } = await signIn(email, password);

        if (error) {
            setError('Email ou mot de passe incorrect');
            setLoading(false);
        } else {
            router.push(redirectUrl);
        }
    };

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
                            Petanque<span className="text-primary">Manager</span>
                        </span>
                    </Link>
                </div>

                <Card className="shadow-xl">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl">Connexion</CardTitle>
                        <CardDescription>
                            Accedez a votre compte pour participer aux tournois
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {redirectUrl !== '/' && (
                            <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg text-sm text-primary">
                                Connectez-vous pour continuer votre inscription
                            </div>
                        )}

                        {error && (
                            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive text-sm">
                                <AlertCircle className="h-4 w-4" />
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Email
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input
                                        type="email"
                                        placeholder="votre@email.com"
                                        className="pl-10"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        disabled={loading}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Mot de passe
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input
                                        type="password"
                                        placeholder="********"
                                        className="pl-10"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        disabled={loading}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        className="rounded border-border text-primary focus:ring-primary"
                                    />
                                    Se souvenir de moi
                                </label>
                                <Link
                                    href="/mot-de-passe-oublie"
                                    className="text-sm text-primary hover:underline"
                                >
                                    Mot de passe oublie ?
                                </Link>
                            </div>
                            <Button type="submit" className="w-full" size="lg" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Connexion en cours...
                                    </>
                                ) : (
                                    <>
                                        Se connecter
                                        <ArrowRight className="h-4 w-4 ml-2" />
                                    </>
                                )}
                            </Button>
                        </form>

                        <p className="text-center text-sm text-muted-foreground mt-6">
                            Pas encore de compte ?{" "}
                            <Link href="/inscription" className="text-primary hover:underline font-medium">
                                Inscrivez-vous
                            </Link>
                        </p>

                        {/* Connexion rapide démo */}
                        <div className="mt-8 pt-6 border-t border-border">
                            <p className="text-center text-sm text-muted-foreground mb-4">
                                Connexion rapide (comptes démo)
                            </p>
                            <div className="grid grid-cols-3 gap-2">
                                {Object.entries(DEMO_ACCOUNTS).map(([key, account]) => {
                                    const Icon = account.icon;
                                    return (
                                        <Button
                                            key={key}
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className={`flex flex-col items-center gap-1 py-3 h-auto text-white ${account.color}`}
                                            disabled={loading}
                                            onClick={async () => {
                                                setError(null);
                                                setLoading(true);
                                                const { error } = await signIn(account.email, account.password);
                                                if (error) {
                                                    setError(`Erreur de connexion ${account.label}`);
                                                    setLoading(false);
                                                } else {
                                                    router.push(redirectUrl);
                                                }
                                            }}
                                        >
                                            <Icon className="h-4 w-4" />
                                            <span className="text-xs">{account.label}</span>
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default function ConnexionPage() {
    return (
        <Suspense fallback={
            <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <ConnexionForm />
        </Suspense>
    );
}
