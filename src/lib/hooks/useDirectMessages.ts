"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Message } from "@/types";
import { useAuth } from "@/lib/context/AuthContext";
import { useTournament } from "@/lib/context/TournamentContext";
import { useNotifications } from "./useNotifications";

interface DirectConversation {
    id: string;
    participant1_id: string;
    participant2_id: string;
    created_at: string;
    updated_at: string;
}

interface DirectMessage {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    message_type: string;
    created_at: string;
    read_by: string[];
}

export interface ConversationWithDetails {
    id: string;
    participant1Id: string;
    participant2Id: string;
    participantId: string;
    participantName: string;
    participantAvatar?: string;
    lastMessage?: string;
    lastMessageTime?: Date;
    unreadCount: number;
    updatedAt: Date;
}

interface UseDirectMessagesReturn {
    conversations: ConversationWithDetails[];
    messages: Message[];
    loading: boolean;
    loadingMessages: boolean;
    error: string | null;
    selectedConversationId: string | null;
    selectConversation: (conversationId: string) => void;
    sendMessage: (content: string, type?: 'text' | 'image' | 'location') => Promise<void>;
    markAsRead: (messageId: string) => Promise<void>;
    startConversationWith: (playerId: string) => Promise<string | null>;
    currentUserPlayerId: string | undefined;
}

export function useDirectMessages(adminMode: boolean = false): UseDirectMessagesReturn {
    const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

    const { user } = useAuth();
    const { getPlayerByUserId, getPlayer } = useTournament();
    const { showNotification } = useNotifications();

    const supabase = useMemo(() => createClient(), []);

    // Identifier le joueur actuel - with fallback to direct DB query
    const [fallbackPlayerId, setFallbackPlayerId] = useState<string | undefined>(undefined);

    const currentPlayer = useMemo(() => {
        if (!user?.id) return undefined;
        return getPlayerByUserId(user.id);
    }, [user?.id, getPlayerByUserId]);

    // Fallback: query DB directly if player not found in context
    useEffect(() => {
        if (!user?.id || currentPlayer) {
            setFallbackPlayerId(undefined);
            return;
        }

        supabase
            .from('tournament_players')
            .select('id')
            .eq('user_id', user.id)
            .limit(1)
            .then(({ data, error }) => {
                if (!error && data && data.length > 0) {
                    setFallbackPlayerId(data[0].id);
                }
            });
    }, [user?.id, currentPlayer, supabase]);

    const currentUserPlayerId = currentPlayer?.id || fallbackPlayerId;

    // Charger les conversations
    const loadConversations = useCallback(async () => {
        if (!currentUserPlayerId && !adminMode) {
            setConversations([]);
            setLoading(false);
            return;
        }

        try {
            console.log('[useDirectMessages] Loading conversations. adminMode:', adminMode, 'currentUserPlayerId:', currentUserPlayerId);

            // Récupérer les conversations
            let query = supabase.from('direct_conversations').select('*');

            if (!adminMode) {
                // Si pas admin, uniquement les siennes
                query = query.or(`participant1_id.eq.${currentUserPlayerId},participant2_id.eq.${currentUserPlayerId}`);
            }

            const { data: convData, error: convError } = await query
                .order('updated_at', { ascending: false });

            if (convError) {
                console.error('[useDirectMessages] Error loading conversations:', convError);
                setError('Erreur lors du chargement des conversations');
                return;
            }

            console.log('[useDirectMessages] Conversations fetched:', convData?.length || 0);

            if (!convData || convData.length === 0) {
                setConversations([]);
                return;
            }

            // Pour chaque conversation, récupérer les détails du participant et le dernier message
            const conversationsWithDetails: ConversationWithDetails[] = await Promise.all(
                convData.map(async (conv: DirectConversation) => {
                    // En mode admin, on montre les deux participants ou celui qui n'est pas "nous"
                    // Si on n'est pas participant (mode admin pur), on montre participant1
                    const otherParticipantId = (conv.participant1_id === currentUserPlayerId)
                        ? conv.participant2_id
                        : (conv.participant2_id === currentUserPlayerId ? conv.participant1_id : conv.participant1_id);

                    const p1 = getPlayer(conv.participant1_id);
                    const p2 = getPlayer(conv.participant2_id);

                    // Récupérer les infos du participant
                    const participant = getPlayer(otherParticipantId);
                    let participantName = 'Utilisateur inconnu';
                    let participantAvatar: string | undefined;

                    if (participant) {
                        participantName = `${participant.firstName} ${participant.lastName}`;
                        participantAvatar = participant.avatar;
                    }

                    // En mode admin, si on n'est pas participant, on clarifie qui parle à qui
                    if (adminMode && conv.participant1_id !== currentUserPlayerId && conv.participant2_id !== currentUserPlayerId) {
                        const name1 = p1 ? `${p1.firstName} ${p1.lastName}` : 'ID:' + conv.participant1_id.substring(0, 4);
                        const name2 = p2 ? `${p2.firstName} ${p2.lastName}` : 'ID:' + conv.participant2_id.substring(0, 4);
                        participantName = `${name1} ↔ ${name2}`;
                    }

                    // Récupérer le dernier message
                    const { data: lastMsgData } = await supabase
                        .from('direct_messages')
                        .select('content, created_at')
                        .eq('conversation_id', conv.id)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single();

                    // Compter les messages non lus
                    const { count: unreadCount } = await supabase
                        .from('direct_messages')
                        .select('*', { count: 'exact', head: true })
                        .eq('conversation_id', conv.id)
                        .not('read_by', 'cs', `{${currentUserPlayerId}}`);

                    return {
                        id: conv.id,
                        participant1Id: conv.participant1_id,
                        participant2Id: conv.participant2_id,
                        participantId: otherParticipantId,
                        participantName,
                        participantAvatar,
                        lastMessage: lastMsgData?.content,
                        lastMessageTime: lastMsgData?.created_at ? new Date(lastMsgData.created_at) : undefined,
                        unreadCount: unreadCount || 0,
                        updatedAt: new Date(conv.updated_at)
                    };
                })
            );

            setConversations(conversationsWithDetails);
        } catch (err) {
            console.error('Error in loadConversations:', err);
            setError('Erreur lors du chargement des conversations');
        } finally {
            setLoading(false);
        }
    }, [currentUserPlayerId, supabase, getPlayer, adminMode]);

    // Charger les messages d'une conversation
    const loadMessages = useCallback(async (conversationId: string) => {
        if (!conversationId) {
            setMessages([]);
            return;
        }

        try {
            setLoadingMessages(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('direct_messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true });

            if (fetchError) {
                console.error('Error loading messages:', fetchError);
                setError('Erreur lors du chargement des messages');
                return;
            }

            if (data) {
                const formattedMessages: Message[] = data.map((msg: DirectMessage) => ({
                    id: msg.id,
                    conversationId: msg.conversation_id,
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
            setLoadingMessages(false);
        }
    }, [supabase]);

    // Sélectionner une conversation
    const selectConversation = useCallback((conversationId: string) => {
        setSelectedConversationId(conversationId);
        loadMessages(conversationId);
    }, [loadMessages]);

    // Envoyer un message
    const sendMessage = useCallback(async (content: string, type: 'text' | 'image' | 'location' = 'text') => {
        if (!selectedConversationId || (!currentUserPlayerId && !adminMode)) {
            setError('Impossible d\'envoyer le message');
            throw new Error('Not authorized to send message');
        }

        if (!content.trim()) {
            return;
        }

        // --- Optimistic UI ---
        const optimisticId = `opt-${Date.now()}`;
        const optimisticMessage: Message = {
            id: optimisticId,
            conversationId: selectedConversationId,
            senderId: currentUserPlayerId || user?.id || 'admin',
            content: content.trim(),
            type: type,
            createdAt: new Date(),
            readBy: []
        };

        setMessages(prev => [...prev, optimisticMessage]);

        try {
            const { error: insertError } = await supabase
                .from('direct_messages')
                .insert({
                    conversation_id: selectedConversationId,
                    sender_id: currentUserPlayerId || user?.id || 'admin',
                    content: content.trim(),
                    message_type: type
                });

            if (insertError) {
                // Annuler l'optimisme
                setMessages(prev => prev.filter(m => m.id !== optimisticId));
                console.error('Error sending message:', insertError);
                setError('Erreur lors de l\'envoi du message');
                throw insertError;
            }
        } catch (err) {
            // Annuler l'optimisme
            setMessages(prev => prev.filter(m => m.id !== optimisticId));
            console.error('Error in sendMessage:', err);
            setError('Erreur lors de l\'envoi du message');
            throw err;
        }
    }, [selectedConversationId, currentUserPlayerId, supabase]);

    // Marquer un message comme lu
    const markAsRead = useCallback(async (messageId: string) => {
        if (!currentUserPlayerId) return;

        try {
            const message = messages.find(m => m.id === messageId);
            if (!message || message.readBy.includes(currentUserPlayerId)) {
                return;
            }

            const updatedReadBy = [...message.readBy, currentUserPlayerId];

            const { error: updateError } = await supabase
                .from('direct_messages')
                .update({ read_by: updatedReadBy })
                .eq('id', messageId);

            if (updateError) {
                console.error('Error marking message as read:', updateError);
            }
        } catch (err) {
            console.error('Error in markAsRead:', err);
        }
    }, [currentUserPlayerId, messages, supabase]);

    // Créer ou trouver une conversation avec un joueur
    const startConversationWith = useCallback(async (playerId: string): Promise<string | null> => {
        if (!currentUserPlayerId) {
            setError('Vous devez être connecté pour envoyer un message');
            return null;
        }

        if (playerId === currentUserPlayerId) {
            setError('Vous ne pouvez pas vous envoyer un message à vous-même');
            return null;
        }

        try {
            // Vérifier si une conversation existe déjà (dans les deux sens)
            const { data: existingConv } = await supabase
                .from('direct_conversations')
                .select('id')
                .or(`and(participant1_id.eq.${currentUserPlayerId},participant2_id.eq.${playerId}),and(participant1_id.eq.${playerId},participant2_id.eq.${currentUserPlayerId})`)
                .single();

            if (existingConv) {
                selectConversation(existingConv.id);
                return existingConv.id;
            }

            // Créer une nouvelle conversation
            const { data: newConv, error: createError } = await supabase
                .from('direct_conversations')
                .insert({
                    participant1_id: currentUserPlayerId,
                    participant2_id: playerId
                })
                .select()
                .single();

            if (createError) {
                console.error('Error creating conversation:', createError);
                setError('Erreur lors de la création de la conversation');
                return null;
            }

            // Recharger les conversations et sélectionner la nouvelle
            await loadConversations();
            selectConversation(newConv.id);
            return newConv.id;
        } catch (err) {
            console.error('Error in startConversationWith:', err);
            setError('Erreur lors de la création de la conversation');
            return null;
        }
    }, [currentUserPlayerId, supabase, selectConversation, loadConversations]);

    // Charger les conversations au montage
    useEffect(() => {
        loadConversations();
    }, [loadConversations]);

    // Subscription temps réel pour les nouvelles conversations
    useEffect(() => {
        if (!currentUserPlayerId && !adminMode) return;

        const channel = supabase
            .channel('direct_conversations_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'direct_conversations'
                },
                () => {
                    // Recharger les conversations quand il y a un changement
                    loadConversations();
                }
            )
            .subscribe((status) => {
                console.log(`[useDirectMessages] Global conversations subscription:`, status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUserPlayerId, supabase, loadConversations]);

    // Subscription temps réel pour les messages de la conversation sélectionnée
    useEffect(() => {
        if (!selectedConversationId) return;

        const channel = supabase
            .channel(`direct_messages_${selectedConversationId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'direct_messages',
                    filter: `conversation_id=eq.${selectedConversationId}`
                },
                (payload) => {
                    const newMsg = payload.new as DirectMessage;
                    const formattedMessage: Message = {
                        id: newMsg.id,
                        conversationId: newMsg.conversation_id,
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

                        // Eviter les doublons
                        if (filtered.some(m => m.id === formattedMessage.id)) {
                            return filtered;
                        }

                        return [...filtered, formattedMessage];
                    });

                    // Notification si message d'un autre utilisateur
                    const isParticipant = conversations.some((c: ConversationWithDetails) => c.id === newMsg.conversation_id && (c.participant1Id === currentUserPlayerId || c.participant2Id === currentUserPlayerId));
                    if (isParticipant && currentUserPlayerId && newMsg.sender_id !== currentUserPlayerId) {
                        const sender = getPlayer(newMsg.sender_id);
                        const senderName = sender ? `${sender.firstName} ${sender.lastName}` : "Quelqu'un";
                        showNotification(`${senderName} vous a envoyé un message`, {
                            body: newMsg.content,
                            icon: sender?.avatar || undefined,
                        });
                    }

                    // Recharger les conversations pour mettre à jour lastMessage
                    loadConversations();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'direct_messages',
                    filter: `conversation_id=eq.${selectedConversationId}`
                },
                (payload) => {
                    const updatedMsg = payload.new as DirectMessage;
                    setMessages(prev => prev.map(msg =>
                        msg.id === updatedMsg.id
                            ? { ...msg, readBy: updatedMsg.read_by || [] }
                            : msg
                    ));
                }
            )
            .subscribe((status) => {
                console.log(`[useDirectMessages] Subscription status for conversation ${selectedConversationId}:`, status);
                if (status === 'SUBSCRIBED') {
                    console.log('Successfully subscribed to direct messages');
                }
                if (status === 'CHANNEL_ERROR') {
                    console.error('Error subscribing to direct messages');
                }
                if (status === 'TIMED_OUT') {
                    console.error('Subscription timed out');
                }
            });

        return () => {
            console.log(`[useDirectMessages] Unsubscribing from conversation ${selectedConversationId}`);
            supabase.removeChannel(channel);
        };
    }, [selectedConversationId, currentUserPlayerId, conversations, showNotification, supabase, loadConversations]);

    return {
        conversations,
        messages,
        loading,
        loadingMessages,
        error,
        selectedConversationId,
        selectConversation,
        sendMessage,
        markAsRead,
        startConversationWith,
        currentUserPlayerId
    };
}
