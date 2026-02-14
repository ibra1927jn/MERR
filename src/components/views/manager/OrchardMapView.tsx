/**
 * OrchardMapView — Premium Interactive Orchard Map
 *
 * Visual grid where each row is a richly styled card:
 *   gray (0%) → amber (50%) → emerald (100%)
 * Animated entrance, progress bars, picker avatars, overall progress ring.
 * The "crown jewel" view that impresses managers on first glance.
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

/* ── Color Engine ──────────────────────────────────── */

function getRowGradient(progress: number): string {
    if (progress <= 0) return 'linear-gradient(135deg, #f1f5f9, #e2e8f0)';
    if (progress < 0.25) return 'linear-gradient(135deg, #fef3c7, #fde68a)';
    if (progress < 0.5) return 'linear-gradient(135deg, #fde68a, #fbbf24)';
    if (progress < 0.75) return 'linear-gradient(135deg, #a7f3d0, #34d399)';
    if (progress < 1) return 'linear-gradient(135deg, #6ee7b7, #10b981)';
    return 'linear-gradient(135deg, #10b981, #059669)';
}

function getRowBorder(progress: number): string {
    if (progress <= 0) return '#e2e8f0';
    if (progress < 0.5) return '#fbbf24';
    if (progress < 1) return '#34d399';
    return '#059669';
}

function getTextColor(progress: number): string {
    return progress > 0.5 ? '#ffffff' : '#1e293b';
}

function getSubTextColor(progress: number): string {
    return progress > 0.5 ? 'rgba(255,255,255,0.8)' : '#64748b';
}

/* ── Avatar color palette ──────────────────────────── */
const AVATAR_COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
    '#0ea5e9', '#14b8a6', '#f59e0b', '#84cc16',
];

function getAvatarColor(index: number): string {
    return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

/* ── Progress Ring SVG ─────────────────────────────── */
function ProgressRing({ progress, size = 56, stroke = 4 }: { progress: number; size?: number; stroke?: number }) {
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - progress);
    const pct = Math.round(progress * 100);

    return (
        <svg width={size} height={size} className="transform -rotate-90">
            {/* Background track */}
            <circle
                cx={size / 2} cy={size / 2} r={radius}
                stroke="#e2e8f0" strokeWidth={stroke} fill="none"
            />
            {/* Progress arc */}
            <circle
                cx={size / 2} cy={size / 2} r={radius}
                stroke="url(#progressGrad)" strokeWidth={stroke} fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}
            />
            <defs>
                <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#059669" />
                </linearGradient>
            </defs>
            {/* Percentage text — rotated back to upright */}
            <text
                x={size / 2} y={size / 2}
                textAnchor="middle" dominantBaseline="central"
                fill="#0f172a" fontSize={size > 48 ? 13 : 10} fontWeight={700}
                transform={`rotate(90, ${size / 2}, ${size / 2})`}
            >
                {pct}%
            </text>
        </svg>
    );
}

/* ── Main Component ────────────────────────────────── */

export default function OrchardMapView({
    totalRows,
    crew,
    bucketRecords,
    blockName = 'Block A',
    targetBucketsPerRow = 50,
}: OrchardMapViewProps) {
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

    // Stats
    const totalBuckets = rowData.reduce((s, r) => s + r.buckets, 0);
    const completedRows = rowData.filter(r => r.progress >= 1).length;
    const activePickers = rowData.reduce((s, r) => s + r.pickers.length, 0);
    const overallProgress = totalRows > 0
        ? rowData.reduce((s, r) => s + r.progress, 0) / totalRows
        : 0;

    const selectedData = selectedRow ? rowData.find(r => r.rowNum === selectedRow) : null;

    return (
        <div className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden bg-white animate-fade-in">
            {/* ── Glassmorphic Header ──────────────────── */}
            <div className="relative overflow-hidden">
                {/* Gradient background */}
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-emerald-400/5 to-indigo-500/10" />
                <div className="relative px-5 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        {/* Progress Ring */}
                        <ProgressRing progress={overallProgress} />

                        <div>
                            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg text-emerald-600 material-icon-filled">
                                    map
                                </span>
                                {blockName} — Row Map
                            </h3>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-breathe" />
                                    {activePickers} active
                                </span>
                                <span>·</span>
                                <span>{completedRows}/{totalRows} rows done</span>
                                <span>·</span>
                                <span>{totalBuckets} buckets</span>
                            </div>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500">
                        <div className="flex items-center gap-1.5">
                            <div className="w-4 h-2.5 rounded-sm" style={{ background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)' }} />
                            <span>Empty</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-4 h-2.5 rounded-sm" style={{ background: 'linear-gradient(135deg, #fde68a, #fbbf24)' }} />
                            <span>In Progress</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-4 h-2.5 rounded-sm" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }} />
                            <span>Complete</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Row Grid ─────────────────────────────── */}
            <div className="p-4">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                    {rowData.map((rd, i) => {
                        const isSelected = selectedRow === rd.rowNum;
                        const isComplete = rd.progress >= 1;
                        const hasActivePickers = rd.pickers.length > 0;

                        return (
                            <button
                                key={rd.rowNum}
                                onClick={() => setSelectedRow(isSelected ? null : rd.rowNum)}
                                className={`
                                    relative rounded-xl p-2.5 text-left
                                    transition-all duration-200 ease-out
                                    animate-slide-up
                                    hover:scale-[1.04] hover:shadow-lg
                                    active:scale-[0.98]
                                    focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1
                                    ${isSelected ? 'ring-2 ring-indigo-500 shadow-lg scale-[1.02]' : 'shadow-sm'}
                                    ${isComplete ? 'animate-breathe' : ''}
                                `}
                                style={{
                                    background: getRowGradient(rd.progress),
                                    borderLeft: `3px solid ${getRowBorder(rd.progress)}`,
                                    animationDelay: `${i * 0.03}s`,
                                }}
                            >
                                {/* Row number */}
                                <div className="flex items-center justify-between mb-1">
                                    <span
                                        className="text-sm font-bold"
                                        style={{ color: getTextColor(rd.progress) }}
                                    >
                                        R{rd.rowNum}
                                    </span>
                                    {isComplete && (
                                        <span className="text-xs" title="Complete">✅</span>
                                    )}
                                    {hasActivePickers && !isComplete && (
                                        <span
                                            className="w-2 h-2 rounded-full bg-emerald-400 animate-breathe"
                                        />
                                    )}
                                </div>

                                {/* Bucket count */}
                                <div
                                    className="text-xs font-medium tabular-nums"
                                    style={{ color: getSubTextColor(rd.progress) }}
                                >
                                    {rd.buckets} 🪣
                                </div>

                                {/* Mini progress bar */}
                                <div className="mt-1.5 h-1 rounded-full bg-black/10 overflow-hidden">
                                    <div
                                        className="h-full rounded-full animate-progress"
                                        style={{
                                            '--w': `${Math.round(rd.progress * 100)}%`,
                                            background: rd.progress >= 1
                                                ? 'linear-gradient(90deg, #059669, #10b981)'
                                                : rd.progress > 0.5
                                                    ? 'linear-gradient(90deg, #34d399, #6ee7b7)'
                                                    : 'linear-gradient(90deg, #fbbf24, #fde68a)',
                                            width: `${Math.round(rd.progress * 100)}%`,
                                        } as React.CSSProperties}
                                    />
                                </div>

                                {/* Picker avatars */}
                                {rd.pickers.length > 0 && (
                                    <div className="flex items-center mt-1.5 -space-x-1.5">
                                        {rd.pickers.slice(0, 3).map((p, pi) => (
                                            <div
                                                key={p.id}
                                                className="w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-bold text-white ring-1 ring-white/60"
                                                style={{ background: getAvatarColor(pi) }}
                                                title={p.name}
                                            >
                                                {p.name.split(' ').map(n => n[0]).join('')}
                                            </div>
                                        ))}
                                        {rd.pickers.length > 3 && (
                                            <div
                                                className="w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-bold bg-gray-700 text-white ring-1 ring-white/60"
                                            >
                                                +{rd.pickers.length - 3}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Selection indicator */}
                                {isSelected && (
                                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-indigo-500 rounded-full border-2 border-white" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Selected Row Detail Panel ────────────── */}
            {selectedData && (
                <div className="px-5 py-4 bg-gradient-to-r from-indigo-50 to-violet-50 border-t border-indigo-100 animate-slide-up">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                                <span className="material-symbols-outlined text-base text-indigo-500">
                                    info
                                </span>
                                Row {selectedData.rowNum}
                            </h4>
                            <div className="flex items-center gap-4 mt-1.5 text-xs text-indigo-700">
                                <span className="flex items-center gap-1">
                                    <span className="font-semibold">{selectedData.buckets}</span> buckets
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="font-semibold">{Math.round(selectedData.progress * 100)}%</span> complete
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="font-semibold">{selectedData.pickers.length}</span> pickers
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap justify-end">
                            {selectedData.pickers.map((p, i) => (
                                <div
                                    key={p.id}
                                    className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-full text-xs border border-indigo-200 shadow-sm animate-scale-in"
                                    style={{ animationDelay: `${i * 0.05}s` }}
                                >
                                    <div
                                        className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                                        style={{ background: getAvatarColor(i) }}
                                    >
                                        {p.name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <span className="font-medium text-indigo-900">
                                        {p.name.split(' ')[0]}
                                    </span>
                                </div>
                            ))}
                            {selectedData.pickers.length === 0 && (
                                <span className="text-xs text-indigo-400 italic">No pickers assigned</span>
                            )}
                        </div>
                    </div>

                    {/* Detail progress bar */}
                    <div className="mt-3 h-2 rounded-full bg-indigo-100 overflow-hidden">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 animate-progress"
                            style={{
                                '--w': `${Math.round(selectedData.progress * 100)}%`,
                                width: `${Math.round(selectedData.progress * 100)}%`,
                            } as React.CSSProperties}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
