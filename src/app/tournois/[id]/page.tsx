"use client";

import { use, useMemo, useState, useRef } from "react";
import { useTournament } from "@/lib/context/TournamentContext";
import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, Trophy, MessageCircle, Send, Users, QrCode, Loader2, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import { formatDateTime, getTournamentTypeLabel, getStatusLabel } from "@/lib/mock/data";
import { useAuth } from "@/lib/context/AuthContext";
import { TournamentBracket } from "@/components/tournois/TournamentBracket";
import { useMatchChat } from "@/lib/hooks/useMatchChat";
import { getMobileUrl } from "@/lib/utils/getMobileUrl";

export default function TournamentDetailWrapper({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return <TournamentDetailClient id={id} />;
}

function TournamentDetailClient({ id }: { id: string }) {
    const { getTournament, getPlayer, getTournamentTeams, getTournamentMatches, getTeam, getPlayerByUserId, players, proposeMatchScore } = useTournament();
    const { user, isOrganisateur, isAdmin } = useAuth();
    const [tournament, setTournament] = useState(getTournament(id));
    const [messageInput, setMessageInput] = useState("");

    useEffect(() => {
        const t = getTournament(id);
        if (t) setTournament(t);
    }, [id, getTournament]);

    // Get teams and matches for this tournament
    const tournamentTeams = useMemo(() => getTournamentTeams(id), [id, getTournamentTeams]);
    const tournamentMatches = useMemo(() => getTournamentMatches(id), [id, getTournamentMatches]);

    // Find if current user is a player in this tournament
    const myTeam = useMemo(() => {
        if (!user?.id) return null;

        // 1. Chercher par userId directement
        const currentPlayer = getPlayerByUserId(user.id);
        if (currentPlayer) {
            const teamByUserId = tournamentTeams.find(team => team.playerIds.includes(currentPlayer.id));
            if (teamByUserId) {
                console.log('Team found by userId:', teamByUserId.name);
                return teamByUserId;
            }
        }

        // 2. Fallback: chercher par email dans les joueurs des équipes du tournoi
        const userEmail = user.email?.toLowerCase();
        if (userEmail) {
            const allTeamPlayerIds = tournamentTeams.flatMap(t => t.playerIds);
            const matchingPlayer = players.find(p =>
                p.email?.toLowerCase() === userEmail && allTeamPlayerIds.includes(p.id)
            );
            if (matchingPlayer) {
                const teamByEmail = tournamentTeams.find(team => team.playerIds.includes(matchingPlayer.id));
                if (teamByEmail) {
                    console.log('Team found by email fallback:', teamByEmail.name);
                    return teamByEmail;
                }
            }
        }

        console.log('No team found for user:', user.id, user.email);
        return null;
    }, [user, tournamentTeams, getPlayerByUserId, players]);

    // Find current match for player's team
    const currentMatch = useMemo(() => {
        if (!myTeam) return null;
        return tournamentMatches.find(m =>
            (m.team1Id === myTeam.id || m.team2Id === myTeam.id) &&
            (m.status === 'pending' || m.status === 'ongoing')
        );
    }, [myTeam, tournamentMatches]);

    // Get opponent team
    const opponentTeam = useMemo(() => {
        if (!currentMatch || !myTeam) return null;
        const opponentId = currentMatch.team1Id === myTeam.id ? currentMatch.team2Id : currentMatch.team1Id;
        return opponentId ? getTeam(opponentId) : null;
    }, [currentMatch, myTeam, getTeam]);

    // Get opponent players
    const opponentPlayers = useMemo(() => {
        if (!opponentTeam) return [];
        return opponentTeam.playerIds.map(pid => getPlayer(pid)).filter(Boolean);
    }, [opponentTeam, getPlayer]);

    // Chat hook for inline chat
    const {
        messages: chatMessages,
        loading: messagesLoading,
        sendMessage,
        isUserInMatch,
        currentUserPlayerId
    } = useMatchChat(currentMatch?.id || null);

    const [sendingMessage, setSendingMessage] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Score states for inline score entry
    const [ourScore, setOurScore] = useState(0);
    const [theirScore, setTheirScore] = useState(0);
    const [isSubmittingScore, setIsSubmittingScore] = useState(false);

    const isTeam1 = myTeam && currentMatch ? currentMatch.team1Id === myTeam.id : false;
    const isTeam2 = myTeam && currentMatch ? currentMatch.team2Id === myTeam.id : false;
    const alreadyValidated = (isTeam1 && currentMatch?.team1Validated) || (isTeam2 && currentMatch?.team2Validated);
    const canSubmitScore = (ourScore === 13 || theirScore === 13) && ourScore !== theirScore;

    const handleSubmitScore = async () => {
        if (!currentMatch || !myTeam || !canSubmitScore) return;
        setIsSubmittingScore(true);
        if (isTeam1) {
            await proposeMatchScore(currentMatch.id, myTeam.id, ourScore, theirScore);
        } else if (isTeam2) {
            await proposeMatchScore(currentMatch.id, myTeam.id, theirScore, ourScore);
        }
        setIsSubmittingScore(false);
    };

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        if (chatMessages.length > 0) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [chatMessages]);

    // Handle sending a message
    const handleSendMessage = async () => {
        if (!messageInput.trim() || sendingMessage) return;
        setSendingMessage(true);
        try {
            await sendMessage(messageInput);
            setMessageInput("");
        } catch (err) {
            console.error('Error sending message:', err);
        } finally {
            setSendingMessage(false);
        }
    };

    if (!tournament) {
        return <div className="p-12 text-center text-muted-foreground">Tournoi introuvable...</div>;
    }

    const organizer = getPlayer(tournament.organizerId);
    const canManage = isAdmin || (isOrganisateur && user?.id === tournament.organizerId);
    const isPlayerInTournament = !!myTeam;
    const showPlayerView = isPlayerInTournament && tournament.status === 'ongoing';

    const participants = tournament.participants
        .map((pId) => getPlayer(pId))
        .filter(Boolean);

    // Player view for ongoing tournaments
    if (showPlayerView) {
        return (
            <div className="container mx-auto px-4 py-8">
                {/* Back button */}
                <Link
                    href="/mon-profil"
                    className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Retour à mon profil
                </Link>

                {/* Tournament Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-4 mb-2">
                        <Badge variant="warning" className="animate-pulse">En cours</Badge>
                        <Badge variant="outline">{getTournamentTypeLabel(tournament.type)}</Badge>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">{tournament.name}</h1>
                    <p className="text-muted-foreground mt-1 flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {tournament.location.city}
                    </p>
                </div>

                {/* Current Match Info - centré */}
                <Card className="border-orange-200 bg-orange-50/50 max-w-lg mx-auto w-full">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-center gap-2">
                            <Trophy className="h-5 w-5 text-orange-500" />
                            Votre prochain match
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {currentMatch && opponentTeam ? (
                            <div className="text-center">
                                <p className="text-sm text-muted-foreground mb-2">
                                    Niveau {currentMatch.round}
                                </p>
                                {currentMatch.terrainNumber && (
                                    <div className="mb-4 inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-lg font-bold text-base shadow-sm">
                                        <MapPin className="h-5 w-5" />
                                        Terrain {currentMatch.terrainNumber}
                                    </div>
                                )}
                                <div className="flex items-center justify-center gap-4 mb-4">
                                    <div className="text-center">
                                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                                            <Users className="h-8 w-8 text-primary" />
                                        </div>
                                        <p className="font-semibold text-sm">{myTeam?.name || "Votre équipe"}</p>
                                    </div>
                                    <div className="text-2xl font-bold text-muted-foreground">VS</div>
                                    <div className="text-center">
                                        <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-2 ring-2 ring-orange-400">
                                            <Users className="h-8 w-8 text-orange-500" />
                                        </div>
                                        <p className="font-semibold text-sm text-orange-600">{opponentTeam.name || "Adversaire"}</p>
                                    </div>
                                </div>

                                {/* Saisie de score */}
                                {currentMatch.status === 'ongoing' && !alreadyValidated && (
                                    <div className="border-t pt-4 mt-2">
                                        <p className="text-xs font-medium text-center mb-3">Saisissez votre score :</p>
                                        <div className="grid grid-cols-2 gap-6 mb-4">
                                            <div className="flex flex-col items-center">
                                                <label className="text-xs text-muted-foreground mb-1 font-medium">Nous</label>
                                                <div className="flex flex-col items-center bg-primary/5 rounded-lg p-2">
                                                    <Button size="sm" variant="ghost" className="h-10 w-14 p-0" onClick={() => setOurScore(s => Math.min(13, s + 1))} disabled={ourScore >= 13}>
                                                        <ChevronUp className="h-6 w-6" />
                                                    </Button>
                                                    <span className={`text-4xl font-bold py-1 ${ourScore === 13 ? 'text-green-600' : ''}`}>{ourScore}</span>
                                                    <Button size="sm" variant="ghost" className="h-10 w-14 p-0" onClick={() => setOurScore(s => Math.max(0, s - 1))} disabled={ourScore <= 0}>
                                                        <ChevronDown className="h-6 w-6" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <label className="text-xs text-muted-foreground mb-1 font-medium">Eux</label>
                                                <div className="flex flex-col items-center bg-orange-500/5 rounded-lg p-2">
                                                    <Button size="sm" variant="ghost" className="h-10 w-14 p-0" onClick={() => setTheirScore(s => Math.min(13, s + 1))} disabled={theirScore >= 13}>
                                                        <ChevronUp className="h-6 w-6" />
                                                    </Button>
                                                    <span className={`text-4xl font-bold py-1 ${theirScore === 13 ? 'text-orange-600' : ''}`}>{theirScore}</span>
                                                    <Button size="sm" variant="ghost" className="h-10 w-14 p-0" onClick={() => setTheirScore(s => Math.max(0, s - 1))} disabled={theirScore <= 0}>
                                                        <ChevronDown className="h-6 w-6" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                        {canSubmitScore && (
                                            <Button
                                                className="w-full bg-green-600 hover:bg-green-700 font-semibold"
                                                onClick={handleSubmitScore}
                                                disabled={isSubmittingScore}
                                            >
                                                {isSubmittingScore ? "Validation..." : `Valider ${ourScore} - ${theirScore}`}
                                            </Button>
                                        )}
                                        {!canSubmitScore && (ourScore > 0 || theirScore > 0) && (
                                            <p className="text-xs text-center text-muted-foreground">Le premier à 13 points gagne</p>
                                        )}
                                    </div>
                                )}
                                {alreadyValidated && (
                                    <div className="border-t pt-3 mt-2 text-center text-sm text-green-600 font-medium">
                                        Score validé - En attente de l&apos;adversaire
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-center text-muted-foreground">
                                Aucun match en attente
                            </p>
                        )}
                    </CardContent>
                </Card>

                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Left: Opponent Info + Chat */}
                    <div className="space-y-6">
                        {/* Opponent Players */}
                        {opponentPlayers.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-orange-600">
                                        <Users className="h-5 w-5" />
                                        Équipe adverse
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {opponentPlayers.map((player) => player && (
                                            <div key={player.id} className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 border border-orange-200">
                                                <Avatar
                                                    src={player.avatar}
                                                    fallback={`${player.firstName[0]}${player.lastName[0]}`}
                                                    size="lg"
                                                />
                                                <div className="flex-1">
                                                    <h4 className="font-medium text-foreground">
                                                        {player.firstName} {player.lastName}
                                                    </h4>
                                                    <span className="text-xs text-muted-foreground">
                                                            {player.eloRating} ELO
                                                        </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Chat with opponent */}
                        {currentMatch && (
                            <Card className="border-2 border-primary/20">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <MessageCircle className="h-6 w-6 text-primary" />
                                        Discussion avec l&apos;adversaire
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-64 bg-muted/30 rounded-lg mb-4 p-4 overflow-y-auto">
                                        {messagesLoading ? (
                                            <div className="flex items-center justify-center h-full">
                                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                            </div>
                                        ) : chatMessages.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                                <MessageCircle className="h-12 w-12 mb-2 opacity-50" />
                                                <p className="text-sm">Démarrez la conversation</p>
                                                <p className="text-xs">Coordonnez-vous avec votre adversaire</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {chatMessages.map((message) => {
                                                    const isCurrentUser = message.senderId === currentUserPlayerId;
                                                    const sender = getPlayer(message.senderId);
                                                    const senderName = sender ? `${sender.firstName} ${sender.lastName}` : "Inconnu";
                                                    const time = message.createdAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

                                                    return (
                                                        <div
                                                            key={message.id}
                                                            className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                                                        >
                                                            <div className="flex flex-col max-w-[80%]">
                                                                {!isCurrentUser && (
                                                                    <span className="text-[10px] text-muted-foreground mb-1 px-2">
                                                                        {senderName}
                                                                    </span>
                                                                )}
                                                                <div
                                                                    className={`rounded-lg px-3 py-2 ${isCurrentUser
                                                                        ? "bg-primary text-primary-foreground rounded-br-none"
                                                                        : "bg-background text-foreground rounded-bl-none border"
                                                                        }`}
                                                                >
                                                                    <p className="text-sm">{message.content}</p>
                                                                    <p
                                                                        className={`text-[9px] mt-1 ${isCurrentUser
                                                                            ? "text-primary-foreground/70"
                                                                            : "text-muted-foreground"
                                                                            }`}
                                                                    >
                                                                        {time}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                <div ref={messagesEndRef} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Tapez votre message..."
                                            value={messageInput}
                                            onChange={(e) => setMessageInput(e.target.value)}
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSendMessage();
                                                }
                                            }}
                                            className="flex-1"
                                            disabled={sendingMessage || !isUserInMatch}
                                        />
                                        <Button
                                            size="icon"
                                            onClick={handleSendMessage}
                                            disabled={!messageInput.trim() || sendingMessage || !isUserInMatch}
                                        >
                                            {sendingMessage ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Send className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                    <Link href={`/messages?matchId=${currentMatch.id}`} className="block mt-4">
                                        <Button className="w-full" size="lg" variant="outline">
                                            <MessageCircle className="h-5 w-5 mr-2" />
                                            Ouvrir le Chat Complet
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Right: Tournament Bracket */}
                    <div>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Trophy className="h-5 w-5 text-primary" />
                                    Arbre du tournoi
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="overflow-x-auto">
                                <TournamentBracket tournamentId={id} currentUserTeamId={myTeam?.id} />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        );
    }

    // Default view for non-players or non-ongoing tournaments
    return (
        <div className="container mx-auto px-4 py-8">
            {/* Back button */}
            <Link
                href="/tournois"
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
            >
                <ArrowLeft className="h-4 w-4" />
                Retour aux tournois
            </Link>

            <div className={`grid ${tournament.is_official ? '' : 'lg:grid-cols-3'} gap-8`}>
                {/* Main Content */}
                <div className={`${tournament.is_official ? '' : 'lg:col-span-2'} space-y-6`}>
                    {/* Header */}
                    <div className="relative rounded-2xl overflow-hidden">
                        {tournament.coverImage ? (
                            <img
                                src={tournament.coverImage}
                                alt={tournament.name}
                                className="w-full h-64 md:h-80 object-cover"
                            />
                        ) : (
                            <div className="w-full h-64 md:h-80 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                                <Trophy className="h-24 w-24 text-primary/50" />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-6">
                            <div className="flex flex-wrap gap-2 mb-3">
                                <Badge variant="secondary">
                                    {getTournamentTypeLabel(tournament.type)}
                                </Badge>
                                <Badge
                                    variant={
                                        tournament.status === "upcoming"
                                            ? "success"
                                            : tournament.status === "ongoing"
                                                ? "warning"
                                                : "outline"
                                    }
                                >
                                    {getStatusLabel(tournament.status)}
                                </Badge>
                            </div>
                            <h1 className="text-3xl md:text-4xl font-bold text-white">
                                {tournament.name}
                            </h1>
                        </div>
                    </div>

                    {/* Description */}
                    <Card>
                        <CardHeader>
                            <CardTitle>À propos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground leading-relaxed">
                                {tournament.description || "Aucune description fournie."}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Bracket for ongoing/completed tournaments */}
                    {(tournament.status === 'ongoing' || tournament.status === 'completed') && (
                        <Card className="border-2 border-primary/20">
                            <CardHeader className="bg-primary/5 border-b">
                                <CardTitle className="flex items-center gap-2">
                                    <Trophy className="h-5 w-5 text-primary" />
                                    Arbre du tournoi
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="overflow-x-auto pt-6">
                                <TournamentBracket tournamentId={id} currentUserTeamId={myTeam?.id} />
                            </CardContent>
                        </Card>
                    )}

                    {/* Participants - hidden for official tournaments */}
                    {!tournament.is_official && (
                    <Card className="border-2 border-blue-200 dark:border-blue-900">
                        <CardHeader className="bg-blue-50 dark:bg-blue-950/30 border-b">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="h-5 w-5 text-blue-600" />
                                    Joueurs inscrits ({tournament.participants.length})
                                </CardTitle>
                                {canManage && (
                                    <Link href={`/tournois/${tournament.id}/gestion`}>
                                        <Button variant="outline" size="sm">Voir les équipes</Button>
                                    </Link>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                                {participants.map((player) => {
                                    if (!player) return null;
                                    const isMe = player.id === currentUserPlayerId;
                                    return (
                                        <Link key={player.id} href={`/profil/${player.id}`}>
                                            <div className={`flex items-center gap-2 p-2 rounded-lg transition-colors cursor-pointer ${isMe ? "bg-orange-100 border-2 border-orange-400 dark:bg-orange-950/40" : "hover:bg-muted border border-transparent"}`}>
                                                <Avatar
                                                    src={player.avatar}
                                                    fallback={`${player.firstName[0]}${player.lastName[0]}`}
                                                    size="sm"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-xs font-medium truncate ${isMe ? "text-orange-700 dark:text-orange-300 font-bold" : "text-foreground"}`}>
                                                        {player.firstName} {player.lastName}
                                                    </p>
                                                    {isMe && <span className="text-[9px] bg-orange-500 text-white px-1 py-0.5 rounded-full font-semibold">Vous</span>}
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                            {participants.length === 0 && (
                                <p className="text-center text-muted-foreground py-8">
                                    Aucun participant pour le moment.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                    )}
                </div>

                {/* Sidebar - hidden for official tournaments */}
                {!tournament.is_official && (
                <div className="space-y-6">
                    {/* Action Card */}
                    <Card className="sticky top-24">
                        <CardContent className="pt-6 space-y-6">
                            {/* Lieu */}
                            <div className="flex items-start gap-3">
                                <MapPin className="h-5 w-5 text-primary mt-0.5" />
                                <div>
                                    <p className="font-medium text-foreground">
                                        {tournament.location.address}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {tournament.location.city}
                                    </p>
                                </div>
                            </div>

                            {/* Organizer */}
                            {organizer && (
                                <div className="border-t border-border pt-4">
                                    <p className="text-sm text-muted-foreground mb-2">
                                        Organisé par
                                    </p>
                                    <Link href={`/profil/${organizer.id || '#'}`}>
                                        <div className="flex items-center gap-3 hover:bg-muted p-2 rounded-lg -mx-2 transition-colors">
                                            <Avatar
                                                src={organizer.avatar}
                                                fallback={`${organizer.firstName[0]}${organizer.lastName[0]}`}
                                                size="md"
                                            />
                                            <div>
                                                <p className="font-medium text-foreground">
                                                    {organizer.firstName} {organizer.lastName}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {organizer.location.city}
                                                </p>
                                            </div>
                                        </div>
                                    </Link>
                                </div>
                            )}

                            {/* QR Code - Organizer only */}
                            {canManage && (
                                <div className="border-t border-border pt-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <QrCode className="h-4 w-4 text-primary" />
                                        <p className="text-sm font-medium text-foreground">QR Code d&apos;inscription</p>
                                    </div>
                                    <div className="bg-white p-3 rounded-lg border border-border flex justify-center">
                                        <img
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(getMobileUrl(`/tournois/${tournament.id}/inscription`))}`}
                                            alt={`QR Code pour ${tournament.name}`}
                                            className="w-32 h-32"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground text-center mt-2">
                                        Scannez pour s&apos;inscrire au tournoi
                                    </p>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="space-y-3">
                                {canManage && (
                                    <Link href={`/tournois/${tournament.id}/gestion`} className="w-full block">
                                        <Button className="w-full" size="lg">
                                            Gérer le tournoi (Table de marque)
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
                )}
            </div>
        </div>
    );
}
