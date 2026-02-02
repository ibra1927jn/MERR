/**
 * TasksView Component - Row Assignments and Progress
 */
import React from 'react';
import { useHarvest } from '../../../context/HarvestContext';

interface UIPicker {
    id: string;
    name: string;
    avatar: string;
    idNumber: string;
    harnessNumber: string;
    startTime: string;
    assignedRow?: number;
    bucketsToday: number;
    hoursWorked: number;
    hourlyRate: number;
    status: 'Active' | 'Break' | 'Below Minimum' | 'Off Duty';
    earningsToday: number;
    qcStatus: ('excellent' | 'good' | 'warning')[];
}

interface UIRowAssignment {
    rowNumber: number;
    side: 'North' | 'South';
    assignedPickers: string[];
    completionPercentage: number;
    status: 'Active' | 'Assigned' | 'Completed';
}

interface TasksViewProps {
    rowAssignments: UIRowAssignment[];
    pickers: UIPicker[];
    onAssignRow: () => void;
}

export const TasksView: React.FC<TasksViewProps> = ({ rowAssignments, pickers, onAssignRow }) => {
    const { broadcasts } = useHarvest();
    const broadcast = broadcasts.length > 0 ? broadcasts[0].content : null;
    const avgCompletion = rowAssignments.length > 0 ? rowAssignments.reduce((sum, r) => sum + r.completionPercentage, 0) / rowAssignments.length : 0;

    return (
        <main className="flex-1 overflow-y-auto pb-32 px-4 pt-4 space-y-6">
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] text-gray-500 uppercase">Block Completion</span>
                    <span className="text-[10px] font-bold text-[#ff1f3d]">{avgCompletion.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-gradient-to-r from-[#ff1f3d] to-[#d91e36] h-2 rounded-full" style={{ width: `${avgCompletion}%` }}></div>
                </div>
            </div>

            {broadcast && (
                <div className="bg-gradient-to-r from-red-50 to-white rounded-xl p-4 border border-[#ff1f3d]/30">
                    <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-[#ff1f3d]">priority_high</span>
                        <div><h3 className="text-gray-900 font-bold text-sm">Manager Broadcast</h3><p className="text-sm text-gray-700">{broadcast}</p></div>
                    </div>
                </div>
            )}

            <div>
                <h2 className="text-lg font-bold text-[#d91e36] mb-4">Row Assignments</h2>
                {rowAssignments.length === 0 ? (
                    <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
                        <span className="material-symbols-outlined text-gray-300 text-6xl mb-3">grid_view</span>
                        <p className="text-gray-500 mb-4">No rows assigned yet</p>
                        <button onClick={onAssignRow} className="px-6 py-3 bg-[#ff1f3d] text-white rounded-lg font-bold">Assign First Row</button>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden divide-y divide-gray-200">
                        {rowAssignments.map(row => (
                            <div key={`${row.rowNumber}-${row.side}`} className="p-4">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="size-6 bg-[#d91e36] text-white rounded flex items-center justify-center text-xs font-bold">{row.rowNumber}</span>
                                        <span className="text-sm font-semibold text-gray-900">{row.side} Side</span>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${row.status === 'Active' ? 'bg-green-100 text-green-700' : row.status === 'Completed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{row.status}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                                    <div className="flex -space-x-2">
                                        {pickers.filter(p => row.assignedPickers.includes(p.id)).map(p => (
                                            <div key={p.id} className="size-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[10px] font-bold">{p.avatar}</div>
                                        ))}
                                    </div>
                                    <span>{row.completionPercentage}%</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                    <div className={`h-1.5 rounded-full ${row.status === 'Completed' ? 'bg-blue-500' : 'bg-[#ff1f3d]'}`} style={{ width: `${row.completionPercentage}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
};

export default TasksView;
