/**
 * HeatMapView.tsx - Dynamic Row Grid Visualization
 * Professional Agricultural Grid View
 * Light Theme: White background, clean borders, high contrast text.
 */
import React, { useMemo, useState } from 'react';
import { Picker } from '../../../types';

interface HeatMapViewProps {
    bucketRecords: any[];
    crew: Picker[];
    blockName: string;
    rows?: number;
    onRowClick?: (rowNumber: number) => void;
}

// Color interpolation: green → yellow → orange → red based on intensity
const getHeatColor = (intensity: number): string => {
    if (intensity === 0) return 'rgba(34, 197, 94, 0.2)'; // Very light green (empty)
    if (intensity < 0.25) return 'rgba(34, 197, 94, 0.6)'; // Green
    if (intensity < 0.5) return 'rgba(234, 179, 8, 0.7)'; // Yellow
    if (intensity < 0.75) return 'rgba(249, 115, 22, 0.8)'; // Orange
    return 'rgba(239, 68, 68, 0.9)'; // Red (high density)
};

const HeatMapView: React.FC<HeatMapViewProps> = ({
    bucketRecords,
    crew,
    blockName,
    rows = 20,
    onRowClick
}) => {
    const [selectedRow, setSelectedRow] = useState<number | null>(null);
    const [showTooltip, setShowTooltip] = useState(false);

    // 1. Calculate Row Intensity from Bucket Records
    const rowData = useMemo(() => {
        const counts = new Array(rows).fill(0);

        bucketRecords.forEach(r => {
            const rowNum = r.row_number || (r.coords?.row) || 0;
            if (rowNum > 0 && rowNum <= rows) {
                counts[rowNum - 1]++;
            }
        });

        const max = Math.max(...counts, 1);

        return counts.map((count, idx) => ({
            rowNumber: idx + 1,
            buckets: count,
            intensity: count / max,
            color: getHeatColor(count / max)
        }));
    }, [bucketRecords, rows]);

    // 2. Find workers in selected row
    const workersInSelectedRow = useMemo(() => {
        if (!selectedRow) return [];
        return crew.filter(p => p.current_row === selectedRow);
    }, [selectedRow, crew]);

    // 3. Handle row click
    const handleRowClick = (rowNum: number) => {
        setSelectedRow(rowNum);
        setShowTooltip(true);
        onRowClick?.(rowNum);
    };

    // 4. Calculate grid layout (responsive)
    const columns = rows > 100 ? 10 : rows > 50 ? 8 : rows > 20 ? 5 : 4;

    return (
        <div className="w-full h-full bg-white dark:bg-slate-900 rounded-2xl overflow-hidden relative border border-slate-200 dark:border-slate-700 shadow-sm">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-slate-900 dark:text-white font-black text-lg">{blockName}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                            <span className="text-xs font-bold text-slate-500">Live • {bucketRecords.length} scans</span>
                        </div>
                    </div>
                    {/* Legend */}
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold">
                        <span>Low Activity</span>
                        <div className="flex gap-0.5">
                            <div className="w-4 h-4 rounded bg-green-500/20 border border-green-500/50"></div>
                            <div className="w-4 h-4 rounded bg-yellow-500/30 border border-yellow-500/50"></div>
                            <div className="w-4 h-4 rounded bg-orange-500/40 border border-orange-500/60"></div>
                            <div className="w-4 h-4 rounded bg-red-500/50 border border-red-500/70"></div>
                        </div>
                        <span>High Activity</span>
                    </div>
                </div>
            </div>

            {/* Dynamic Grid */}
            <div
                className="p-4 pt-24 pb-12 h-full overflow-y-auto"
                style={{ scrollbarWidth: 'none' }}
            >
                <div
                    className="grid gap-2"
                    style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
                >
                    {rowData.map((row) => (
                        <button
                            key={row.rowNumber}
                            onClick={() => handleRowClick(row.rowNumber)}
                            className={`
                                relative aspect-[4/1] rounded-md flex flex-col items-center justify-center
                                transition-all duration-200 border
                                ${selectedRow === row.rowNumber
                                    ? 'ring-2 ring-primary border-primary z-10 shadow-lg scale-105'
                                    : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md'
                                }
                            `}
                            style={{
                                backgroundColor: row.buckets > 0 ? row.color : 'rgba(241, 245, 249, 0.5)', // Slate-100 equivalent for empty
                                color: row.buckets > 0 ? (row.intensity > 0.5 ? 'white' : '#1e293b') : '#94a3b8'
                            }}
                        >
                            <span className={`font-bold text-xs ${row.buckets > 0 && row.intensity > 0.5 ? 'text-white drop-shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}>
                                R{row.rowNumber}
                            </span>
                            {row.buckets > 0 && (
                                <span className={`text-[9px] font-bold ${row.buckets > 0 && row.intensity > 0.5 ? 'text-white/90' : 'text-slate-500'}`}>
                                    {row.buckets}
                                </span>
                            )}

                            {/* Activity Bar Indicator for low counts */}
                            {row.buckets > 0 && (
                                <div
                                    className="absolute bottom-0 left-0 right-0 h-1 bg-current opacity-30"
                                    style={{ width: `${Math.min(row.intensity * 100, 100)}%` }}
                                ></div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Selected Row Tooltip */}
            {showTooltip && selectedRow && (
                <div className="absolute bottom-6 left-6 right-6 bg-white dark:bg-slate-800 rounded-xl p-0 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in slide-in-from-bottom duration-200 z-30 overflow-hidden">
                    <div className="bg-slate-50 dark:bg-slate-700/50 p-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-8 bg-primary rounded-full"></div>
                            <div>
                                <h4 className="font-black text-slate-900 dark:text-white text-sm">Row {selectedRow}</h4>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                                    {rowData[selectedRow - 1]?.buckets || 0} buckets • {workersInSelectedRow.length} workers
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowTooltip(false)}
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-400 transition-colors"
                        >
                            <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                    </div>

                    <div className="p-3">
                        {workersInSelectedRow.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {workersInSelectedRow.map(w => (
                                    <div
                                        key={w.id}
                                        className="flex items-center gap-2 pr-3 pl-1 py-1 bg-white border border-slate-100 dark:bg-slate-700 dark:border-slate-600 rounded-full shadow-sm"
                                    >
                                        <div className={`
                                            w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white
                                            ${w.role === 'team_leader' ? 'bg-purple-500' : 'bg-blue-500'}
                                        `}>
                                            {w.name?.charAt(0) || '?'}
                                        </div>
                                        <span className="text-xs font-bold text-slate-700 dark:text-white">{w.name}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center py-2 text-slate-400 gap-2">
                                <span className="material-symbols-outlined text-lg">person_off</span>
                                <span className="text-xs font-medium">No active workers in this row</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Stats Footer */}
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 text-[10px] font-bold text-slate-500">
                <span>TOTAL: {rows} ROWS</span>
                <span>ACTIVE: {rowData.filter(r => r.buckets > 0).length}</span>
            </div>
        </div>
    );
};

export default HeatMapView;
