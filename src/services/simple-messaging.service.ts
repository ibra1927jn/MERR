
import { supabase } from './supabase';

export interface ChatMessage {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    created_at: string;
    sender_name?: string; // For UI convenience
    sender?: { full_name: string }; // From DB Join
}

export interface Conversation {
    id: string;
    type: 'direct' | 'group';
    name?: string;
    participant_ids: string[];
    last_message?: string;
    updated_at: string;
}

export const simpleMessagingService = {

    async sendMessage(conversationId: string, senderId: string, content: string) {
        const { data, error } = await supabase
            .from('chat_messages')
            .insert([{
                conversation_id: conversationId,
                sender_id: senderId,
                content: content
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async getMessages(conversationId: string) {
        const { data, error } = await supabase
            .from('chat_messages')
            .select(`
                *,
                sender:users(full_name)
            `)
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Map sender to sender_name for UI
        // Use unknown to handle DB schema flexibility
        return (data || []).map((msg: unknown) => {
            const m = msg as Record<string, unknown>;
            return {
                id: String(m.id),
                conversation_id: String(m.conversation_id),
                sender_id: String(m.sender_id),
                content: String(m.content),
                created_at: String(m.created_at),
                sender_name: (m.sender as Record<string, unknown>)?.full_name as string || 'Unknown'
            } as ChatMessage;
        });
    },

    subscribeToConversation(conversationId: string, onMessage: (msg: ChatMessage) => void) {
        const channel = supabase
            .channel(`chat:${conversationId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${conversationId}` },
                (payload) => {
                    onMessage(payload.new as ChatMessage);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    },

    // === MISSING METHODS IMPLEMENTATION ===

    async getConversations(userId: string): Promise<Conversation[]> {
        // Query generic or specific 
        // Logic: Find conversations where user is participant.
        // Assuming table 'conversation_participants' exists or 'conversations' has array
        // For now, returning mock/empty to satisfy compiler if schema unknown, 
        // OR assume 'conversations' table has 'participant_ids' (array)

        try {
            const { data, error } = await supabase
                .from('conversations')
                .select('*')
                .contains('participant_ids', [userId])
                .order('updated_at', { ascending: false });

            if (error) {

                console.warn("Failed to fetch conversations", error);
                return [];
            }
            return data as Conversation[];
        } catch (e) {
            return [];
        }
    },

    async getUsers() {
        // Get all users for chat selection
        const { data } = await supabase.from('users').select('id, full_name, role');
        return (data || []).map((u: unknown) => {
            const usr = u as Record<string, unknown>;
            return {
                id: String(usr.id),
                name: String(usr.full_name),
                role: String(usr.role)
            };
        });
    },

    async createConversation(type: 'direct' | 'group', participantIds: string[], createdBy: string, name?: string) {
        // 1. Create Conversation
        const { data: conv, error } = await supabase
            .from('conversations')
            .insert([{
                type,
                name,
                participant_ids: participantIds,
                created_by: createdBy
            }])
            .select()
            .single();

        if (error || !conv) return null;
        return conv as Conversation;
    }
};