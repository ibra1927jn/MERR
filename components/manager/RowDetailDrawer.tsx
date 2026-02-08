/**
 * RowDetailDrawer.tsx - Blueprint Theme
 * Sliding panel for row details with ETA prediction
 */
import React, { useMemo } from 'react';
import { Picker } from '../../types';

interface RowDetailDrawerProps {
    isOpen: boolean;
    rowNumber: number;
    buckets: number;
    workers: Picker[];
    onClose: () => void;
    onReassign: () => void;
    onMessage: (leaderId: string) => void;
}

const RowDetailDrawer: React.FC<RowDetailDrawerProps> = ({
    isOpen,
    rowNumber,
    buckets,
    workers,
    onClose,
    onReassign,
    onMessage
}) => {
    if (!isOpen) return null;

    const teamLeader = workers.find(w => w.role === 'team_leader');

    // Calculate productivity and ETA
    const totalHours = workers.reduce((sum, w) => sum + (w.hours || 1), 0);
    const bucketsPerHour = totalHours > 0 ? Math.round(buckets / totalHours * 10) / 10 : 0;

    // Estimate completion (mock: 100 buckets per row)
    const remainingBuckets = Math.max(0, 100 - buckets);
    const etaMinutes = bucketsPerHour > 0 ? Math.round(remainingBuckets / bucketsPerHour * 60) : 0;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 z-40"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed bottom-0 left-0 right-0 z-50 blueprint-bg border-t border-[var(--blueprint-accent)]/30 rounded-t-2xl shadow-2xl"
                style={{ maxHeight: '50vh' }}
            >
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-2">
                    <div className="w-12 h-1 bg-[var(--blueprint-accent)]/30 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-6 pb-4 border-b border-[var(--blueprint-accent)]/10">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="blueprint-mono text-[var(--blueprint-text)] font-bold text-xl uppercase tracking-wider">
                                FILA {rowNumber.toString().padStart(2, '0')}
                            </h3>
                            <div className="flex items-center gap-4 mt-1">
                                <span className="blueprint-mono text-[var(--blueprint-muted)] text-xs">
                                    {workers.length} TRABAJADORES
                                </span>
                                <span className="blueprint-mono text-[var(--blueprint-accent)] text-xs">
                                    {bucketsPerHour} CUBOS/HORA
                                </span>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-4">
                            <div className="text-center">
                                <span className="block blueprint-mono text-2xl font-bold text-[var(--blueprint-accent)] neon-text">
                                    {buckets}
                                </span>
                                <span className="blueprint-mono text-[10px] text-[var(--blueprint-muted)] uppercase">Cubos</span>
                            </div>
                            {etaMinutes > 0 && (
                                <div className="text-center pl-4 border-l border-[var(--blueprint-accent)]/20">
                                    <span className="block blueprint-mono text-2xl font-bold text-[var(--blueprint-warning)]">
                                        {etaMinutes}m
                                    </span>
                                    <span className="blueprint-mono text-[10px] text-[var(--blueprint-muted)] uppercase">ETA</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Workers List */}
                <div className="px-6 py-4 overflow-y-auto" style={{ maxHeight: '25vh' }}>
                    {workers.length === 0 ? (
                        <div className="text-center py-6">
                            <span className="material-symbols-outlined text-4xl text-[var(--blueprint-muted)] mb-2 block">group_off</span>
                            <p className="blueprint-mono text-[var(--blueprint-muted)] text-sm">SIN EQUIPO ASIGNADO</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {workers.map(worker => (
                                <div
                                    key={worker.id}
                                    className="flex items-center gap-3 p-3 bg-[var(--blueprint-grid)] rounded-lg border border-[var(--blueprint-accent)]/10"
                                >
                                    {/* Status Dot */}
                                    <div className={`w-2.5 h-2.5 rounded-full ${worker.status === 'active' ? 'bg-[var(--blueprint-accent)] neon-pulse' :
                                            worker.status === 'break' || worker.status === 'on_break' ? 'bg-[var(--blueprint-warning)]' :
                                                'bg-[var(--blueprint-muted)]'
                                        }`} />

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="blueprint-mono text-[var(--blueprint-text)] text-sm font-bold truncate">
                                            {worker.name}
                                            {worker.role === 'team_leader' && (
                                                <span className="ml-2 text-[10px] bg-[var(--blueprint-accent)]/20 text-[var(--blueprint-accent)] px-2 py-0.5 rounded font-bold">
                                                    LÍDER
                                                </span>
                                            )}
                                        </p>
                                    </div>

                                    {/* Buckets */}
                                    <span className="blueprint-mono text-[var(--blueprint-accent)] text-sm font-bold">
                                        {worker.total_buckets_today || 0}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="px-6 py-4 border-t border-[var(--blueprint-accent)]/10 flex gap-3">
                    <button
                        onClick={onReassign}
                        className="flex-1 py-3 bg-[var(--blueprint-accent)] text-black rounded-lg font-bold blueprint-mono uppercase tracking-wide flex items-center justify-center gap-2 active:scale-[0.98] transition-all neon-glow"
                    >
                        <span className="material-symbols-outlined text-lg">swap_horiz</span>
                        Reasignar
                    </button>
                    {teamLeader && (
                        <button
                            onClick={() => onMessage(teamLeader.id)}
                            className="py-3 px-4 bg-[var(--blueprint-grid)] border border-[var(--blueprint-accent)]/30 text-[var(--blueprint-accent)] rounded-lg font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:neon-glow"
                        >
                            <span className="material-symbols-outlined text-lg">chat</span>
                        </button>
                    )}
                </div>
            </div>
        </>
    );
};

export default RowDetailDrawer;
