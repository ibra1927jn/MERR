/**
 * SIMPLE MESSAGING SERVICE
 * Sistema de mensajería simple estilo WhatsApp
 */

import { supabase } from './supabase';

// =============================================
// TYPES
// =============================================

export interface Conversation {
    id: string;
    type: 'direct' | 'group';
    name: string | null;
    participant_ids: string[];
    created_by: string | null;
    created_at: string;
    updated_at: string;
    // Computed fields
    last_message?: ChatMessage;
    other_participant?: {
        id: string;
        name: string;
        avatar?: string;
    };
}

export interface ChatMessage {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    created_at: string;
    // Computed
    sender_name?: string;
    sender_avatar?: string;
}

// =============================================
// SIMPLE MESSAGING SERVICE
// =============================================

class SimpleMessagingService {
    private subscriptions: Map<string, ReturnType<typeof supabase.channel>> = new Map();

    /**
     * Get all conversations for a user
     */
    async getConversations(userId: string): Promise<Conversation[]> {
        console.log('[SimpleMessaging] Getting conversations for:', userId);

        const { data, error } = await supabase
            .from('conversations')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('[SimpleMessaging] Error getting conversations:', error);
            return [];
        }

        // Filter to conversations where user is a participant
        const userConversations = (data || []).filter(conv =>
            conv.participant_ids.includes(userId)
        );

        console.log('[SimpleMessaging] Found conversations:', userConversations.length);
        return userConversations;
    }

    /**
     * Get messages for a conversation
     */
    async getMessages(conversationId: string): Promise<ChatMessage[]> {
        console.log('[SimpleMessaging] Getting messages for conversation:', conversationId);

        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('[SimpleMessaging] Error getting messages:', error);
            return [];
        }

        // Enrich with sender info
        const messages = data || [];
        const enrichedMessages = await Promise.all(
            messages.map(async (msg) => {
                const { data: user } = await supabase
                    .from('users')
                    .select('full_name, avatar_url')
                    .eq('id', msg.sender_id)
                    .single();

                return {
                    ...msg,
                    sender_name: user?.full_name || 'Unknown',
                    sender_avatar: user?.avatar_url,
                };
            })
        );

        console.log('[SimpleMessaging] Found messages:', enrichedMessages.length);
        return enrichedMessages;
    }

    /**
     * Send a message
     */
    async sendMessage(
        conversationId: string,
        senderId: string,
        content: string
    ): Promise<ChatMessage | null> {
        console.log('[SimpleMessaging] Sending message to:', conversationId);

        const { data, error } = await supabase
            .from('chat_messages')
            .insert({
                conversation_id: conversationId,
                sender_id: senderId,
                content: content.trim(),
            })
            .select()
            .single();

        if (error) {
            console.error('[SimpleMessaging] Error sending message:', error);
            return null;
        }

        // Update conversation's updated_at
        await supabase
            .from('conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', conversationId);

        console.log('[SimpleMessaging] Message sent:', data.id);
        return data;
    }

    /**
     * Create a new conversation
     */
    async createConversation(
        type: 'direct' | 'group',
        participantIds: string[],
        createdBy: string,
        name?: string
    ): Promise<Conversation | null> {
        console.log('[SimpleMessaging] Creating conversation:', { type, participantIds, name });

        // For direct chats, check if one already exists
        if (type === 'direct' && participantIds.length === 2) {
            const existing = await this.findDirectConversation(participantIds[0], participantIds[1]);
            if (existing) {
                console.log('[SimpleMessaging] Found existing direct conversation:', existing.id);
                return existing;
            }
        }

        const { data, error } = await supabase
            .from('conversations')
            .insert({
                type,
                name: type === 'group' ? name : null,
                participant_ids: participantIds,
                created_by: createdBy,
            })
            .select()
            .single();

        if (error) {
            console.error('[SimpleMessaging] Error creating conversation:', error);
            return null;
        }

        console.log('[SimpleMessaging] Conversation created:', data.id);
        return data;
    }

    /**
     * Find existing direct conversation between two users
     */
    private async findDirectConversation(
        user1: string,
        user2: string
    ): Promise<Conversation | null> {
        const { data } = await supabase
            .from('conversations')
            .select('*')
            .eq('type', 'direct');

        const found = (data || []).find(conv =>
            conv.participant_ids.includes(user1) &&
            conv.participant_ids.includes(user2) &&
            conv.participant_ids.length === 2
        );

        return found || null;
    }

    /**
     * Subscribe to new messages in a conversation
     */
    subscribeToConversation(
        conversationId: string,
        onNewMessage: (message: ChatMessage) => void
    ): () => void {
        const channelName = `conversation-${conversationId}`;

        if (this.subscriptions.has(channelName)) {
            console.log('[SimpleMessaging] Already subscribed to:', channelName);
            return () => { };
        }

        console.log('[SimpleMessaging] Subscribing to conversation:', conversationId);

        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `conversation_id=eq.${conversationId}`,
                },
                async (payload) => {
                    const newMessage = payload.new as ChatMessage;
                    console.log('[SimpleMessaging] New message in conversation:', newMessage.id);

                    // Get sender info
                    const { data: user } = await supabase
                        .from('users')
                        .select('full_name, avatar_url')
                        .eq('id', newMessage.sender_id)
                        .single();

                    onNewMessage({
                        ...newMessage,
                        sender_name: user?.full_name || 'Unknown',
                        sender_avatar: user?.avatar_url,
                    });
                }
            )
            .subscribe((status) => {
                console.log('[SimpleMessaging] Subscription status:', status);
            });

        this.subscriptions.set(channelName, channel);

        return () => {
            console.log('[SimpleMessaging] Unsubscribing from:', channelName);
            channel.unsubscribe();
            this.subscriptions.delete(channelName);
        };
    }

    /**
     * Get all users (for creating conversations)
     */
    async getUsers(): Promise<Array<{ id: string; name: string; role: string; avatar?: string }>> {
        const { data, error } = await supabase
            .from('users')
            .select('id, full_name, role, avatar_url');

        if (error) {
            console.error('[SimpleMessaging] Error getting users:', error);
            return [];
        }

        return (data || []).map(u => ({
            id: u.id,
            name: u.full_name || 'Unknown',
            role: u.role || 'user',
            avatar: u.avatar_url,
        }));
    }
}

export const simpleMessaging = new SimpleMessagingService();
