
import { supabase } from './supabase';
import { Notification } from '../types'; // Re-using Notification type for UI display if needed

export interface ChatMessage {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    created_at: string;
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
        return data;
    },

    subscribeToConversation(conversationId: string, onMessage: (msg: ChatMessage) => void) {
        return supabase
            .channel(`chat:${conversationId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${conversationId}` },
                (payload) => {
                    onMessage(payload.new as ChatMessage);
                }
            )
            .subscribe();
    }
};
