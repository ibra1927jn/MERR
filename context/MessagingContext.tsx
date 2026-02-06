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
        channelType: Message['channel_type'],
        recipientId: string,
        content: string,
        priority?: MessagePriority
    ) => Promise<DBMessage | null>;
    sendBroadcast: (
        title: string,
        content: string,
        priority?: MessagePriority,
        targetRoles?: Role[]
    ) => Promise<void>;
    markMessageRead: (messageId: string) => Promise<void>;
    acknowledgeBroadcast: (broadcastId: string) => Promise<void>;
    createChatGroup: (name: string, memberIds: string[]) => Promise<ChatGroup | null>;
    loadChatGroups: () => Promise<void>;
    loadConversation: (recipientId: string, isGroup: boolean) => Promise<DBMessage[]>;
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
        channelType: Message['channel_type'],
        recipientId: string,
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
            recipient_id: channelType === 'direct' ? recipientId : undefined,
            group_id: channelType === 'team' ? recipientId : undefined
        };

        setState(prev => ({
            ...prev,
            messages: [optimisticMsg, ...prev.messages],
        }));

        try {
            // 2. Try Online Send
            if (navigator.onLine) {
                await simpleMessagingService.sendMessage(
                    recipientId, // Conversation ID in simple service usually
                    userIdRef.current,
                    content
                );
                // Note: Real ID replaces tempId on refresh/subscription, but for now this is fine
                return optimisticMsg;
            } else {
                throw new Error("Offline");
            }
        } catch (error) {
            console.warn('[MessagingContext] Offline/Error, queuing message...', error);

            // 3. Fallback to Offline Queue
            await db.message_queue.add({
                channel_type: channelType as any,
                recipient_id: recipientId,
                sender_id: userIdRef.current, // <--- SAVE SENDER ID
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
            const group: ChatGroup = {
                id: Math.random().toString(36).substring(2, 11),
                name,
                members: [userIdRef.current, ...memberIds],
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

    const loadConversation = async (recipientId: string, isGroup: boolean): Promise<DBMessage[]> => {
        // In a real app, load from Supabase
        return state.messages.filter(m =>
            isGroup ? m.group_id === recipientId : m.recipient_id === recipientId
        );
    };

    const refreshMessages = async () => {
        if (!orchardIdRef.current) return;

        try {
            const { data: broadcastsData } = await supabase
                .from('broadcasts')
                .select('*')
                .eq('orchard_id', orchardIdRef.current)
                .order('created_at', { ascending: false })
                .limit(20);

            setState(prev => ({
                ...prev,
                broadcasts: broadcastsData || [],
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
    // CONTEXT VALUE
    // =============================================
    const contextValue: MessagingContextType = {
        ...state,
        sendMessage,
        sendBroadcast,
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
