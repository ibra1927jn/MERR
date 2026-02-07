// components/views/runner/MessagingView.tsx
import React from 'react';

const MessagingView = () => {
    return (
        <div className="flex flex-col h-full bg-[#f4f5f7]">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200 pb-3 pt-3 shadow-sm px-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center size-10 rounded-full bg-white border border-primary/20 text-primary shadow-[0_2px_8px_rgba(217,30,54,0.15)]">
                            <span className="material-symbols-outlined text-[24px]">forum</span>
                        </div>
                        <div>
                            <h1 className="text-gray-900 text-lg font-bold leading-tight tracking-tight">Field Comms</h1>
                            <p className="text-xs text-gray-500 font-medium">Team Alpha • Online</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="size-10 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition-colors">
                            <span className="material-symbols-outlined">search</span>
                        </button>
                        <div className="size-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold ring-2 ring-white shadow-md">
                            3
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    <button className="px-4 py-1.5 rounded-full bg-gray-900 text-white text-xs font-bold shadow-sm whitespace-nowrap">
                        All Chats
                    </button>
                    <button className="px-4 py-1.5 rounded-full bg-white border border-gray-200 text-gray-500 text-xs font-bold shadow-sm whitespace-nowrap">
                        Direct
                    </button>
                    <button className="px-4 py-1.5 rounded-full bg-white border border-gray-200 text-gray-500 text-xs font-bold shadow-sm whitespace-nowrap">
                        Groups
                    </button>
                    <button className="px-4 py-1.5 rounded-full bg-white border border-gray-200 text-gray-500 text-xs font-bold shadow-sm whitespace-nowrap flex items-center gap-1">
                        <span className="size-1.5 rounded-full bg-orange-400"></span> Alerts
                    </button>
                </div>
            </header>

            <main className="flex-1 w-full pb-32 overflow-x-hidden overflow-y-auto">
                <section className="mt-4 px-4">
                    <div className="bg-gradient-to-r from-primary to-[#ff1f3d] rounded-xl p-0.5 shadow-glow">
                        <div className="bg-white/10 backdrop-blur-sm rounded-[10px] p-4 text-white relative overflow-hidden">
                            <div className="absolute -right-4 -top-4 text-white/10 rotate-12">
                                <span className="material-symbols-outlined text-[80px]">campaign</span>
                            </div>

                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="bg-white text-primary text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">Broadcast</span>
                                    <span className="text-[10px] font-medium text-white/80">10 mins ago</span>
                                </div>
                                <h2 className="text-lg font-bold leading-tight mb-1">Incoming Rain Storm</h2>
                                <p className="text-sm text-white/90 leading-snug">All teams stop harvesting. Cover bins in Block 4B immediately and return to shed.</p>

                                <div className="mt-3 flex items-center gap-2">
                                    <div className="flex -space-x-2">
                                        <div className="size-6 rounded-full bg-green-500 border-2 border-[#b3152b] flex items-center justify-center text-[10px] text-white">✓</div>
                                        <div className="size-6 rounded-full bg-green-500 border-2 border-[#b3152b] flex items-center justify-center text-[10px] text-white">✓</div>
                                        <div className="size-6 rounded-full bg-green-500 border-2 border-[#b3152b] flex items-center justify-center text-[10px] text-white">✓</div>
                                    </div>
                                    <span className="text-[10px] font-medium text-white/80">12/14 Read</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mt-6 px-4">
                    <h2 class="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3 px-1">Pinned Channels</h2>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-28 active:scale-[0.98] transition-transform">
                            <div className="flex justify-between items-start">
                                <div className="size-8 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[20px]">local_shipping</span>
                                </div>
                                <span className="bg-primary text-white text-[10px] font-bold px-1.5 rounded-full">2</span>
                            </div>
                            <div>
                                <div className="text-sm font-bold text-gray-900">Logistics Alpha</div>
                                <div className="text-[10px] text-gray-500 truncate">Driver: Arriving at Row 12...</div>
                            </div>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-28 active:scale-[0.98] transition-transform">
                            <div className="flex justify-between items-start">
                                <div className="size-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[20px]">manage_accounts</span>
                                </div>
                            </div>
                            <div>
                                <div className="text-sm font-bold text-gray-900">Manager Channel</div>
                                <div className="text-[10px] text-gray-500 truncate">Dave: Quota updated.</div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mt-6 px-4">
                    <h2 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3 px-1">Recent Messages</h2>
                    <div className="flex flex-col gap-1">

                        <div className="bg-white p-4 rounded-xl border-l-4 border-l-primary border-y border-r border-gray-200 shadow-sm flex gap-4 active:bg-gray-50 transition-colors">
                            <div className="relative">
                                <img src="https://ui-avatars.com/api/?name=Liam+O&background=random" className="size-12 rounded-full object-cover border border-gray-100" alt="Liam" />
                                <div className="absolute bottom-0 right-0 size-3 bg-green-500 border-2 border-white rounded-full"></div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-1">
                                    <h3 className="text-gray-900 font-bold text-sm">Liam O'Connor</h3>
                                    <span className="text-[10px] text-primary font-bold">Just now</span>
                                </div>
                                <p className="text-sm text-gray-900 font-medium truncate">Hey boss, I need a harness replacement.</p>
                                <div className="mt-2 flex gap-2">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-50 text-primary border border-red-100">
                                        Issue Report
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex gap-4 active:bg-gray-50 transition-colors">
                            <div className="relative">
                                <img src="https://ui-avatars.com/api/?name=Sarah+J&background=random" className="size-12 rounded-full object-cover border border-gray-100" alt="Sarah" />
                                <div className="absolute bottom-0 right-0 size-3 bg-gray-300 border-2 border-white rounded-full"></div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-1">
                                    <h3 className="text-gray-900 font-bold text-sm">Sarah Jenkins</h3>
                                    <span className="text-[10px] text-gray-500">15m ago</span>
                                </div>
                                <p className="text-sm text-gray-500 truncate">Finished Row 12. Moving to 13 now.</p>
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex gap-4 active:bg-gray-50 transition-colors">
                            <div className="relative">
                                <div className="size-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold border border-gray-200">
                                    MT
                                </div>
                                <div className="absolute bottom-0 right-0 size-3 bg-green-500 border-2 border-white rounded-full"></div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-1">
                                    <h3 className="text-gray-900 font-bold text-sm">Mike Thompson</h3>
                                    <span className="text-[10px] text-gray-500">1h ago</span>
                                </div>
                                <p className="text-sm text-gray-500 truncate">Can I take my break early?</p>
                            </div>
                        </div>

                    </div>
                </section>
            </main>

            <div className="fixed bottom-24 right-4 z-40">
                <button className="size-14 rounded-full bg-primary text-white shadow-[0_4px_14px_rgba(236,19,37,0.4)] flex items-center justify-center hover:bg-primary-dark transition-transform active:scale-95">
                    <span className="material-symbols-outlined text-[28px]">edit_square</span>
                </button>
            </div>
        </div>
    );
};

export default MessagingView;
