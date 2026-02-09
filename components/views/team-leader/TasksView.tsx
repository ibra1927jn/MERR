import React, { useState } from 'react';
import { useHarvest } from '../../../context/HarvestContext';
import RowAssignmentModal, { PickerForAssignment } from '../../modals/RowAssignmentModal';
import HeatMapView from '../../manager/HeatMapView'; // Importamos el mapa

const TARGET_BUCKETS_PER_ROW = 60; // Valor de referencia para la barra de progreso

const TasksView = () => {
    const { broadcasts, rowAssignments, orchard, bucketRecords, assignRow, crew } = useHarvest();
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Obtener última alerta
    const latestAlert = broadcasts?.find(b => b.priority === 'urgent' || b.priority === 'high');

    // Filtro para el mapa (Registros de hoy)
    const todayRecords = bucketRecords.filter(r =>
        new Date(r.scanned_at).toDateString() === new Date().toDateString()
    );

    // Función auxiliar para calcular progreso
    const getRowProgress = (rowNumber: number) => {
        const rowBuckets = bucketRecords.filter(
            r => r.row_number === rowNumber &&
                new Date(r.scanned_at).toDateString() === new Date().toDateString()
        ).length;

        return Math.min((rowBuckets / TARGET_BUCKETS_PER_ROW) * 100, 100);
    };

    // Prepare pickers for modal
    const pickersForAssignment: PickerForAssignment[] = crew.map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        idNumber: p.picker_id,
        status: p.status === 'active' ? 'Active' : p.status === 'break' ? 'Break' : 'Off Duty'
    }));

    return (
        <div className="pb-24">
            {/* Header Fusionado */}
            <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-border-light p-4 shadow-sm">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-lg font-bold text-slate-900">Map & Tasks</h1>
                        <p className="text-xs text-slate-500 font-medium">{orchard?.name || 'Loading...'}</p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-[#ff1f3d] text-white size-10 rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform"
                    >
                        <span className="material-symbols-outlined">add</span>
                    </button>
                </div>
            </header>

            <main className="p-4 space-y-6">
                {/* BROADCAST BANNER */}
                {latestAlert && (
                    <section className="mb-6">
                        <div className={`bg-white rounded-xl p-4 border shadow-sm relative overflow-hidden ${latestAlert.priority === 'urgent' ? 'border-red-500/30 bg-red-50/50' : 'border-orange-500/30 bg-orange-50/50'
                            }`}>
                            <div className="flex items-start gap-3">
                                <div className={`flex-shrink-0 size-8 rounded-full flex items-center justify-center mt-0.5 ${latestAlert.priority === 'urgent' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
                                    }`}>
                                    <span className="material-symbols-outlined text-sm">priority_high</span>
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <h3 className="text-slate-900 font-bold text-sm">{latestAlert.title}</h3>
                                        <span className="text-[10px] text-slate-500 font-mono">
                                            {new Date(latestAlert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-700 mt-1 leading-snug">{latestAlert.message}</p>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* 1. SECCIÓN MAPA (Integrada) */}
                <section className="bg-white rounded-2xl border border-border-light shadow-sm overflow-hidden h-[250px] relative">
                    <HeatMapView
                        bucketRecords={todayRecords}
                        crew={crew}
                        rows={orchard?.total_rows || 50}
                    />
                    <div className="absolute top-2 right-2 bg-white/80 px-2 py-1 rounded text-[10px] font-bold backdrop-blur-md text-slate-600">
                        LIVE VIEW
                    </div>
                </section>

                {/* 2. LISTA DE TAREAS (Row Assignments) */}
                <section>
                    <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">Active Rows</h3>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[100px]">
                        {rowAssignments && rowAssignments.length > 0 ? (
                            rowAssignments.map((assignment) => {
                                const progress = getRowProgress(assignment.row_number);
                                return (
                                    <div key={assignment.id} className="p-4 border-b border-slate-100 last:border-0">
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="size-6 bg-[#22c55e] text-white rounded flex items-center justify-center text-xs font-bold">
                                                    {assignment.row_number}
                                                </span>
                                                <span className="text-sm font-semibold text-slate-900 capitalize">
                                                    {assignment.side || 'Center'} Side
                                                </span>
                                            </div>
                                            <div className="flex gap-2">
                                                <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                                    {Math.round(progress)}% Done
                                                </span>
                                                {assignment.assigned_pickers?.length > 0 && (
                                                    <span className="text-[10px] font-bold bg-[#22c55e]/10 text-[#22c55e] px-2 py-0.5 rounded-full">
                                                        {assignment.assigned_pickers.length} Active
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden mt-2 relative">
                                            <div
                                                className="bg-[#22c55e] h-1.5 rounded-full transition-all duration-1000 ease-out"
                                                style={{ width: `${progress}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center p-8">
                                <p className="text-gray-400 text-sm">No rows assigned yet.</p>
                            </div>
                        )}
                    </div>
                </section>
            </main>

            {isModalOpen && (
                <RowAssignmentModal
                    onClose={() => setIsModalOpen(false)}
                    onAssign={(row, side, pickers) => assignRow(row, side.toLowerCase() as 'north' | 'south', pickers)}
                    pickers={pickersForAssignment}
                />
            )}
        </div>
    );
};

export default TasksView;
