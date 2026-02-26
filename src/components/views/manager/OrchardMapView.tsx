/**
 * OrchardMapView — Tactical Command Center (El Director de Orquesta)
 *
 * Master-Detail drill-down map:
 *   Level 1 (Macro): Giant block cards — tap to drill in
 *   Level 2 (Micro): Row grid for selected block with VARIETY FILTER
 *
 * KEY CONCEPT: Variety is PER-ROW, not per-block.
 * A block can have many varieties (e.g. 5 Lapins + 4 Sweetheart + 3 Bing).
 * User flow: Select Block → Enter block → Filter by variety → ghost-dim non-matching rows
 *
 * Features:
 *   - Cherry varieties (Lapins, Sweetheart, Bing, Rainier, Stella, Kordia)
 *   - Variety filter at Level 2 (ghost-dims non-matching rows)
 *   - Breadcrumb navigation (Zustand state, no browser history)
 *   - Floating HUD with live stats
 *   - Fat UI for gloved fingers (min 120px cards)
 *   - Offline-first: pure CSS, zero external map tiles
 *   - Animated transitions via key prop
 */
import React, { useMemo } from 'react';
import { Picker, BucketRecord, OrchardBlock } from '@/types';
import { useHarvestStore } from '@/stores/useHarvestStore';

/* ── Color Engine ──────────────────────────────────── */

function getBlockStatusColor(status: OrchardBlock['status']): string {
    switch (status) {
        case 'idle': return 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)';
        case 'active': return 'linear-gradient(135deg, #fef3c7 0%, #fbbf24 100%)';
        case 'complete': return 'linear-gradient(135deg, #a7f3d0 0%, #10b981 100%)';
        case 'alert': return 'linear-gradient(135deg, #fecaca 0%, #ef4444 100%)';
    }
}

function getBlockStatusBorder(status: OrchardBlock['status']): string {
    switch (status) {
        case 'idle': return '#cbd5e1';
        case 'active': return '#f59e0b';
        case 'complete': return '#10b981';
        case 'alert': return '#ef4444';
    }
}

function getBlockTextColor(status: OrchardBlock['status']): string {
    return status === 'complete' || status === 'alert' ? '#ffffff' : '#1e293b';
}

function getRowProgress(buckets: number, target: number): number {
    return target > 0 ? Math.min(buckets / target, 1) : 0;
}

function getRowGradient(progress: number): string {
    if (progress <= 0) return 'linear-gradient(135deg, #f8fafc, #f1f5f9)';
    if (progress < 0.25) return 'linear-gradient(135deg, #fef9c3, #fde68a)';
    if (progress < 0.5) return 'linear-gradient(135deg, #fde68a, #fbbf24)';
    if (progress < 0.75) return 'linear-gradient(135deg, #bbf7d0, #4ade80)';
    if (progress < 1) return 'linear-gradient(135deg, #6ee7b7, #10b981)';
    return 'linear-gradient(135deg, #10b981, #059669)';
}

/* ── Avatar Colors ──────────────────────────────────── */
const AVATAR_COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
    '#0ea5e9', '#14b8a6', '#f59e0b', '#84cc16',
];

/* ── Cherry Variety Colors ──────────────────────────── */
const VARIETY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
    'Lapins': { bg: '#fef2f2', text: '#991b1b', dot: '#dc2626' },
    'Sweetheart': { bg: '#fdf2f8', text: '#9d174d', dot: '#ec4899' },
    'Bing': { bg: '#faf5ff', text: '#6b21a8', dot: '#9333ea' },
    'Rainier': { bg: '#fefce8', text: '#854d0e', dot: '#eab308' },
    'Stella': { bg: '#f0fdf4', text: '#166534', dot: '#16a34a' },
    'Kordia': { bg: '#fff7ed', text: '#9a3412', dot: '#ea580c' },
};

function getVarietyStyle(variety: string) {
    return VARIETY_COLORS[variety] || { bg: '#f8fafc', text: '#475569', dot: '#94a3b8' };
}

/* ── Status Label ──────────────────────────────────── */
function getStatusLabel(status: OrchardBlock['status']): { label: string; icon: string } {
    switch (status) {
        case 'idle': return { label: 'Sin asignar', icon: 'hourglass_empty' };
        case 'active': return { label: 'En progreso', icon: 'trending_up' };
        case 'complete': return { label: 'Completado', icon: 'check_circle' };
        case 'alert': return { label: '¡Alerta!', icon: 'warning' };
    }
}

/* ── Progress Ring SVG ─────────────────────────────── */
function ProgressRing({ progress, size = 48, stroke = 4 }: { progress: number; size?: number; stroke?: number }) {
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - progress);
    const pct = Math.round(progress * 100);

    return (
        <svg width={size} height={size} className="transform -rotate-90">
            <circle cx={size / 2} cy={size / 2} r={radius} stroke="#e2e8f0" strokeWidth={stroke} fill="none" />
            <circle
                cx={size / 2} cy={size / 2} r={radius}
                stroke="url(#tacticalProgressGrad)" strokeWidth={stroke} fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className="svg-stroke-transition"
            />
            <defs>
                <linearGradient id="tacticalProgressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#dc2626" />
                    <stop offset="100%" stopColor="#9333ea" />
                </linearGradient>
            </defs>
            <text
                x={size / 2} y={size / 2}
                textAnchor="middle" dominantBaseline="central"
                fill="#0f172a" fontSize={size > 40 ? 12 : 10} fontWeight={700}
                transform={`rotate(90, ${size / 2}, ${size / 2})`}
            >
                {pct}%
            </text>
        </svg>
    );
}

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════ */

interface OrchardMapViewProps {
    crew: Picker[];
    bucketRecords: BucketRecord[];
    targetBucketsPerRow?: number;
    onRowClick?: (rowNum: number) => void;
}

export default function OrchardMapView({
    crew,
    bucketRecords,
    targetBucketsPerRow = 50,
    onRowClick,
}: OrchardMapViewProps) {
    // ── Store (El Cerebro) ──────────────────────────
    const orchardBlocks = useHarvestStore(s => s.orchardBlocks);
    const selectedBlockId = useHarvestStore(s => s.selectedBlockId);
    const selectedVariety = useHarvestStore(s => s.selectedVariety);
    const setSelectedBlock = useHarvestStore(s => s.setSelectedBlock);
    const setSelectedVariety = useHarvestStore(s => s.setSelectedVariety);
    const orchard = useHarvestStore(s => s.orchard);
    const rowAssignments = useHarvestStore(s => s.rowAssignments);

    const selectedBlock = orchardBlocks.find(b => b.id === selectedBlockId) || null;

    // ── Build pickers-by-row lookup from rowAssignments (supports multi-row teams)
    const pickersByRow = useMemo(() => {
        const map: Record<number, Picker[]> = {};
        rowAssignments.forEach(ra => {
            if (!map[ra.row_number]) map[ra.row_number] = [];
            ra.assigned_pickers.forEach(pid => {
                const p = crew.find(c => c.id === pid);
                if (p && !map[ra.row_number].find(x => x.id === p.id)) {
                    map[ra.row_number].push(p);
                }
            });
        });
        // Fallback: also include pickers whose current_row is set (e.g. from Supabase)
        crew.forEach(p => {
            if (p.current_row > 0) {
                if (!map[p.current_row]) map[p.current_row] = [];
                if (!map[p.current_row].find(x => x.id === p.id)) {
                    map[p.current_row].push(p);
                }
            }
        });
        return map;
    }, [rowAssignments, crew]);

    // ── Derive unique varieties for the SELECTED BLOCK (Level 2 only) ───
    const blockVarieties = useMemo(() => {
        if (!selectedBlock) return [];
        const set = new Set(Object.values(selectedBlock.rowVarieties));
        return Array.from(set);
    }, [selectedBlock]);

    // ── Derive unique varieties per block (for Level 1 badges) ──────────
    const blockVarietySummaries = useMemo(() => {
        const summaries: Record<string, string[]> = {};
        orchardBlocks.forEach(block => {
            const set = new Set(Object.values(block.rowVarieties));
            summaries[block.id] = Array.from(set);
        });
        return summaries;
    }, [orchardBlocks]);

    // ── Compute block-level stats ───────────────────
    const blockStats = useMemo(() => {
        const stats: Record<string, { buckets: number; activePickers: number; completedRows: number; progress: number }> = {};
        orchardBlocks.forEach(block => {
            let blockBuckets = 0;
            let blockPickers = 0;
            let blockCompletedRows = 0;
            for (let row = block.startRow; row < block.startRow + block.totalRows; row++) {
                const rowBuckets = bucketRecords.filter(br => br.row_number === row).length;
                const rowPickers = (pickersByRow[row] || []).length;
                blockBuckets += rowBuckets;
                blockPickers += rowPickers;
                if (rowBuckets >= targetBucketsPerRow) blockCompletedRows++;
            }
            stats[block.id] = {
                buckets: blockBuckets,
                activePickers: blockPickers,
                completedRows: blockCompletedRows,
                progress: block.totalRows > 0 ? blockCompletedRows / block.totalRows : 0,
            };
        });
        return stats;
    }, [orchardBlocks, bucketRecords, targetBucketsPerRow, pickersByRow]);

    // ── Compute row data for selected block ─────────
    const rowData = useMemo(() => {
        if (!selectedBlock) return [];
        return Array.from({ length: selectedBlock.totalRows }, (_, i) => {
            const rowNum = selectedBlock.startRow + i;
            const buckets = bucketRecords.filter(br => br.row_number === rowNum).length;
            const pickers = pickersByRow[rowNum] || [];
            const variety = selectedBlock.rowVarieties[rowNum] || 'Desconocida';
            return {
                rowNum,
                buckets,
                pickers,
                variety,
                progress: getRowProgress(buckets, targetBucketsPerRow),
            };
        });
    }, [selectedBlock, bucketRecords, targetBucketsPerRow, pickersByRow]);

    // ── Global stats ────────────────────────────────
    const totalActivePickers = crew.filter(p => p.status === 'active').length;
    const totalBuckets = bucketRecords.length;
    const totalRows = orchardBlocks.reduce((s, b) => s + b.totalRows, 0);

    return (
        <div className="flex flex-col gap-4 px-4 pb-4 pt-14 animate-fade-in">
            {/* ═══ FLOATING HUD (Persists across levels) ═══ */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-white/70 backdrop-blur-lg border border-border-light shadow-sm">
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-xl text-primary material-icon-filled">agriculture</span>
                    <div>
                        <h2 className="text-sm font-black text-text-main tracking-tight">
                            {orchard?.name || 'Orchard'} — Centro de Mando
                        </h2>
                        <div className="flex items-center gap-3 text-xs text-text-muted mt-0.5">
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-breathe" />
                                {totalActivePickers} activos
                            </span>
                            <span>·</span>
                            <span>🍒 {totalBuckets} buckets</span>
                            <span>·</span>
                            <span>{orchardBlocks.length} bloques · {totalRows} filas</span>
                        </div>
                    </div>
                </div>

                {/* Status pill */}
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 border border-red-200 text-xs font-bold text-red-700">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-breathe" />
                    LIVE
                </div>
            </div>

            {/* ═══ BREADCRUMB ═══ */}
            {selectedBlock && (
                <div className="flex items-center gap-2 px-1 text-xs animate-fade-in">
                    <button
                        onClick={() => setSelectedBlock(null)}
                        className="flex items-center gap-1 text-primary hover:text-primary/80 font-bold transition-colors"
                    >
                        <span className="material-symbols-outlined text-sm">arrow_back</span>
                        <span>🍒 {orchard?.name || 'Orchard'}</span>
                    </button>
                    <span className="text-text-muted">›</span>
                    <span className="font-bold text-text-main">{selectedBlock.name}</span>
                    <span className="text-text-muted">·</span>
                    <span className="text-text-muted">{blockVarieties.length} variedades</span>
                </div>
            )}

            {/* ═══ CONTENT: Level 1 (Blocks) or Level 2 (Rows) ═══ */}
            <div key={selectedBlockId || 'macro-view'} className="animate-scale-in">
                {!selectedBlock ? (
                    /* ─── LEVEL 1: MACRO VIEW (Block Cards) ─── */
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-20">
                        {orchardBlocks.map((block, i) => {
                            const stats = blockStats[block.id] || { buckets: 0, activePickers: 0, completedRows: 0, progress: 0 };
                            const statusInfo = getStatusLabel(block.status);
                            const varieties = blockVarietySummaries[block.id] || [];

                            return (
                                <button
                                    key={block.id}
                                    onClick={() => setSelectedBlock(block.id)}
                                    className={`
                                        relative rounded-2xl p-6 text-left
                                        transition-all duration-300 ease-out
                                        animate-slide-up anim-delay
                                        hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] cursor-pointer shadow-md
                                        focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2
                                    `}
                                    style={{
                                        background: getBlockStatusColor(block.status),
                                        borderLeft: `4px solid ${getBlockStatusBorder(block.status)}`,
                                        '--delay': `${i * 0.08}s`,
                                        minHeight: '120px',
                                    } as React.CSSProperties}
                                >
                                    {/* Block Header */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h3 className="text-xl font-black" style={{ color: getBlockTextColor(block.status) }}>
                                                {block.name}
                                            </h3>
                                            {/* Variety badges (show all varieties in this block) */}
                                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                                {varieties.map(v => {
                                                    const vs = getVarietyStyle(v);
                                                    return (
                                                        <span
                                                            key={v}
                                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                                                            style={{ backgroundColor: vs.bg, color: vs.text }}
                                                        >
                                                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: vs.dot }} />
                                                            {v}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Status badge */}
                                        <div className={`
                                            flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shrink-0
                                            ${block.status === 'active' ? 'bg-amber-100 text-amber-800' : ''}
                                            ${block.status === 'idle' ? 'bg-slate-100 text-slate-600' : ''}
                                            ${block.status === 'complete' ? 'bg-white/20 text-white' : ''}
                                            ${block.status === 'alert' ? 'bg-white/20 text-white animate-breathe' : ''}
                                        `}>
                                            <span className="material-symbols-outlined text-sm">{statusInfo.icon}</span>
                                            {statusInfo.label}
                                        </div>
                                    </div>

                                    {/* Stats Row */}
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="bg-white/30 backdrop-blur-sm rounded-xl px-3 py-2 text-center">
                                            <div className="text-lg font-black" style={{ color: getBlockTextColor(block.status) }}>
                                                {block.totalRows}
                                            </div>
                                            <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: getBlockTextColor(block.status), opacity: 0.7 }}>
                                                Filas
                                            </div>
                                        </div>
                                        <div className="bg-white/30 backdrop-blur-sm rounded-xl px-3 py-2 text-center">
                                            <div className="text-lg font-black" style={{ color: getBlockTextColor(block.status) }}>
                                                {stats.activePickers}
                                            </div>
                                            <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: getBlockTextColor(block.status), opacity: 0.7 }}>
                                                Pickers
                                            </div>
                                        </div>
                                        <div className="bg-white/30 backdrop-blur-sm rounded-xl px-3 py-2 text-center">
                                            <div className="text-lg font-black" style={{ color: getBlockTextColor(block.status) }}>
                                                🍒 {stats.buckets}
                                            </div>
                                            <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: getBlockTextColor(block.status), opacity: 0.7 }}>
                                                Buckets
                                            </div>
                                        </div>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="mt-4">
                                        <div className="flex justify-between text-[10px] font-bold mb-1" style={{ color: getBlockTextColor(block.status), opacity: 0.8 }}>
                                            <span>Progreso</span>
                                            <span>{stats.completedRows}/{block.totalRows} filas</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-black/10 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-white/60 animate-progress dynamic-width"
                                                style={{ '--w': `${Math.round(stats.progress * 100)}%` } as React.CSSProperties}
                                            />
                                        </div>
                                    </div>

                                    {/* Drill-in hint — normal flow, not absolute */}
                                    <div className="mt-3 flex items-center justify-end gap-1 text-xs font-semibold" style={{ color: getBlockTextColor(block.status), opacity: 0.6 }}>
                                        <span>Ver filas</span>
                                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    /* ─── LEVEL 2: MICRO VIEW (Rows of Selected Block) ─── */
                    <div className="pb-20">
                        {/* Variety Pill Filter (inside block — per-row filtering) */}
                        <div className="flex flex-wrap items-center gap-2 mb-4 px-1">
                            <span className="text-xs font-bold text-text-muted uppercase tracking-wider mr-1">Variedad:</span>
                            <button
                                onClick={() => setSelectedVariety('ALL')}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${selectedVariety === 'ALL'
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'bg-slate-100 text-text-sub hover:bg-slate-200'
                                    }`}
                            >
                                Todas ({selectedBlock.totalRows})
                            </button>
                            {blockVarieties.map(v => {
                                const vs = getVarietyStyle(v);
                                const count = rowData.filter(rd => rd.variety === v).length;
                                return (
                                    <button
                                        key={v}
                                        onClick={() => setSelectedVariety(v)}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${selectedVariety === v
                                            ? 'shadow-sm ring-2 ring-offset-1'
                                            : 'hover:scale-105'
                                            }`}
                                        style={{
                                            backgroundColor: selectedVariety === v ? vs.dot : vs.bg,
                                            color: selectedVariety === v ? '#fff' : vs.text,
                                            ...(selectedVariety === v ? { ringColor: vs.dot } : {}),
                                        }}
                                    >
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedVariety === v ? '#fff' : vs.dot }} />
                                        🍒 {v} ({count})
                                    </button>
                                );
                            })}
                        </div>

                        {/* Block Summary Header */}
                        <div className="flex items-center justify-between mb-4 px-2">
                            <div className="flex items-center gap-3">
                                <ProgressRing progress={blockStats[selectedBlock.id]?.progress || 0} />
                                <div>
                                    <h3 className="text-sm font-bold text-text-main">
                                        {selectedBlock.name} — Filas
                                    </h3>
                                    <div className="text-xs text-text-muted">
                                        {blockStats[selectedBlock.id]?.completedRows || 0}/{selectedBlock.totalRows} completadas
                                        · {blockStats[selectedBlock.id]?.activePickers || 0} pickers activos
                                    </div>
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="hidden sm:flex items-center gap-3 text-xs text-text-muted">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-4 h-2.5 rounded-sm bg-slate-200" />
                                    <span>Vacía</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-4 h-2.5 rounded-sm bg-amber-400" />
                                    <span>En progreso</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-4 h-2.5 rounded-sm bg-emerald-500" />
                                    <span>Completa</span>
                                </div>
                            </div>
                        </div>

                        {/* Row Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {rowData.map((rd, i) => {
                                const isComplete = rd.progress >= 1;
                                const hasActivePickers = rd.pickers.length > 0;
                                const isDimmed = selectedVariety !== 'ALL' && rd.variety !== selectedVariety;
                                const vs = getVarietyStyle(rd.variety);

                                return (
                                    <button
                                        key={rd.rowNum}
                                        onClick={() => !isDimmed && onRowClick?.(rd.rowNum)}
                                        disabled={isDimmed}
                                        className={`
                                            relative rounded-xl p-3 text-left
                                            transition-all duration-300 ease-out
                                            animate-slide-up row-card-bg anim-delay
                                            focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-1
                                            shadow-sm
                                            ${isDimmed
                                                ? 'opacity-30 grayscale pointer-events-none'
                                                : 'hover:scale-[1.04] hover:shadow-lg active:scale-[0.98]'
                                            }
                                            ${isComplete ? 'ring-1 ring-emerald-300' : ''}
                                        `}
                                        style={{
                                            '--row-bg': getRowGradient(rd.progress),
                                            '--row-border': isComplete ? '#10b981' : hasActivePickers ? '#fbbf24' : '#e2e8f0',
                                            '--delay': `${i * 0.03}s`,
                                            minHeight: '80px',
                                        } as React.CSSProperties}
                                    >
                                        {/* Row header */}
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`text-sm font-black ${rd.progress > 0.5 ? 'text-white' : 'text-text-main'}`}>
                                                R{rd.rowNum}
                                            </span>
                                            <div className="flex items-center gap-1.5">
                                                {/* Variety dot */}
                                                <span
                                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold"
                                                    style={{ backgroundColor: vs.bg, color: vs.text }}
                                                    title={rd.variety}
                                                >
                                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: vs.dot }} />
                                                    {rd.variety}
                                                </span>
                                                {isComplete && <span className="text-xs" title="Complete">✅</span>}
                                                {hasActivePickers && !isComplete && (
                                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-breathe" />
                                                )}
                                            </div>
                                        </div>

                                        {/* Bucket count */}
                                        <div className={`text-xs font-semibold tabular-nums ${rd.progress > 0.5 ? 'text-white/80' : 'text-text-sub'}`}>
                                            🍒 {rd.buckets}/{targetBucketsPerRow}
                                        </div>

                                        {/* Progress bar */}
                                        <div className="mt-2 h-1.5 rounded-full bg-black/10 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full animate-progress dynamic-width ${rd.progress >= 1 ? 'progress-gradient-complete'
                                                    : rd.progress > 0.5 ? 'progress-gradient-mid'
                                                        : 'progress-gradient-low'
                                                    }`}
                                                style={{ '--w': `${Math.round(rd.progress * 100)}%` } as React.CSSProperties}
                                            />
                                        </div>

                                        {/* Picker avatars — split by North/South side */}
                                        {rd.pickers.length > 0 && (() => {
                                            // Find assignments for this row to determine side
                                            const rowRA = rowAssignments.filter(ra => ra.row_number === rd.rowNum);
                                            const northIds = new Set<string>();
                                            const southIds = new Set<string>();
                                            rowRA.forEach(ra => {
                                                ra.assigned_pickers.forEach(pid => {
                                                    if (ra.side === 'north') northIds.add(pid);
                                                    else southIds.add(pid);
                                                });
                                            });
                                            const northPickers = rd.pickers.filter(p => northIds.has(p.id));
                                            const southPickers = rd.pickers.filter(p => southIds.has(p.id));
                                            // Pickers not in any assignment fallback to a single group
                                            const unassigned = rd.pickers.filter(p => !northIds.has(p.id) && !southIds.has(p.id));
                                            const hasBothSides = northPickers.length > 0 && southPickers.length > 0;

                                            const renderAvatar = (p: Picker, pi: number) => {
                                                const isTeamLead = p.role === 'team_leader';
                                                const isRunnerRole = p.role === 'runner' || p.role === 'bucket_runner';
                                                const initials = p.name.split(' ').map(n => n[0]).join('').slice(0, 2);
                                                if (isTeamLead) {
                                                    return (
                                                        <div
                                                            key={p.id}
                                                            className="w-6 h-6 rounded-full flex items-center justify-center text-[7px] font-bold text-white bg-slate-800 ring-2 ring-amber-400 shadow-sm"
                                                            title={`${p.name} (Team Leader)`}
                                                        >
                                                            {initials}
                                                        </div>
                                                    );
                                                }
                                                if (isRunnerRole) {
                                                    return (
                                                        <div
                                                            key={p.id}
                                                            className="w-6 h-6 rounded-full flex items-center justify-center text-[7px] font-bold text-white bg-blue-500 ring-2 ring-white/80 shadow-sm"
                                                            title={`${p.name} (Runner)`}
                                                        >
                                                            {initials}
                                                        </div>
                                                    );
                                                }
                                                return (
                                                    <div
                                                        key={p.id}
                                                        className="w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-bold text-white ring-1 ring-white/60 avatar-bg"
                                                        style={{ '--avatar-bg': AVATAR_COLORS[pi % AVATAR_COLORS.length] } as React.CSSProperties}
                                                        title={p.name}
                                                    >
                                                        {initials}
                                                    </div>
                                                );
                                            };

                                            return (
                                                <div className={`flex items-center mt-2 ${hasBothSides ? 'justify-between' : ''}`}>
                                                    {/* North side group */}
                                                    {northPickers.length > 0 && (
                                                        <div className="flex items-center gap-0.5">
                                                            {hasBothSides && <span className="text-[7px] font-bold text-slate-400 mr-0.5">N</span>}
                                                            <div className="flex -space-x-1.5">
                                                                {northPickers.slice(0, 3).map((p, pi) => renderAvatar(p, pi))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {/* South side group */}
                                                    {southPickers.length > 0 && (
                                                        <div className="flex items-center gap-0.5">
                                                            <div className="flex -space-x-1.5">
                                                                {southPickers.slice(0, 3).map((p, pi) => renderAvatar(p, pi + 4))}
                                                            </div>
                                                            {hasBothSides && <span className="text-[7px] font-bold text-slate-400 ml-0.5">S</span>}
                                                        </div>
                                                    )}
                                                    {/* Unassigned pickers (fallback) */}
                                                    {unassigned.length > 0 && northPickers.length === 0 && southPickers.length === 0 && (
                                                        <div className="flex -space-x-1.5">
                                                            {unassigned.slice(0, 4).map((p, pi) => renderAvatar(p, pi))}
                                                        </div>
                                                    )}
                                                    {rd.pickers.length > 6 && (
                                                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-bold bg-slate-500 text-white ring-1 ring-white/60">
                                                            +{rd.pickers.length - 6}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}

                                        {/* Assign hint for empty rows */}
                                        {rd.pickers.length === 0 && rd.buckets === 0 && !isDimmed && (
                                            <div className="mt-2 text-[9px] text-text-muted italic">
                                                Tap para asignar
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
