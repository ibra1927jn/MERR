/**
 * Manager Messaging View Component
 * Displays broadcasts, chats, and direct messaging
 */
import React, { useState } from 'react';
import { Broadcast } from '../../types';

interface MessagingViewProps {
    broadcasts: Broadcast[];
    onOpenBroadcastModal: () => void;
    onOpenChat: (chat: { id: string; name: string; isGroup: boolean }) => void;
}

const MessagingView: React.FC<MessagingViewProps> = ({
    broadcasts,
    onOpenBroadcastModal,
    onOpenChat,
}) => {
    const [activeTab, setActiveTab] = useState<'broadcasts' | 'chats'>('broadcasts');

    const mockChats = [
        { id: '1', name: 'Team Leaders', isGroup: true, unread: 2, lastMsg: 'Row 12 is complete', time: '14:20' },
        { id: '2', name: 'Runners', isGroup: true, unread: 0, lastMsg: 'Bin pickup at Row 8', time: '13:45' },
        { id: '3', name: 'Sarah M.', isGroup: false, unread: 1, lastMsg: 'Need more bins please', time: '12:30' },
    ];

    return (
        <main className="flex-1 overflow-y-auto pb-24 px-4 pt-4 space-y-4">
            {/* Tabs */}
            <div className="flex bg-gray-100 rounded-xl p-1">
                <button
                    onClick={() => setActiveTab('broadcasts')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'broadcasts'
                            ? 'bg-white text-[#d91e36] shadow-sm'
                            : 'text-gray-500'
                        }`}
                >
                    Broadcasts
                </button>
                <button
                    onClick={() => setActiveTab('chats')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'chats'
                            ? 'bg-white text-[#d91e36] shadow-sm'
                            : 'text-gray-500'
                        }`}
                >
                    Chats
                </button>
            </div>

            {activeTab === 'broadcasts' && (
                <div className="space-y-3">
                    <button
                        onClick={onOpenBroadcastModal}
                        className="w-full py-4 bg-[#d91e36] text-white rounded-xl font-bold flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined">campaign</span>
                        New Broadcast
                    </button>

                    {broadcasts.length === 0 ? (
                        <div className="text-center py-12">
                            <span className="material-symbols-outlined text-gray-300 text-6xl">campaign</span>
                            <p className="text-gray-500 mt-2">No broadcasts yet</p>
                        </div>
                    ) : (
                        broadcasts.map(broadcast => (
                            <div
                                key={broadcast.id}
                                className={`bg-white rounded-xl p-4 shadow-sm border-l-4 ${broadcast.priority === 'high'
                                        ? 'border-red-500'
                                        : broadcast.priority === 'normal'
                                            ? 'border-blue-500'
                                            : 'border-gray-300'
                                    }`}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <h4 className="font-bold text-gray-900">{broadcast.title}</h4>
                                    <span className="text-xs text-gray-500">
                                        {new Date(broadcast.created_at).toLocaleTimeString('en-NZ', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600">{broadcast.content}</p>
                                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                                    <span className="material-symbols-outlined text-sm">group</span>
                                    <span>{broadcast.acknowledged_by.length} acknowledged</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {activeTab === 'chats' && (
                <div className="space-y-2">
                    {mockChats.map(chat => (
                        <div
                            key={chat.id}
                            onClick={() => onOpenChat(chat)}
                            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform"
                        >
                            <div className="size-12 rounded-full bg-gray-200 flex items-center justify-center">
                                <span className="material-symbols-outlined text-gray-600">
                                    {chat.isGroup ? 'groups' : 'person'}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <p className="font-bold text-gray-900">{chat.name}</p>
                                    <span className="text-xs text-gray-400">{chat.time}</span>
                                </div>
                                <p className="text-sm text-gray-500 truncate">{chat.lastMsg}</p>
                            </div>
                            {chat.unread > 0 && (
                                <span className="size-5 rounded-full bg-[#d91e36] text-white text-xs flex items-center justify-center font-bold">
                                    {chat.unread}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
};

export default MessagingView;
