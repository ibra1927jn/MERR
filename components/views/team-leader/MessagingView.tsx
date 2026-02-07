// components/views/team-leader/MessagingView.tsx
import React from 'react';

const MessagingView = () => {
    return (
        <div>
            <header className="sticky top-0 z-30 bg-surface-white/95 backdrop-blur-sm border-b border-border-light pb-3 pt-4 shadow-sm">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center size-10 rounded-full bg-white border border-primary-vibrant/20 text-primary-vibrant shadow-[0_2px_8px_rgba(217,30,54,0.15)]">
                            <span className="material-symbols-outlined text-[24px]">forum</span>
                        </div>
                        <div>
                            <h1 className="text-text-main text-lg font-bold leading-tight tracking-tight">Field Comms</h1>
                            <p className="text-xs text-text-sub font-medium">Team Alpha • Online</p>
                        </div>
                    </div>
                    <div className="size-8 rounded-full bg-primary-vibrant text-white flex items-center justify-center text-xs font-bold ring-2 ring-white shadow-md">
                        3
                    </div>
                </div>
                {/* Filter Pills */}
                <div className="px-4 mt-1 flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    <button className="px-4 py-1.5 rounded-full bg-text-main text-white text-xs font-bold shadow-sm whitespace-nowrap">
                        All Chats
                    </button>
                    <button className="px-4 py-1.5 rounded-full bg-white border border-border-light text-text-sub text-xs font-bold shadow-sm whitespace-nowrap">
                        Direct
                    </button>
                    <button className="px-4 py-1.5 rounded-full bg-white border border-border-light text-text-sub text-xs font-bold shadow-sm whitespace-nowrap flex items-center gap-1">
                        <span className="size-1.5 rounded-full bg-warning"></span> Alerts
                    </button>
                </div>
            </header>

            <main className="px-4 mt-4 pb-24">
                {/* Broadcast */}
                <section className="mb-6">
                    <div className="bg-gradient-to-r from-primary to-primary-vibrant rounded-xl p-0.5 shadow-glow">
                        <div className="bg-white/10 backdrop-blur-sm rounded-[10px] p-4 text-white relative overflow-hidden">
                            <div className="absolute -right-4 -top-4 text-white/10 rotate-12">
                                <span className="material-symbols-outlined text-[80px]">campaign</span>
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="bg-white text-primary-vibrant text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">Broadcast</span>
                                    <span className="text-[10px] font-medium text-white/80">10 mins ago</span>
                                </div>
                                <h2 className="text-lg font-bold leading-tight mb-1">Incoming Rain Storm</h2>
                                <p className="text-sm text-white/90 leading-snug">All teams stop harvesting. Cover bins in Block 4B immediately.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Messages List */}
                <section>
                    <h2 className="text-text-sub text-xs font-bold uppercase tracking-wider mb-3 px-1">Recent Messages</h2>
                    <div className="flex flex-col gap-1">
                        {/* Message Item */}
                        <div className="bg-white p-4 rounded-xl border-l-4 border-l-primary-vibrant border-y border-r border-border-light shadow-sm flex gap-4 active:bg-gray-50 transition-colors">
                            <div className="relative">
                                <div className="size-12 rounded-full bg-gray-200 flex items-center justify-center font-bold">LO</div>
                                <div className="absolute bottom-0 right-0 size-3 bg-green-500 border-2 border-white rounded-full"></div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-1">
                                    <h3 class="text-text-main font-bold text-sm">Liam O'Connor</h3>
                                    <span className="text-[10px] text-primary-vibrant font-bold">Just now</span>
                                </div>
                                <p className="text-sm text-text-main font-medium truncate">Hey boss, I need a harness replacement.</p>
                                <div className="mt-2 flex gap-2">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-50 text-primary-vibrant border border-red-100">
                                        Issue Report
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default MessagingView;
