/**
 * SIMPLE CHAT COMPONENT
 * Sistema de mensajerÃ­a simple estilo WhatsApp
 */

import { useState, useEffect, useRef } from 'react';
import { simpleMessagingService, Conversation, ChatMessage } from '../services/simple-messaging.service';
import { nowNZST } from '@/utils/nzst';

export interface SimpleChatProps {
    userId: string;
    userName: string;
    channelType?: 'team' | 'direct';
    recipientId?: string;
}

export const SimpleChat = ({ userId, userName, channelType, recipientId }: SimpleChatProps) => {
    // State
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [showNewChat, setShowNewChat] = useState(false);
    const [users, setUsers] = useState<Array<{ id: string; name: string; role: string }>>([]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const unsubscribeRef = useRef<(() => void) | null>(null);

    // Load conversations on mount
    useEffect(() => {
        const init = async () => {
            await loadConversations();
            await loadUsers();

            // Deep linking logic
            if (channelType && recipientId && userId) {
                // Determine if we need to find an existing chat or create one
                // ... logic to find or create conversation ...
                // For now, let's just try to find a direct chat if recipientId is provided
                if (channelType === 'direct') {
                    // This logic would need to be robust, for now we rely on user clicking "New Chat" if not found
                    // Or we could trigger handleCreateConversation if needed.
                }
            }
        };
        init();
    }, [userId]);

    // Load messages when conversation changes
    useEffect(() => {
        if (activeConversation) {
            loadMessages(activeConversation.id);
            subscribeToConversation(activeConversation.id);
        }

        return () => {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
                unsubscribeRef.current = null;
            }
        };
    }, [activeConversation?.id]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadConversations = async () => {
        // eslint-disable-next-line no-console
        console.log('[SimpleChat] Loading conversations for:', userId);
        setLoading(true);
        const convs = await simpleMessagingService.getConversations(userId);
        // eslint-disable-next-line no-console
        console.log('[SimpleChat] Loaded conversations:', convs.length, convs);
        setConversations(convs);
        setLoading(false);
    };

    const loadUsers = async () => {
        const allUsers = await simpleMessagingService.getUsers();
        setUsers(allUsers.filter(u => u.id !== userId));
    };

    const loadMessages = async (conversationId: string) => {
        const msgs = await simpleMessagingService.getMessages(conversationId);
        setMessages(msgs);
    };

    const subscribeToConversation = (conversationId: string) => {
        if (unsubscribeRef.current) {
            unsubscribeRef.current();
        }

        unsubscribeRef.current = simpleMessagingService.subscribeToConversation(
            conversationId,
            (newMsg) => {
                setMessages(prev => {
                    // Avoid duplicates
                    if (prev.some(m => m.id === newMsg.id)) return prev;
                    return [...prev, newMsg];
                });
            }
        );
    };

    const handleSend = async () => {
        if (!newMessage.trim() || !activeConversation) return;

        const content = newMessage.trim();
        setNewMessage('');

        // Optimistic update
        const tempMessage: ChatMessage = {
            id: 'temp-' + Date.now(),
            conversation_id: activeConversation.id,
            sender_id: userId,
            content,
            created_at: nowNZST(),
            sender_name: userName,
        };
        setMessages(prev => [...prev, tempMessage]);

        // Send to server
        const sent = await simpleMessagingService.sendMessage(activeConversation.id, userId, content);

        if (sent) {
            // Replace temp message with real one
            setMessages(prev => prev.map(m =>
                m.id === tempMessage.id ? { ...sent, sender_name: userName } : m
            ));
        }
    };

    const handleCreateConversation = async (type: 'direct' | 'group', participantIds: string[], name?: string) => {
        const allParticipants = [...new Set([userId, ...participantIds])];
        const conv = await simpleMessagingService.createConversation(type, allParticipants, userId, name);

        if (conv) {
            await loadConversations();
            setActiveConversation(conv);
            setShowNewChat(false);
        }
    };

    const getConversationName = (conv: Conversation): string => {
        if (conv.type === 'group') return conv.name || 'Group';

        // For direct chats, show the other person's name
        const otherUserId = conv.participant_ids.find(id => id !== userId);
        const otherUser = users.find(u => u.id === otherUserId);
        return otherUser?.name || 'Chat';
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' });
    };

    // =============================================
    // RENDER
    // =============================================

    return (
        <div className="flex h-full bg-[#0a0a0a] rounded-2xl overflow-hidden border border-[#333]">
            {/* Sidebar - Conversation List */}
            <div className={`
                md:w-80 w-full border-r border-[#333] flex-col
                ${activeConversation ? 'hidden md:flex' : 'flex'}
            `}>
                {/* Header */}
                <div className="p-4 border-b border-[#333] flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">Chats</h2>
                    <button
                        onClick={() => setShowNewChat(true)}
                        className="size-10 bg-primary rounded-full flex items-center justify-center hover:bg-primary/80 transition"
                    >
                        <span className="material-symbols-outlined text-white">add</span>
                    </button>
                </div>

                {/* Conversation List */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-4 text-center text-[#a1a1aa]">Loading...</div>
                    ) : conversations.length === 0 ? (
                        <div className="p-4 text-center text-[#a1a1aa]">
                            No conversations yet
                            <button
                                onClick={() => setShowNewChat(true)}
                                className="block mx-auto mt-2 text-primary hover:underline"
                            >
                                Start a new chat
                            </button>
                        </div>
                    ) : (
                        conversations.map(conv => (
                            <div
                                key={conv.id}
                                onClick={() => setActiveConversation(conv)}
                                className={`p-4 border-b border-[#222] cursor-pointer transition hover:bg-[#1a1a1a] ${activeConversation?.id === conv.id ? 'bg-[#1a1a1a] border-l-2 border-l-primary' : ''
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="size-12 rounded-full bg-primary/20 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-primary">
                                            {conv.type === 'group' ? 'group' : 'person'}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-white truncate">{getConversationName(conv)}</p>
                                        <p className="text-xs text-[#a1a1aa]">
                                            {conv.participant_ids.length} participants
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className={`
                flex-1 flex-col
                ${activeConversation ? 'flex' : 'hidden md:flex'}
            `}>
                {activeConversation ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 border-b border-[#333] flex items-center gap-3">
                            <button
                                onClick={() => setActiveConversation(null)}
                                className="md:hidden size-10 rounded-full hover:bg-[#333] flex items-center justify-center text-[#a1a1aa]"
                            >
                                <span className="material-symbols-outlined">arrow_back</span>
                            </button>
                            <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center">
                                <span className="material-symbols-outlined text-primary">
                                    {activeConversation.type === 'group' ? 'group' : 'person'}
                                </span>
                            </div>
                            <div>
                                <p className="font-bold text-white">{getConversationName(activeConversation)}</p>
                                <p className="text-xs text-[#a1a1aa]">
                                    {activeConversation.participant_ids.length} members
                                </p>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {messages.map(msg => (
                                <div
                                    key={msg.id}
                                    className={`flex ${msg.sender_id === userId ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2 ${msg.sender_id === userId
                                            ? 'bg-primary text-white rounded-br-sm'
                                            : 'bg-[#1e1e1e] text-white rounded-bl-sm'
                                            }`}
                                    >
                                        {msg.sender_id !== userId && (
                                            <p className="text-xs font-bold text-primary mb-1">{msg.sender_name}</p>
                                        )}
                                        <p>{msg.content}</p>
                                        <p className="text-xs opacity-60 mt-1">{formatTime(msg.created_at)}</p>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t border-[#333]">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder="Type a message..."
                                    className="flex-1 bg-[#1e1e1e] border border-[#333] rounded-full px-4 py-3 text-white focus:border-primary outline-none"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!newMessage.trim()}
                                    className="size-12 bg-primary rounded-full flex items-center justify-center hover:bg-primary/80 transition disabled:opacity-50"
                                >
                                    <span className="material-symbols-outlined text-white">send</span>
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-[#a1a1aa]">
                        <div className="text-center">
                            <span className="material-symbols-outlined text-6xl mb-4">chat</span>
                            <p>Select a conversation or start a new chat</p>
                        </div>
                    </div>
                )}
            </div>

            {/* New Chat Modal */}
            {showNewChat && (
                <NewChatModal
                    users={users}
                    onClose={() => setShowNewChat(false)}
                    onCreate={handleCreateConversation}
                />
            )}
        </div>
    );
};

// =============================================
// NEW CHAT MODAL
// =============================================

interface NewChatModalProps {
    users: Array<{ id: string; name: string; role: string }>;
    onClose: () => void;
    onCreate: (type: 'direct' | 'group', participantIds: string[], name?: string) => void;
}

const NewChatModal = ({ users, onClose, onCreate }: NewChatModalProps) => {
    const [chatType, setChatType] = useState<'direct' | 'group'>('direct');
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [groupName, setGroupName] = useState('');

    const toggleUser = (id: string) => {
        if (chatType === 'direct') {
            setSelectedUsers([id]);
        } else {
            setSelectedUsers(prev =>
                prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id]
            );
        }
    };

    const handleCreate = () => {
        if (selectedUsers.length === 0) return;
        if (chatType === 'group' && !groupName.trim()) return;

        onCreate(chatType, selectedUsers, groupName.trim() || undefined);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[#1e1e1e] rounded-3xl p-6 w-[90%] max-w-md shadow-2xl border border-[#333]" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-white">New Chat</h3>
                    <button onClick={onClose} className="text-[#a1a1aa] hover:text-white">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Chat Type Toggle */}
                <div className="flex gap-2 mb-4">
                    <button
                        onClick={() => { setChatType('direct'); setSelectedUsers([]); }}
                        className={`flex-1 py-2 rounded-xl font-bold transition ${chatType === 'direct' ? 'bg-primary text-white' : 'bg-[#0a0a0a] text-[#a1a1aa]'
                            }`}
                    >
                        Direct
                    </button>
                    <button
                        onClick={() => { setChatType('group'); setSelectedUsers([]); }}
                        className={`flex-1 py-2 rounded-xl font-bold transition ${chatType === 'group' ? 'bg-primary text-white' : 'bg-[#0a0a0a] text-[#a1a1aa]'
                            }`}
                    >
                        Group
                    </button>
                </div>

                {/* Group Name (only for groups) */}
                {chatType === 'group' && (
                    <input
                        type="text"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        placeholder="Group name"
                        className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-3 text-white focus:border-primary outline-none mb-4"
                    />
                )}

                {/* User List */}
                <p className="text-xs font-bold text-[#a1a1aa] uppercase mb-2">
                    Select {chatType === 'direct' ? 'User' : 'Members'} ({selectedUsers.length})
                </p>
                <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                    {users.map(user => (
                        <label
                            key={user.id}
                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${selectedUsers.includes(user.id) ? 'bg-primary/20 border border-primary/50' : 'bg-[#0a0a0a] border border-[#333]'
                                }`}
                        >
                            <input
                                type={chatType === 'direct' ? 'radio' : 'checkbox'}
                                checked={selectedUsers.includes(user.id)}
                                onChange={() => toggleUser(user.id)}
                                className="size-5 accent-primary"
                            />
                            <div>
                                <p className="font-bold text-white text-sm">{user.name}</p>
                                <p className="text-xs text-[#a1a1aa]">{user.role}</p>
                            </div>
                        </label>
                    ))}
                </div>

                {/* Create Button */}
                <button
                    onClick={handleCreate}
                    disabled={selectedUsers.length === 0 || (chatType === 'group' && !groupName.trim())}
                    className="w-full py-4 bg-primary text-white rounded-xl font-bold uppercase disabled:bg-gray-600 transition"
                >
                    {chatType === 'direct' ? 'Start Chat' : 'Create Group'}
                </button>
            </div>
        </div>
    );
};

export default SimpleChat;
