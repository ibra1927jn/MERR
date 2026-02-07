// components/views/runner/LogisticsView.tsx
import React from 'react';
import { useHarvest } from '../../../context/HarvestContext';

interface LogisticsViewProps {
    onScanRequest: () => void;
}

const LogisticsView: React.FC<LogisticsViewProps> = ({ onScanRequest }) => {
    const { bucketRecords, stats } = useHarvest();

    // Filtro simulado para mis registros
    const myScans = bucketRecords || [];

    return (
        <div className="p-4 space-y-6">
            {/* Tarjetas de Resumen (Stats) */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-[#1e1e1e] p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5">
                    <p className="text-slate-400 text-xs font-bold uppercase">My Buckets</p>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white">{myScans.length}</h3>
                </div>
                <div className="bg-white dark:bg-[#1e1e1e] p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5">
                    <p className="text-slate-400 text-xs font-bold uppercase">Orchard Velocity</p>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white">{stats.velocity} <span className="text-sm text-slate-500">/hr</span></h3>
                </div>
            </div>

            {/* Botón de Acción Principal (Estilo Tarjeta) */}
            <div
                onClick={onScanRequest}
                className="bg-gradient-to-r from-[#d91e36] to-orange-500 rounded-2xl p-6 shadow-lg shadow-orange-500/20 text-white flex items-center justify-between cursor-pointer active:scale-98 transition-transform"
            >
                <div>
                    <h3 className="text-lg font-black uppercase">Scan Bucket</h3>
                    <p className="text-white/80 text-xs font-medium">Tap here to open scanner</p>
                </div>
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">qr_code_scanner</span>
                </div>
            </div>

            {/* Lista de Registros (Lo que echabas de menos) */}
            <div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-3 px-1">Recent Activity</h3>
                <div className="space-y-3">
                    {myScans.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 text-sm">
                            No active scans yet. Start running! 🏃‍♂️
                        </div>
                    ) : (
                        myScans.slice(0, 20).map((scan: any, i: number) => (
                            <div key={i} className="bg-white dark:bg-[#1e1e1e] p-3 rounded-xl shadow-sm border border-slate-100 dark:border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center text-green-600 dark:text-green-400 font-bold text-xs">
                                        #{scan.bucket_id || i + 1}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{scan.picker_name || 'Unknown'}</p>
                                        <p className="text-[10px] text-slate-500 font-medium">Row {scan.row_number || '?'}</p>
                                    </div>
                                </div>
                                <span className="text-xs font-mono text-slate-400">
                                    {new Date(scan.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default LogisticsView;
