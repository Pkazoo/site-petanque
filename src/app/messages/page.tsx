"use client";

import { Suspense, useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTournament } from "@/lib/context/TournamentContext";
import { useAuth } from "@/lib/context/AuthContext";
import { useMatchChat } from "@/lib/hooks/useMatchChat";
import { useDirectMessages } from "@/lib/hooks/useDirectMessages";
import { Search, Send, MoreVertical, Phone, Video, Users, MessageSquare, Loader2, AlertCircle, ArrowLeft, User, Filter, RefreshCcw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { NotificationPermissionBanner } from "@/components/notifications/NotificationPermissionBanner";

function MessagesContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const matchId = searchParams.get('matchId');
    const userIdParam = searchParams.get('userId'); // Pour ouvrir une conversation avec un joueur
    const { isAdmin } = useAuth();
    const { matches, getTeam, getPlayer, players } = useTournament();

    // Chat hook for match messages
    const {
        messages: chatMessages,
        loading: messagesLoading,
        error: messagesError,
        sendMessage: sendMatchMessage,
        isUserInMatch,
        currentUserPlayerId: matchChatPlayerId
    } = useMatchChat(matchId);

    // Direct messages hook
    const {
        conversations,
        messages: directMessages,
        loading: conversationsLoading,
        loadingMessages: directMessagesLoading,
        error: directError,
        selectedConversationId,
        selectConversation,
        sendMessage: sendDirectMessage,
        startConversationWith,
        currentUserPlayerId
    } = useDirectMessages(isAdmin);

    const [messageInput, setMessageInput] = useState("");
    const [sendingMessage, setSendingMessage] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedPlayerFilter, setSelectedPlayerFilter] = useState<string | "all">("all");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const prevDirectCountRef = useRef(0);
    const prevMatchCountRef = useRef(0);

    // Handle userId parameter - start conversation with user
    useEffect(() => {
        if (userIdParam && currentUserPlayerId && !conversationsLoading) {
            startConversationWith(userIdParam);
        }
    }, [userIdParam, currentUserPlayerId, conversationsLoading]);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        if (matchId && chatMessages.length > 0) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        } else if (!matchId && directMessages.length > 0) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [chatMessages, directMessages, matchId]);

    // Play sound on new messages
    useEffect(() => {
        // Direct messages
        if (directMessages.length > prevDirectCountRef.current) {
            const lastMsg = directMessages[directMessages.length - 1];
            if (lastMsg && lastMsg.senderId !== currentUserPlayerId) {
                audioRef.current?.play().catch(() => { });
            }
        }
        prevDirectCountRef.current = directMessages.length;

        // Match messages
        if (chatMessages.length > prevMatchCountRef.current) {
            const lastMsg = chatMessages[chatMessages.length - 1];
            // Use currentUserPlayerId (or matchChatPlayerId) to check sender
            if (lastMsg && lastMsg.senderId !== currentUserPlayerId) {
                audioRef.current?.play().catch(() => { });
            }
        }
        prevMatchCountRef.current = chatMessages.length;
    }, [directMessages, chatMessages, currentUserPlayerId]);

    // Handle sending a message
    const handleSendMessage = async () => {
        if (!messageInput.trim() || sendingMessage) return;
        setSendingMessage(true);
        try {
            if (matchId) {
                await sendMatchMessage(messageInput);
            } else if (selectedConversationId) {
                await sendDirectMessage(messageInput);
            }
            setMessageInput("");
        } catch (err) {
            // Error already logged in hook
        } finally {
            setSendingMessage(false);
        }
    };

    // Logic for match conversation
    let matchConversation = null;
    let currentMatch = null;
    if (matchId) {
        const match = matches.find(m => m.id === matchId);
        currentMatch = match;
        if (match) {
            const team1 = match.team1Id ? getTeam(match.team1Id) : null;
            const team2 = match.team2Id ? getTeam(match.team2Id) : null;
            matchConversation = {
                id: `match-${matchId}`,
                title: `Chat de Match #${match.matchNumber + 1}`,
                subtitle: `${team1?.name || "Equipe 1"} vs ${team2?.name || "Equipe 2"}`,
                type: 'match' as const,
                lastMessage: "Commencez la discussion avec vos adversaires...",
                time: "Maintenant",
                unread: 0,
            };
        }
    }

    // Filter conversations by search and selected player (for admins)
    const filteredConversations = conversations.filter(conv => {
        const matchesSearch = conv.participantName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesPlayerFilter = selectedPlayerFilter === "all" ||
            conv.participant1Id === selectedPlayerFilter ||
            conv.participant2Id === selectedPlayerFilter;

        return matchesSearch && matchesPlayerFilter;
    });

    // Unified list of conversations for Admin
    const allSidebarConversations = useMemo(() => {
        const direct = filteredConversations.map(conv => ({
            ...conv,
            displayType: 'direct' as const
        }));

        // Map ongoing matches to conversation items
        // Admin sees ALL ongoing matches
        // Players see only THEIR ongoing matches
        const visibleMatches = matches.filter(m => {
            if (m.status !== 'ongoing') return false;

            if (isAdmin) return true;

            // Check if current user is participant
            // We need to check if user (from useDirectMessages hook or context) is in team
            if (!currentUserPlayerId) return false;

            const team1 = m.team1Id ? getTeam(m.team1Id) : null;
            const team2 = m.team2Id ? getTeam(m.team2Id) : null;

            const inTeam1 = team1?.playerIds?.includes(currentUserPlayerId);
            const inTeam2 = team2?.playerIds?.includes(currentUserPlayerId);

            return inTeam1 || inTeam2;
        });

        const matchConvs = visibleMatches.map(m => {
            const team1 = m.team1Id ? getTeam(m.team1Id) : null;
            const team2 = m.team2Id ? getTeam(m.team2Id) : null;
            return {
                id: m.id,
                participantName: `Match #${m.matchNumber !== undefined ? m.matchNumber + 1 : ''}`,
                participantAvatar: undefined,
                lastMessage: `${team1?.name || 'T1'} vs ${team2?.name || 'T2'}`,
                lastMessageTime: undefined,
                unreadCount: 0,
                displayType: 'match' as const
            };
        });

        return [...matchConvs, ...direct]; // Matches first, then DMs
    }, [filteredConversations, isAdmin, matches, getTeam, currentUserPlayerId]);

    // Si on a un matchId dans l'URL, on affiche uniquement le chat du match
    const showMatchChat = !!matchId;
    const showDirectChat = !matchId;

    // Masquer la liste de conversations si on vient d'un match
    const showConversationsList = !matchId;

    // Selected conversation for direct messages
    const selectedDirectConversation = conversations.find(c => c.id === selectedConversationId);

    // Si on a un matchId mais que le match n'est pas trouve, afficher un loader
    if (matchId && !matchConversation) {
        return (
            <div className="h-[calc(100vh-4rem-5rem)] md:h-[calc(100vh-4rem)] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <>
            <NotificationPermissionBanner />
            <audio ref={audioRef} className="hidden" src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" />
            <div className="h-[calc(100vh-4rem-5rem)] md:h-[calc(100vh-4rem)] flex">
                {/* Conversations List */}
                {showConversationsList && (
                    <div className="w-full sm:w-80 lg:w-96 border-r border-border bg-background flex flex-col">
                        {/* Header */}
                        <div className="p-4 border-b border-border">
                            <div className="flex items-center justify-between mb-4">
                                <h1 className="text-xl font-bold text-foreground">Messages</h1>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                                    onClick={() => window.location.reload()}
                                    title="Actualiser la page"
                                >
                                    <RefreshCcw className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="space-y-3">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Rechercher..."
                                        className="pl-10"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                {isAdmin && (
                                    <div className="flex items-center gap-2">
                                        <Filter className="h-4 w-4 text-primary" />
                                        <select
                                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                            value={selectedPlayerFilter}
                                            onChange={(e) => setSelectedPlayerFilter(e.target.value)}
                                        >
                                            <option value="all">Tous les joueurs</option>
                                            {players
                                                .sort((a, b) => a.firstName.localeCompare(b.firstName))
                                                .map(p => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.firstName} {p.lastName}
                                                    </option>
                                                ))
                                            }
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Conversations */}
                        <div className="flex-1 overflow-y-auto">
                            {conversationsLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                </div>
                            ) : directError ? (
                                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                                    <AlertCircle className="h-8 w-8 text-destructive mb-2" />
                                    <p className="text-sm text-muted-foreground">{directError}</p>
                                </div>
                            ) : allSidebarConversations.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                                        <MessageSquare className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <h3 className="font-semibold text-foreground mb-1">Aucune conversation</h3>
                                    <p className="text-sm text-muted-foreground max-w-xs">
                                        Visitez le profil d'un joueur et cliquez sur "Message" pour demarrer une conversation.
                                    </p>
                                </div>
                            ) : (
                                allSidebarConversations.map((conv) => (
                                    <div
                                        key={conv.id}
                                        onClick={() => {
                                            if (conv.displayType === 'match') {
                                                router.push(`/messages?matchId=${conv.id}`);
                                            } else {
                                                selectConversation(conv.id);
                                            }
                                        }}
                                        className={`flex items-center gap-3 p-4 hover:bg-muted transition-colors cursor-pointer border-b border-border ${(conv.displayType === 'match' && matchId === conv.id) ||
                                            (conv.displayType === 'direct' && conv.id === selectedConversationId)
                                            ? "bg-muted border-l-4 border-l-primary" : ""
                                            }`}
                                    >
                                        <div className="relative">
                                            {conv.displayType === 'match' ? (
                                                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                    <Trophy className="h-6 w-6" />
                                                </div>
                                            ) : (
                                                <Avatar
                                                    src={conv.participantAvatar}
                                                    fallback={conv.participantName.substring(0, 2).toUpperCase()}
                                                    size="lg"
                                                />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-semibold text-foreground truncate">
                                                    {conv.participantName}
                                                </h3>
                                                {conv.lastMessageTime && (
                                                    <span className="text-xs text-muted-foreground shrink-0">
                                                        {formatTime(conv.lastMessageTime)}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground truncate">
                                                {conv.lastMessage || "Aucun message"}
                                            </p>
                                        </div>
                                        {conv.unreadCount > 0 && (
                                            <span className="shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
                                                {conv.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Chat Area */}
                <div className={`flex-1 flex flex-col bg-muted/30 ${showConversationsList ? 'hidden sm:flex' : 'flex'}`}>
                    {/* Match Chat */}
                    {showMatchChat && matchConversation ? (
                        <>
                            {/* Chat Header */}
                            <div className="flex items-center justify-between p-4 border-b border-border bg-background">
                                <div className="flex items-center gap-3">
                                    {currentMatch && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => router.push(`/tournois/${currentMatch.tournamentId}`)}
                                            className="shrink-0"
                                        >
                                            <ArrowLeft className="h-5 w-5" />
                                        </Button>
                                    )}
                                    <Avatar
                                        fallback={<Users className="h-5 w-5" />}
                                        size="md"
                                        className="bg-primary/10 text-primary"
                                    />
                                    <div>
                                        <h2 className="font-semibold text-foreground">
                                            {matchConversation.title}
                                        </h2>
                                        <p className="text-sm text-muted-foreground">{matchConversation.subtitle}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="icon">
                                        <MoreVertical className="h-5 w-5" />
                                    </Button>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {messagesLoading ? (
                                    <div className="flex items-center justify-center h-full">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    </div>
                                ) : messagesError ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4">
                                        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
                                            <AlertCircle className="h-8 w-8 text-destructive" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg">Erreur</h3>
                                            <p className="text-muted-foreground">{messagesError}</p>
                                        </div>
                                    </div>
                                ) : !isUserInMatch ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4">
                                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                                            <AlertCircle className="h-8 w-8 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg">Acces refuse</h3>
                                            <p className="text-muted-foreground max-w-md">
                                                Vous devez etre participant de ce match pour acceder a cette conversation.
                                            </p>
                                        </div>
                                    </div>
                                ) : chatMessages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4">
                                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                                            <MessageSquare className="h-8 w-8 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg">Discussion de Match</h3>
                                            <p className="text-muted-foreground max-w-md">
                                                Cet espace est reserve aux membres des deux equipes pour s'organiser.
                                                Commencez la conversation !
                                            </p>
                                        </div>
                                        <Badge variant="outline" className="mt-4">
                                            {matchConversation.subtitle}
                                        </Badge>
                                    </div>
                                ) : (
                                    <>
                                        {chatMessages.map((message) => {
                                            const isCurrentUser = message.senderId === matchChatPlayerId;
                                            const sender = getPlayer(message.senderId);
                                            const senderName = sender ? `${sender.firstName} ${sender.lastName}` : "Inconnu";
                                            const time = message.createdAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

                                            return (
                                                <div
                                                    key={message.id}
                                                    className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                                                >
                                                    <div className="flex flex-col max-w-[70%]">
                                                        {!isCurrentUser && (
                                                            <span className="text-xs text-muted-foreground mb-1 px-2">
                                                                {senderName}
                                                            </span>
                                                        )}
                                                        <div
                                                            className={`rounded-2xl px-4 py-2 ${isCurrentUser
                                                                ? "bg-primary text-primary-foreground rounded-br-sm"
                                                                : "bg-background text-foreground rounded-bl-sm shadow-sm"
                                                                }`}
                                                        >
                                                            <p>{message.content}</p>
                                                            <p
                                                                className={`text-[10px] mt-1 ${isCurrentUser
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
                                    </>
                                )}
                            </div>

                            {/* Input */}
                            <div className="p-4 border-t border-border bg-background">
                                <div className="flex items-center gap-3">
                                    <Input
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage();
                                            }
                                        }}
                                        placeholder={
                                            !isUserInMatch
                                                ? "Vous ne pouvez pas envoyer de message"
                                                : "Tapez votre message..."
                                        }
                                        className="flex-1"
                                        disabled={!isUserInMatch || messagesLoading || sendingMessage}
                                    />
                                    <Button
                                        size="icon"
                                        onClick={handleSendMessage}
                                        disabled={!messageInput.trim() || sendingMessage || !isUserInMatch}
                                    >
                                        {sendingMessage ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : (
                                            <Send className="h-5 w-5" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </>
                    ) : showDirectChat && selectedDirectConversation ? (
                        /* Direct Message Chat */
                        <>
                            {/* Chat Header */}
                            <div className="flex items-center justify-between p-4 border-b border-border bg-background">
                                <div className="flex items-center gap-3">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => selectConversation('')}
                                        className="shrink-0 sm:hidden"
                                    >
                                        <ArrowLeft className="h-5 w-5" />
                                    </Button>
                                    <Avatar
                                        src={selectedDirectConversation.participantAvatar}
                                        fallback={selectedDirectConversation.participantName.substring(0, 2).toUpperCase()}
                                        size="md"
                                    />
                                    <div>
                                        <h2 className="font-semibold text-foreground">
                                            {selectedDirectConversation.participantName}
                                        </h2>
                                        <p className="text-sm text-muted-foreground">
                                            <button
                                                onClick={() => router.push(`/profil/${selectedDirectConversation.participantId}`)}
                                                className="hover:underline"
                                            >
                                                Voir le profil
                                            </button>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="icon">
                                        <Phone className="h-5 w-5" />
                                    </Button>
                                    <Button variant="ghost" size="icon">
                                        <Video className="h-5 w-5" />
                                    </Button>
                                    <Button variant="ghost" size="icon">
                                        <MoreVertical className="h-5 w-5" />
                                    </Button>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {directMessagesLoading ? (
                                    <div className="flex items-center justify-center h-full">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    </div>
                                ) : directMessages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4">
                                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                                            <User className="h-8 w-8 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg">Nouvelle conversation</h3>
                                            <p className="text-muted-foreground max-w-md">
                                                Envoyez votre premier message a {selectedDirectConversation.participantName}.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {directMessages.map((message) => {
                                            const isCurrentUser = message.senderId === currentUserPlayerId;
                                            const time = message.createdAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

                                            return (
                                                <div
                                                    key={message.id}
                                                    className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                                                >
                                                    <div
                                                        className={`max-w-[70%] rounded-2xl px-4 py-2 ${isCurrentUser
                                                            ? "bg-primary text-primary-foreground rounded-br-sm"
                                                            : "bg-background text-foreground rounded-bl-sm shadow-sm"
                                                            }`}
                                                    >
                                                        <p>{message.content}</p>
                                                        <p
                                                            className={`text-[10px] mt-1 ${isCurrentUser
                                                                ? "text-primary-foreground/70"
                                                                : "text-muted-foreground"
                                                                }`}
                                                        >
                                                            {time}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div ref={messagesEndRef} />
                                    </>
                                )}
                            </div>

                            {/* Input */}
                            <div className="p-4 border-t border-border bg-background">
                                <div className="flex items-center gap-3">
                                    <Input
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage();
                                            }
                                        }}
                                        placeholder="Tapez votre message..."
                                        className="flex-1"
                                        disabled={sendingMessage}
                                    />
                                    <Button
                                        size="icon"
                                        onClick={handleSendMessage}
                                        disabled={!messageInput.trim() || sendingMessage}
                                    >
                                        {sendingMessage ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : (
                                            <Send className="h-5 w-5" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
                            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
                                <MessageSquare className="h-10 w-10" />
                            </div>
                            <h3 className="font-semibold text-lg text-foreground mb-2">Vos messages</h3>
                            <p className="text-center max-w-xs">
                                Selectionnez une conversation pour commencer a discuter ou visitez le profil d'un joueur pour lui envoyer un message.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

// Helper function to format time
function formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
        return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
        return 'Hier';
    } else if (days < 7) {
        return date.toLocaleDateString('fr-FR', { weekday: 'short' });
    } else {
        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    }
}

export default function MessagesPage() {
    return (
        <Suspense fallback={
            <div className="h-[calc(100vh-4rem-5rem)] md:h-[calc(100vh-4rem)] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <MessagesContent />
        </Suspense>
    );
}
