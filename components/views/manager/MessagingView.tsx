import React, { useState } from 'react';
import BroadcastModal from '../../modals/BroadcastModal';
import { useHarvest } from '../../../context/HarvestContext';

const MessagingView = () => {
    const { broadcasts = [], sendBroadcast } = useHarvest();
    const [showBroadcast, setShowBroadcast] = useState(false);

    // Sort: Newest first
    const sortedBroadcasts = [...broadcasts].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return (
        <div className="flex flex-col gap-4 p-4 relative h-full">
            {showBroadcast && <BroadcastModal onClose={() => setShowBroadcast(false)} onSend={sendBroadcast} />}

            <div className="bg-gray-200 dark:bg-card-dark p-1 rounded-xl flex items-center text-sm font-medium">
                <button className="flex-1 py-2 rounded-lg bg-white dark:bg-primary text-gray-900 dark:text-white shadow-sm transition-all text-center">
                    Broadcasts
                </button>
                <button className="flex-1 py-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-all text-center">
                    Direct
                </button>
            </div>

            <section onClick={() => setShowBroadcast(true)} className="cursor-pointer active:scale-95 transition-transform">
                <div className="bg-gradient-to-r from-cherry-dark to-card-dark rounded-2xl p-0.5 shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl rounded-full -mr-10 -mt-10 group-hover:bg-primary/30 transition-all"></div>
                    <div className="bg-card-dark rounded-[14px] p-4 relative z-10">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shadow-lg shadow-red-900/50">
                                    <span className="material-symbols-outlined filled">campaign</span>
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white leading-none">New Broadcast</h3>
                                    <span className="text-xs text-primary font-medium">Tap to send alert</span>
                                </div>
                            </div>
                            <span className="material-symbols-outlined text-gray-500">add_circle</span>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                            <p className="text-sm text-gray-400 italic leading-snug">
                                Send a priority message to all team devices...
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="flex flex-col gap-2 flex-1 overflow-y-auto pb-20">
                <h2 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1 mt-2">
                    Recent Broadcasts ({sortedBroadcasts.length})
                </h2>

                {sortedBroadcasts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center opacity-60">
                        <span className="material-symbols-outlined text-4xl text-gray-400 mb-2">inbox</span>
                        <p className="text-sm text-gray-400 font-medium">No broadcasts sent yet.</p>
                        <button
                            onClick={() => setShowBroadcast(true)}
                            className="mt-4 px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm font-bold hover:bg-primary/20 transition-colors"
                        >
                            Send First Message
                        </button>
                    </div>
                ) : (
                    sortedBroadcasts.map((msg) => (
                        <div key={msg.id} className="bg-white dark:bg-card-dark active:scale-[0.99] transition-transform rounded-xl p-4 shadow-sm border border-gray-100 dark:border-white/5 relative">
                            <div className={`absolute top-0 left-0 bottom-0 w-1 rounded-l-xl ${msg.priority === 'urgent' ? 'bg-red-500' : msg.priority === 'high' ? 'bg-orange-500' : 'bg-blue-500'}`}></div>
                            <div className="flex justify-between items-baseline mb-1 pl-2">
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">{msg.title}</h3>
                                <span className="text-xs text-gray-400 font-medium whitespace-nowrap">
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 pl-2 leading-relaxed">
                                {msg.message}
                            </p>
                        </div>
                    ))
                )}
            </section>
        </div>
    );
};

export default MessagingView;
