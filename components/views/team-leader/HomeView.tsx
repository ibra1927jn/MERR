import React from 'react';
import { useHarvest } from '../../../context/HarvestContext';

const HomeView = () => {
    const { stats, crew, orchard } = useHarvest();

    // Cálculos seguros con fallbacks
    const totalEarnings = (stats.totalBuckets * 6.50).toFixed(0);
    const tons = (stats.totalBuckets * 0.015).toFixed(1);

    // Ordenar y tomar Top 3
    const topPerformers = [...crew]
        .sort((a, b) => (b.total_buckets_today || 0) - (a.total_buckets_today || 0))
        .slice(0, 3);

    return (
        <div className="flex-1 flex flex-col w-full overflow-x-hidden">
            <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200 pb-3 pt-safe-top shadow-sm px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center size-10 rounded-full bg-white border border-[#d91e36]/20 text-[#d91e36] shadow-sm">
                            <span className="material-symbols-outlined text-[24px]">agriculture</span>
                        </div>
                        <div>
                            <h1 className="text-slate-800 text-lg font-bold leading-tight">HarvestPro NZ</h1>
                            <p className="text-xs text-slate-500 font-medium">Team Alpha • {orchard?.id || 'No Orchard'}</p>
                        </div>
                    </div>
                    <button className="size-10 flex items-center justify-center rounded-full text-slate-500 hover:bg-gray-100 relative">
                        <span className="material-symbols-outlined">notifications</span>
                    </button>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-white border border-slate-200 shadow-sm">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Buckets</span>
                        <span className="text-[#d91e36] text-xl font-bold font-mono tracking-tight">{stats.totalBuckets}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-white border border-slate-200 shadow-sm">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Pay Est.</span>
                        <span className="text-slate-800 text-xl font-bold font-mono tracking-tight">${totalEarnings}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-white border border-slate-200 shadow-sm">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Tons</span>
                        <span className="text-slate-800 text-xl font-bold font-mono tracking-tight">{tons}</span>
                    </div>
                </div>
            </header>

            <main className="p-4 pb-24">
                <section className="mt-2">
                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <h2 className="text-[#d91e36] text-lg font-bold">Performance Analytics</h2>
                            <p className="text-sm text-slate-500">Top Pickers vs Goal</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 bottom-0 left-[60%] border-l border-dashed border-gray-300 z-10 pointer-events-none">
                            <div className="absolute -top-1 left-1 text-[9px] font-bold text-gray-400 uppercase">Goal</div>
                        </div>
                        <div className="flex flex-col gap-5 relative z-0 mt-3">
                            {topPerformers.map(picker => {
                                const buckets = picker.total_buckets_today || 0;
                                const width = Math.min((buckets / 60) * 100, 100);
                                return (
                                    <div key={picker.id} className="grid grid-cols-[70px_1fr_40px] items-center gap-3">
                                        <div className="flex flex-col">
                                            <span className="text-slate-800 text-sm font-semibold truncate">{picker.name.split(' ')[0]}</span>
                                            <span className="text-[10px] text-slate-500">ID: {picker.picker_id}</span>
                                        </div>
                                        <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden relative">
                                            <div
                                                className="h-full bg-gradient-to-r from-[#ff1f3d] to-[#b3152b] rounded-full shadow-sm"
                                                style={{ width: `${width}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-right text-slate-800 font-mono text-sm font-bold">{buckets}</span>
                                    </div>
                                );
                            })}
                            {topPerformers.length === 0 && <p className="text-sm text-slate-400 text-center">No active pickers today</p>}
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default HomeView;
