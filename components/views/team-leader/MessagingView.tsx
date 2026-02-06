import React, { useState } from 'react';
import { useHarvest } from '../../../context/HarvestContext';
import SimpleChat from '../../SimpleChat';

const MessagingView = () => {
    const { crew, currentUser } = useHarvest();
    const [selectedChat, setSelectedChat] = useState<string | null>(null);

    if (selectedChat) {
        return (
            <div className="h-[calc(100vh-80px)] flex flex-col bg-[#f4f5f7]">
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
        <div className="pb-24">
            <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200 p-4 shadow-sm">
                <h1 className="text-slate-800 text-lg font-bold">Messages</h1>
            </header>
            <main className="p-4 space-y-4">
                <div onClick={() => setSelectedChat('team')} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:bg-slate-50 cursor-pointer">
                    <div className="size-12 rounded-full bg-red-50 flex items-center justify-center text-[#d91e36]">
                        <span className="material-symbols-outlined">groups</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800">General Team</h3>
                        <p className="text-xs text-slate-500">Announcements & Broadcasts</p>
                    </div>
                </div>
                <h2 className="text-[#d91e36] text-sm font-bold uppercase mt-6">Direct Messages</h2>
                {crew.map(picker => (
                    <div key={picker.id} onClick={() => setSelectedChat(picker.id)} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 cursor-pointer">
                        <div className="size-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">
                            {picker.name.substring(0, 2)}
                        </div>
                        <span className="font-bold text-slate-800 text-sm">{picker.name}</span>
                    </div>
                ))}
            </main>
        </div>
    );
};

export default MessagingView;
