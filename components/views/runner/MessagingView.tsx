import React, { useState } from 'react';
import { useHarvest } from '../../../../context/HarvestContext';
import SimpleChat from '../../../SimpleChat';
import { Role } from '../../../../types';

const MessagingView = () => {
    const { currentUser, broadcasts, teamLeaders } = useHarvest(); // Assuming we might want to chat with TLs
    const [selectedChat, setSelectedChat] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'chats' | 'broadcasts'>('chats');

    // Runner's contact list usually consists of Team Leaders and Manager
    // Since we don't have infinite lists, we can hardcode "My Team Leader" or rely on context

    if (selectedChat) {
        return (
            <div className="h-[calc(100vh-80px)] flex flex-col bg-[#f4f5f7] -m-4">
                <header className="sticky top-0 z-30 bg-white border-b border-slate-200 p-3 flex items-center gap-2">
                    <button onClick={() => setSelectedChat(null)} className="p-2 rounded-full hover:bg-slate-100">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <span className="font-bold text-slate-800">Chat</span>
                </header>
                <div className="flex-1 relative">
                    <SimpleChat
                        userId={currentUser?.id || ''}
                        userName={currentUser?.name || 'Unknown'}
                        channelType={selectedChat === 'team' ? 'team' : 'direct'}
                        recipientId={selectedChat !== 'team' ? selectedChat : undefined}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-4">
            {/* Tabs */}
            <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
                <button
                    onClick={() => setActiveTab('chats')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'chats'
                        ? 'bg-white text-[#d91e36] shadow-sm'
                        : 'text-gray-500'
                        }`}
                >
                    Chats
                </button>
                <button
                    onClick={() => setActiveTab('broadcasts')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'broadcasts'
                        ? 'bg-white text-[#d91e36] shadow-sm'
                        : 'text-gray-500'
                        }`}
                >
                    Broadcasts
                </button>
            </div>

            {activeTab === 'chats' ? (
                <>
                    <div onClick={() => setSelectedChat('team')} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:bg-slate-50 cursor-pointer">
                        <div className="size-12 rounded-full bg-red-50 flex items-center justify-center text-[#d91e36]">
                            <span className="material-symbols-outlined">groups</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">Orchard Channel</h3>
                            <p className="text-xs text-slate-500">General Updates</p>
                        </div>
                    </div>
                </>
            ) : (
                <div className="space-y-3">
                    {broadcasts.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <span className="material-symbols-outlined text-5xl mb-2">inbox</span>
                            <p>No broadcasts</p>
                        </div>
                    ) : (
                        broadcasts.map(broadcast => (
                            <div key={broadcast.id} className="bg-white p-4 rounded-xl border-l-4 border-l-[#d91e36] shadow-sm">
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="font-bold text-slate-900">{broadcast.title}</h3>
                                    <span className="text-[10px] text-slate-400">
                                        {new Date(broadcast.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-600">{broadcast.content}</p>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default MessagingView;
