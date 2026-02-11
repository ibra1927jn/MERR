import React, { useState, useEffect, useRef } from 'react';
import { useMessaging, ChatGroup, DBMessage } from '../../context/MessagingContext';
import { useAuth } from '../../context/AuthContext';
import { Role, MessagePriority } from '../../types';
import BroadcastModal from '../modals/BroadcastModal';
import { simpleMessagingService } from '../../services/simple-messaging.service';

const UnifiedMessagingView = () => {
    const { appUser } = useAuth();
    const {
        broadcasts,
        chatGroups,
        loadConversation,
        sendMessage,
        sendBroadcast,
        getOrCreateConversation,
        createChatGroup,
        refreshMessages
    } = useMessaging();
    // Removed unused crew destructuring

    // State
    const [activeTab, setActiveTab] = useState<'alerts' | 'chats'>('alerts');
    const [selectedChat, setSelectedChat] = useState<ChatGroup | null>(null);
    const [messages, setMessages] = useState<DBMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [showBroadcastModal, setShowBroadcastModal] = useState(false);
    const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; name: string; role: string }>>([]);

    const isManager = appUser?.role === Role.MANAGER;

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initial Load
    useEffect(() => {
        refreshMessages();
        simpleMessagingService.getUsers().then(setAvailableUsers);
    }, []);

    // Load messages when chat selection changes
    useEffect(() => {
        if (selectedChat) {
            loadConversation(selectedChat.id).then(setMessages);
            if (window.innerWidth < 768) setIsSidebarOpen(false);
        } else {
            setMessages([]);
        }
    }, [selectedChat?.id]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!newMessage.trim() || !selectedChat) return;
        const sent = await sendMessage(selectedChat.id, newMessage.trim());
        if (sent) {
            setMessages(prev => [...prev, sent]);
            setNewMessage('');
        }
    };

    const handleStartDirectChat = async (userId: string) => {
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
    };

    const formatTime = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) { return ''; }
    };

    return (
        <div className="flex h-[calc(100dvh-64px)] bg-[#f8fafc] overflow-hidden">

            {/* Sidebar */}
            <aside className={`${isSidebarOpen ? 'w-full md:w-80' : 'hidden md:flex md:w-20'} flex flex-col border-r border-slate-200 bg-white transition-all duration-300 z-40`}>

                {/* Header Tabs */}
                <div className="p-4 border-b border-slate-100">
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => setActiveTab('alerts')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition ${activeTab === 'alerts' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}
                        >
                            <span className="material-symbols-outlined text-sm">campaign</span>
                            ALERTS
                        </button>
                        <button
                            onClick={() => setActiveTab('chats')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition ${activeTab === 'chats' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}
                        >
                            <span className="material-symbols-outlined text-sm">forum</span>
                            CHATS
                        </button>
                    </div>
                </div>

                {/* List Container */}
                <div className="flex-1 overflow-y-auto no-scrollbar">
                    {activeTab === 'alerts' ? (
                        <div className="p-2 space-y-2">
                            {isManager && (
                                <button
                                    onClick={() => setShowBroadcastModal(true)}
                                    className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-primary text-white font-bold text-xs shadow-soft transition mb-2"
                                >
                                    <span className="material-symbols-outlined text-sm">campaign</span>
                                    NEW BROADCAST
                                </button>
                            )}
                            {broadcasts.length === 0 ? (
                                <div className="text-center py-10 opacity-40">
                                    <span className="material-symbols-outlined text-4xl block mb-2">notifications_off</span>
                                    <p className="text-xs font-medium">No alerts today</p>
                                </div>
                            ) : (
                                broadcasts.map(b => (
                                    <div key={b.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50 hover:border-primary/20 transition group">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`text-[10px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded ${b.priority === 'urgent' ? 'bg-red-500 text-white' : 'bg-primary/10 text-primary'}`}>
                                                {b.priority || 'Alert'}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-medium">{formatTime(b.created_at)}</span>
                                        </div>
                                        <h4 className="text-sm font-bold text-slate-800 mb-1">{b.title}</h4>
                                        <p className="text-xs text-slate-500 leading-snug line-clamp-2">{b.content}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="p-2 space-y-1">
                            <button
                                onClick={() => setShowNewChatModal(true)}
                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 text-slate-600 transition mb-2 border border-dashed border-slate-200"
                            >
                                <div className="size-10 rounded-full bg-slate-100 flex items-center justify-center">
                                    <span className="material-symbols-outlined">add</span>
                                </div>
                                <span className="text-sm font-bold uppercase tracking-tight">New Message</span>
                            </button>

                            {chatGroups.map(chat => (
                                <button
                                    key={chat.id}
                                    onClick={() => setSelectedChat(chat)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition ${selectedChat?.id === chat.id ? 'bg-primary/5 border-l-4 border-primary shadow-sm' : 'hover:bg-slate-50'}`}
                                >
                                    <div className={`size-11 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${chat.isGroup ? 'bg-blue-500' : 'bg-primary'}`}>
                                        {chat.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="flex-1 text-left min-w-0">
                                        <div className="flex justify-between items-baseline mb-0.5">
                                            <h4 className="text-sm font-bold text-slate-800 truncate">{chat.name}</h4>
                                            <span className="text-[10px] text-slate-400">{chat.time}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 truncate">{chat.lastMsg || 'No messages yet'}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </aside>

            {/* Chat Window */}
            <main className={`flex-1 flex flex-col bg-white ${!selectedChat && !isSidebarOpen ? 'hidden md:flex' : 'flex'}`}>
                {selectedChat ? (
                    <>
                        {/* Chat Header */}
                        <header className="h-16 flex items-center justify-between px-4 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
                            <div className="flex items-center gap-3">
                                <button onClick={() => { setSelectedChat(null); setIsSidebarOpen(true); }} className="md:hidden text-slate-400">
                                    <span className="material-symbols-outlined">arrow_back</span>
                                </button>
                                <div className={`size-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${selectedChat.isGroup ? 'bg-blue-500' : 'bg-primary'}`}>
                                    {selectedChat.name.substring(0, 1).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800">{selectedChat.name}</h3>
                                    <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Active Now</p>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <button className="size-9 rounded-full hover:bg-slate-50 text-slate-400 flex items-center justify-center transition">
                                    <span className="material-symbols-outlined text-xl">info</span>
                                </button>
                            </div>
                        </header>

                        {/* Message Stream */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-slate-50/50">
                            {messages.map((m, idx) => {
                                const isMe = m.sender_id === appUser?.id;
                                return (
                                    <div key={m.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl shadow-sm text-sm ${isMe ? 'bg-primary text-white rounded-br-none' : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'}`}>
                                            {!isMe && selectedChat.isGroup && (
                                                <p className="text-[10px] font-black uppercase text-primary mb-1">Worker {m.sender_id.substring(0, 4)}</p>
                                            )}
                                            <p className="leading-relaxed font-medium">{m.content}</p>
                                            <p className={`text-[9px] mt-1 text-right opacity-60 ${isMe ? 'text-white' : 'text-slate-400'}`}>
                                                {formatTime(m.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Compose */}
                        <footer className="p-4 bg-white border-t border-slate-100">
                            <div className="flex items-center gap-2 bg-slate-100 rounded-2xl px-4 py-1">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder="Type your message..."
                                    className="flex-1 bg-transparent py-3 text-sm focus:outline-none placeholder:text-slate-400 font-medium"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!newMessage.trim()}
                                    className="size-10 rounded-xl bg-primary text-white shadow-lg shadow-primary/20 flex items-center justify-center transition active:scale-90 disabled:opacity-50"
                                >
                                    <span className="material-symbols-outlined filled text-lg">send</span>
                                </button>
                            </div>
                        </footer>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                        <div className="size-24 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-5xl">forum</span>
                        </div>
                        <h3 className="text-slate-800 font-bold mb-1">Field Comms</h3>
                        <p className="text-xs font-medium">Select a conversation to start chatting</p>
                    </div>
                )}
            </main>

            {/* New Chat Modal (Unified: Direct & Group) */}
            {showNewChatModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm shadow-2xl" onClick={() => setShowNewChatModal(false)}>
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
            )}

            {/* Broadcast Modal (Manager Only) */}
            {showBroadcastModal && isManager && (
                <BroadcastModal
                    onClose={() => setShowBroadcastModal(false)}
                    onSend={async (title, content, priority) => {
                        await sendBroadcast(title, content, priority as MessagePriority);
                        refreshMessages();
                    }}
                />
            )}
        </div>
    );
};

// Sub-component for New Chat Modal to keep main component clean
const NewChatModalContent = ({
    availableUsers,
    currentUserId,
    onClose,
    onStartDirect,
    onCreateGroup
}: any) => {
    const [mode, setMode] = useState<'direct' | 'group'>('direct');
    const [groupName, setGroupName] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => prev.includes(id)
            ? prev.filter(x => x !== id)
            : [...prev, id]
        );
    };

    const handleCreateGroup = () => {
        if (!groupName.trim() || selectedIds.length === 0) return;
        onCreateGroup(groupName, selectedIds);
    };

    const filteredUsers = availableUsers.filter((u: any) => u.id !== currentUserId);

    return (
        <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden flex flex-col max-h-[85vh] shadow-2xl" onClick={e => e.stopPropagation()}>
            <header className="p-4 border-b border-slate-100 flex flex-col gap-3 bg-slate-50/50">
                <div className="flex justify-between items-center w-full">
                    <h3 className="text-lg font-black text-slate-800 tracking-tight">
                        {mode === 'direct' ? 'NEW MESSAGE' : 'NEW GROUP'}
                    </h3>
                    <button onClick={onClose} className="size-8 flex items-center justify-center text-slate-400 hover:bg-slate-100 rounded-full transition">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="flex bg-slate-200 p-1 rounded-xl w-full">
                    <button
                        onClick={() => setMode('direct')}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${mode === 'direct' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <span className="material-symbols-outlined text-[16px]">person</span>
                        Direct Message
                    </button>
                    <button
                        onClick={() => setMode('group')}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${mode === 'group' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <span className="material-symbols-outlined text-[16px]">groups</span>
                        Create Group
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4">
                {mode === 'group' && (
                    <div className="mb-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Group Name</label>
                        <input
                            type="text"
                            value={groupName}
                            onChange={e => setGroupName(e.target.value)}
                            placeholder="e.g. Harvesting Team A"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                        />
                    </div>
                )}

                <p className="text-[10px] font-black text-slate-400 uppercase px-2 mb-2 tracking-widest">
                    {mode === 'direct' ? 'Select Person' : `Select Members (${selectedIds.length})`}
                </p>

                <div className="space-y-2">
                    {filteredUsers.map((p: any) => {
                        const isSelected = selectedIds.includes(p.id);
                        return (
                            <button
                                key={p.id}
                                onClick={() => {
                                    if (mode === 'direct') onStartDirect(p.id);
                                    else toggleSelection(p.id);
                                }}
                                className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition text-left ${mode === 'group' && isSelected
                                    ? 'bg-primary/5 border-primary/30'
                                    : 'bg-white border-transparent hover:bg-slate-50'
                                    }`}
                            >
                                <div className={`size-10 rounded-full flex items-center justify-center font-bold text-sm transition ${mode === 'group' && isSelected ? 'bg-primary text-white scale-110' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                    {mode === 'group' && isSelected ? (
                                        <span className="material-symbols-outlined text-lg">check</span>
                                    ) : (
                                        (p.name || 'U').substring(0, 2).toUpperCase()
                                    )}
                                </div>
                                <div className="flex-1">
                                    <p className={`text-sm font-bold leading-none mb-1 ${mode === 'group' && isSelected ? 'text-primary' : 'text-slate-800'}`}>
                                        {p.name}
                                    </p>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{p.role || 'Personnel'}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {mode === 'group' && (
                <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                    <button
                        onClick={handleCreateGroup}
                        disabled={!groupName.trim() || selectedIds.length === 0}
                        className="w-full py-3.5 bg-primary text-white rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-primary/20 disabled:opacity-50 disabled:shadow-none transition active:scale-[0.98]"
                    >
                        Create Group
                    </button>
                </div>
            )}
        </div>
    );
};

export default UnifiedMessagingView;
