"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Message } from "@/types";
import { useAuth } from "@/lib/context/AuthContext";
import { useTournament } from "@/lib/context/TournamentContext";
import { useNotifications } from "./useNotifications";

interface MatchMessage {
    id: string;
    match_id: string;
    sender_id: string;
    content: string;
    message_type: string;
    created_at: string;
    read_by: string[];
}

interface UseMatchChatReturn {
    messages: Message[];
    loading: boolean;
    error: string | null;
    sendMessage: (content: string, type?: 'text' | 'image' | 'location') => Promise<void>;
    markAsRead: (messageId: string) => Promise<void>;
    isUserInMatch: boolean;
    currentUserPlayerId: string | undefined;
}

export function useMatchChat(matchId: string | null): UseMatchChatReturn {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { user, isAdmin, loading: authLoading } = useAuth();
    const { matches, getPlayerByUserId, getTeam, getPlayer } = useTournament();
    const { showNotification } = useNotifications();

    const supabase = useMemo(() => createClient(), []);

    // Identifier le joueur actuel - with fallback to direct DB query
    const [fallbackPlayerId, setFallbackPlayerId] = useState<string | undefined>(undefined);
    const [isResolvingPlayer, setIsResolvingPlayer] = useState(true);

    const currentPlayer = useMemo(() => {
        if (authLoading) return undefined;
        if (!user?.id) {
            console.log('[useMatchChat] No user ID (Auth loaded)');
            return undefined;
        }
        const player = getPlayerByUserId(user.id);
        console.log('[useMatchChat] Looking for player with user ID:', user.id);
        console.log('[useMatchChat] Found player in context:', player);
        return player;
    }, [user?.id, getPlayerByUserId, authLoading]);

    // Fallback: query DB directly if player not found in context
    useEffect(() => {
        if (authLoading) return;

        if (!user?.id) {
            setIsResolvingPlayer(false);
            return;
        }

        if (currentPlayer) {
            setFallbackPlayerId(undefined);
            setIsResolvingPlayer(false);
            return;
        }

        console.log('[useMatchChat] Player not found in context, querying DB...');
        setIsResolvingPlayer(true);

        supabase
            .from('tournament_players')
            .select('id')
            .eq('user_id', user.id)
            .limit(1)
            .then(({ data, error }) => {
                if (error) {
                    if (!error.message?.includes('AbortError') && !error.message?.includes('signal is aborted')) {
                        console.warn('[useMatchChat] DB query error:', error);
                    }
                } else if (data && data.length > 0) {
                    console.log('[useMatchChat] Found player from DB:', data[0].id);
                    setFallbackPlayerId(data[0].id);
                } else {
                    console.log('[useMatchChat] No player found in DB for user:', user.id);
                }
                setIsResolvingPlayer(false);
            });
    }, [user?.id, currentPlayer, supabase, authLoading]);

    const currentUserPlayerId = currentPlayer?.id || fallbackPlayerId;

    // Update global loading state to include auth and player resolution
    const [initialLoadDone, setInitialLoadDone] = useState(false);

    useEffect(() => {
        if (!authLoading && !isResolvingPlayer) {
            setInitialLoadDone(true);
        }
    }, [authLoading, isResolvingPlayer]);

    // Vérifier si l'utilisateur est dans le match
    const isUserInMatch = useMemo(() => {
        // Wait for auth and player resolution to avoid false negatives
        if (authLoading || isResolvingPlayer) {
            return false;
        }

        console.log('[useMatchChat] Checking isUserInMatch - matchId:', matchId, 'currentUserPlayerId:', currentUserPlayerId, 'isAdmin:', isAdmin);

        if (isAdmin) return true; // Admin bypass

        if (!matchId || !currentUserPlayerId) {
            console.log('[useMatchChat] Missing matchId or currentUserPlayerId (Resolution complete)');
            return false;
        }

        const match = matches.find(m => m.id === matchId);
        if (!match || !match.team1Id || !match.team2Id) {
            console.log('[useMatchChat] Match missing or no teams');
            return false;
        }

        const team1 = getTeam(match.team1Id);
        const team2 = getTeam(match.team2Id);

        if (!team1 || !team2) {
            console.log('[useMatchChat] Teams not found in context');
            return false;
        }

        const allPlayerIds = [...team1.playerIds, ...team2.playerIds];
        const isInMatch = allPlayerIds.includes(currentUserPlayerId);
        console.log('[useMatchChat] Is user in match:', isInMatch);
        return isInMatch;
    }, [matchId, currentUserPlayerId, matches, getTeam, isAdmin, authLoading, isResolvingPlayer]);

    // Charger les messages
    const loadMessages = useCallback(async () => {
        if (!matchId) {
            setMessages([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('match_messages')
                .select('*')
                .eq('match_id', matchId)
                .order('created_at', { ascending: true });

            if (fetchError) {
                console.error('Error loading messages:', fetchError);
                setError('Erreur lors du chargement des messages');
                return;
            }

            if (data) {
                const formattedMessages: Message[] = data.map((msg: MatchMessage) => ({
                    id: msg.id,
                    conversationId: msg.match_id,
                    senderId: msg.sender_id,
                    content: msg.content,
                    type: msg.message_type as 'text' | 'image' | 'location',
                    createdAt: new Date(msg.created_at),
                    readBy: msg.read_by || []
                }));
                setMessages(formattedMessages);
            }
        } catch (err) {
            console.error('Error in loadMessages:', err);
            setError('Erreur lors du chargement des messages');
        } finally {
            setLoading(false);
        }
    }, [matchId, supabase]);

    // Envoyer un message
    const sendMessage = useCallback(async (content: string, type: 'text' | 'image' | 'location' = 'text') => {
        if (!matchId || (!currentUserPlayerId && !isAdmin) || !isUserInMatch) {
            setError('Vous ne pouvez pas envoyer de message dans ce match');
            throw new Error('Not authorized to send message');
        }

        if (!content.trim()) {
            return;
        }

        // --- Optimistic UI ---
        const optimisticId = `opt-${Date.now()}`;
        const optimisticMessage: Message = {
            id: optimisticId,
            conversationId: matchId,
            senderId: currentUserPlayerId || user?.id || 'admin',
            content: content.trim(),
            type: type,
            createdAt: new Date(),
            readBy: []
        };

        setMessages(prev => [...prev, optimisticMessage]);

        try {
            const { error: insertError } = await supabase
                .from('match_messages')
                .insert({
                    match_id: matchId,
                    sender_id: currentUserPlayerId || user?.id || 'admin',
                    content: content.trim(),
                    message_type: type
                });

            if (insertError) {
                // Annuler l'optimisme en cas d'erreur
                setMessages(prev => prev.filter(m => m.id !== optimisticId));
                console.error('Error sending message (Supabase):', insertError);
                console.error('Error code:', insertError.code);
                console.error('Error message:', insertError.message);
                setError(`Erreur lors de l'envoi du message: ${insertError.message}`);
                throw insertError;
            }
        } catch (err) {
            // Annuler l'optimisme en cas d'exception
            setMessages(prev => prev.filter(m => m.id !== optimisticId));
            console.error('Error in sendMessage:', err);
            setError('Erreur lors de l\'envoi du message');
            throw err;
        }
    }, [matchId, currentUserPlayerId, isUserInMatch, supabase]);

    // Marquer un message comme lu
    const markAsRead = useCallback(async (messageId: string) => {
        if (!currentUserPlayerId) return;

        try {
            const message = messages.find(m => m.id === messageId);
            if (!message || message.readBy.includes(currentUserPlayerId)) {
                return; // Déjà lu
            }

            const updatedReadBy = [...message.readBy, currentUserPlayerId];

            const { error: updateError } = await supabase
                .from('match_messages')
                .update({ read_by: updatedReadBy })
                .eq('id', messageId);

            if (updateError) {
                console.error('Error marking message as read:', updateError);
            }
        } catch (err) {
            console.error('Error in markAsRead:', err);
        }
    }, [currentUserPlayerId, messages, supabase]);

    // Charger les messages au montage et quand matchId change
    useEffect(() => {
        loadMessages();
    }, [loadMessages]);

    // Subscription temps réel
    useEffect(() => {
        if (!matchId) return;

        const channel = supabase
            .channel(`match_messages_${matchId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'match_messages',
                    filter: `match_id=eq.${matchId}`
                },
                (payload) => {
                    const newMsg = payload.new as MatchMessage;
                    const formattedMessage: Message = {
                        id: newMsg.id,
                        conversationId: newMsg.match_id,
                        senderId: newMsg.sender_id,
                        content: newMsg.content,
                        type: newMsg.message_type as 'text' | 'image' | 'location',
                        createdAt: new Date(newMsg.created_at),
                        readBy: newMsg.read_by || []
                    };

                    setMessages(prev => {
                        // Supprimer le message optimiste s'il existe
                        const filtered = prev.filter(m =>
                            !(m.id.startsWith('opt-') && m.content === formattedMessage.content && m.senderId === formattedMessage.senderId)
                        );

                        // Eviter les doublons si le message est deja la
                        if (filtered.some(m => m.id === formattedMessage.id)) {
                            return filtered;
                        }

                        return [...filtered, formattedMessage];
                    });

                    // Afficher une notification si le message vient d'un autre joueur
                    if (currentUserPlayerId && newMsg.sender_id !== currentUserPlayerId) {
                        const sender = getPlayer(newMsg.sender_id);
                        const senderName = sender ? `${sender.firstName} ${sender.lastName}` : "Un joueur";
                        showNotification(`${senderName} a envoyé un message`, {
                            body: newMsg.content,
                            icon: sender?.avatar || undefined,
                        });
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'match_messages',
                    filter: `match_id=eq.${matchId}`
                },
                (payload) => {
                    // Update
                    if (payload.new) {
                        const newMsg = payload.new as MatchMessage;
                        setMessages(prev => prev.map(m =>
                            m.id === newMsg.id
                                ? { ...m, readBy: newMsg.read_by || [] }
                                : m
                        ));
                    }
                }
            )
            .subscribe((status) => {
                console.log(`[useMatchChat] Subscription status for match ${matchId}:`, status);
                if (status === 'SUBSCRIBED') {
                    console.log('Successfully subscribed to match messages');
                }
                if (status === 'CHANNEL_ERROR') {
                    console.error('Error subscribing to match messages');
                }
                if (status === 'TIMED_OUT') {
                    console.error('Subscription timed out');
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [matchId]); // Retirer supabase des dépendances pour éviter les re-subscriptions

    return {
        messages,
        loading,
        error,
        sendMessage,
        markAsRead,
        isUserInMatch,
        currentUserPlayerId
    };
}
