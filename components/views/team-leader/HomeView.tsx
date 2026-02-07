// components/views/team-leader/HomeView.tsx
import React from 'react';

const HomeView = () => {
    return (
        <div className="pb-6">
            <header className="sticky top-0 z-30 bg-surface-white/95 backdrop-blur-sm border-b border-border-light pb-3 pt-4 shadow-sm">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center size-10 rounded-full bg-white border border-primary-vibrant/20 text-primary-vibrant shadow-[0_2px_8px_rgba(217,30,54,0.15)]">
                            <span className="material-symbols-outlined text-[24px]">agriculture</span>
                        </div>
                        <div>
                            <h1 className="text-text-main text-lg font-bold leading-tight tracking-tight">HarvestPro NZ</h1>
                            <p className="text-xs text-text-sub font-medium">Team Alpha • Block 4B</p>
                        </div>
                    </div>
                    <button className="size-10 flex items-center justify-center rounded-full text-text-sub hover:bg-gray-100 active:bg-gray-200 transition-colors relative">
                        <span className="material-symbols-outlined">notifications</span>
                        <span className="absolute top-2 right-2 size-2 bg-primary-vibrant rounded-full border border-white"></span>
                    </button>
                </div>
                <div className="grid grid-cols-3 gap-3 px-4 mt-1">
                    <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-white border border-border-light shadow-sm">
                        <span className="text-[10px] text-text-sub uppercase tracking-wider font-semibold">Buckets</span>
                        <span className="text-primary-vibrant text-xl font-bold font-mono tracking-tight">1,240</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-white border border-border-light shadow-sm">
                        <span className="text-[10px] text-text-sub uppercase tracking-wider font-semibold">Pay Est.</span>
                        <span className="text-text-main text-xl font-bold font-mono tracking-tight">$4.2k</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-white border border-border-light shadow-sm">
                        <span className="text-[10px] text-text-sub uppercase tracking-wider font-semibold">Tons</span>
                        <span className="text-text-main text-xl font-bold font-mono tracking-tight">8.5</span>
                    </div>
                </div>
            </header>

            <section className="mt-6 px-4">
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-primary text-lg font-bold flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary-vibrant">health_and_safety</span>
                        Breaks & Safety
                    </h2>
                    <span className="bg-red-50 text-primary-vibrant text-[10px] px-2 py-1 rounded-full font-bold border border-red-100 animate-pulse">1 Action Required</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-xl p-4 border border-border-light shadow-sm relative overflow-hidden group">
                        <div className="absolute right-2 top-2 p-1 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="material-symbols-outlined text-4xl text-black">timer</span>
                        </div>
                        <div className="relative z-10">
                            <span className="text-[10px] text-text-sub uppercase font-bold tracking-wide">Active Shift</span>
                            <div className="text-2xl font-mono font-bold text-text-main mt-1">3h 45m</div>
                            <div className="mt-2 text-[10px] text-text-sub flex items-center gap-1">
                                <span className="size-1.5 rounded-full bg-green-500"></span>
                                Next break in 15m
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-primary-vibrant/20 shadow-sm relative overflow-hidden bg-gradient-to-br from-white to-red-50">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] text-primary-vibrant uppercase font-bold tracking-wide">Hydration Alert</span>
                            <span className="material-symbols-outlined text-primary-vibrant text-base">warning</span>
                        </div>
                        <div className="mb-3">
                            <div className="text-sm font-bold text-text-main">Mike T.</div>
                            <div className="text-[10px] text-red-500 font-medium">Overdue by 10m</div>
                        </div>
                        <button className="w-full bg-primary-vibrant hover:bg-primary-dim text-white text-[10px] font-bold py-1.5 px-2 rounded transition-colors shadow-md shadow-red-200">
                            Log Break
                        </button>
                    </div>
                </div>
            </section>

            <section className="mt-8 px-4">
                {/* Aquí irían las tarjetas de My Crew del HTML */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-primary text-lg font-bold">My Crew</h2>
                    <button className="text-primary-vibrant text-sm font-medium hover:text-primary-dim transition-colors">View All</button>
                </div>
                {/* Ejemplo de un Picker Card */}
                <div className="flex flex-col gap-3">
                    <div className="group bg-white rounded-xl p-4 border border-border-light shadow-sm active:border-primary-vibrant/50 transition-all hover:bg-gray-50">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                                <div className="size-10 rounded-full bg-gray-100 flex items-center justify-center text-primary-vibrant font-bold border border-gray-200">LO</div>
                                <div>
                                    <h3 className="text-text-main font-bold text-base leading-tight">Liam O.</h3>
                                    <p className="text-xs text-text-sub">ID #402 • Row 12</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-primary-vibrant text-2xl font-bold font-mono leading-none">45</p>
                                <p className="text-[10px] text-text-sub uppercase font-medium">Buckets</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-border-light">
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-text-sub font-medium mr-1">QC Status</span>
                                <div className="size-2.5 rounded-full bg-primary-vibrant shadow-sm"></div>
                                <div className="size-2.5 rounded-full bg-primary-vibrant shadow-sm"></div>
                                <div className="size-2.5 rounded-full bg-warning"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default HomeView;
