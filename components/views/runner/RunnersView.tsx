import React from 'react';
import { useHarvest } from '../../../context/HarvestContext';

const RunnersView = () => {
    const { crew, orchard } = useHarvest();

    // Filter? No, context is already filtered to Active Pickers!
    // But we might want to filter out Runners themselves if this view is "Runners watching Pickers"?
    // OR "List of Runners"?
    // The component name is `RunnersView`, usually implies "View for Runners" or "View OF Runners"?
    // User instruction: "Runner View Restriction: The Runner view should only display pickers who have checked in".
    // So this view likely shows the PICKERS that the Runner needs to serve.
    // Let's assume it lists the Pickers.

    const activePickers = crew;

    return (
        <div className="flex flex-col h-full bg-background-light">
            <header className="pt-8 pb-4 px-5 flex items-center justify-between z-20 bg-white/90 backdrop-blur-md sticky top-0 border-b border-gray-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]">
                <button className="size-10 flex items-center justify-center rounded-full bg-white border border-gray-100 shadow-sm text-slate-700 active:bg-gray-50 transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div className="text-center">
                    <h1 className="text-lg font-black text-slate-900 uppercase tracking-wide">Orchard Crew</h1>
                    <p className="text-[10px] text-primary font-bold tracking-widest uppercase">{orchard?.name || 'Live Ops'}</p>
                </div>
                <button className="size-10 flex items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-red-500/30 active:scale-95 transition-transform">
                    <span className="material-symbols-outlined">add</span>
                </button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 z-10 pb-20">
                <div className="flex items-center justify-between px-1 mb-2">
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">Active Pickers</h2>
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                        </span>
                        <span className="text-primary font-bold text-xs uppercase tracking-wider">{activePickers.length} Checked In</span>
                    </div>
                </div>

                {activePickers.map(picker => (
                    <div key={picker.id} className="bg-white p-5 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-gray-100 flex flex-col gap-4">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className="size-14 rounded-2xl bg-gray-100 flex items-center justify-center text-lg font-black text-gray-400 border border-gray-200 uppercase">
                                    {picker.avatar}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-xl leading-tight">{picker.name}</h3>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <span className="material-symbols-outlined text-sm text-primary filled">location_on</span>
                                        <span className="text-sm font-medium text-gray-600">Row {picker.current_row || '?'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <div className="size-3 rounded-full bg-green-500 shadow-[0_0_0_4px_rgba(34,197,94,0.15)]"></div>
                            </div>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Buckets</p>
                                <p className="text-sm font-semibold text-slate-800">{picker.total_buckets_today || 0}</p>
                            </div>
                            <span className="material-symbols-outlined text-gray-400">shopping_basket</span>
                        </div>
                    </div>
                ))}

                {activePickers.length === 0 && (
                    <div className="text-center py-10 opacity-50">
                        <p>No active pickers found.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RunnersView;
