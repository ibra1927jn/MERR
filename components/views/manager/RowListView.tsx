import React, { useMemo } from 'react';
import { Picker } from '../../../types';

interface RowListViewProps {
    runners: Picker[];
    setActiveTab: (tab: any) => void;
    onRowClick?: (rowNum: number) => void;
}

const RowListView: React.FC<RowListViewProps> = ({ runners, setActiveTab, onRowClick }) => {
    const rows = Array.from({ length: 20 }, (_, i) => i + 1);

    const runnersByRow = runners.reduce((acc, runner) => {
        const r = parseInt(runner.current_row?.toString() || '0');
        if (r > 0) {
            if (!acc[r]) acc[r] = [];
            acc[r].push(runner);
        }
        return acc;
    }, {} as Record<number, typeof runners>);

    const getBucketsForRow = (r: number) => {
        const rowRunners = runnersByRow[r] || [];
        if (rowRunners.length === 0) return 0;
        return rowRunners.reduce((sum, runner) => sum + (runner.total_buckets_today || 0), 0);
    };

    // Calculate ETA based on velocity
    const calculateETA = (buckets: number, velocity: number = 8): string => {
        if (velocity <= 0 || buckets === 0) return '--:--';
        const targetBuckets = 100; // Target per row
        const remaining = Math.max(0, targetBuckets - buckets);
        const minutes = Math.ceil((remaining / velocity) * 60);
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${String(mins).padStart(2, '0')}m`;
    };

    // Calculate progress percentage
    const getProgress = (buckets: number): number => {
        const target = 100;
        return Math.min(100, Math.round((buckets / target) * 100));
    };

    return (
        <div className="flex flex-col h-full bg-[#050505] relative min-h-screen">
            {/* System Header */}
            <div className="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-md p-4 border-b border-[#00f0ff]/20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#00f0ff]/10 border border-[#00f0ff]/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[#00f0ff]">view_list</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white leading-none font-mono-tech">ROW.CONTROL</h2>
                            <p className="text-[10px] text-[#00f0ff]/60 font-mono-tech mt-0.5">BLOCK_04 • 20 UNITS</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#00f0ff] blink-neon" />
                        <span className="font-mono-tech text-[10px] text-[#00f0ff]">LIVE</span>
                    </div>
                </div>

                {/* Column Headers */}
                <div className="mt-4 grid grid-cols-12 gap-2 text-[9px] font-mono-tech text-gray-500 uppercase px-2">
                    <div className="col-span-2">ID</div>
                    <div className="col-span-3">STATUS</div>
                    <div className="col-span-2 text-right">UNITS</div>
                    <div className="col-span-3 text-right">PROGRESS</div>
                    <div className="col-span-2 text-right">ETA</div>
                </div>
            </div>

            {/* Row List */}
            <div className="flex-1 overflow-y-auto p-4 pb-32 space-y-2">
                {rows.map(rowNum => {
                    const rowRunners = runnersByRow[rowNum] || [];
                    const hasActivity = rowRunners.length > 0;
                    const bucketCount = getBucketsForRow(rowNum);
                    const progress = getProgress(bucketCount);
                    const eta = calculateETA(bucketCount);

                    return (
                        <div
                            key={rowNum}
                            onClick={() => onRowClick && onRowClick(rowNum)}
                            className={`
                                rounded-lg border p-3 grid grid-cols-12 gap-2 items-center
                                cursor-pointer transition-all duration-200
                                ${hasActivity
                                    ? 'border-[#00f0ff]/30 bg-[#0a0a0a] hover:border-[#00f0ff]/60 hover:bg-[#0f0f0f]'
                                    : 'border-white/5 bg-[#050505] opacity-50 hover:opacity-70 hover:border-white/10'}
                            `}
                        >
                            {/* Row ID */}
                            <div className="col-span-2">
                                <span className={`
                                    font-mono-tech font-bold text-sm
                                    ${hasActivity ? 'text-[#00f0ff]' : 'text-gray-600'}
                                `}>
                                    R{String(rowNum).padStart(2, '0')}
                                </span>
                            </div>

                            {/* Status */}
                            <div className="col-span-3 flex items-center gap-2">
                                {hasActivity ? (
                                    <>
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 pulse-dot" />
                                        <span className="text-[10px] font-bold text-green-400 font-mono-tech">ACTIVE</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                                        <span className="text-[10px] text-gray-600 font-mono-tech">IDLE</span>
                                    </>
                                )}
                            </div>

                            {/* Unit Count */}
                            <div className="col-span-2 text-right">
                                <span className={`font-mono-tech font-bold ${hasActivity ? 'text-white' : 'text-gray-600'}`}>
                                    {bucketCount}
                                </span>
                            </div>

                            {/* Progress Bar */}
                            <div className="col-span-3">
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${progress >= 80 ? 'bg-green-500' :
                                                    progress >= 50 ? 'bg-[#00f0ff]' :
                                                        progress > 0 ? 'bg-amber-500' : 'bg-gray-700'
                                                }`}
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    <span className="font-mono-tech text-[10px] text-gray-500 w-8 text-right">
                                        {progress}%
                                    </span>
                                </div>
                            </div>

                            {/* ETA */}
                            <div className="col-span-2 text-right">
                                <span className={`font-mono-tech text-xs ${hasActivity ? 'text-gray-400' : 'text-gray-700'}`}>
                                    {eta}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer Stats */}
            <div className="fixed bottom-20 left-0 right-0 bg-[#050505]/95 backdrop-blur-md border-t border-[#00f0ff]/20 px-4 py-3">
                <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                        <span className="font-mono-tech text-[9px] text-gray-500 block">ACTIVE</span>
                        <span className="font-mono-tech text-lg text-[#00f0ff] font-bold">
                            {Object.keys(runnersByRow).length}
                        </span>
                    </div>
                    <div>
                        <span className="font-mono-tech text-[9px] text-gray-500 block">IDLE</span>
                        <span className="font-mono-tech text-lg text-gray-500 font-bold">
                            {20 - Object.keys(runnersByRow).length}
                        </span>
                    </div>
                    <div>
                        <span className="font-mono-tech text-[9px] text-gray-500 block">UNITS</span>
                        <span className="font-mono-tech text-lg text-white font-bold">
                            {rows.reduce((sum, r) => sum + getBucketsForRow(r), 0)}
                        </span>
                    </div>
                    <div>
                        <span className="font-mono-tech text-[9px] text-gray-500 block">PICKERS</span>
                        <span className="font-mono-tech text-lg text-white font-bold">
                            {runners.filter(r => r.current_row > 0).length}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RowListView;
