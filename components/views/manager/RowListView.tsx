import React from 'react';
import { Picker } from '../../../types';

interface RowListViewProps {
    runners: Picker[];
    setActiveTab: (tab: any) => void;
    onRowClick?: (rowNum: number) => void;
}

const RowListView: React.FC<RowListViewProps> = ({ runners, setActiveTab, onRowClick }) => {
    // Generate active rows from runner data
    // In a real scenario, this would come from a "Rows" database table + live runner positions
    // For now, we derive it from runners who have a 'row' property assigned
    const rows = Array.from({ length: 20 }, (_, i) => i + 1);

    const runnersByRow = runners.reduce((acc, runner) => {
        const r = parseInt(runner.row?.toString() || '0');
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

    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] relative min-h-screen">
            {/* Map Header */}
            <div className="sticky top-0 z-50 bg-[#2b2b2b]/95 backdrop-blur-md p-4 border-b border-white/10 flex items-center justify-between shadow-xl">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-2 rounded-lg">
                        <span className="material-symbols-outlined text-white">list_alt</span>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white leading-none">Row Overview</h2>
                        <p className="text-xs text-gray-400">Block 4 • 20 Rows</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 pb-32">
                <div className="flex flex-col gap-3">
                    {rows.map(rowNum => {
                        const rowRunners = runnersByRow[rowNum] || [];
                        const hasActivity = rowRunners.length > 0;
                        const bucketCount = getBucketsForRow(rowNum);

                        // Calculate a "Status Color" based on activity
                        // Green = Active, Gray = Idle
                        const statusColor = hasActivity ? 'border-primary/50 bg-[#2a2a2a]' : 'border-white/5 bg-[#252525] opacity-60';

                        return (
                            <div
                                key={rowNum}
                                onClick={() => onRowClick && onRowClick(rowNum)}
                                className={`rounded - xl border p - 4 flex items - center justify - between transition - all cursor - pointer hover: border - primary / 50 ${statusColor} `}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w - 10 h - 10 rounded - lg flex items - center justify - center font - black text - lg ${hasActivity ? 'bg-primary text-white shadow-lg shadow-red-900/40' : 'bg-white/10 text-gray-500'} `}>
                                        {rowNum}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-white text-sm">Row {rowNum}</h3>
                                            {hasActivity && <span className="text-[10px] font-bold bg-green-500/20 text-green-500 px-1.5 py-0.5 rounded uppercase">Active</span>}
                                        </div>
                                        <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[12px]">group</span>
                                            {hasActivity ? `${rowRunners.length} Runners Assigned` : 'No runners assigned'}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    {/* Mini Progress Bar or Stats */}
                                    <div className="text-right">
                                        <span className={`block text - xl font - black ${hasActivity ? 'text-white' : 'text-gray-600'} `}>
                                            {bucketCount}
                                        </span>
                                        <span className="text-[9px] uppercase font-bold text-gray-500">Buckets</span>
                                    </div>
                                    <div className="hidden sm:flex">
                                        <div className="flex -space-x-2">
                                            {rowRunners.slice(0, 3).map((r, i) => (
                                                <div key={i} className="w-8 h-8 rounded-full bg-cover bg-center border-2 border-[#2a2a2a]" style={{ backgroundImage: `url('https://ui-avatars.com/api/?name=${r.name}&background=random')` }}></div>
                                            ))}
                                            {rowRunners.length > 3 && (
                                                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs text-white border-2 border-[#2a2a2a]">
                                                    +{rowRunners.length - 3}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default RowListView;
