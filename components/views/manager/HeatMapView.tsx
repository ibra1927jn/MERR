/**
 * HeatMapView.tsx - Fullscreen Row Grid Visualization
 * Optimized for Phase 2 Command Center
 * High contrast for sunlight visibility, no internal tooltip
 */
import React, { useMemo } from 'react';
import { Picker } from '../../../types';

interface HeatMapViewProps {
    bucketRecords: any[];
    crew: Picker[];
    blockName: string;
    rows?: number;
    onRowClick?: (rowNumber: number) => void;
}

// High contrast color scale for sunlight visibility
const getHeatColor = (intensity: number): string => {
    if (intensity === 0) return '#f1f5f9'; // Slate-100 (Empty)
    if (intensity < 0.25) return '#10b981'; // Emerald-500
    if (intensity < 0.5) return '#fbbf24'; // Amber-400
    if (intensity < 0.75) return '#f97316'; // Orange-500
    return '#dc2626'; // Red-600
};

const HeatMapView: React.FC<HeatMapViewProps> = ({
    bucketRecords,
    crew,
    blockName,
    rows = 20,
    onRowClick
}) => {
    // Calculate Row Intensity from Bucket Records
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
            color: getHeatColor(count / max),
            hasWorkers: crew.some(p => p.current_row === idx + 1)
        }));
    }, [bucketRecords, rows, crew]);

    // Responsive grid columns
    const columns = rows > 100 ? 10 : rows > 50 ? 8 : rows > 20 ? 5 : 4;

    // Total active rows
    const activeRows = rowData.filter(r => r.buckets > 0).length;

    return (
        <div className="w-full h-full bg-white flex flex-col overflow-hidden">
            {/* Compact Header */}
            <div className="shrink-0 px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm font-bold text-slate-700">
                        {activeRows}/{rows} filas activas
                    </span>
                </div>
                {/* Legend */}
                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-emerald-500" />
                        <span>Bajo</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-amber-400" />
                        <span>Med</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-red-600" />
                        <span>Alto</span>
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 p-4 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                <div
                    className="grid gap-2"
                    style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
                >
                    {rowData.map((row) => (
                        <button
                            key={row.rowNumber}
                            onClick={() => onRowClick?.(row.rowNumber)}
                            className={`
                                relative aspect-[3/1] rounded-lg flex flex-col items-center justify-center
                                transition-all duration-150 border-2 font-bold
                                active:scale-95 select-none
                                ${row.hasWorkers ? 'ring-2 ring-blue-400 ring-offset-1' : ''}
                            `}
                            style={{
                                backgroundColor: row.color,
                                borderColor: row.buckets > 0 ? 'transparent' : '#e2e8f0',
                                color: row.intensity > 0.3 ? 'white' : '#475569'
                            }}
                        >
                            <span className="text-sm font-black">
                                F{row.rowNumber}
                            </span>
                            {row.buckets > 0 && (
                                <span className="text-[10px] font-bold opacity-90">
                                    {row.buckets}
                                </span>
                            )}
                            {row.hasWorkers && (
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border border-white" />
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default HeatMapView;

