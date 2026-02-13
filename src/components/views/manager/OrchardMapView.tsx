/**
 * OrchardMapView — Interactive SVG-based row map
 *
 * Visual grid where each row is a colored rectangle:
 *   gray (0%) → amber (50%) → emerald (100%)
 * Shows picker dots on active rows. Click row → tooltip.
 */
import React, { useMemo, useState } from 'react';
import { Picker, BucketRecord } from '@/types';

interface OrchardMapViewProps {
    totalRows: number;
    crew: Picker[];
    bucketRecords: BucketRecord[];
    blockName?: string;
    targetBucketsPerRow?: number;
}

interface RowData {
    rowNum: number;
    buckets: number;
    pickers: Picker[];
    progress: number; // 0-1
}

/**
 * Interpolate color from gray → amber → emerald based on progress (0-1)
 */
function getRowColor(progress: number): string {
    if (progress <= 0) return '#e5e7eb'; // gray-200
    if (progress < 0.25) return '#fde68a'; // amber-200
    if (progress < 0.5) return '#fbbf24';  // amber-400
    if (progress < 0.75) return '#34d399'; // emerald-400
    return '#10b981'; // emerald-500
}

function getTextColor(progress: number): string {
    return progress > 0.5 ? '#ffffff' : '#374151';
}

export default function OrchardMapView({
    totalRows,
    crew,
    bucketRecords,
    blockName = 'Block A',
    targetBucketsPerRow = 50,
}: OrchardMapViewProps) {
    const [hoveredRow, setHoveredRow] = useState<number | null>(null);
    const [selectedRow, setSelectedRow] = useState<number | null>(null);

    // Compute row data
    const rowData: RowData[] = useMemo(() => {
        const bucketsByRow: Record<number, number> = {};
        bucketRecords.forEach(br => {
            const row = br.row_number || 0;
            if (row > 0) {
                bucketsByRow[row] = (bucketsByRow[row] || 0) + 1;
            }
        });

        return Array.from({ length: totalRows }, (_, i) => {
            const rowNum = i + 1;
            const buckets = bucketsByRow[rowNum] || 0;
            const pickers = crew.filter(p => p.current_row === rowNum && p.status === 'active');
            return {
                rowNum,
                buckets,
                pickers,
                progress: Math.min(buckets / targetBucketsPerRow, 1),
            };
        });
    }, [totalRows, crew, bucketRecords, targetBucketsPerRow]);

    // Responsive grid layout
    const cols = totalRows <= 20 ? 4 : totalRows <= 40 ? 5 : 6;
    const cellSize = 64; // px
    const gap = 4;
    const rows = Math.ceil(totalRows / cols);
    const svgWidth = cols * (cellSize + gap) + gap;
    const svgHeight = rows * (cellSize + gap) + gap;

    // Stats
    const totalBuckets = rowData.reduce((s, r) => s + r.buckets, 0);
    const completedRows = rowData.filter(r => r.progress >= 1).length;
    const activePickers = rowData.reduce((s, r) => s + r.pickers.length, 0);

    const selectedData = selectedRow ? rowData.find(r => r.rowNum === selectedRow) : null;

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <span className="material-symbols-outlined text-base text-emerald-600">map</span>
                        {blockName} — Row Map
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                        {completedRows}/{totalRows} rows complete · {totalBuckets} buckets · {activePickers} active pickers
                    </p>
                </div>
                {/* Legend */}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-sm bg-gray-200" />
                        <span>0%</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-sm bg-amber-400" />
                        <span>50%</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                        <span>100%</span>
                    </div>
                </div>
            </div>

            {/* SVG Map */}
            <div className="p-4 overflow-x-auto">
                <svg
                    width="100%"
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    className="max-w-full"
                    role="img"
                    aria-label={`Orchard row map for ${blockName}`}
                >
                    {rowData.map((rd, i) => {
                        const col = i % cols;
                        const row = Math.floor(i / cols);
                        const x = gap + col * (cellSize + gap);
                        const y = gap + row * (cellSize + gap);
                        const isHovered = hoveredRow === rd.rowNum;
                        const isSelected = selectedRow === rd.rowNum;

                        return (
                            <g
                                key={rd.rowNum}
                                onMouseEnter={() => setHoveredRow(rd.rowNum)}
                                onMouseLeave={() => setHoveredRow(null)}
                                onClick={() => setSelectedRow(isSelected ? null : rd.rowNum)}
                                className="cursor-pointer"
                            >
                                {/* Row cell */}
                                <rect
                                    x={x}
                                    y={y}
                                    width={cellSize}
                                    height={cellSize}
                                    rx={6}
                                    fill={getRowColor(rd.progress)}
                                    stroke={isSelected ? '#4f46e5' : isHovered ? '#6366f1' : 'transparent'}
                                    strokeWidth={isSelected ? 3 : isHovered ? 2 : 0}
                                    className="transition-all duration-150"
                                />

                                {/* Row number */}
                                <text
                                    x={x + cellSize / 2}
                                    y={y + 20}
                                    textAnchor="middle"
                                    fill={getTextColor(rd.progress)}
                                    fontSize={14}
                                    fontWeight={600}
                                >
                                    R{rd.rowNum}
                                </text>

                                {/* Bucket count */}
                                <text
                                    x={x + cellSize / 2}
                                    y={y + 36}
                                    textAnchor="middle"
                                    fill={getTextColor(rd.progress)}
                                    fontSize={10}
                                    opacity={0.8}
                                >
                                    {rd.buckets}🪣
                                </text>

                                {/* Picker dots */}
                                {rd.pickers.slice(0, 4).map((_, pi) => (
                                    <circle
                                        key={pi}
                                        cx={x + 14 + pi * 12}
                                        cy={y + cellSize - 12}
                                        r={4}
                                        fill="#ffffff"
                                        stroke="#10b981"
                                        strokeWidth={1.5}
                                    />
                                ))}
                                {rd.pickers.length > 4 && (
                                    <text
                                        x={x + 14 + 4 * 12}
                                        y={y + cellSize - 8}
                                        fontSize={8}
                                        fill={getTextColor(rd.progress)}
                                    >
                                        +{rd.pickers.length - 4}
                                    </text>
                                )}
                            </g>
                        );
                    })}
                </svg>
            </div>

            {/* Selected Row Detail */}
            {selectedData && (
                <div className="px-4 py-3 bg-indigo-50 border-t border-indigo-100 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-sm font-semibold text-indigo-900">
                                Row {selectedData.rowNum}
                            </h4>
                            <p className="text-xs text-indigo-700 mt-0.5">
                                {selectedData.buckets} buckets · {Math.round(selectedData.progress * 100)}% complete · {selectedData.pickers.length} pickers
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {selectedData.pickers.map(p => (
                                <div key={p.id} className="flex items-center gap-1 bg-white px-2 py-1 rounded-full text-xs border border-indigo-200">
                                    <div className="w-4 h-4 bg-emerald-100 rounded-full flex items-center justify-center text-[8px] font-bold text-emerald-700">
                                        {p.name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    {p.name.split(' ')[0]}
                                </div>
                            ))}
                            {selectedData.pickers.length === 0 && (
                                <span className="text-xs text-indigo-400">No pickers assigned</span>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
