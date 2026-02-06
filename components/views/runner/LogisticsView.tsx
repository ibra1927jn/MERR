// components/views/runner/LogisticsView.tsx
import React from 'react';
import { useHarvest } from '../../../context/HarvestContext';

interface LogisticsViewProps {
    onScanRequest: () => void;
}

const LogisticsView: React.FC<LogisticsViewProps> = ({ onScanRequest }) => {
    const { bucketRecords } = useHarvest();

    // Filter only my scans (assuming bucketRecords has data, showing everything for now as per updated context or mock)
    // We display the last 5 for visual confirmation
    const myLastScans = bucketRecords?.slice(0, 5) || [];

    return (
        <div className="h-full flex flex-col p-4 space-y-4">
            {/* 1. Status Cards (High Visibility) */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800 p-5 rounded-2xl border-l-4 border-blue-500 shadow-lg">
                    <p className="text-slate-400 text-xs font-bold uppercase mb-1">Total Buckets</p>
                    <h2 className="text-4xl font-black text-white">{bucketRecords?.length || 0}</h2>
                </div>
                <div className="bg-slate-800 p-5 rounded-2xl border-l-4 border-green-500 shadow-lg">
                    <p className="text-slate-400 text-xs font-bold uppercase mb-1">Efficiency</p>
                    <h2 className="text-4xl font-black text-white">98<span className="text-lg text-slate-500">%</span></h2>
                </div>
            </div>

            {/* 2. Action Zone (The Big Button) */}
            <div className="flex-1 flex items-center justify-center py-4">
                <button
                    onClick={onScanRequest}
                    className="w-full h-full max-h-[300px] bg-gradient-to-br from-[#252525] to-[#1a1a1a] rounded-3xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center gap-4 active:border-[#d91e36] active:bg-[#d91e36]/10 transition-all group"
                >
                    <div className="w-24 h-24 rounded-full bg-[#d91e36] flex items-center justify-center shadow-lg shadow-red-900/40 group-active:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-white text-5xl">qr_code_2</span>
                    </div>
                    <span className="text-xl font-black text-slate-300 uppercase tracking-widest group-active:text-white">Tap to Scan</span>
                </button>
            </div>

            {/* 3. Recent Feed (Confirmation Log) */}
            <div className="bg-slate-800 rounded-2xl overflow-hidden flex-1 max-h-[30%]">
                <div className="bg-slate-700/50 px-4 py-2 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase">Recent Activity</span>
                    <span className="text-[10px] bg-slate-600 px-2 py-0.5 rounded text-white">Live</span>
                </div>
                <div className="overflow-y-auto h-full p-2 space-y-2 pb-10">
                    {myLastScans.map((scan: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-xl border border-white/5">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-green-500">check_circle</span>
                                <div>
                                    <p className="text-sm font-bold text-white">Bucket #{scan.bucket_id || 'ID'}</p>
                                    <p className="text-[10px] text-slate-400">Row {scan.row_number || '--'}</p>
                                </div>
                            </div>
                            <span className="text-xs font-mono text-slate-500">
                                {new Date(scan.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    ))}
                    {myLastScans.length === 0 && (
                        <p className="text-center text-slate-500 text-sm py-4">Ready to start scanning...</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LogisticsView;
