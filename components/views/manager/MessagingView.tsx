import React from 'react';

const MessagingView = () => {
    return (
        <div className="flex flex-col gap-4 p-4">
            <div className="bg-gray-200 dark:bg-card-dark p-1 rounded-xl flex items-center text-sm font-medium">
                <button className="flex-1 py-2 rounded-lg bg-white dark:bg-primary text-gray-900 dark:text-white shadow-sm transition-all text-center">
                    Groups
                </button>
                <button className="flex-1 py-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-all text-center">
                    Direct
                </button>
            </div>
            <section>
                <div className="bg-gradient-to-r from-cherry-dark to-card-dark rounded-2xl p-0.5 shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl rounded-full -mr-10 -mt-10"></div>
                    <div className="bg-card-dark rounded-[14px] p-4 relative z-10">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shadow-lg shadow-red-900/50">
                                    <span className="material-symbols-outlined filled">campaign</span>
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white leading-none">Manager Broadcast</h3>
                                    <span className="text-xs text-primary font-medium">Official Channel • All Teams</span>
                                </div>
                            </div>
                            <span className="text-[10px] text-gray-400 font-medium bg-white/5 px-2 py-1 rounded-full">12m ago</span>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                            <p className="text-sm text-gray-200 leading-snug">
                                <span className="text-primary font-bold">@All</span> Weather alert: Heavy rain expected at 15:00. Please ensure all picked buckets are covered and runners are prioritized for Block 4.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="flex flex-col gap-2">
                <h2 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1 mt-2">Active Conversations</h2>
                {/* Static placeholders for visual fidelity */}
                <div className="bg-white dark:bg-card-dark active:scale-[0.98] transition-transform rounded-xl p-4 shadow-sm border border-gray-100 dark:border-white/5 flex gap-4 relative">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-lg font-bold text-white border-2 border-transparent group-hover:border-primary transition-colors">
                            TA
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 bg-green-500 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-card-dark"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">Team Alpha</h3>
                            <span className="text-xs text-gray-400 font-medium whitespace-nowrap">2m ago</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                            <span className="material-symbols-outlined text-[16px] text-primary">image</span>
                            <span className="text-xs truncate font-medium dark:text-gray-300">Sarah: Found split fruit in Row 12...</span>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default MessagingView;
