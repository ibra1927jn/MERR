/**
 * RowDetailDrawer.tsx - Panel deslizante para detalles de fila
 * Se abre al tocar una fila en el HeatMap
 * Muestra métricas en tiempo real y permite reasignación
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

    // Find team leader in this row
    const teamLeader = workers.find(w => w.role === 'team_leader');

    // Calculate productivity
    const totalHours = workers.reduce((sum, w) => sum + (w.hours || 0), 0);
    const bucketsPerHour = totalHours > 0 ? Math.round(buckets / totalHours * 10) / 10 : 0;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 z-40 animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300"
                style={{ maxHeight: '45vh' }}
            >
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-2">
                    <div className="w-12 h-1 bg-slate-300 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-6 pb-4 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-black text-slate-900">
                                Fila {rowNumber}
                            </h3>
                            <p className="text-sm text-slate-500 font-medium">
                                {workers.length} trabajadores • {bucketsPerHour} cubos/hora
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl">
                                <span className="text-2xl font-black">{buckets}</span>
                                <span className="text-xs font-bold ml-1">cubos</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Workers List */}
                <div className="px-6 py-4 overflow-y-auto" style={{ maxHeight: '20vh' }}>
                    {workers.length === 0 ? (
                        <div className="text-center py-6 text-slate-400">
                            <span className="material-symbols-outlined text-4xl mb-2 block">group_off</span>
                            <p className="text-sm font-medium">Sin equipo asignado</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {workers.map(worker => (
                                <div
                                    key={worker.id}
                                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${worker.role === 'team_leader' ? 'bg-purple-500' : 'bg-emerald-500'
                                        }`}>
                                        {worker.avatar || worker.name?.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-900 text-sm truncate">
                                            {worker.name}
                                            {worker.role === 'team_leader' && (
                                                <span className="ml-2 text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">
                                                    LÍDER
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {worker.total_buckets_today || 0} cubos hoy
                                        </p>
                                    </div>
                                    <div className={`px-2 py-1 rounded-lg text-xs font-bold ${worker.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                                            worker.status === 'break' || worker.status === 'on_break' ? 'bg-amber-100 text-amber-700' :
                                                'bg-slate-100 text-slate-500'
                                        }`}>
                                        {worker.status === 'active' ? 'Activo' :
                                            worker.status === 'break' || worker.status === 'on_break' ? 'Descanso' : 'Inactivo'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
                    <button
                        onClick={onReassign}
                        className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                    >
                        <span className="material-symbols-outlined text-lg">swap_horiz</span>
                        Reasignar Equipo
                    </button>
                    {teamLeader && (
                        <button
                            onClick={() => onMessage(teamLeader.id)}
                            className="py-3 px-4 bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
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
