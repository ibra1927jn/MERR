import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { simpleMessaging, Conversation, ChatMessage } from '../services/simple-messaging.service';
import { useAuth } from './AuthContext';

interface MessagingState {
  conversations: Conversation[];
  activeConversationId: string | null;
  activeMessages: ChatMessage[];
  isLoadingMessages: boolean;
  unreadCount: number; // Placeholder for now
}

interface MessagingContextType extends MessagingState {
  selectConversation: (conversationId: string) => void;
  sendMessage: (content: string) => Promise<void>;
  createDirectChat: (recipientId: string) => Promise<string | null>;
  createGroupChat: (name: string, memberIds: string[]) => Promise<string | null>;
  refreshConversations: () => Promise<void>;
}

const MessagingContext = createContext<MessagingContextType | undefined>(undefined);

export const MessagingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [state, setState] = useState<MessagingState>({
    conversations: [],
    activeConversationId: null,
    activeMessages: [],
    isLoadingMessages: false,
    unreadCount: 0,
  });

  const updateState = useCallback((updates: Partial<MessagingState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const refreshConversations = useCallback(async () => {
    if (!user) return;
    try {
      const convs = await simpleMessaging.getConversations(user.id);
      updateState({ conversations: convs });
    } catch (error) {
      console.error('[MessagingContext] Error refreshing conversations:', error);
    }
  }, [user, updateState]);

  // Load conversations on mount/user change
  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  // Subscribe to active conversation
  useEffect(() => {
    if (!state.activeConversationId) return;

    const unsubscribe = simpleMessaging.subscribeToConversation(
      state.activeConversationId,
      (newMessage) => {
        setState(prev => ({
          ...prev,
          activeMessages: [...prev.activeMessages, newMessage]
        }));
      }
    );

    return () => {
      unsubscribe();
    };
  }, [state.activeConversationId]);

  const selectConversation = async (conversationId: string) => {
    if (state.activeConversationId === conversationId) return;

    updateState({ activeConversationId: conversationId, isLoadingMessages: true });

    try {
      const messages = await simpleMessaging.getMessages(conversationId);
      updateState({ activeMessages: messages, isLoadingMessages: false });
    } catch (error) {
      console.error('[MessagingContext] Error loading messages:', error);
      updateState({ activeMessages: [], isLoadingMessages: false });
    }
  };

  const sendMessage = async (content: string) => {
    if (!user || !state.activeConversationId) return;

    // Optimistic update? Maybe later. For now just wait for send.
    // Actually, since we are subscribed, the real message will come in via subscription.
    // But we might want to show it immediately.

    await simpleMessaging.sendMessage(state.activeConversationId, user.id, content);
    // Refresh conversations list to update 'updated_at' order
    refreshConversations();
  };

  const createDirectChat = async (recipientId: string) => {
    if (!user) return null;
    const conv = await simpleMessaging.createConversation('direct', [user.id, recipientId], user.id);
    if (conv) {
      await refreshConversations();
      return conv.id;
    }
    return null;
  };

  const createGroupChat = async (name: string, memberIds: string[]) => {
    if (!user) return null;
    const allMembers = Array.from(new Set([user.id, ...memberIds]));
    const conv = await simpleMessaging.createConversation('group', allMembers, user.id, name);
    if (conv) {
      await refreshConversations();
      return conv.id;
    }
    return null;
  };

  return (
    <MessagingContext.Provider value={{
      ...state,
      selectConversation,
      sendMessage,
      createDirectChat,
      createGroupChat,
      refreshConversations
    }}>
      {children}
    </MessagingContext.Provider>
  );
};

export const useMessaging = () => {
  const context = useContext(MessagingContext);
  if (!context) throw new Error('useMessaging must be used within a MessagingProvider');
  return context;
};
