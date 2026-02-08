// components/views/team-leader/TasksView.tsx
import React from 'react';
import { useHarvest } from '../../../context/HarvestContext';

const TasksView = () => {
    const { broadcasts, rowAssignments, orchard } = useHarvest();

    // Get latest urgent/high priority broadcast
    const latestAlert = broadcasts?.find(b => b.priority === 'urgent' || b.priority === 'high');

    return (
        <div>
            <header className="sticky top-0 z-30 bg-surface-white/95 backdrop-blur-sm border-b border-border-light pb-3 pt-4 shadow-sm">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center size-10 rounded-full bg-white border border-primary-vibrant/20 text-primary-vibrant shadow-[0_2px_8px_rgba(217,30,54,0.15)]">
                            <span className="material-symbols-outlined text-[24px]">grid_view</span>
                        </div>
                        <div>
                            <h1 className="text-text-main text-lg font-bold leading-tight tracking-tight">Row Logistics</h1>
                            <p className="text-xs text-text-sub font-medium">{orchard?.id || 'Block 5B'} • Gala Apples</p>
                        </div>
                    </div>
                </div>

            </header>

            <main className="px-4 mt-6 pb-24">
                {/* Broadcast Banner - Dynamic */}
                {latestAlert && (
                    <section className="mb-6">
                        <div className={`bg-white rounded-xl p-4 border shadow-[0_2px_8px_rgba(255,31,61,0.08)] relative overflow-hidden bg-gradient-to-r ${latestAlert.priority === 'urgent' ? 'from-red-50/50 to-white border-red-500/30' : 'from-orange-50/50 to-white border-orange-500/30'
                            }`}>
                            <div className="flex items-start gap-3">
                                <div className={`flex-shrink-0 size-8 rounded-full flex items-center justify-center mt-0.5 ${latestAlert.priority === 'urgent' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
                                    }`}>
                                    <span className="material-symbols-outlined text-sm">priority_high</span>
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <h3 className="text-text-main font-bold text-sm">{latestAlert.title}</h3>
                                        <span className="text-[10px] text-text-sub font-mono">
                                            {new Date(latestAlert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-text-main mt-1 leading-snug">{latestAlert.message}</p>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                <div className="bg-white rounded-2xl border border-border-light shadow-sm overflow-hidden min-h-[200px]">
                    <div className="p-4 bg-gray-50 border-b border-border-light flex justify-between items-center">
                        <span className="text-sm font-bold text-text-main">
                            Active Rows ({rowAssignments?.length || 0})
                        </span>
                        <button className="text-xs text-primary-vibrant font-semibold flex items-center gap-1">
                            Edit Range <span className="material-symbols-outlined text-[14px]">edit</span>
                        </button>
                    </div>

                    {/* Dynamic Row List */}
                    {rowAssignments && rowAssignments.length > 0 ? (
                        rowAssignments.map((assignment) => (
                            <div key={assignment.id} className="p-4 border-b border-border-light last:border-0">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="size-6 bg-primary text-white rounded flex items-center justify-center text-xs font-bold">
                                            {assignment.row_number}
                                        </span>
                                        <span className="text-sm font-semibold text-text-main capitalize">
                                            {assignment.side || 'Center'} Side
                                        </span>
                                    </div>
                                    {assignment.assigned_pickers?.length > 0 ? (
                                        <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                            {assignment.assigned_pickers.length} Active
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                            Empty
                                        </span>
                                    )}
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden mt-2">
                                    {/* Simulated progress for now as per instructions */}
                                    <div
                                        className="bg-green-500 h-1.5 rounded-full"
                                        style={{ width: `${assignment.completion_percentage || (assignment.assigned_pickers.length * 10)}%` }} // Mock calc
                                    ></div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-8 text-center text-gray-400 text-sm">
                            No rows currently active.
                        </div>
                    )}
                </div>

                {/* FAB */}
                <div className="fixed bottom-24 right-4 z-40">
                    <button aria-label="Add Row Assignment" className="size-14 rounded-full bg-primary-vibrant text-white shadow-[0_4px_14px_rgba(255,31,61,0.4)] flex items-center justify-center hover:bg-primary-dim transition-transform active:scale-95">
                        <span className="material-symbols-outlined text-[28px]">add_location_alt</span>
                    </button>
                </div>
            </main>
        </div>
    );
};

export default TasksView;
