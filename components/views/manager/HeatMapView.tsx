/**
 * HeatMapView.tsx - Dynamic Row Grid Visualization
 * No static image - creates visual blocks based on total_rows from database
 * Color-coded by bucket density: green (low) → red (high)
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
    if (intensity === 0) return 'rgba(34, 197, 94, 0.3)'; // Light green (empty)
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
        <div className="w-full h-full bg-slate-900 rounded-2xl overflow-hidden relative">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-slate-900 to-transparent">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-white font-black text-lg">{blockName}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                            <span className="text-xs text-slate-400">Live • {bucketRecords.length} scans</span>
                        </div>
                    </div>
                    {/* Legend */}
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <span>Low</span>
                        <div className="flex gap-0.5">
                            <div className="w-3 h-3 rounded bg-green-500/60"></div>
                            <div className="w-3 h-3 rounded bg-yellow-500/70"></div>
                            <div className="w-3 h-3 rounded bg-orange-500/80"></div>
                            <div className="w-3 h-3 rounded bg-red-500/90"></div>
                        </div>
                        <span>High</span>
                    </div>
                </div>
            </div>

            {/* Dynamic Grid */}
            <div
                className="p-4 pt-20 pb-6 h-full overflow-y-auto"
                style={{ scrollbarWidth: 'none' }}
            >
                <div
                    className="grid gap-1.5"
                    style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
                >
                    {rowData.map((row) => (
                        <button
                            key={row.rowNumber}
                            onClick={() => handleRowClick(row.rowNumber)}
                            className={`
                                aspect-[3/1] rounded-lg flex flex-col items-center justify-center
                                transition-all duration-200 hover:scale-105 hover:ring-2
                                ${selectedRow === row.rowNumber
                                    ? 'ring-2 ring-white scale-105 z-10'
                                    : 'hover:ring-white/50'
                                }
                            `}
                            style={{
                                backgroundColor: row.color,
                                boxShadow: row.intensity > 0.5 ? `0 0 20px ${row.color}` : 'none'
                            }}
                        >
                            <span className="text-white font-black text-xs drop-shadow-md">
                                R{row.rowNumber}
                            </span>
                            {row.buckets > 0 && (
                                <span className="text-[8px] text-white/80 font-bold">
                                    {row.buckets} bkts
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Selected Row Tooltip */}
            {showTooltip && selectedRow && (
                <div className="absolute bottom-4 left-4 right-4 bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom duration-200 z-20">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div
                                className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-white"
                                style={{ backgroundColor: rowData[selectedRow - 1]?.color }}
                            >
                                R{selectedRow}
                            </div>
                            <div>
                                <h4 className="font-black text-slate-900 dark:text-white">Row {selectedRow}</h4>
                                <p className="text-xs text-slate-500">
                                    {rowData[selectedRow - 1]?.buckets || 0} buckets collected
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowTooltip(false)}
                            className="text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    {/* Workers in this row */}
                    {workersInSelectedRow.length > 0 ? (
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Team Working Here</p>
                            <div className="flex flex-wrap gap-2">
                                {workersInSelectedRow.map(w => (
                                    <div
                                        key={w.id}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-full"
                                    >
                                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                                            {w.name?.charAt(0) || '?'}
                                        </div>
                                        <span className="text-xs font-bold text-slate-700 dark:text-white">{w.name}</span>
                                        <span className="text-[10px] text-slate-400">{w.role}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs text-slate-400 italic">No active workers in this row</p>
                    )}
                </div>
            )}

            {/* Stats Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none">
                <div className="flex justify-between text-[10px] text-slate-400">
                    <span>{rows} rows total</span>
                    <span>{rowData.filter(r => r.buckets > 0).length} active rows</span>
                </div>
            </div>
        </div>
    );
};

export default HeatMapView;
