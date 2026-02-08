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

// Color interpolation: Emerald (Low) -> Yellow -> Red (High)
const getHeatColor = (intensity: number): string => {
    if (intensity === 0) return 'rgba(241, 245, 249, 1)'; // Slate-100 (Empty)
    if (intensity < 0.2) return '#10b981'; // Emerald-500
    if (intensity < 0.4) return '#34d399'; // Emerald-400
    if (intensity < 0.6) return '#fbbf24'; // Amber-400
    if (intensity < 0.8) return '#f97316'; // Orange-500
    return '#dc2626'; // Red-600
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
        <div className="w-full h-full bg-slate-50 border border-slate-200 rounded-xl overflow-hidden relative shadow-sm">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-white/95 backdrop-blur-sm border-b border-slate-200 flex items-center justify-between">
                <div>
                    <h3 className="text-slate-800 font-bold text-lg">{blockName}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-xs font-semibold text-slate-500">Live • {bucketRecords.length} scans</span>
                    </div>
                </div>
                {/* Legend */}
                <div className="flex items-center gap-3 text-[10px] text-slate-500 font-medium">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-emerald-500"></div>
                        <span>Low</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-amber-400"></div>
                        <span>Med</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-red-600"></div>
                        <span>High</span>
                    </div>
                </div>
            </div>

            {/* Dynamic Grid */}
            <div
                className="p-4 pt-20 pb-12 h-full overflow-y-auto"
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
                                relative aspect-[4/1] rounded flex flex-col items-center justify-center
                                transition-all duration-200 border
                                ${selectedRow === row.rowNumber
                                    ? 'ring-2 ring-emerald-500 border-emerald-500 z-10 shadow-md transform scale-[1.02]'
                                    : 'border-slate-200 hover:border-emerald-300 hover:shadow-sm'
                                }
                            `}
                            style={{
                                backgroundColor: row.buckets > 0 ? row.color : '#f1f5f9',
                                color: row.buckets > 0 ? (row.intensity > 0.4 ? 'white' : '#1e293b') : '#cbd5e1'
                            }}
                        >
                            <span className="font-bold text-xs">
                                R{row.rowNumber}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Selected Row Tooltip */}
            {showTooltip && selectedRow && (
                <div className="absolute bottom-6 left-6 right-6 bg-white rounded-xl p-4 shadow-xl border border-slate-200 animate-in slide-in-from-bottom duration-200 z-30">
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <h4 className="font-bold text-slate-900 text-lg">
                                Fila {selectedRow}: <span className="text-emerald-600">{rowData[selectedRow - 1]?.buckets || 0} cubos</span>
                            </h4>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                                Equipo: {workersInSelectedRow.length > 0 ? workersInSelectedRow.map(w => w.name.split(' ')[0]).join(', ') : 'Sin asignar'}
                            </p>
                        </div>
                        <button
                            onClick={() => setShowTooltip(false)}
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    {workersInSelectedRow.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                            {workersInSelectedRow.map(w => (
                                <span key={w.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700">
                                    <span className={`w-2 h-2 rounded-full ${w.role === 'team_leader' ? 'bg-purple-500' : 'bg-emerald-500'}`}></span>
                                    {w.name}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Stats Footer */}
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-slate-50 border-t border-slate-200 flex items-center justify-between px-4 text-[10px] font-bold text-slate-500">
                <span>TOTAL: {rows} FILAS</span>
                <span>ACTIVO: {rowData.filter(r => r.buckets > 0).length} FILAS</span>
            </div>
        </div>
    );
};

export default HeatMapView;
