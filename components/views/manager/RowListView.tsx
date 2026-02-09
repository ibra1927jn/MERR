import React from 'react';
import { Picker } from '../../../types';

interface RowListViewProps {
    runners: Picker[];
    setActiveTab: (tab: any) => void;
    onRowClick?: (rowNum: number) => void;
}

const RowListView: React.FC<RowListViewProps> = ({ runners, onRowClick }) => {
    // Generar filas 1-20
    const rows = Array.from({ length: 20 }, (_, i) => i + 1);

    // Agrupar runners por fila para cálculos rápidos
    const runnersByRow = runners.reduce((acc, runner) => {
        const r = parseInt(runner.current_row?.toString() || '0');
        if (r > 0) {
            if (!acc[r]) acc[r] = [];
            acc[r].push(runner);
        }
        return acc;
    }, {} as Record<number, typeof runners>);

    // Helpers de cálculo
    const getBucketsForRow = (r: number) => {
        const rowRunners = runnersByRow[r] || [];
        if (rowRunners.length === 0) return 0;
        return rowRunners.reduce((sum, runner) => sum + (runner.total_buckets_today || 0), 0);
    };

    const getProgress = (buckets: number) => Math.min(100, Math.round((buckets / 100) * 100)); // Target 100 por ejemplo

    const calculateETA = (buckets: number) => {
        if (buckets === 0) return '--:--';
        const remaining = Math.max(0, 100 - buckets);
        // Simulación: 8 cubos/hora por persona
        const velocity = 8;
        const minutes = Math.ceil((remaining / velocity) * 60);
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h}:${String(m).padStart(2, '0')}`;
    };

    // Estadísticas Generales
    const totalActivePickers = runners.filter(r => r.current_row > 0).length;
    const totalYield = rows.reduce((sum, r) => sum + getBucketsForRow(r), 0);
    const targetYield = 2000; // Ejemplo: 20 filas * 100 cubos
    const yieldPercentage = Math.min(100, (totalYield / targetYield) * 100);

    return (
        <div className="flex flex-col h-full bg-black text-slate-300 font-mono relative overflow-hidden">
            {/* Background Grid */}
            <div className="absolute inset-0 technical-grid z-0"></div>

            {/* HEADER */}
            <header className="z-50 px-4 pt-6 pb-4 flex flex-col gap-4 bg-black/90 backdrop-blur-sm border-b border-white/5 relative">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 border border-[#00f0ff]/30 bg-[#00f0ff]/5 rounded">
                            <span className="material-symbols-outlined text-[#00f0ff] text-xl">grid_view</span>
                        </div>
                        <div>
                            <h1 className="text-sm font-bold tracking-widest text-white uppercase flex items-center gap-2">
                                Advanced Row <span className="text-[#00f0ff]">Control</span>
                            </h1>
                            <p className="text-[9px] text-slate-500 uppercase tracking-tighter">Block_04 • 20 Units</p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                        <div className="text-[10px] text-[#00f0ff] flex items-center gap-1.5 px-2 py-0.5 border border-[#00f0ff]/20 rounded bg-[#00f0ff]/5">
                            <span className="w-1.5 h-1.5 bg-[#00f0ff] rounded-full animate-pulse shadow-[0_0_5px_#00f0ff]"></span>
                            LIVE
                        </div>
                        <p className="text-[8px] text-slate-600 mt-1 uppercase">Lat: -41.2865 | Lon 174.7762</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-900/40 p-2 border border-white/5 rounded-sm">
                        <div className="text-[8px] text-slate-500 uppercase">Active Pickers</div>
                        <div className="text-lg font-bold text-white leading-tight">{totalActivePickers}</div>
                    </div>
                    <div className="bg-slate-900/40 p-2 border border-white/5 rounded-sm">
                        <div className="text-[8px] text-slate-500 uppercase">Total Rows</div>
                        <div className="text-lg font-bold text-white leading-tight">20</div>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] uppercase tracking-wider">
                        <span className="text-slate-400">Total Yield Progress</span>
                        <span className="text-[#00f0ff]">{totalYield} / {targetYield} UNITS</span>
                    </div>
                    <div className="relative w-full h-1.5 bg-slate-900 border border-slate-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-[#00f0ff] relative z-10 shadow-[0_0_8px_rgba(0,240,255,0.4)] transition-all duration-700"
                            style={{ width: `${yieldPercentage}%` }}
                        ></div>
                    </div>
                </div>
            </header>

            {/* MAIN LIST */}
            <main className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-2 relative z-10 pb-24">
                {/* Column Headers */}
                <div className="grid grid-cols-12 px-3 text-[8px] text-slate-600 uppercase tracking-widest mb-1">
                    <div className="col-span-2">ID</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-6">Harvest Progress</div>
                    <div className="col-span-1 text-right">Units</div>
                    <div className="col-span-1 text-right">ETA</div>
                </div>

                {/* Rows Loop */}
                {rows.map(rowNum => {
                    const buckets = getBucketsForRow(rowNum);
                    const isActive = runnersByRow[rowNum]?.length > 0;
                    const progress = getProgress(buckets);
                    const rowId = `R${String(rowNum).padStart(2, '0')}`;

                    return (
                        <div
                            key={rowNum}
                            onClick={() => onRowClick && onRowClick(rowNum)}
                            className={`row-card p-3 rounded-sm grid grid-cols-12 items-center cursor-pointer ${!isActive ? 'opacity-60 hover:opacity-100' : ''}`}
                        >
                            <div className={`col-span-2 font-bold text-xs tracking-tighter ${isActive ? 'text-white' : 'text-slate-500'}`}>
                                {rowId}
                            </div>

                            <div className="col-span-2 flex items-center gap-1.5">
                                <div className={`status-dot ${isActive ? 'bg-[#00f0ff] shadow-[0_0_4px_#00f0ff]' : 'bg-slate-700'}`}></div>
                                <span className={`text-[9px] uppercase font-medium ${isActive ? 'text-[#00f0ff]' : 'text-slate-500'}`}>
                                    {isActive ? 'Active' : 'Idle'}
                                </span>
                            </div>

                            <div className="col-span-6 px-2">
                                <div className="w-full bg-slate-900/50 h-1 relative border border-slate-800/50 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 ${isActive ? 'bg-[#00f0ff] shadow-[0_0_5px_rgba(0,240,255,0.3)]' : 'bg-slate-800'}`}
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div className={`col-span-1 text-right text-[10px] font-mono ${isActive ? 'text-slate-400' : 'text-slate-600'}`}>
                                {buckets}
                            </div>

                            <div className={`col-span-1 text-right text-[10px] font-mono ${isActive ? 'text-slate-500' : 'text-slate-600'}`}>
                                {isActive ? calculateETA(buckets) : '--:--'}
                            </div>
                        </div>
                    );
                })}
            </main>
        </div>
    );
};

export default RowListView;
