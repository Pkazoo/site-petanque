"use client";

import { useAuth } from "@/lib/context/AuthContext";
import { useTournament } from "@/lib/context/TournamentContext";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
    Settings,
    MapPin,
    Calendar,
    Trophy,
    QrCode,
    Camera,
    Loader2,
    ScanLine,
    Plus,
    MessageCircle,
    Send,
    AlertCircle,
} from "lucide-react";
import { useMatchChat } from "@/lib/hooks/useMatchChat";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
} from "@/components/ui/Dialog";
import {
    formatDate,
} from "@/lib/mock/data";
import { getMobileUrl } from "@/lib/utils/getMobileUrl";
import { computeEloRatings, INITIAL_ELO } from "@/lib/utils/elo";





export default function MonProfilPage() {
    const { user: authUser, userAccount, loading, isOrganisateur } = useAuth();
    const { tournaments, matches, teams, players, leagueMatches, getPlayerByUserId, updatePlayer, addPlayer } = useTournament();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [chatMessage, setChatMessage] = useState("");
    const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
    const [sendingMessage, setSendingMessage] = useState(false);
    const [enlargedAvatar, setEnlargedAvatar] = useState<{ src?: string; name: string } | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const lastMessageCountRef = useRef<number>(0);
    const audioUnlockedRef = useRef<boolean>(false);
    const router = useRouter();

    // Auto-close enlarged avatar after 3 seconds
    useEffect(() => {
        if (enlargedAvatar) {
            const timer = setTimeout(() => {
                setEnlargedAvatar(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [enlargedAvatar]);

    // Initialize audio for notification sound (louder, clearer sound)
    useEffect(() => {
        // Use a clearer notification sound URL
        audioRef.current = new Audio('https://notificationsounds.com/storage/sounds/file-sounds-1150-pristine.mp3');
        audioRef.current.volume = 1.0;
    }, []);

    // Unlock audio on mobile (needs user interaction)
    const unlockAudio = () => {
        if (!audioUnlockedRef.current && audioRef.current) {
            audioRef.current.play().then(() => {
                audioRef.current?.pause();
                audioRef.current!.currentTime = 0;
                audioUnlockedRef.current = true;
            }).catch(() => { });
        }
    };

    // Hook for match chat - connected to Supabase
    const {
        messages: matchChatMessages,
        loading: chatLoading,
        error: chatError,
        sendMessage,
        isUserInMatch,
        currentUserPlayerId
    } = useMatchChat(selectedMatchId);

    useEffect(() => {
        if (!loading && !authUser) {
            router.push('/connexion');
        }
    }, [authUser, loading, router]);

    // Get player profile linked to this auth user
    const playerProfile = useMemo(() => {
        if (!authUser) return null;
        return getPlayerByUserId(authUser.id);
    }, [authUser, getPlayerByUserId, players]);

    // Compress image to be under 300KB
    const compressImage = (file: File, maxSizeKB: number = 300): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Resize if image is too large (max 800px)
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
                    if (!ctx) {
                        reject(new Error('Could not get canvas context'));
                        return;
                    }

                    ctx.drawImage(img, 0, 0, width, height);

                    // Start with quality 0.9 and reduce until under maxSizeKB
                    let quality = 0.9;
                    let result = canvas.toDataURL('image/jpeg', quality);

                    while (result.length > maxSizeKB * 1024 * 1.37 && quality > 0.1) {
                        quality -= 0.1;
                        result = canvas.toDataURL('image/jpeg', quality);
                    }

                    console.log(`Image compressed: ${Math.round(result.length / 1024)}KB (quality: ${quality.toFixed(1)})`);
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
        if (!file || !authUser) return;

        if (file.size > 10 * 1024 * 1024) {
            alert("La photo ne doit pas dépasser 10 Mo");
            return;
        }

        setUploadingPhoto(true);

        try {
            // Compress image to under 300KB
            const avatarData = await compressImage(file, 300);

            console.log('Photo upload - authUser.id:', authUser.id);
            console.log('Photo upload - playerProfile:', playerProfile);
            console.log('Photo upload - compressed size:', Math.round(avatarData.length / 1024), 'KB');

            if (playerProfile) {
                // Update existing player
                console.log('Updating existing player:', playerProfile.id);
                await updatePlayer(playerProfile.id, { avatar: avatarData });
            } else {
                // Create new player profile with avatar
                console.log('Creating new player profile');
                const displayName = userAccount?.display_name || authUser.email?.split('@')[0] || 'Joueur';
                const [fName, ...lNameParts] = displayName.split(' ');
                await addPlayer({
                    firstName: fName || 'Joueur',
                    lastName: lNameParts.join(' ') || '',
                    username: authUser.email?.split('@')[0] || 'joueur',
                    email: authUser.email || '',
                    location: { city: 'Non renseigné', lat: 0, lng: 0 },
                    avatar: avatarData,
                }, authUser.id);
                alert('Nouveau profil joueur cree avec photo');
            }
        } catch (error) {
            console.error('Error compressing image:', error);
            alert('Erreur lors du traitement de la photo');
        } finally {
            setUploadingPhoto(false);
        }
    };

    // Calculate real statistics from tournament data
    const stats = useMemo(() => {
        if (!authUser || !playerProfile) return { wins: 0, losses: 0, tournamentsPlayed: 0, tournamentsWon: 0, pointsScored: 0, pointsConceded: 0, pointDifference: 0 };

        // Find teams where this player is a member
        const playerTeams = teams.filter(t => t.playerIds.includes(playerProfile.id));
        const playerTeamIds = playerTeams.map(t => t.id);

        // Find all matches involving player's teams
        const playerMatches = matches.filter(m =>
            (m.team1Id && playerTeamIds.includes(m.team1Id)) ||
            (m.team2Id && playerTeamIds.includes(m.team2Id))
        );

        let wins = 0;
        let losses = 0;
        let pointsScored = 0;
        let pointsConceded = 0;

        playerMatches.forEach(match => {
            if (match.status !== 'completed' || match.winnerId === null) return;

            const isTeam1 = match.team1Id && playerTeamIds.includes(match.team1Id);
            const isTeam2 = match.team2Id && playerTeamIds.includes(match.team2Id);

            // Calculate points
            if (match.score1 !== undefined && match.score2 !== undefined) {
                if (isTeam1) {
                    pointsScored += match.score1;
                    pointsConceded += match.score2;
                } else if (isTeam2) {
                    pointsScored += match.score2;
                    pointsConceded += match.score1;
                }
            }

            if (isTeam1 && match.winnerId === match.team1Id) wins++;
            else if (isTeam2 && match.winnerId === match.team2Id) wins++;
            else if (isTeam1 || isTeam2) losses++;
        });

        // Count tournaments
        const playerTournamentIds = [...new Set(playerTeams.map(t => t.tournamentId))];
        const tournamentsPlayed = playerTournamentIds.length;

        // Count tournaments won (where player's team won the final)
        let tournamentsWon = 0;
        playerTournamentIds.forEach(tournamentId => {
            const tournament = tournaments.find(t => t.id === tournamentId);
            if (tournament?.status === 'completed') {
                // Find final match
                const tournamentMatches = matches.filter(m => m.tournamentId === tournamentId);
                const finalMatch = tournamentMatches.find(m => m.round === Math.max(...tournamentMatches.map(tm => tm.round)));
                if (finalMatch?.winnerId && playerTeamIds.includes(finalMatch.winnerId)) {
                    tournamentsWon++;
                }
            }
        });

        return {
            wins,
            losses,
            tournamentsPlayed,
            tournamentsWon,
            pointsScored,
            pointsConceded,
            pointDifference: pointsScored - pointsConceded
        };
    }, [authUser, playerProfile, teams, matches, tournaments]);

    // Compute ELO rating from match history
    const eloRating = useMemo(() => {
        if (!playerProfile) return INITIAL_ELO;
        const ratings = computeEloRatings(teams, matches, leagueMatches);
        return ratings.get(playerProfile.id) ?? INITIAL_ELO;
    }, [playerProfile, teams, matches, leagueMatches]);

    // Get ALL ongoing matches for the player
    const ongoingMatches = useMemo(() => {
        if (!authUser) return [];

        // Si on n'a pas de profil joueur et qu'on n'est pas organisateur, on ne peut rien voir
        if (!playerProfile && !isOrganisateur) return [];

        const playerTeams = playerProfile ? teams.filter(t => t.playerIds.includes(playerProfile.id)) : [];
        const playerTeamIds = playerTeams.map(t => t.id);

        // Find all ongoing matches
        const allOngoingMatches = matches.filter(m => {
            if (m.status !== 'ongoing') return false;

            // Si admin/organisateur, on voit TOUT
            if (isOrganisateur) return true;

            // Sinon seulement les siens
            return (m.team1Id && playerTeamIds.includes(m.team1Id)) ||
                (m.team2Id && playerTeamIds.includes(m.team2Id));
        });

        return allOngoingMatches.map(ongoingMatch => {
            // Get opponent team info
            const myTeamId = playerTeamIds.find(id => id === ongoingMatch.team1Id || id === ongoingMatch.team2Id);
            const opponentTeamId = ongoingMatch.team1Id === myTeamId ? ongoingMatch.team2Id : ongoingMatch.team1Id;
            const opponentTeam = teams.find(t => t.id === opponentTeamId);
            const opponentPlayers = opponentTeam ? players.filter(p => opponentTeam.playerIds.includes(p.id)) : [];
            const tournament = tournaments.find(t => t.id === ongoingMatch.tournamentId);

            return {
                match: ongoingMatch,
                opponentTeam,
                opponentPlayers,
                tournament,
            };
        });
    }, [authUser, playerProfile, teams, matches, players, tournaments]);

    // Auto-select first match if none selected
    useEffect(() => {
        if (ongoingMatches.length > 0 && !selectedMatchId) {
            setSelectedMatchId(ongoingMatches[0].match.id);
        }
    }, [ongoingMatches, selectedMatchId]);

    // Auto-scroll chat and play sound when new messages arrive
    useEffect(() => {
        if (matchChatMessages.length > 0 && chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

            // Play sound if new message from someone else
            if (matchChatMessages.length > lastMessageCountRef.current) {
                const lastMessage = matchChatMessages[matchChatMessages.length - 1];
                if (lastMessage && lastMessage.senderId !== currentUserPlayerId) {
                    audioRef.current?.play().catch(() => { });
                }
            }
        }
        lastMessageCountRef.current = matchChatMessages.length;
    }, [matchChatMessages, currentUserPlayerId]);

    // Get currently selected match
    const currentMatch = useMemo(() => {
        if (!selectedMatchId) return ongoingMatches[0] || null;
        return ongoingMatches.find(m => m.match.id === selectedMatchId) || ongoingMatches[0] || null;
    }, [ongoingMatches, selectedMatchId]);

    // Get tournaments where player is registered OR that they organize
    const userTournaments = useMemo(() => {
        if (!authUser) return [];

        // Tournois où le joueur participe (via ses équipes)
        const playerTeams = playerProfile ? teams.filter(t => t.playerIds.includes(playerProfile.id)) : [];
        const participatingTournamentIds = new Set(playerTeams.map(t => t.tournamentId));

        return tournaments
            .filter(t => {
                if (t.status !== 'upcoming' && t.status !== 'ongoing') return false;
                // Tournois que j'organise
                const isMyTournament = t.organizerId === authUser.id;
                // Tournois où je joue
                const isParticipant = participatingTournamentIds.has(t.id);
                return isMyTournament || isParticipant;
            })
            .sort((a, b) => {
                if (a.status === 'ongoing' && b.status !== 'ongoing') return -1;
                if (b.status === 'ongoing' && a.status !== 'ongoing') return 1;
                return a.date.getTime() - b.date.getTime();
            });
    }, [authUser, playerProfile, teams, tournaments]);

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-4xl flex justify-center items-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!authUser) return null;

    // Build user object from playerProfile or userAccount
    const user = {
        id: authUser.id,
        email: userAccount?.email || authUser.email || '',
        firstName: playerProfile?.firstName || userAccount?.display_name?.split(' ')[0] || 'Joueur',
        lastName: playerProfile?.lastName || userAccount?.display_name?.split(' ').slice(1).join(' ') || '',
        location: playerProfile?.location || { city: 'Non renseigné', region: '', lat: 0, lng: 0 },
        avatar: playerProfile?.avatar,
        bio: playerProfile?.bio || '',
        eloRating,
        badges: playerProfile?.badges || [],
        createdAt: playerProfile?.createdAt || new Date(),
        stats,
    };

    const winRate =
        user.stats.wins + user.stats.losses > 0
            ? Math.round(
                (user.stats.wins / (user.stats.wins + user.stats.losses)) * 100
            )
            : 0;

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <audio ref={audioRef} className="hidden" src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" />
            {/* Profile Header */}
            <Card className="mb-6 overflow-hidden">
                <div className="h-32 bg-gradient-to-r from-primary to-accent" />
                <CardContent className="relative pt-0">
                    <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-16 sm:-mt-12">
                        <div className="relative">
                            <Avatar
                                src={user.avatar}
                                fallback={`${user.firstName[0]}${user.lastName[0]}`}
                                size="xl"
                                className="h-28 w-28 border-4 border-background shadow-lg"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingPhoto}
                                className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                            >
                                {uploadingPhoto ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Camera className="h-4 w-4" />
                                )}
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoChange}
                                className="hidden"
                            />
                        </div>
                        <div className="flex-1 pb-2">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                <h1 className="text-2xl font-bold text-foreground">
                                    {user.firstName} {user.lastName}
                                </h1>
                            </div>
                            <p className="text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {user.location.city}, {user.location.region}
                            </p>
                        </div>
                        <div className="flex gap-2 sm:pb-2">
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="icon">
                                        <QrCode className="h-4 w-4" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle className="flex items-center gap-2">
                                            <QrCode className="h-5 w-5" />
                                            Mon QR Code
                                        </DialogTitle>
                                        <DialogDescription>
                                            Scannez ce QR code pour accéder à votre profil public
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="flex flex-col items-center gap-4 py-4">
                                        <div className="bg-white p-4 rounded-lg shadow-inner">
                                            <img
                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(getMobileUrl(`/profil/${user.id}`))}`}
                                                alt="QR Code du profil"
                                                className="w-48 h-48"
                                            />
                                        </div>
                                        <p className="text-sm text-muted-foreground text-center">
                                            Partagez ce code lors des tournois pour permettre aux autres joueurs de vous retrouver facilement
                                        </p>
                                    </div>
                                </DialogContent>
                            </Dialog>
                            <Link href="/profil/editer">
                                <Button variant="outline" className="gap-2">
                                    <Settings className="h-4 w-4" />
                                    Paramètres
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {user.bio && (
                        <p className="mt-6 text-foreground">{user.bio}</p>
                    )}
                </CardContent>
            </Card>

            {/* Stats Grid - Compact for mobile */}
            <div className="grid grid-cols-4 gap-2 mb-4">
                <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
                    <CardContent className="py-2 px-1 text-center">
                        <div className="text-lg sm:text-2xl font-bold text-primary">
                            {user.eloRating}
                        </div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">ELO</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="py-2 px-1 text-center">
                        <div className="text-lg sm:text-2xl font-bold text-foreground">{winRate}%</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Victoires</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="py-2 px-1 text-center">
                        <div className="text-lg sm:text-2xl font-bold text-foreground">
                            {user.stats.tournamentsPlayed}
                        </div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Joués</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="py-2 px-1 text-center">
                        <div className="text-lg sm:text-2xl font-bold text-foreground">
                            {user.stats.tournamentsWon}
                        </div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Gagnés</p>
                    </CardContent>
                </Card>
            </div>

            {/* Points Stats Grid */}
            <div className="grid grid-cols-3 gap-2 mb-6">
                <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-200/50">
                    <CardContent className="py-2 px-1 text-center">
                        <div className="text-lg sm:text-2xl font-bold text-green-600">
                            {user.stats.pointsScored}
                        </div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Points Marqués</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-200/50">
                    <CardContent className="py-2 px-1 text-center">
                        <div className="text-lg sm:text-2xl font-bold text-red-600">
                            {user.stats.pointsConceded}
                        </div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Points Encaissés</p>
                    </CardContent>
                </Card>
                <Card className={`bg-gradient-to-br ${user.stats.pointDifference >= 0 ? 'from-blue-500/10 to-blue-500/5 border-blue-200/50' : 'from-orange-500/10 to-orange-500/5 border-orange-200/50'}`}>
                    <CardContent className="py-2 px-1 text-center">
                        <div className={`text-lg sm:text-2xl font-bold ${user.stats.pointDifference >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                            {user.stats.pointDifference > 0 ? '+' : ''}{user.stats.pointDifference}
                        </div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Différence</p>
                    </CardContent>
                </Card>
            </div>

            {/* Current Match Chat */}
            {ongoingMatches.length > 0 && currentMatch && (
                <Card className="mb-6 border-green-500/50 bg-green-500/5">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <CardTitle className="flex items-center gap-2 text-green-600">
                                <MessageCircle className="h-5 w-5 animate-pulse" />
                                Chat match en cours
                            </CardTitle>
                            <Badge variant="default" className="bg-green-500 text-white animate-pulse">
                                {currentMatch.match.score1 ?? 0} - {currentMatch.match.score2 ?? 0}
                            </Badge>
                        </div>
                        {/* Match/Tournament selector dropdown */}
                        {ongoingMatches.length > 1 && (
                            <div className="mt-2">
                                <select
                                    value={selectedMatchId || ''}
                                    onChange={(e) => setSelectedMatchId(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm font-medium"
                                >
                                    {ongoingMatches.map((m) => (
                                        <option key={m.match.id} value={m.match.id}>
                                            {m.tournament?.name || 'Tournoi'} - vs {m.opponentPlayers.map(p => p.firstName).join(' & ') || 'Adversaire'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {/* Opponent info */}
                        <div className="mt-2 p-2 bg-background/50 rounded-lg border">
                            <div className="flex items-center gap-3">
                                {currentMatch.opponentPlayers.length > 0 && (
                                    <div className="flex -space-x-2">
                                        {currentMatch.opponentPlayers.map((player) => (
                                            <button
                                                key={player.id}
                                                onClick={() => setEnlargedAvatar({ src: player.avatar, name: `${player.firstName} ${player.lastName}` })}
                                                className="focus:outline-none focus:ring-2 focus:ring-primary rounded-full"
                                            >
                                                <Avatar
                                                    src={player.avatar}
                                                    fallback={`${player.firstName[0]}${player.lastName[0]}`}
                                                    size="md"
                                                    className="border-2 border-background cursor-pointer hover:scale-110 transition-transform"
                                                />
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <div>
                                    <p className="text-sm font-medium text-foreground">
                                        Adversaire : <span className="text-primary">{currentMatch.opponentPlayers.map(p => `${p.firstName} ${p.lastName}`).join(' & ') || 'Non défini'}</span>
                                    </p>
                                    {currentMatch.tournament && (
                                        <p className="text-xs text-muted-foreground">
                                            {currentMatch.tournament.name}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {/* Chat messages */}
                        <div className="bg-background rounded-lg border h-48 overflow-y-auto p-3 mb-3 space-y-2">
                            {chatLoading ? (
                                <div className="flex items-center justify-center h-full">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                </div>
                            ) : chatError ? (
                                <div className="flex flex-col items-center justify-center h-full text-center">
                                    <AlertCircle className="h-6 w-6 text-destructive mb-2" />
                                    <p className="text-sm text-muted-foreground">{chatError}</p>
                                </div>
                            ) : !isUserInMatch ? (
                                <p className="text-muted-foreground text-center text-sm py-8">
                                    Chargement...
                                </p>
                            ) : matchChatMessages.length === 0 ? (
                                <p className="text-muted-foreground text-center text-sm py-8">
                                    Envoyez un message à {currentMatch.opponentPlayers[0]?.firstName || 'votre adversaire'}
                                </p>
                            ) : (
                                matchChatMessages.map((msg) => {
                                    const isMe = msg.senderId === currentUserPlayerId;
                                    const sender = players.find(p => p.id === msg.senderId);
                                    return (
                                        <div
                                            key={msg.id}
                                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div className="flex flex-col max-w-[80%]">
                                                {!isMe && (
                                                    <span className="text-xs text-muted-foreground mb-1">
                                                        {sender?.firstName || 'Joueur'}
                                                    </span>
                                                )}
                                                <div
                                                    className={`rounded-lg px-3 py-2 text-sm ${isMe
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'bg-muted'
                                                        }`}
                                                >
                                                    {msg.content}
                                                    <span className={`text-[10px] ml-2 ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                                        {msg.createdAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={chatEndRef} />
                        </div>
                        {/* Message input */}
                        <form
                            onSubmit={async (e) => {
                                e.preventDefault();
                                if (chatMessage.trim() && isUserInMatch) {
                                    setSendingMessage(true);
                                    try {
                                        await sendMessage(chatMessage);
                                        setChatMessage("");
                                        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
                                    } catch (err) {
                                        console.error('Error sending message:', err);
                                    } finally {
                                        setSendingMessage(false);
                                    }
                                }
                            }}
                            className="flex gap-2"
                        >
                            <input
                                type="text"
                                value={chatMessage}
                                onChange={(e) => setChatMessage(e.target.value)}
                                onFocus={unlockAudio}
                                placeholder={`Message à ${currentMatch.opponentPlayers[0]?.firstName || 'adversaire'}...`}
                                className="flex-1 px-4 py-2 rounded-lg border border-input bg-background text-sm"
                                disabled={!isUserInMatch || sendingMessage}
                            />
                            <Button type="submit" size="icon" disabled={!chatMessage.trim() || !isUserInMatch || sendingMessage}>
                                {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* My Tournaments */}
            <Card className="mb-6">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Trophy className="h-5 w-5 text-primary" />
                            Mes tournois
                        </CardTitle>
                        <Link href="/mes-tournois">
                            <Button variant="outline" size="sm">
                                Voir tout
                            </Button>
                        </Link>
                    </div>
                </CardHeader>
                <CardContent>
                    {userTournaments.length > 0 ? (
                        <div className="space-y-4">
                            {userTournaments.map((tournament) => (
                                <Link key={tournament.id} href={`/mes-tournois/${tournament.id}`} className="block">
                                    <div className={`flex items-center gap-4 p-3 rounded-lg hover:bg-muted transition-colors cursor-pointer ${tournament.status === 'ongoing' ? 'ring-2 ring-primary/50 bg-primary/5' : ''}`}>
                                        <div className="w-16 h-16 rounded-lg bg-white p-1 flex items-center justify-center shadow-sm border">
                                            <img
                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(getMobileUrl(`/tournois/${tournament.id}/inscription`))}`}
                                                alt={`QR ${tournament.name}`}
                                                className="w-14 h-14"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-medium text-foreground truncate">
                                                    {tournament.name}
                                                </h4>
                                                {tournament.status === 'ongoing' && (
                                                    <Badge variant="default" className="bg-green-500 text-white animate-pulse">
                                                        En cours
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {formatDate(tournament.date)}
                                            </p>
                                        </div>
                                        <Badge variant="outline">{tournament.location.city}</Badge>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-center py-8">
                            Vous n&apos;êtes inscrit à aucun tournoi
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-4 mt-6">
                <Link href="/tournois/scanner">
                    <Button className="w-full gap-2 h-14 text-lg" size="lg">
                        <ScanLine className="h-6 w-6" />
                        S&apos;inscrire à un tournoi
                    </Button>
                </Link>
                <Link href="/tournois/creer" className="block mt-4">
                    <Button variant="outline" className="w-full gap-2 h-14 text-lg" size="lg">
                        <Plus className="h-6 w-6" />
                        Créer un tournoi
                    </Button>
                </Link>
            </div>

            {/* Enlarged Avatar Modal */}
            {enlargedAvatar && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 animate-fade-in"
                    onClick={() => setEnlargedAvatar(null)}
                >
                    <div className="flex flex-col items-center gap-4 p-4">
                        <div className="relative">
                            <Avatar
                                src={enlargedAvatar.src}
                                fallback={enlargedAvatar.name.split(' ').map(n => n[0]).join('')}
                                size="xl"
                                className="w-48 h-48 border-4 border-white shadow-2xl"
                            />
                            {/* Progress bar showing 3 seconds countdown */}
                            <div className="absolute -bottom-2 left-0 right-0 h-1 bg-white/30 rounded-full overflow-hidden">
                                <div className="h-full bg-white animate-shrink-width" style={{ animationDuration: '3s' }} />
                            </div>
                        </div>
                        <p className="text-white text-lg font-semibold">{enlargedAvatar.name}</p>
                        <p className="text-white/60 text-sm">Touchez pour fermer</p>
                    </div>
                </div>
            )}
        </div>
    );
}
