"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    Calendar,
    MapPin,
    Trophy,
    Users,
    CheckCircle,
    UserPlus,
    Loader2,
    AlertCircle,
    LogIn,
    Eye,
    EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { useTournament } from "@/lib/context/TournamentContext";
import { useAuth } from "@/lib/context/AuthContext";
import { formatDateTime, getTournamentTypeLabel, getStatusLabel } from "@/lib/mock/data";

type InscriptionStep = 'info' | 'auth-choice' | 'register' | 'form' | 'success';

export default function TournamentInscriptionPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { getTournament, addPlayer, createTeam, getPlayerByUserId } = useTournament();
    const { user, signUp, loading: authLoading } = useAuth();
    const tournament = getTournament(id);

    const [step, setStep] = useState<InscriptionStep>('info');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    // Form state
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // Check if user is already registered for this tournament
    const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);

    useEffect(() => {
        if (user && tournament) {
            const existingPlayer = getPlayerByUserId(user.id);
            if (existingPlayer && tournament.participants.includes(existingPlayer.id)) {
                setIsAlreadyRegistered(true);
            }
        }
    }, [user, tournament, getPlayerByUserId]);

    if (!tournament) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="max-w-md w-full text-center">
                    <CardContent className="pt-8 pb-8">
                        <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <h2 className="text-xl font-bold mb-2">Tournoi introuvable</h2>
                        <p className="text-muted-foreground mb-4">
                            Ce tournoi n&apos;existe pas ou a été supprimé.
                        </p>
                        <Link href="/tournois">
                            <Button>Voir tous les tournois</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const isRegistrationClosed = tournament.status !== 'upcoming';
    const isFull = tournament.participants.length >= tournament.maxParticipants;

    // Handle registration for logged-in user
    const handleLoggedInRegistration = async () => {
        if (!user || !tournament) return;

        setLoading(true);
        setError(null);

        try {
            // Check if player already exists for this user
            let playerId = getPlayerByUserId(user.id)?.id;

            if (!playerId) {
                // Create new player linked to auth user
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

            // Create team for tournament
            const teamName = tournament.type === 'tete-a-tete'
                ? `${user.user_metadata?.full_name || user.email?.split('@')[0]}`
                : `Équipe ${user.email?.split('@')[0]}`;

            createTeam(tournament.id, [playerId], teamName);
            setStep('success');
        } catch {
            setError('Erreur lors de l\'inscription. Veuillez réessayer.');
        } finally {
            setLoading(false);
        }
    };

    // Handle registration with new account creation
    const handleNewAccountRegistration = async () => {
        if (!firstName.trim() || !lastName.trim()) {
            setError('Veuillez remplir votre nom et prénom');
            return;
        }

        if (!email.trim()) {
            setError('L\'email est requis pour créer un compte');
            return;
        }

        if (password.length < 8) {
            setError('Le mot de passe doit contenir au moins 8 caractères');
            return;
        }

        if (!tournament) {
            setError('Tournoi introuvable');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // 1. Create Supabase auth account
            const displayName = `${firstName.trim()} ${lastName.trim()}`;
            const { error: signUpError } = await signUp(email.trim(), password, displayName);

            if (signUpError) {
                if (signUpError.message.includes('already registered')) {
                    setError('Cet email est déjà utilisé. Connectez-vous ou utilisez un autre email.');
                } else {
                    setError(signUpError.message);
                }
                setLoading(false);
                return;
            }

            // 2. Create player entry (will be linked after email confirmation)
            // For now, we create with the email as identifier
            const newPlayerId = await addPlayer({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                username: `${firstName.trim().toLowerCase()}.${lastName.trim().toLowerCase()}`,
                email: email.trim(),
                location: { city: tournament.location.city, lat: 0, lng: 0 },
            });

            // 3. Create team for tournament
            const teamName = tournament.type === 'tete-a-tete'
                ? `${firstName.trim()} ${lastName.trim()}`
                : `Équipe ${firstName.trim()}`;

            createTeam(tournament.id, [newPlayerId], teamName);

            setStep('success');
        } catch {
            setError('Erreur lors de l\'inscription. Veuillez réessayer.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
            <div className="container mx-auto px-4 py-8 max-w-lg">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                        <Trophy className="h-8 w-8 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground mb-2">
                        Inscription au tournoi
                    </h1>
                    <p className="text-muted-foreground">
                        {tournament.name}
                    </p>
                </div>

                {/* Step: Tournament Info */}
                {step === 'info' && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Informations du tournoi</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Tournament Info */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-sm">
                                    <Calendar className="h-5 w-5 text-primary" />
                                    <span>{formatDateTime(tournament.date)}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <MapPin className="h-5 w-5 text-primary" />
                                    <span>{tournament.location.address}, {tournament.location.city}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <Users className="h-5 w-5 text-primary" />
                                    <span>{tournament.participants.length} / {tournament.maxParticipants} participants</span>
                                </div>
                            </div>

                            {/* Badges */}
                            <div className="flex flex-wrap gap-2 pt-2">
                                <Badge variant="secondary">
                                    {getTournamentTypeLabel(tournament.type)}
                                </Badge>
                                <Badge
                                    variant={tournament.status === "upcoming" ? "success" : "warning"}
                                >
                                    {getStatusLabel(tournament.status)}
                                </Badge>
                            </div>

                            {/* Registration Status */}
                            {isAlreadyRegistered ? (
                                <div className="p-4 bg-green-100 border border-green-200 rounded-lg">
                                    <div className="flex items-center gap-2 text-green-700">
                                        <CheckCircle className="h-5 w-5" />
                                        <span className="font-medium">Vous êtes déjà inscrit</span>
                                    </div>
                                    <p className="text-sm text-green-600 mt-1">
                                        Vous participez déjà à ce tournoi.
                                    </p>
                                    <Link href={`/mes-tournois`} className="block mt-3">
                                        <Button variant="outline" size="sm" className="w-full">
                                            Voir mes tournois
                                        </Button>
                                    </Link>
                                </div>
                            ) : isRegistrationClosed ? (
                                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                                    <div className="flex items-center gap-2 text-destructive">
                                        <AlertCircle className="h-5 w-5" />
                                        <span className="font-medium">Inscriptions fermées</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Le tournoi a déjà commencé ou est terminé.
                                    </p>
                                </div>
                            ) : isFull ? (
                                <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                                    <div className="flex items-center gap-2 text-warning">
                                        <AlertCircle className="h-5 w-5" />
                                        <span className="font-medium">Tournoi complet</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Le nombre maximum de participants est atteint.
                                    </p>
                                </div>
                            ) : (
                                <Button
                                    className="w-full mt-4"
                                    size="lg"
                                    onClick={() => setStep('auth-choice')}
                                    disabled={authLoading}
                                >
                                    <UserPlus className="h-5 w-5 mr-2" />
                                    S&apos;inscrire au tournoi
                                </Button>
                            )}

                            {/* Description */}
                            {tournament.description && (
                                <div className="pt-4 border-t border-border">
                                    <p className="text-sm text-muted-foreground">
                                        {tournament.description}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Step: Auth Choice */}
                {step === 'auth-choice' && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Comment voulez-vous vous inscrire ?</CardTitle>
                            <CardDescription>
                                Créez un compte pour suivre vos tournois et voir votre classement
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {user ? (
                                // User is already logged in
                                <div className="space-y-4">
                                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                                        <p className="text-sm">
                                            Connecté en tant que <strong>{user.email}</strong>
                                        </p>
                                    </div>
                                    <Button
                                        className="w-full"
                                        size="lg"
                                        onClick={handleLoggedInRegistration}
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Inscription...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle className="h-5 w-5 mr-2" />
                                                S&apos;inscrire avec mon compte
                                            </>
                                        )}
                                    </Button>
                                </div>
                            ) : (
                                // User is not logged in
                                <div className="space-y-3">
                                    <Button
                                        className="w-full"
                                        size="lg"
                                        onClick={() => setStep('register')}
                                    >
                                        <UserPlus className="h-5 w-5 mr-2" />
                                        Créer un compte
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        size="lg"
                                        onClick={() => router.push(`/connexion?redirect=/tournois/${id}/inscription`)}
                                    >
                                        <LogIn className="h-5 w-5 mr-2" />
                                        J&apos;ai déjà un compte
                                    </Button>
                                </div>
                            )}

                            <Button
                                variant="ghost"
                                className="w-full"
                                onClick={() => setStep('info')}
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Retour
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Step: Registration Form */}
                {step === 'register' && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Créer votre compte</CardTitle>
                            <CardDescription>
                                Remplissez le formulaire pour créer votre compte et vous inscrire
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {error && (
                                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive text-sm">
                                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                    {error}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Prénom *
                                    </label>
                                    <Input
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        placeholder="Prénom"
                                        disabled={loading}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Nom *
                                    </label>
                                    <Input
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        placeholder="Nom"
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Email *
                                </label>
                                <Input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="votre@email.com"
                                    disabled={loading}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Mot de passe *
                                </label>
                                <div className="relative">
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Minimum 8 caractères"
                                        disabled={loading}
                                        className="pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Au moins 8 caractères
                                </p>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setStep('auth-choice')}
                                    disabled={loading}
                                >
                                    Retour
                                </Button>
                                <Button
                                    className="flex-1"
                                    onClick={handleNewAccountRegistration}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Création...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            Créer et s&apos;inscrire
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Step: Success */}
                {step === 'success' && (
                    <Card>
                        <CardContent className="pt-8 pb-8 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                                <CheckCircle className="h-8 w-8 text-green-600" />
                            </div>
                            <h2 className="text-xl font-bold text-foreground mb-2">
                                Inscription confirmée !
                            </h2>
                            <p className="text-muted-foreground mb-2">
                                Vous êtes inscrit au tournoi <strong>{tournament.name}</strong>.
                            </p>
                            <p className="text-muted-foreground mb-6">
                                Rendez-vous le {formatDateTime(tournament.date)} !
                            </p>

                            {!user && (
                                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg mb-6 text-left">
                                    <p className="text-sm font-medium text-primary mb-1">
                                        Vérifiez votre email
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Un email de confirmation a été envoyé à <strong>{email}</strong>.
                                        Confirmez votre compte pour accéder à toutes les fonctionnalités.
                                    </p>
                                </div>
                            )}

                            <div className="space-y-3">
                                <Link href="/mes-tournois" className="block">
                                    <Button className="w-full">
                                        Voir mes tournois
                                    </Button>
                                </Link>
                                <Link href={`/tournois/${tournament.id}`} className="block">
                                    <Button variant="outline" className="w-full">
                                        Voir le tournoi
                                    </Button>
                                </Link>
                                <Link href="/tournois" className="block">
                                    <Button variant="ghost" className="w-full">
                                        Retour aux tournois
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Back link */}
                <div className="text-center mt-6">
                    <Link
                        href={`/tournois/${tournament.id}`}
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Retour au détail du tournoi
                    </Link>
                </div>
            </div>
        </div>
    );
}
