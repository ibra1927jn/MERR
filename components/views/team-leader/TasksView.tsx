// components/views/team-leader/TasksView.tsx
import React from 'react';

const TasksView = () => {
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
                            <p className="text-xs text-text-sub font-medium">Block 5B • Gala Apples</p>
                        </div>
                    </div>
                </div>
                <div className="px-4 mt-1">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-medium text-text-sub uppercase tracking-wide">Block Completion</span>
                        <span className="text-[10px] font-bold text-primary-vibrant">42%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-gradient-to-r from-primary-vibrant to-primary h-1.5 rounded-full" style={{ width: '42%' }}></div>
                    </div>
                </div>
            </header>

            <main className="px-4 mt-6 pb-24">
                {/* Broadcast Banner */}
                <section className="mb-6">
                    <div className="bg-white rounded-xl p-4 border border-primary-vibrant/30 shadow-[0_2px_8px_rgba(255,31,61,0.08)] relative overflow-hidden bg-gradient-to-r from-red-50/50 to-white">
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 size-8 rounded-full bg-red-100 flex items-center justify-center text-primary-vibrant mt-0.5">
                                <span className="material-symbols-outlined text-sm">priority_high</span>
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h3 className="text-text-main font-bold text-sm">Storm Alert Incoming</h3>
                                    <span className="text-[10px] text-text-sub font-mono">10:42 AM</span>
                                </div>
                                <p className="text-sm text-text-main mt-1 leading-snug">Heavy rain expected at 2 PM. Prepare to cover bins.</p>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="bg-white rounded-2xl border border-border-light shadow-sm overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b border-border-light flex justify-between items-center">
                        <span className="text-sm font-bold text-text-main">Rows 12 - 18</span>
                        <button className="text-xs text-primary-vibrant font-semibold flex items-center gap-1">
                            Edit Range <span className="material-symbols-outlined text-[14px]">edit</span>
                        </button>
                    </div>
                    {/* Row Item */}
                    <div className="p-4 border-b border-border-light">
                        <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                                <span className="size-6 bg-primary text-white rounded flex items-center justify-center text-xs font-bold">12</span>
                                <span className="text-sm font-semibold text-text-main">South Side</span>
                            </div>
                            <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Active</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden mt-2">
                            <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '80%' }}></div>
                        </div>
                    </div>
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
