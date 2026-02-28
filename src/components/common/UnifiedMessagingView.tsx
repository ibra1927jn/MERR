import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useMessaging, ChatGroup, DBMessage } from '../../context/MessagingContext';
import { useAuth } from '../../context/AuthContext';
import { Role, MessagePriority } from '../../types';
import BroadcastModal from '../modals/BroadcastModal';
import { simpleMessagingService } from '../../services/simple-messaging.service';

// ── Quick Reply presets for field context ──
const QUICK_REPLIES = [
    { emoji: '👍', label: 'Acknowledged' },
    { emoji: '✅', label: 'Done' },
    { emoji: '🚜', label: 'On my way' },
    { emoji: '⚠️', label: 'Issue here' },
    { emoji: '☔', label: 'Weather stop' },
    { emoji: '🔄', label: 'Need backup' },
];

// ── Date formatting helpers ──
const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();

const getDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    if (isSameDay(d, now)) return 'Today';
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (isSameDay(d, yesterday)) return 'Yesterday';
    return d.toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' });
};

const formatTime = (dateStr: string) => {
    try {
        return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
};

// ── Avatar colors by name hash ──
const AVATAR_COLORS = [
    'from-violet-500 to-purple-600', 'from-blue-500 to-indigo-600', 'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600', 'from-rose-500 to-pink-600', 'from-cyan-500 to-sky-600',
    'from-fuchsia-500 to-purple-600', 'from-lime-500 to-green-600',
];
const getAvatarColor = (name: string) => AVATAR_COLORS[Math.abs(name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % AVATAR_COLORS.length];

const UnifiedMessagingView = () => {
    const { appUser } = useAuth();
    const {
        broadcasts, chatGroups, loadConversation, sendMessage, sendBroadcast,
        getOrCreateConversation, createChatGroup, refreshMessages
    } = useMessaging();

    // State
    const [activeTab, setActiveTab] = useState<'alerts' | 'chats'>('chats');
    const [selectedChat, setSelectedChat] = useState<ChatGroup | null>(null);
    const [messages, setMessages] = useState<DBMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [showBroadcastModal, setShowBroadcastModal] = useState(false);
    const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; name: string; role: string }>>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showQuickReplies, setShowQuickReplies] = useState(false);
    const [isSending, setIsSending] = useState(false);

    const isManager = appUser?.role === Role.MANAGER;
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // User name lookup map
    const userNameMap = useMemo(() => {
        const map: Record<string, string> = {};
        availableUsers.forEach(u => { map[u.id] = u.name; });
        return map;
    }, [availableUsers]);

    // ── Initial Load ──
    useEffect(() => {
        refreshMessages();
        simpleMessagingService.getUsers().then(setAvailableUsers);
    }, [refreshMessages]);

    // ── Load messages + subscribe to real-time ──
    useEffect(() => {
        if (!selectedChat) { setMessages([]); return; }
        loadConversation(selectedChat.id).then(setMessages);
        if (window.innerWidth < 768) setIsSidebarOpen(false);

        // Real-time subscription
        const unsubscribe = simpleMessagingService.subscribeToConversation(
            selectedChat.id,
            (newMsg) => {
                if (newMsg.sender_id !== appUser?.id) {
                    // Cast ChatMessage to DBMessage format
                    const dbMsg: DBMessage = {
                        id: newMsg.id,
                        sender_id: newMsg.sender_id,
                        content: newMsg.content,
                        created_at: newMsg.created_at,
                        conversation_id: newMsg.conversation_id,
                        priority: 'normal' as MessagePriority,
                        read_by: [],
                    };
                    setMessages(prev => [...prev, dbMsg]);
                }
            }
        );
        return () => unsubscribe();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedChat?.id, loadConversation]);

    // ── Sidebar real-time: refresh chat list periodically ──
    useEffect(() => {
        const interval = setInterval(() => { refreshMessages(); }, 15000);
        return () => clearInterval(interval);
    }, [refreshMessages]);

    // ── Scroll to bottom ──
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // ── Send message ──
    const handleSend = useCallback(async (content?: string) => {
        const text = (content || newMessage).trim();
        if (!text || !selectedChat || isSending) return;
        setIsSending(true);
        try {
            const sent = await sendMessage(selectedChat.id, text);
            if (sent) {
                setMessages(prev => [...prev, sent]);
                setNewMessage('');
                setShowQuickReplies(false);
                inputRef.current?.focus();
            }
        } finally {
            setIsSending(false);
        }
    }, [newMessage, selectedChat, isSending, sendMessage]);

    // ── Start direct chat ──
    const handleStartDirectChat = useCallback(async (userId: string) => {
        const convId = await getOrCreateConversation(userId);
        if (convId) {
            const user = availableUsers.find(p => p.id === userId);
            setSelectedChat({
                id: convId,
                name: user?.name || 'Direct Chat',
                members: [appUser?.id || '', userId],
                isGroup: false,
                lastMsg: '',
                time: ''
            });
            setShowNewChatModal(false);
            setActiveTab('chats');
        }
    }, [getOrCreateConversation, availableUsers, appUser?.id]);

    // ── Filter chats by search ──
    const filteredChats = useMemo(() => {
        if (!searchQuery.trim()) return chatGroups;
        const q = searchQuery.toLowerCase();
        return chatGroups.filter(c => c.name.toLowerCase().includes(q));
    }, [chatGroups, searchQuery]);

    const filteredBroadcasts = useMemo(() => {
        if (!searchQuery.trim()) return broadcasts;
        const q = searchQuery.toLowerCase();
        return broadcasts.filter(b => b.title.toLowerCase().includes(q) || b.content.toLowerCase().includes(q));
    }, [broadcasts, searchQuery]);

    // ── Get sender display name ──
    const getSenderName = (senderId: string) => {
        if (senderId === appUser?.id) return 'You';
        return userNameMap[senderId] || 'Unknown';
    };

    // ── Message groups by date ──
    const messagesByDate = useMemo(() => {
        const groups: { label: string; messages: DBMessage[] }[] = [];
        let currentLabel = '';
        messages.forEach(m => {
            const label = getDateLabel(m.created_at);
            if (label !== currentLabel) {
                currentLabel = label;
                groups.push({ label, messages: [m] });
            } else {
                groups[groups.length - 1].messages.push(m);
            }
        });
        return groups;
    }, [messages]);

    return (
        <div className="flex h-[calc(100dvh-64px)] bg-slate-50 overflow-hidden">

            {/* ═══════════════════ SIDEBAR ═══════════════════ */}
            <aside className={`${isSidebarOpen ? 'w-full md:w-96' : 'hidden md:flex md:w-0'} flex flex-col border-r border-slate-200/80 bg-white transition-all duration-300 z-40`}>

                {/* Sidebar Header */}
                <div className="p-4 pb-3">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="size-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                <span className="material-symbols-outlined text-white text-lg">forum</span>
                            </div>
                            <div>
                                <h2 className="text-base font-black text-slate-800 tracking-tight">Field Comms</h2>
                                <p className="text-[10px] text-slate-400 font-medium -mt-0.5">{chatGroups.length} conversations</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowNewChatModal(true)}
                            className="size-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100 transition active:scale-95"
                        >
                            <span className="material-symbols-outlined text-lg">edit_square</span>
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-lg">search</span>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search conversations..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition font-medium placeholder:text-slate-300"
                        />
                    </div>
                </div>

                {/* Tabs */}
                <div className="px-4 pb-2">
                    <div className="flex bg-slate-100/80 p-1 rounded-xl">
                        <button
                            onClick={() => setActiveTab('chats')}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'chats'
                                ? 'bg-white text-indigo-600 shadow-sm'
                                : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <span className="material-symbols-outlined text-sm">chat</span>
                            Chats
                            {chatGroups.length > 0 && (
                                <span className="bg-indigo-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                    {chatGroups.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('alerts')}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'alerts'
                                ? 'bg-white text-amber-600 shadow-sm'
                                : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <span className="material-symbols-outlined text-sm">campaign</span>
                            Alerts
                            {broadcasts.length > 0 && (
                                <span className="bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                    {broadcasts.length}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto no-scrollbar">
                    {activeTab === 'alerts' ? (
                        <div className="p-3 space-y-2">
                            {isManager && (
                                <button
                                    onClick={() => setShowBroadcastModal(true)}
                                    className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs shadow-lg shadow-amber-500/20 transition active:scale-[0.98] mb-1"
                                >
                                    <span className="material-symbols-outlined text-sm">campaign</span>
                                    NEW BROADCAST
                                </button>
                            )}
                            {filteredBroadcasts.length === 0 ? (
                                <div className="text-center py-16 px-6">
                                    <div className="size-16 mx-auto mb-3 rounded-2xl bg-amber-50 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-3xl text-amber-300">notifications_off</span>
                                    </div>
                                    <p className="text-sm font-bold text-slate-300">No alerts yet</p>
                                    <p className="text-xs text-slate-300 mt-1">Broadcasts will appear here</p>
                                </div>
                            ) : (
                                filteredBroadcasts.map(b => (
                                    <div key={b.id} className={`p-3.5 rounded-xl border transition group cursor-pointer hover:shadow-sm ${b.priority === 'urgent'
                                        ? 'bg-red-50/50 border-red-200/50 hover:border-red-300'
                                        : b.priority === 'high'
                                            ? 'bg-amber-50/50 border-amber-200/50 hover:border-amber-300'
                                            : 'bg-white border-slate-100 hover:border-indigo-200'}`}
                                    >
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${b.priority === 'urgent'
                                                ? 'bg-red-500 text-white'
                                                : b.priority === 'high'
                                                    ? 'bg-amber-500 text-white'
                                                    : 'bg-indigo-100 text-indigo-600'}`}
                                            >
                                                {b.priority || 'Info'}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-medium">{formatTime(b.created_at)}</span>
                                        </div>
                                        <h4 className="text-sm font-bold text-slate-800 mb-0.5">{b.title}</h4>
                                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{b.content}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="p-3 space-y-1">
                            {filteredChats.length === 0 && !searchQuery ? (
                                <div className="text-center py-16 px-6">
                                    <div className="size-16 mx-auto mb-3 rounded-2xl bg-indigo-50 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-3xl text-indigo-300">chat_bubble</span>
                                    </div>
                                    <p className="text-sm font-bold text-slate-300">No conversations yet</p>
                                    <p className="text-xs text-slate-300 mt-1">Start a new chat to begin</p>
                                    <button
                                        onClick={() => setShowNewChatModal(true)}
                                        className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition"
                                    >
                                        Start a chat
                                    </button>
                                </div>
                            ) : filteredChats.length === 0 ? (
                                <div className="text-center py-10 opacity-50">
                                    <p className="text-xs font-medium">No results for "{searchQuery}"</p>
                                </div>
                            ) : (
                                filteredChats.map(chat => {
                                    const isActive = selectedChat?.id === chat.id;
                                    const avatarGrad = getAvatarColor(chat.name);
                                    return (
                                        <button
                                            key={chat.id}
                                            onClick={() => setSelectedChat(chat)}
                                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${isActive
                                                ? 'bg-indigo-50 shadow-sm ring-1 ring-indigo-200/50'
                                                : 'hover:bg-slate-50'}`}
                                        >
                                            <div className="relative">
                                                <div className={`size-12 rounded-full bg-gradient-to-br ${avatarGrad} flex items-center justify-center font-bold text-white text-sm shadow-sm`}>
                                                    {chat.isGroup
                                                        ? <span className="material-symbols-outlined text-lg">groups</span>
                                                        : chat.name.substring(0, 2).toUpperCase()
                                                    }
                                                </div>
                                                {/* Last active indicator (only for DMs) */}
                                                {!chat.isGroup && chat.time && (
                                                    <div className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full bg-slate-300 border-2 border-white" title={`Last seen: ${chat.time}`}></div>
                                                )}
                                            </div>
                                            <div className="flex-1 text-left min-w-0">
                                                <div className="flex justify-between items-baseline mb-0.5">
                                                    <h4 className={`text-sm font-bold truncate ${isActive ? 'text-indigo-700' : 'text-slate-800'}`}>
                                                        {chat.name}
                                                    </h4>
                                                    <span className="text-[10px] text-slate-400 font-medium ml-2 shrink-0">{chat.time}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    {chat.isGroup && <span className="text-[10px] text-slate-400">👥 {chat.members.length}</span>}
                                                    <p className="text-xs text-slate-400 truncate">{chat.lastMsg || 'No messages yet'}</p>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>
            </aside >

            {/* ═══════════════════ CHAT WINDOW ═══════════════════ */}
            < main className={`flex-1 flex flex-col ${!selectedChat && !isSidebarOpen ? 'hidden md:flex' : 'flex'}`}>
                {
                    selectedChat ? (
                        <>
                            {/* Chat Header */}
                            < header className="h-16 flex items-center justify-between px-5 border-b border-slate-100 bg-white/90 backdrop-blur-lg sticky top-0 z-10" >
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => { setSelectedChat(null); setIsSidebarOpen(true); }}
                                        className="md:hidden size-9 rounded-lg text-slate-400 hover:bg-slate-50 flex items-center justify-center"
                                    >
                                        <span className="material-symbols-outlined">arrow_back</span>
                                    </button>
                                    <div className="relative">
                                        <div className={`size-10 rounded-full bg-gradient-to-br ${getAvatarColor(selectedChat.name)} flex items-center justify-center font-bold text-white text-sm shadow-sm`}>
                                            {selectedChat.isGroup
                                                ? <span className="material-symbols-outlined text-base">groups</span>
                                                : selectedChat.name.substring(0, 1).toUpperCase()
                                            }
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-800">{selectedChat.name}</h3>
                                        <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                            {selectedChat.isGroup
                                                ? `${selectedChat.members.length} members`
                                                : selectedChat.time ? `Last seen ${selectedChat.time}` : 'Offline'
                                            }
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => {
                                            /* TODO: Implement user profile/info panel */
                                        }}
                                        className="size-9 rounded-xl hover:bg-slate-50 text-slate-400 flex items-center justify-center transition"
                                        title="Chat info"
                                    >
                                        <span className="material-symbols-outlined text-xl">more_vert</span>
                                    </button>
                                </div>
                            </header >

                            {/* Message Stream */}
                            < div className="flex-1 overflow-y-auto px-5 py-4 no-scrollbar" style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)' }}>
                                {
                                    messages.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-center px-6">
                                            <div className="size-20 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-4">
                                                <span className="material-symbols-outlined text-4xl text-indigo-200">waving_hand</span>
                                            </div>
                                            <h4 className="text-sm font-bold text-slate-400 mb-1">Start the conversation</h4>
                                            <p className="text-xs text-slate-300">Send a message or use a quick reply below</p>
                                        </div>
                                    ) : (
                                        messagesByDate.map((group, gi) => (
                                            <React.Fragment key={gi}>
                                                {/* Date separator */}
                                                <div className="flex items-center gap-3 my-4">
                                                    <div className="flex-1 h-px bg-slate-200/60"></div>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full">
                                                        {group.label}
                                                    </span>
                                                    <div className="flex-1 h-px bg-slate-200/60"></div>
                                                </div>
                                                {group.messages.map((m, idx) => {
                                                    const isMe = m.sender_id === appUser?.id;
                                                    const senderName = getSenderName(m.sender_id);
                                                    const showSender = !isMe && selectedChat.isGroup;
                                                    return (
                                                        <div key={m.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-2`}>
                                                            {!isMe && (
                                                                <div className={`size-7 rounded-full bg-gradient-to-br ${getAvatarColor(senderName)} flex items-center justify-center text-white text-[10px] font-bold mr-2 mt-auto mb-1 shrink-0`}>
                                                                    {senderName.substring(0, 1)}
                                                                </div>
                                                            )}
                                                            <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                                                                {showSender && (
                                                                    <p className="text-[10px] font-bold text-indigo-500 mb-0.5 px-3">{senderName}</p>
                                                                )}
                                                                <div className={`px-4 py-2.5 rounded-2xl text-sm font-medium leading-relaxed ${isMe
                                                                    ? 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-br-md shadow-lg shadow-indigo-500/10'
                                                                    : 'bg-white text-slate-700 rounded-bl-md shadow-sm border border-slate-100'}`}
                                                                >
                                                                    <p>{m.content}</p>
                                                                </div>
                                                                <div className={`flex items-center gap-1 mt-0.5 px-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                                    <span className={`text-[9px] ${isMe ? 'text-slate-400' : 'text-slate-300'}`}>
                                                                        {formatTime(m.created_at)}
                                                                    </span>
                                                                    {isMe && (
                                                                        <span className="material-symbols-outlined text-[12px] text-indigo-400">done_all</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </React.Fragment>
                                        ))
                                    )
                                }
                                < div ref={messagesEndRef} />
                            </div >

                            {/* Quick replies bar */}
                            {
                                showQuickReplies && (
                                    <div className="px-5 py-2 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto no-scrollbar">
                                        {QUICK_REPLIES.map(qr => (
                                            <button
                                                key={qr.label}
                                                onClick={() => handleSend(`${qr.emoji} ${qr.label}`)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 rounded-full text-xs font-bold text-slate-600 hover:text-indigo-600 transition whitespace-nowrap active:scale-95"
                                            >
                                                <span>{qr.emoji}</span>
                                                {qr.label}
                                            </button>
                                        ))}
                                    </div>
                                )
                            }

                            {/* Compose Bar */}
                            <footer className="p-3 bg-white border-t border-slate-100">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setShowQuickReplies(!showQuickReplies)}
                                        className={`size-10 rounded-xl flex items-center justify-center transition shrink-0 ${showQuickReplies
                                            ? 'bg-indigo-100 text-indigo-600'
                                            : 'bg-slate-50 text-slate-400 hover:text-slate-600'}`}
                                    >
                                        <span className="material-symbols-outlined text-lg">emoji_emotions</span>
                                    </button>
                                    <div className="flex-1 flex items-center bg-slate-50 border border-slate-100 rounded-2xl px-4 py-1 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 transition">
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                            placeholder="Type your message..."
                                            className="flex-1 bg-transparent py-2.5 text-sm focus:outline-none placeholder:text-slate-300 font-medium text-slate-800"
                                        />
                                    </div>
                                    <button
                                        onClick={() => handleSend()}
                                        disabled={!newMessage.trim() || isSending}
                                        className="size-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-lg shadow-indigo-500/20 flex items-center justify-center transition active:scale-90 disabled:opacity-40 disabled:shadow-none shrink-0"
                                    >
                                        <span className="material-symbols-outlined filled text-lg">{isSending ? 'hourglass_empty' : 'send'}</span>
                                    </button>
                                </div>
                            </footer>
                        </>
                    ) : (
                        /* ── Empty State (no chat selected) ── */
                        <div className="flex-1 flex flex-col items-center justify-center px-6" style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)' }}>
                            <div className="size-28 rounded-3xl bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center mb-5 shadow-sm">
                                <span className="material-symbols-outlined text-6xl text-indigo-400">forum</span>
                            </div>
                            <h3 className="text-xl font-black text-slate-800 mb-1">Field Communications</h3>
                            <p className="text-sm text-slate-400 font-medium text-center max-w-xs mb-6">
                                Stay connected with your team. Send messages, alerts, and coordinate harvest operations in real-time.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowNewChatModal(true)}
                                    className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30 transition active:scale-95"
                                >
                                    <span className="material-symbols-outlined text-sm mr-1 align-middle">add</span>
                                    New Chat
                                </button>
                                {isManager && (
                                    <button
                                        onClick={() => setShowBroadcastModal(true)}
                                        className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:border-amber-300 hover:text-amber-600 transition active:scale-95"
                                    >
                                        <span className="material-symbols-outlined text-sm mr-1 align-middle">campaign</span>
                                        Broadcast
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
            </main >

            {/* ═══════════════════ NEW CHAT MODAL ═══════════════════ */}
            {
                showNewChatModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowNewChatModal(false)}>
                        <NewChatModalContent
                            availableUsers={availableUsers}
                            currentUserId={appUser?.id || ''}
                            onClose={() => setShowNewChatModal(false)}
                            onStartDirect={handleStartDirectChat}
                            onCreateGroup={async (name, ids) => {
                                const group = await createChatGroup(name, ids);
                                if (group) {
                                    setSelectedChat(group);
                                    setShowNewChatModal(false);
                                    setActiveTab('chats');
                                }
                            }}
                        />
                    </div>
                )
            }

            {/* Broadcast Modal */}
            {
                showBroadcastModal && isManager && (
                    <BroadcastModal
                        onClose={() => setShowBroadcastModal(false)}
                        onSend={async (title, content, priority) => {
                            await sendBroadcast(title, content, priority as MessagePriority);
                            refreshMessages();
                        }}
                    />
                )
            }
        </div >
    );
};

// ═══════════════════════════════════════════════════════════
// NEW CHAT MODAL CONTENT
// ═══════════════════════════════════════════════════════════

interface NewChatModalContentProps {
    availableUsers: Array<{ id: string; name: string; role: string }>;
    currentUserId: string;
    onClose: () => void;
    onStartDirect: (userId: string) => void;
    onCreateGroup: (name: string, ids: string[]) => void;
}

const NewChatModalContent = ({
    availableUsers, currentUserId, onClose, onStartDirect, onCreateGroup
}: NewChatModalContentProps) => {
    const [mode, setMode] = useState<'direct' | 'group'>('direct');
    const [groupName, setGroupName] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [search, setSearch] = useState('');

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleCreateGroup = () => {
        if (!groupName.trim() || selectedIds.length === 0) return;
        onCreateGroup(groupName, selectedIds);
    };

    const filteredUsers = availableUsers.filter(u =>
        u.id !== currentUserId && u.name.toLowerCase().includes(search.toLowerCase())
    );

    const getRoleBadge = (role: string) => {
        switch (role.toLowerCase()) {
            case 'manager': return { bg: 'bg-purple-100 text-purple-600', icon: 'admin_panel_settings' };
            case 'team_leader': return { bg: 'bg-blue-100 text-blue-600', icon: 'supervisor_account' };
            case 'runner': return { bg: 'bg-amber-100 text-amber-600', icon: 'directions_run' };
            default: return { bg: 'bg-emerald-100 text-emerald-600', icon: 'agriculture' };
        }
    };

    return (
        <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh] shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <header className="p-5 border-b border-slate-100">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <div className="size-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-sm">
                            <span className="material-symbols-outlined text-white text-lg">
                                {mode === 'direct' ? 'person_add' : 'group_add'}
                            </span>
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-800">
                                {mode === 'direct' ? 'New Message' : 'Create Group'}
                            </h3>
                            <p className="text-[10px] text-slate-400 font-medium">
                                {mode === 'direct' ? 'Select a person to message' : `${selectedIds.length} selected`}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="size-9 flex items-center justify-center text-slate-300 hover:text-slate-500 hover:bg-slate-50 rounded-xl transition">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Mode Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                        onClick={() => setMode('direct')}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${mode === 'direct' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
                    >
                        <span className="material-symbols-outlined text-sm">person</span>
                        Direct
                    </button>
                    <button
                        onClick={() => setMode('group')}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${mode === 'group' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
                    >
                        <span className="material-symbols-outlined text-sm">groups</span>
                        Group
                    </button>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {mode === 'group' && (
                    <div className="mb-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Group Name</label>
                        <input
                            type="text"
                            value={groupName}
                            onChange={e => setGroupName(e.target.value)}
                            placeholder="e.g. Block A Team"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
                        />
                    </div>
                )}

                {/* Search users */}
                <div className="relative mb-3">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-lg">search</span>
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search people..."
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-indigo-300 transition font-medium placeholder:text-slate-300"
                    />
                </div>

                <div className="space-y-1.5">
                    {filteredUsers.map(p => {
                        const isSelected = selectedIds.includes(p.id);
                        const badge = getRoleBadge(p.role);
                        return (
                            <button
                                key={p.id}
                                onClick={() => {
                                    if (mode === 'direct') onStartDirect(p.id);
                                    else toggleSelection(p.id);
                                }}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left active:scale-[0.98] ${mode === 'group' && isSelected
                                    ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                                    : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-100'}`}
                            >
                                <div className={`size-10 rounded-full bg-gradient-to-br ${getAvatarColor(p.name)} flex items-center justify-center font-bold text-white text-sm shadow-sm transition ${mode === 'group' && isSelected ? 'ring-2 ring-indigo-400 ring-offset-2' : ''}`}>
                                    {mode === 'group' && isSelected ? (
                                        <span className="material-symbols-outlined text-base">check</span>
                                    ) : (
                                        p.name.substring(0, 2).toUpperCase()
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-bold truncate ${mode === 'group' && isSelected ? 'text-indigo-700' : 'text-slate-800'}`}>
                                        {p.name}
                                    </p>
                                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${badge.bg}`}>
                                        <span className="material-symbols-outlined text-[11px]">{badge.icon}</span>
                                        {p.role?.replace('_', ' ') || 'Picker'}
                                    </span>
                                </div>
                                {mode === 'direct' && (
                                    <span className="material-symbols-outlined text-slate-300 text-lg">arrow_forward_ios</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Create Group Footer */}
            {mode === 'group' && (
                <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                    <button
                        onClick={handleCreateGroup}
                        disabled={!groupName.trim() || selectedIds.length === 0}
                        className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-indigo-500/20 disabled:opacity-40 disabled:shadow-none transition active:scale-[0.98]"
                    >
                        Create Group ({selectedIds.length} members)
                    </button>
                </div>
            )}
        </div>
    );
};

export default UnifiedMessagingView;
