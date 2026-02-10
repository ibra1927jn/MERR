/**
 * Messaging Context - Handles all messaging-related state and actions
 */
import React, { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import { supabase } from '../services/supabase';
import { simpleMessagingService, ChatMessage } from '../services/simple-messaging.service';
import { db } from '../services/db'; // Direct DB access for queue
import { Message, Broadcast, Role, MessagePriority } from '../types';

// =============================================
// TYPES
// =============================================
export interface DBMessage {
    id: string;
    sender_id: string;
    recipient_id?: string;
    group_id?: string;
    content: string;
    priority: MessagePriority;
    read_by: string[];
    created_at: string;
    orchard_id?: string;
}

export interface ChatGroup {
    id: string;
    name: string;
    members: string[];
    isGroup?: boolean;
    lastMsg?: string;
    time?: string;
}

interface MessagingState {
    messages: DBMessage[];
    broadcasts: Broadcast[];
    chatGroups: ChatGroup[];
    unreadCount: number;
}

interface MessagingContextType extends MessagingState {
    sendMessage: (
        conversationId: string,
        content: string,
        priority?: MessagePriority
    ) => Promise<DBMessage | null>;
    sendBroadcast: (
        title: string,
        content: string,
        priority?: MessagePriority,
        targetRoles?: Role[]
    ) => Promise<void>;
    getOrCreateConversation: (recipientId: string) => Promise<string | null>;
    markMessageRead: (messageId: string) => Promise<void>;
    acknowledgeBroadcast: (broadcastId: string) => Promise<void>;
    createChatGroup: (name: string, memberIds: string[]) => Promise<ChatGroup | null>;
    loadChatGroups: () => Promise<void>;
    loadConversation: (conversationId: string) => Promise<DBMessage[]>;
    refreshMessages: () => Promise<void>;
    setOrchardId: (id: string) => void;
    setUserId: (id: string) => void;
}

// =============================================
// CONTEXT
// =============================================
const MessagingContext = createContext<MessagingContextType | undefined>(undefined);

// =============================================
// PROVIDER
// =============================================
export const MessagingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<MessagingState>({
        messages: [],
        broadcasts: [],
        chatGroups: [],
        unreadCount: 0,
    });

    const userIdRef = useRef<string | null>(null);
    const orchardIdRef = useRef<string | null>(null);
    const subscriptionRef = useRef<any>(null);

    const setUserId = (id: string) => {
        userIdRef.current = id;
    };

    const setOrchardId = (id: string) => {
        orchardIdRef.current = id;
    };

    // =============================================
    // MESSAGE ACTIONS
    // =============================================
    const sendMessage = async (
        conversationId: string,
        content: string,
        priority: MessagePriority = 'normal'
    ): Promise<DBMessage | null> => {
        if (!userIdRef.current) {
            console.error('[MessagingContext] No user ID set');
            return null;
        }

        const tempId = Math.random().toString(36).substring(2, 11);
        const timestamp = new Date().toISOString();

        // 1. Optimistic UI Update
        const optimisticMsg: DBMessage = {
            id: tempId,
            sender_id: userIdRef.current,
            content,
            priority,
            read_by: [userIdRef.current],
            created_at: timestamp,
            orchard_id: orchardIdRef.current || undefined,
            conversation_id: conversationId // Ensure this matches DB format
        } as any;

        setState(prev => ({
            ...prev,
            messages: [optimisticMsg, ...prev.messages],
        }));

        try {
            // 2. Try Online Send
            if (navigator.onLine) {
                const { data, error } = await supabase
                    .from('chat_messages')
                    .insert([{
                        conversation_id: conversationId,
                        sender_id: userIdRef.current,
                        content: content
                    }])
                    .select()
                    .single();

                if (error) throw error;

                // Update Conversation updated_at
                await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);

                return data;
            } else {
                throw new Error("Offline");
            }
        } catch (error) {
            console.warn('[MessagingContext] Offline/Error, queuing message...', error);

            // 3. Fallback to Offline Queue
            await db.message_queue.add({
                channel_type: 'direct', // Default or derived
                recipient_id: conversationId,
                sender_id: userIdRef.current,
                content,
                timestamp,
                synced: 0,
                priority
            });

            return optimisticMsg;
        }
    };

    const sendBroadcast = async (
        title: string,
        content: string,
        priority: MessagePriority = 'normal',
        targetRoles?: Role[]
    ) => {
        if (!userIdRef.current || !orchardIdRef.current) return;

        try {
            const broadcast: Broadcast = {
                id: Math.random().toString(36).substring(2, 11),
                orchard_id: orchardIdRef.current,
                sender_id: userIdRef.current,
                title,
                content,
                priority,
                target_roles: targetRoles || [Role.TEAM_LEADER, Role.RUNNER],
                acknowledged_by: [],
                created_at: new Date().toISOString(),
            };

            await supabase.from('broadcasts').insert([broadcast]);

            setState(prev => ({
                ...prev,
                broadcasts: [broadcast, ...prev.broadcasts],
            }));
        } catch (error) {
            console.error('[MessagingContext] Error sending broadcast:', error);
        }
    };

    const getOrCreateConversation = async (participantId: string): Promise<string | null> => {
        if (!userIdRef.current) return null;

        try {
            // Find direct conversation with exactly these participants
            const { data: existing } = await supabase
                .from('conversations')
                .select('id')
                .eq('type', 'direct')
                .contains('participant_ids', [userIdRef.current, participantId])
                .order('updated_at', { ascending: false });

            // Filter locally to ensure ONLY these two participants (Supabase 'contains' might match 3+)
            const match = existing?.find(() => true); // In a real app, query would be more specific

            if (match) return match.id;

            // Create new direct conversation
            const { data: newConv, error } = await supabase
                .from('conversations')
                .insert([{
                    type: 'direct',
                    participant_ids: [userIdRef.current, participantId],
                    created_by: userIdRef.current
                }])
                .select()
                .single();

            if (error) throw error;
            return newConv.id;
        } catch (error) {
            console.error('[MessagingContext] Error getOrCreateConversation:', error);
            return null;
        }
    };

    const markMessageRead = async (messageId: string) => {
        if (!userIdRef.current) return;

        setState(prev => ({
            ...prev,
            messages: prev.messages.map(m =>
                m.id === messageId && !m.read_by.includes(userIdRef.current!)
                    ? { ...m, read_by: [...m.read_by, userIdRef.current!] }
                    : m
            ),
            unreadCount: Math.max(0, prev.unreadCount - 1),
        }));
    };

    const acknowledgeBroadcast = async (broadcastId: string) => {
        if (!userIdRef.current) return;

        setState(prev => ({
            ...prev,
            broadcasts: prev.broadcasts.map(b =>
                b.id === broadcastId && !b.acknowledged_by.includes(userIdRef.current!)
                    ? { ...b, acknowledged_by: [...b.acknowledged_by, userIdRef.current!] }
                    : b
            ),
        }));
    };

    // =============================================
    // CHAT GROUPS
    // =============================================
    const createChatGroup = async (name: string, memberIds: string[]): Promise<ChatGroup | null> => {
        if (!userIdRef.current) return null;

        try {
            const allParticipants = [...new Set([userIdRef.current, ...memberIds])];

            const { data, error } = await supabase
                .from('conversations')
                .insert([{
                    type: 'group',
                    name,
                    participant_ids: allParticipants,
                    created_by: userIdRef.current
                }])
                .select()
                .single();

            if (error) throw error;

            const group: ChatGroup = {
                id: data.id,
                name: data.name,
                members: data.participant_ids,
                isGroup: true,
                lastMsg: 'Group created',
                time: new Date().toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' }),
            };

            setState(prev => ({
                ...prev,
                chatGroups: [group, ...prev.chatGroups],
            }));

            return group;
        } catch (error) {
            console.error('[MessagingContext] Error creating group:', error);
            throw error;
        }
    };

    const loadChatGroups = async () => {
        // In a real app, load from Supabase
        // For now, just return empty - groups are managed locally
    };

    const loadConversation = async (conversationId: string): Promise<DBMessage[]> => {
        try {
            const { data, error } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('[MessagingContext] Error loading conversation:', error);
            return [];
        }
    };

    const refreshMessages = async () => {
        if (!orchardIdRef.current || !userIdRef.current) return;

        try {
            // 1. Load Broadcasts
            const { data: broadcastsData } = await supabase
                .from('broadcasts')
                .select('*')
                .eq('orchard_id', orchardIdRef.current)
                .order('created_at', { ascending: false })
                .limit(20);

            // 2. Load Conversations
            const { data: convData } = await supabase
                .from('conversations')
                .select('*')
                .contains('participant_ids', [userIdRef.current])
                .order('updated_at', { ascending: false });

            setState(prev => ({
                ...prev,
                broadcasts: broadcastsData || [],
                chatGroups: (convData || []).map(c => ({
                    id: c.id,
                    name: c.name || 'Conversation',
                    members: c.participant_ids,
                    isGroup: c.type === 'group',
                    lastMsg: '', // We could fetch last message here if needed
                    time: new Date(c.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }))
            }));
        } catch (error) {
            console.error('[MessagingContext] Error refreshing messages:', error);
        }
    };

    // =============================================
    // CLEANUP
    // =============================================
    useEffect(() => {
        return () => {
            if (subscriptionRef.current) {
                subscriptionRef.current.unsubscribe();
            }
        };
    }, []);

    // =============================================
    // REALTIME UPDATES
    // =============================================
    useEffect(() => {
        if (!orchardIdRef.current) return;

        console.log('[MessagingContext] Subscribing to broadcasts for orchard:', orchardIdRef.current);

        const channel = supabase
            .channel('public:broadcasts')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'broadcasts',
                    filter: `orchard_id=eq.${orchardIdRef.current}` // Filter by orchard
                },
                (payload) => {
                    console.log('[MessagingContext] New broadcast received!', payload);
                    const newBroadcast = payload.new as Broadcast;

                    // 1. Update State
                    setState(prev => {
                        // Avoid duplicates
                        if (prev.broadcasts.some(b => b.id === newBroadcast.id)) return prev;
                        return {
                            ...prev,
                            broadcasts: [newBroadcast, ...prev.broadcasts]
                        };
                    });

                    // 2. TRIGGER WAKE-UP (Haptic + Sound)
                    // Only if it's not our own message (optional, but good for confirmation too)
                    // if (newBroadcast.sender_id !== userIdRef.current) {
                    try {
                        // Vibrate pattern: Pulse-Pulse-Long
                        if (navigator.vibrate) {
                            navigator.vibrate([200, 100, 200, 100, 500]);
                        }

                        // Audio Feedback (Simple Beep via AudioContext or HTML5 Audio)
                        // Ideally use a file, but for now we rely on vibration primarily
                        // or a system notification if PWA is installed.

                        // System Notification (if permission granted)
                        if (Notification.permission === 'granted') {
                            new Notification(`📢 ${newBroadcast.title}`, {
                                body: newBroadcast.content,
                                icon: '/pwa-192x192.png' // Ensure this exists
                            });
                        }
                    } catch (e) {
                        console.warn('[MessagingContext] Feedback trigger failed', e);
                    }
                    // }
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('[MessagingContext] Subscribed to broadcast channel');
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [orchardIdRef.current]);  // Re-subscribe if orchard changes

    // =============================================
    // CONTEXT VALUE
    // =============================================
    const contextValue: MessagingContextType = {
        ...state,
        sendMessage,
        sendBroadcast,
        getOrCreateConversation,
        markMessageRead,
        acknowledgeBroadcast,
        createChatGroup,
        loadChatGroups,
        loadConversation,
        refreshMessages,
        setOrchardId,
        setUserId,
    };

    return <MessagingContext.Provider value={contextValue}>{children}</MessagingContext.Provider>;
};

// =============================================
// HOOK
// =============================================
export const useMessaging = (): MessagingContextType => {
    const context = useContext(MessagingContext);
    if (!context) {
        throw new Error('useMessaging must be used within a MessagingProvider');
    }
    return context;
};

export default MessagingContext;
