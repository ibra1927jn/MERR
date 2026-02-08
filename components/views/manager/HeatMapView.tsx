/**
 * HeatMapView.tsx - Blueprint DataLines Visualization
 * Cyber Blueprint aesthetic with horizontal data lines
 * Pickers as cyan dots, bins as yellow diamonds
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

type LayerVisibility = {
    workers: boolean;
    bins: boolean;
    qcAlerts: boolean;
};

const HeatMapView: React.FC<HeatMapViewProps> = ({
    bucketRecords,
    crew,
    blockName,
    rows = 20,
    onRowClick
}) => {
    // Layer visibility state
    const [layers, setLayers] = useState<LayerVisibility>({
        workers: true,
        bins: true,
        qcAlerts: true
    });
    const [showLayers, setShowLayers] = useState(false);
    const [teamFilter, setTeamFilter] = useState<string | null>(null);

    // Calculate row data
    const rowData = useMemo(() => {
        const counts = new Array(rows).fill(0);
        const maxBuckets = new Array(rows).fill(100); // Estimated max for progress

        bucketRecords.forEach(r => {
            const rowNum = r.row_number || (r.coords?.row) || 0;
            if (rowNum > 0 && rowNum <= rows) {
                counts[rowNum - 1]++;
            }
        });

        const max = Math.max(...counts, 1);

        return counts.map((count, idx) => {
            const rowNumber = idx + 1;
            const workers = crew.filter(p => p.current_row === rowNumber);
            const progress = count / max;

            return {
                rowNumber,
                buckets: count,
                progress,
                thickness: Math.max(2, progress * 6), // Line thickness based on activity
                workers,
                hasQcAlert: Math.random() > 0.9 // Mock QC alerts (would be real data)
            };
        });
    }, [bucketRecords, rows, crew]);

    // Get team leaders for filter
    const teamLeaders = useMemo(() => {
        return crew.filter(p => p.role === 'team_leader');
    }, [crew]);

    // Filter workers by team if filter is active
    const filteredWorkers = useMemo(() => {
        if (!teamFilter) return crew;
        return crew.filter(p => p.team_leader_id === teamFilter || p.id === teamFilter);
    }, [crew, teamFilter]);

    const toggleLayer = (layer: keyof LayerVisibility) => {
        setLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
    };

    return (
        <div className="w-full h-full blueprint-bg flex flex-col overflow-hidden relative">
            {/* Header with Layer Toggle */}
            <div className="shrink-0 px-4 py-3 flex items-center justify-between border-b border-[var(--blueprint-accent)]/10">
                <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-[var(--blueprint-accent)] neon-pulse" />
                    <span className="blueprint-mono text-[var(--blueprint-accent)] text-xs font-bold uppercase">
                        {rowData.filter(r => r.buckets > 0).length}/{rows} Filas Activas
                    </span>
                </div>

                <button
                    onClick={() => setShowLayers(!showLayers)}
                    className={`px-3 py-1.5 rounded-lg blueprint-mono text-xs font-bold transition-all ${showLayers
                            ? 'bg-[var(--blueprint-accent)] text-black'
                            : 'border border-[var(--blueprint-accent)]/30 text-[var(--blueprint-accent)]'
                        }`}
                >
                    <span className="material-symbols-outlined text-sm mr-1">layers</span>
                    CAPAS
                </button>
            </div>

            {/* Layers Panel */}
            {showLayers && (
                <div className="absolute top-14 right-4 z-20 blueprint-bg border border-[var(--blueprint-accent)]/30 rounded-xl p-4 w-48 shadow-xl">
                    <h4 className="blueprint-mono text-[var(--blueprint-muted)] text-xs uppercase mb-3">Visibilidad</h4>

                    {/* Layer Toggles */}
                    {[
                        { key: 'workers' as const, label: 'Trabajadores', color: 'var(--blueprint-accent)' },
                        { key: 'bins' as const, label: 'Bins', color: 'var(--blueprint-warning)' },
                        { key: 'qcAlerts' as const, label: 'Alertas QC', color: 'var(--blueprint-qc-alert)' }
                    ].map(layer => (
                        <button
                            key={layer.key}
                            onClick={() => toggleLayer(layer.key)}
                            className="w-full flex items-center gap-3 py-2 text-left"
                        >
                            <span
                                className={`w-3 h-3 rounded-sm transition-all ${layers[layer.key] ? 'neon-glow' : 'opacity-30'}`}
                                style={{ backgroundColor: layer.color }}
                            />
                            <span className={`blueprint-mono text-xs ${layers[layer.key] ? 'text-[var(--blueprint-text)]' : 'text-[var(--blueprint-muted)]'}`}>
                                {layer.label}
                            </span>
                        </button>
                    ))}

                    {/* Team Filter */}
                    <div className="mt-4 pt-3 border-t border-[var(--blueprint-accent)]/10">
                        <h4 className="blueprint-mono text-[var(--blueprint-muted)] text-xs uppercase mb-2">Filtrar Equipo</h4>
                        <select
                            value={teamFilter || ''}
                            onChange={(e) => setTeamFilter(e.target.value || null)}
                            className="w-full bg-[var(--blueprint-grid)] border border-[var(--blueprint-accent)]/20 rounded-lg px-2 py-1.5 text-[var(--blueprint-text)] blueprint-mono text-xs"
                        >
                            <option value="">Todos</option>
                            {teamLeaders.map(tl => (
                                <option key={tl.id} value={tl.id}>{tl.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            {/* DataLines Grid */}
            <div className="flex-1 p-4 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                <div className="space-y-2">
                    {rowData.map((row) => {
                        const visibleWorkers = layers.workers
                            ? row.workers.filter(w => !teamFilter || w.team_leader_id === teamFilter || w.id === teamFilter)
                            : [];

                        return (
                            <button
                                key={row.rowNumber}
                                onClick={() => onRowClick?.(row.rowNumber)}
                                className="w-full group relative"
                            >
                                {/* Row Label */}
                                <div className="flex items-center gap-3">
                                    <span className="blueprint-mono text-[var(--blueprint-muted)] text-xs w-8 text-right">
                                        F{row.rowNumber.toString().padStart(2, '0')}
                                    </span>

                                    {/* Data Line */}
                                    <div className="flex-1 relative h-8 flex items-center">
                                        {/* Background Line */}
                                        <div className="absolute inset-y-0 left-0 right-0 flex items-center">
                                            <div
                                                className="w-full rounded-full bg-[var(--blueprint-grid)] transition-all group-hover:bg-[var(--blueprint-accent)]/10"
                                                style={{ height: `${row.thickness}px` }}
                                            />
                                        </div>

                                        {/* Progress Fill */}
                                        <div
                                            className="absolute left-0 rounded-full bg-[var(--blueprint-accent)]/40 transition-all"
                                            style={{
                                                height: `${row.thickness}px`,
                                                width: `${row.progress * 100}%`,
                                                boxShadow: row.buckets > 0 ? '0 0 10px var(--blueprint-accent-dim)' : 'none'
                                            }}
                                        />

                                        {/* Ghost Trajectory (prediction line) */}
                                        {row.workers.length > 0 && (
                                            <div
                                                className="absolute rounded-full opacity-20"
                                                style={{
                                                    height: '1px',
                                                    left: `${row.progress * 100}%`,
                                                    right: '0',
                                                    background: `repeating-linear-gradient(90deg, var(--blueprint-accent), var(--blueprint-accent) 4px, transparent 4px, transparent 8px)`
                                                }}
                                            />
                                        )}

                                        {/* Worker Dots */}
                                        {visibleWorkers.map((worker, idx) => (
                                            <div
                                                key={worker.id}
                                                className="absolute w-3 h-3 rounded-full bg-[var(--blueprint-accent)] neon-pulse z-10"
                                                style={{
                                                    left: `${Math.min(95, (row.progress * 100) + (idx * 3))}%`,
                                                    transform: 'translateX(-50%)'
                                                }}
                                                title={worker.name}
                                            />
                                        ))}

                                        {/* Bin Markers (Yellow Diamonds) */}
                                        {layers.bins && row.buckets > 0 && (
                                            <div
                                                className="absolute w-2.5 h-2.5 bg-[var(--blueprint-warning)] rotate-45 z-10"
                                                style={{
                                                    left: `${Math.max(5, row.progress * 80)}%`,
                                                    transform: 'translateX(-50%)',
                                                    boxShadow: '0 0 8px var(--blueprint-warning)'
                                                }}
                                            />
                                        )}

                                        {/* QC Alert Marker */}
                                        {layers.qcAlerts && row.hasQcAlert && (
                                            <div
                                                className="absolute w-2.5 h-2.5 rounded-full bg-[var(--blueprint-qc-alert)] z-10 animate-pulse"
                                                style={{
                                                    left: '30%',
                                                    transform: 'translateX(-50%)',
                                                    boxShadow: '0 0 8px var(--blueprint-qc-alert)'
                                                }}
                                            />
                                        )}
                                    </div>

                                    {/* Bucket Count */}
                                    <span className={`blueprint-mono text-xs w-12 text-right ${row.buckets > 0 ? 'text-[var(--blueprint-accent)]' : 'text-[var(--blueprint-muted)]'
                                        }`}>
                                        {row.buckets > 0 ? row.buckets : '--'}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Legend */}
            <div className="shrink-0 px-4 py-2 border-t border-[var(--blueprint-accent)]/10 flex items-center justify-center gap-6">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[var(--blueprint-accent)]" />
                    <span className="blueprint-mono text-[var(--blueprint-muted)] text-[10px] uppercase">Picker</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[var(--blueprint-warning)] rotate-45" />
                    <span className="blueprint-mono text-[var(--blueprint-muted)] text-[10px] uppercase">Bin</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[var(--blueprint-qc-alert)]" />
                    <span className="blueprint-mono text-[var(--blueprint-muted)] text-[10px] uppercase">QC Alert</span>
                </div>
            </div>
        </div>
    );
};

export default HeatMapView;
