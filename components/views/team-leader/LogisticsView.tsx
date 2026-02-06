import React from 'react';
import HeatMapView from '../../manager/HeatMapView'; // Reuse Manager's component
import { Picker } from '../../../types';

interface LogisticsViewProps {
    crew: Picker[];
}

const LogisticsView: React.FC<LogisticsViewProps> = ({ crew }) => {
    return (
        <div className="flex-1 flex flex-col w-full pb-32">
            <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200 p-4 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center size-10 rounded-full bg-white border border-[#d91e36]/20 text-[#d91e36] shadow-sm">
                        <span className="material-symbols-outlined text-[24px]">grid_view</span>
                    </div>
                    <div>
                        <h1 className="text-slate-800 text-lg font-bold leading-tight">Row Logistics</h1>
                        <p className="text-xs text-slate-500 font-medium">Block 5B • Gala Apples</p>
                    </div>
                </div>
            </header>

            <main className="p-4 space-y-6">
                {/* Visual Map Integration */}
                <section>
                    <div className="flex justify-between items-end mb-4">
                        <h2 className="text-[#d91e36] text-lg font-bold">Orchard Map</h2>
                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">Live Tracking</span>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-1">
                        <div className="rounded-xl overflow-hidden border border-slate-100">
                            <HeatMapView
                                bucketRecords={[]}
                                crew={crew}
                                rows={20}
                            />
                        </div>
                    </div>
                </section>

                <section>
                    <h2 className="text-[#d91e36] text-lg font-bold mb-4">Picker Targets</h2>
                    <div className="bg-gradient-to-br from-[#d91e36] to-[#b3152b] rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
                        <div className="flex justify-between items-start relative z-10">
                            <div>
                                <div className="flex items-center gap-1 text-white/80 text-xs font-medium uppercase tracking-wider mb-1">
                                    Min Wage Guarantee
                                </div>
                                <div className="text-2xl font-bold">$23.15<span className="text-sm font-normal text-white/70"> / hr</span></div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-white/80 font-medium uppercase tracking-wider mb-1">Piece Rate</div>
                                <div className="text-lg font-bold">$6.50<span className="text-sm font-normal text-white/70"> / bkt</span></div>
                            </div>
                        </div>
                    </div>
                </section>

                <section>
                    <div className="flex justify-between items-end mb-4">
                        <h2 className="text-[#d91e36] text-lg font-bold">Row Assignments</h2>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <span className="text-sm font-bold text-slate-800">Rows 12 - 18</span>
                            <button className="text-xs text-[#ff1f3d] font-semibold">Edit Range</button>
                        </div>
                        <div className="p-4 border-b border-slate-100">
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="size-6 bg-[#d91e36] text-white rounded flex items-center justify-center text-xs font-bold">12</span>
                                    <span className="text-sm font-semibold text-slate-800">South Side</span>
                                </div>
                                <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Active</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '80%' }}></div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default LogisticsView;
