/**
 * components/views/manager/VelocityChart.tsx
 * Hourly Bucket Velocity Chart (Pure CSS/SVG - No dependencies)
 * Shows last 8 hours of production with elegant zero-data state.
 *
 * Fixes aplicados:
 * - Eje X siempre en formato 24h (08, 09 … 13, no mezcla 12h/24h)
 * - Tooltip al hacer hover: hora, bins, % vs target
 * - Línea Target más gruesa con label en el borde derecho
 * - Leyenda honesta: "Current" sólo aparece si la barra actual tiene bins > 0;
 *   barras bajo-target se pintan azul para que la leyenda sea consistente
 * - Barras bajo-target (no current) se muestran en azul oscuro en lugar de gris
 */
import React, { useMemo, useState } from 'react';
import { analyticsService } from '../../../services/analytics.service';
import { BucketRecord } from '../../../types';

interface VelocityChartProps {
    bucketRecords: BucketRecord[];
    targetVelocity?: number;
}

/** Extrae el número de hora (0–23) de la string devuelta por toLocaleTimeString */
function parseHour(hourStr: string): number {
    // Soporta: "09:00", "9:00 AM", "1:00 PM", "13:00"
    const lower = hourStr.toLowerCase();
    const isPm = lower.includes('pm');
    const isAm = lower.includes('am');
    const parts = hourStr.replace(/[^0-9:]/g, '').split(':');
    let h = parseInt(parts[0], 10);
    if (isPm && h < 12) h += 12;
    if (isAm && h === 12) h = 0;
    return h;
}

function fmt24(hour: number): string {
    return String(hour).padStart(2, '0');
}

const VelocityChart: React.FC<VelocityChartProps> = ({
    bucketRecords,
    targetVelocity = 50,
}) => {
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

    const hourlyData = useMemo(() =>
        analyticsService.groupByHour(bucketRecords, 8),
        [bucketRecords]
    );

    // Enriquecer con hora numérica 24h para el eje
    const enriched = useMemo(() =>
        hourlyData.map(d => ({ ...d, hour24: parseHour(d.hour) })),
        [hourlyData]
    );

    const maxCount = useMemo(() => {
        const dataMax = Math.max(...enriched.map(d => d.count), 0);
        return Math.max(dataMax, targetVelocity, 10);
    }, [enriched, targetVelocity]);

    const totalToday = enriched.reduce((sum, d) => sum + d.count, 0);
    const hasData = totalToday > 0;
    const currentIdx = enriched.length - 1;
    const currentHasData = enriched[currentIdx]?.count > 0;
    // La barra actual tiene datos: leyenda "Current" es honesta
    const showCurrentLegend = currentHasData;
    // Hay barras bajo-target (distintas de la actual)
    const hasBelowTarget = enriched.some((d, i) => i !== currentIdx && d.count > 0 && d.count < targetVelocity);

    const targetLinePos = maxCount > 0 ? (1 - targetVelocity / maxCount) * 100 : 0;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden dash-card-enter anim-delay" style={{ '--delay': '200ms' } as React.CSSProperties}>
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-text-main flex items-center gap-2">
                        <span className="material-symbols-outlined text-blue-500">trending_up</span>
                        Velocity (Hourly)
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Last 8 hours</p>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-black text-text-main">{totalToday}</p>
                    <p className="text-[10px] text-slate-400">total buckets</p>
                </div>
            </div>

            {/* Chart Area */}
            <div className="p-4">
                {!hasData ? (
                    <div className="h-[180px] flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                            <span className="material-symbols-outlined text-3xl text-slate-300 dash-hourglass">hourglass_empty</span>
                        </div>
                        <p className="text-sm font-bold text-slate-500">Awaiting First Scan</p>
                        <p className="text-xs text-slate-400 mt-1">Data will appear as Runners sync buckets</p>
                        <div className="flex items-center gap-2 mt-3 text-[10px] text-slate-400">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            Live updates enabled
                        </div>
                    </div>
                ) : (
                    /* Bar Chart con línea target relativa al área de barras */
                    <div className="relative">
                        {/* Línea target — posicionada en el área de 140px de las barras */}
                        <div
                            className="absolute left-0 right-0 pointer-events-none z-10"
                            style={{ top: `${targetLinePos * 1.4}px` }}
                        >
                            <div className="relative flex items-center">
                                <div className="flex-1 border-t-2 border-dashed border-slate-400" />
                                <span className="text-[9px] font-bold text-slate-500 ml-1 whitespace-nowrap bg-white px-1 rounded">
                                    Target {targetVelocity}
                                </span>
                            </div>
                        </div>

                        <div className="h-[180px] flex items-end gap-2">
                            {enriched.map((data, idx) => {
                                const height = maxCount > 0 ? (data.count / maxCount) * 100 : 0;
                                const isAboveTarget = data.count >= targetVelocity;
                                const isCurrentHour = idx === currentIdx;
                                const isHovered = hoveredIdx === idx;
                                const pctVsTarget = targetVelocity > 0
                                    ? Math.round((data.count / targetVelocity) * 100)
                                    : 0;

                                // Color: current=blue, aboveTarget=green, belowTarget=blue-darker
                                const barColor = isCurrentHour
                                    ? 'bg-gradient-to-t from-blue-600 to-blue-400'
                                    : isAboveTarget
                                        ? 'bg-gradient-to-t from-green-500 to-green-400'
                                        : 'bg-gradient-to-t from-blue-800 to-blue-600';

                                return (
                                    <div
                                        key={idx}
                                        className="flex-1 flex flex-col items-center gap-1 relative group"
                                        onMouseEnter={() => setHoveredIdx(idx)}
                                        onMouseLeave={() => setHoveredIdx(null)}
                                    >
                                        {/* Tooltip */}
                                        {isHovered && data.count > 0 && (
                                            <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 z-20 bg-slate-900 text-white rounded-xl px-3 py-2 text-[10px] whitespace-nowrap shadow-xl pointer-events-none">
                                                <p className="font-bold">{fmt24(data.hour24)}:00–{fmt24(data.hour24 + 1 < 24 ? data.hour24 + 1 : 0)}:00</p>
                                                <p>{data.count} bins · {pctVsTarget}% of target</p>
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                                            </div>
                                        )}

                                        {/* Bar */}
                                        <div className="relative w-full h-[140px] flex items-end justify-center">
                                            <div
                                                className={`w-full max-w-[40px] rounded-t-lg transition-all duration-500 ease-out dynamic-bar cursor-pointer ${barColor} ${isHovered ? 'opacity-80 scale-x-105' : ''}`}
                                                style={{ '--h': `${height}%`, '--min-h': data.count > 0 ? '8px' : '0' } as React.CSSProperties}
                                            >
                                                {data.count > 0 && (
                                                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-text-sub">
                                                        {data.count}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Eje X — siempre 24h */}
                                        <span className={`text-[10px] font-medium ${isCurrentHour ? 'text-blue-600 font-bold' : 'text-slate-400'}`}>
                                            {fmt24(data.hour24)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Legend — honesta: sólo muestra entradas que existen en el chart */}
            {hasData && (
                <div className="px-4 pb-3 flex items-center justify-center gap-4 text-[10px] text-slate-400 flex-wrap">
                    {showCurrentLegend && (
                        <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded bg-blue-500"></span> Current hour
                        </span>
                    )}
                    <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded bg-green-500"></span> Above target
                    </span>
                    {hasBelowTarget && (
                        <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded bg-blue-800"></span> Below target
                        </span>
                    )}
                    <span className="flex items-center gap-1">
                        <span className="w-6 border-t-2 border-dashed border-slate-400"></span> Target ({targetVelocity})
                    </span>
                </div>
            )}
        </div>
    );
};

export default VelocityChart;
