"use client";

import { useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { useTournament } from '@/lib/context/TournamentContext';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

import { useRouter } from 'next/navigation';

export function GlobalMessageListener() {
    const { user, userAccount } = useAuth();
    const { getPlayerByUserId, matches } = useTournament();
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const supabase = useMemo(() => createClient(), []);
    const router = useRouter();

    const playSound = () => {
        if (!audioRef.current) {
            audioRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
        }
        audioRef.current.play().catch(() => {});
    };

    const sendNotification = async (title: string, body: string, url: string) => {
        if (!("Notification" in window)) return;

        try {
            if (Notification.permission === "granted") {
                // Essayer d'utiliser le Service Worker (Android/Mobile)
                if ('serviceWorker' in navigator) {
                    const registration = await navigator.serviceWorker.ready;
                    if (registration) {
                        await registration.showNotification(title, {
                            body,
                            // icon: '/icon-192.png',
                            data: { url } // Passer l'URL pour le clic (nécessite gestion dans SW)
                        });
                        return;
                    }
                }

                // Fallback Desktop (si pas de SW)
                const notification = new Notification(title, {
                    body,
                    // icon: '/icon.png',
                });

                notification.onclick = function () {
                    window.focus();
                    notification.close();
                    router.push(url);
                };
            }
        } catch (error) {
            console.error("Erreur notification:", error);
        }
    };

    const currentUserPlayerId = user ? getPlayerByUserId(user.id)?.id : null;

    useEffect(() => {
        if (!user) return;

        // 1. Subscription aux messages directs
        const directChannel = supabase
            .channel('global_direct_messages')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'direct_messages'
                },
                async (payload) => {
                    const newMsg = payload.new;

                    if (newMsg.sender_id !== currentUserPlayerId && newMsg.sender_id !== user.id) {
                        const { data: conv } = await supabase
                            .from('direct_conversations')
                            .select('participant1_id, participant2_id')
                            .eq('id', newMsg.conversation_id)
                            .single();

                        if (conv) {
                            const isParticipant = conv.participant1_id === currentUserPlayerId || conv.participant2_id === currentUserPlayerId;

                            // Determine other participant ID for navigation
                            const otherId = conv.participant1_id === currentUserPlayerId ? conv.participant2_id : conv.participant1_id;

                            // Si on est participant ou admin, on notifie
                            if (isParticipant || userAccount?.role === 'admin') {
                                playSound();

                                toast((t) => (
                                    <div
                                        onClick={() => {
                                            // Navigation differente pour admin vs user si besoin, mais userId marche généralement
                                            // Mais attention, userId attend le user UUID, ici on a player UUID potentiellement.
                                            // Simplification: Rediriger vers /messages, le hook chargera la derniere conv ou on peut essayer d'être plus malin.
                                            // Si on a l'ID du sender (user_id), c'est mieux.
                                            // `newMsg.sender_id` est le `player_id` ou `user_id` selon implementation.
                                            // Dans direct_messages, sender_id est uuid references User(id) ou Player(id)?
                                            // Verifions: sender_id references auth.users normalement ou public.players?
                                            // Base sur useDirectMessages: sender_id est UUID.

                                            toast.dismiss(t.id);
                                            router.push('/messages');
                                        }}
                                        className="cursor-pointer flex items-center gap-2"
                                    >
                                        <span>💬 Nouveau message reçu ! <br /><span className="text-xs opacity-70">Cliquez pour voir</span></span>
                                    </div>
                                ), {
                                    position: 'top-right',
                                    duration: 5000,
                                    style: {
                                        background: '#333',
                                        color: '#fff',
                                        cursor: 'pointer'
                                    }
                                });

                                // Notification Système
                                sendNotification("Nouveau message", "Vous avez reçu un message privé", "/messages");
                            }
                        }
                    }
                }
            )
            .subscribe();

        // 2. Subscription aux messages de match
        const ongoingMatchIds = matches
            .filter(m => m.status === 'ongoing')
            .map(m => m.id);

        let matchChannel: any = null;

        if (ongoingMatchIds.length > 0 || userAccount?.role === 'admin') {
            matchChannel = supabase
                .channel('global_match_messages')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'match_messages'
                    },
                    (payload) => {
                        const newMsg = payload.new;

                        if (newMsg.sender_id === currentUserPlayerId || newMsg.sender_id === user.id) return;

                        const isMyMatch = ongoingMatchIds.includes(newMsg.match_id);

                        if (userAccount?.role === 'admin' || isMyMatch) {
                            playSound();

                            toast((t) => (
                                <div
                                    onClick={() => {
                                        toast.dismiss(t.id);
                                        router.push(`/messages?matchId=${newMsg.match_id}`);
                                    }}
                                    className="cursor-pointer flex items-center gap-2"
                                >
                                    <span>🏆 Nouveau message de match ! <br /><span className="text-xs opacity-70">Cliquez pour voir</span></span>
                                </div>
                            ), {
                                position: 'top-right',
                                duration: 5000,
                                style: {
                                    background: '#22c55e', // Green for matches
                                    color: '#fff',
                                    cursor: 'pointer'
                                }
                            });

                            // Notification Système
                            sendNotification("Message de match", "Nouveau message dans le chat du match", `/messages?matchId=${newMsg.match_id}`);
                        }
                    }
                )
                .subscribe();
        }

        return () => {
            supabase.removeChannel(directChannel);
            if (matchChannel) supabase.removeChannel(matchChannel);
        };

    }, [user, currentUserPlayerId, matches, userAccount, router]); // Added router to dependency

    return null;
}
