import React, { useState, useMemo } from 'react';
import { useHarvest } from '../../../context/HarvestContext';
import RowAssignmentModal, { PickerForAssignment } from '../../modals/RowAssignmentModal';
import HeatMapView from '../../manager/HeatMapView';

const TARGET_BUCKETS_PER_ROW = 60; // Valor de referencia para la barra de progreso

const TasksView = () => {
    const { broadcasts, rowAssignments, orchard, bucketRecords, assignRow, crew } = useHarvest();
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Obtener última alerta
    const latestAlert = broadcasts?.find(b => b.priority === 'urgent' || b.priority === 'high');

    // Filtro para el mapa (Registros de hoy)
    const todayRecords = useMemo(() => bucketRecords.filter(r =>
        new Date(r.scanned_at).toDateString() === new Date().toDateString()
    ), [bucketRecords]);

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
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header Flotante sobre el mapa */}
            <div className="absolute top-0 left-0 w-full z-20 bg-gradient-to-b from-black/50 to-transparent p-4 pb-12 pointer-events-none">
                <div className="flex justify-between items-center pointer-events-auto">
                    <div>
                        <h1 className="text-lg font-bold text-white shadow-sm">Operations Map</h1>
                        <p className="text-xs text-white/90 font-medium shadow-sm">{orchard?.name || 'Loading...'}</p>
                    </div>
                </div>
            </div>

            {/* MITAD SUPERIOR: MAPA */}
            <div className="h-[50vh] w-full relative z-0 bg-slate-200">
                <HeatMapView
                    bucketRecords={todayRecords}
                    crew={crew}
                    rows={orchard?.total_rows || 50}
                />
            </div>

            {/* MITAD INFERIOR: LISTA DE TAREAS */}
            <div className="flex-1 bg-white -mt-6 rounded-t-3xl relative z-10 overflow-y-auto shadow-lg pb-24">
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-3"></div>

                <div className="px-4 space-y-4">
                    {/* BROADCAST BANNER (Moved here for visibility) */}
                    {latestAlert && (
                        <div className={`rounded-xl p-4 border shadow-sm relative overflow-hidden ${latestAlert.priority === 'urgent' ? 'border-red-500/30 bg-red-50/50' : 'border-orange-500/30 bg-orange-50/50'
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
                    )}

                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-bold text-slate-500 uppercase">Active Rows</h3>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="text-primary-vibrant text-xs font-bold uppercase flex items-center gap-1 bg-red-50 px-2 py-1 rounded-lg"
                        >
                            <span className="material-symbols-outlined text-sm">add</span> Assign Row
                        </button>
                    </div>

                    {rowAssignments && rowAssignments.length > 0 ? (
                        <div className="space-y-3">
                            {rowAssignments.map((assignment) => {
                                const progress = getRowProgress(assignment.row_number);
                                return (
                                    <div key={assignment.id} className="p-4 border border-slate-100 rounded-xl bg-white shadow-sm">
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="flex items-center gap-3">
                                                <span className="size-8 bg-slate-900 text-white rounded-lg flex items-center justify-center text-sm font-bold shadow-sm">
                                                    {assignment.row_number}
                                                </span>
                                                <div>
                                                    <span className="text-sm font-bold text-slate-900 capitalize block">
                                                        {assignment.side || 'Center'} Side
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-medium">
                                                        {assignment.assigned_pickers?.length || 0} Pickers Active
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <span className="text-xs font-bold text-slate-700">
                                                    {Math.round(progress)}%
                                                </span>
                                            </div>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden relative">
                                            <div
                                                className="bg-[#22c55e] h-2 rounded-full transition-all duration-1000 ease-out"
                                                style={{ width: `${progress}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center p-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                            <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">assignment_add</span>
                            <p className="text-slate-400 text-sm font-medium">No rows assigned yet.</p>
                            <button onClick={() => setIsModalOpen(true)} className="text-primary-vibrant text-xs font-bold mt-2 uppercase">Tap + button to assign</button>
                        </div>
                    )}
                </div>
            </div>

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
