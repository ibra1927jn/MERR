// components/views/runner/MessagingView.tsx
import React from 'react';

const MessagingView = () => {
    return (
        <div className="flex flex-col h-full bg-background-light">
            <header className="flex-none bg-white shadow-sm z-30">
                <div className="flex items-center px-4 py-3 justify-between">
                    <h2 className="text-[#1b0d0f] text-xl font-bold leading-tight tracking-[-0.015em] flex-1">Messaging Hub</h2>
                    <div className="flex items-center justify-end gap-3">
                        <button className="flex items-center justify-center rounded-full size-10 bg-cherry-light text-primary relative">
                            <span className="material-symbols-outlined">notifications</span>
                            <span className="absolute top-2.5 right-2.5 size-2 bg-primary rounded-full border-2 border-white"></span>
                        </button>
                        <div className="size-10 rounded-full bg-gray-200 overflow-hidden border border-gray-100">
                            <img src={`https://ui-avatars.com/api/?name=Runner&background=random`} alt="Avatar" className="w-full h-full object-cover" />
                        </div>
                    </div>
                </div>
                {/* Broadcast Banner */}
                <div className="bg-primary text-white px-4 py-3 flex items-start gap-3 shadow-md relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 text-white/10">
                        <span className="material-symbols-outlined" style={{ fontSize: "80px" }}>campaign</span>
                    </div>
                    <span className="material-symbols-outlined flex-none mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                    <div className="relative z-10">
                        <p className="text-[10px] font-bold uppercase opacity-90 mb-0.5 tracking-wider">Manager Broadcast</p>
                        <p className="text-sm font-semibold leading-tight">Harvest paused for Block 4 due to incoming rain. Cover bins immediately.</p>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto bg-background-light pb-24 relative">
                {/* Toggle */}
                <div className="sticky top-0 z-20 bg-background-light pt-4 px-4 pb-2 backdrop-blur-xl bg-opacity-95">
                    <div className="flex p-1 bg-gray-200 rounded-lg">
                        <button className="flex-1 py-2 px-4 rounded-md bg-white shadow-sm text-sm font-bold text-primary transition-all">
                            Groups
                        </button>
                        <button className="flex-1 py-2 px-4 rounded-md text-sm font-medium text-gray-500 hover:text-gray-700 transition-all">
                            Direct Messages
                        </button>
                    </div>
                </div>

                {/* Messages List */}
                <div className="px-4 space-y-3 mt-2">
                    <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-primary active:scale-[0.99] transition-transform">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>groups</span>
                                <h3 className="font-bold text-[#1b0d0f]">Logistics Team</h3>
                            </div>
                            <span className="text-[10px] font-medium text-gray-400">Just now</span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">
                            <span className="font-bold text-[#1b0d0f]">Sarah:</span> Truck #4 is arriving at the North Gate. We need 3 loaders ready.
                        </p>
                        <div className="flex items-center gap-2 mt-3">
                            <span className="bg-cherry-light text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">3 New</span>
                            <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded-full">High Priority</span>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 active:scale-[0.99] transition-transform">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-gray-400">group_work</span>
                                <h3 className="font-bold text-[#1b0d0f]">Block 1 Teams</h3>
                            </div>
                            <span className="text-[10px] font-medium text-gray-400">12m ago</span>
                        </div>
                        <p className="text-sm text-gray-500 line-clamp-1">
                            <span className="font-medium text-[#1b0d0f]">Mike:</span> Finished row 12. Moving to 13.
                        </p>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="p-4 mt-2">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">Quick Actions</h3>
                    <button className="w-full flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100 group active:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-full bg-cherry-light flex items-center justify-center text-primary">
                                <span className="material-symbols-outlined">add_a_photo</span>
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-[#1b0d0f]">Quick Photo Report</p>
                                <p className="text-xs text-gray-500">Attach bin location or damage</p>
                            </div>
                        </div>
                        <span className="material-symbols-outlined text-gray-300 group-active:translate-x-1 transition-transform">chevron_right</span>
                    </button>
                </div>
            </main>
        </div>
    );
};

export default MessagingView;
