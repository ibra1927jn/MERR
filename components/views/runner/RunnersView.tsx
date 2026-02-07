// components/views/runner/RunnersView.tsx
import React from 'react';

const RunnersView = () => {
    return (
        <div className="flex flex-col h-full bg-background-light">
            <header className="pt-8 pb-4 px-5 flex items-center justify-between z-20 bg-white/90 backdrop-blur-md sticky top-0 border-b border-gray-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]">
                <button className="size-10 flex items-center justify-center rounded-full bg-white border border-gray-100 shadow-sm text-slate-700 active:bg-gray-50 transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div className="text-center">
                    <h1 className="text-lg font-black text-slate-900 uppercase tracking-wide">Orchard Runners</h1>
                    <p className="text-[10px] text-primary font-bold tracking-widest uppercase">Team Coordination</p>
                </div>
                <button className="size-10 flex items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-red-500/30 active:scale-95 transition-transform">
                    <span className="material-symbols-outlined">add</span>
                </button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 z-10 pb-20">
                <div className="flex items-center justify-between px-1 mb-2">
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">Logistics Team</h2>
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                        </span>
                        <span className="text-primary font-bold text-xs uppercase tracking-wider">4 Active</span>
                    </div>
                </div>

                {/* Runner Card 1 */}
                <div className="bg-white p-5 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-gray-100 flex flex-col gap-4">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="size-14 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 border border-gray-200">
                                <span className="material-symbols-outlined text-3xl">person</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 text-xl leading-tight">Liam O'Connor</h3>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <span className="material-symbols-outlined text-sm text-primary filled">location_on</span>
                                    <span className="text-sm font-medium text-gray-600">Row 04 <span className="text-gray-300 mx-1">|</span> Block B</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <div className="size-3 rounded-full bg-green-500 shadow-[0_0_0_4px_rgba(34,197,94,0.15)]"></div>
                        </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Current Task</p>
                            <p className="text-sm font-semibold text-slate-800">Transporting Bin #4092</p>
                        </div>
                        <span className="material-symbols-outlined text-gray-400">local_shipping</span>
                    </div>
                    <button className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-primary text-white font-bold text-sm shadow-md shadow-red-500/20 active:bg-primary-dark transition-colors">
                        <span>View Tasks</span>
                        <span className="material-symbols-outlined text-lg">arrow_forward</span>
                    </button>
                </div>

                {/* Runner Card 2 */}
                <div className="bg-white p-5 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-gray-100 flex flex-col gap-4">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="size-14 rounded-2xl bg-cherry-light border border-red-100 flex items-center justify-center text-primary">
                                <span className="font-bold text-xl">SJ</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 text-xl leading-tight">Sarah Jenkins</h3>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <span className="material-symbols-outlined text-sm text-primary">location_on</span>
                                    <span className="text-sm font-medium text-gray-600">Row 08 <span className="text-gray-300 mx-1">|</span> Block B</span>
                                </div>
                            </div>
                        </div>
                        <div className="size-3 rounded-full bg-green-500 shadow-[0_0_0_4px_rgba(34,197,94,0.15)]"></div>
                    </div>
                    <button className="w-full h-12 flex items-center justify-center gap-2 rounded-xl border-2 border-primary/10 text-primary font-bold text-sm bg-white hover:bg-cherry-light active:border-primary transition-colors">
                        <span>View Tasks</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RunnersView;
