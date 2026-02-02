/**
 * RunnersView Component - Bucket Runners Management
 */
import React from 'react';
import { RunnerData } from '../../modals';

interface RunnersViewProps {
    runners: RunnerData[];
    onAddRunner: () => void;
    onViewRunner: (runner: RunnerData) => void;
}

export const RunnersView: React.FC<RunnersViewProps> = ({ runners, onAddRunner, onViewRunner }) => (
    <main className="flex-1 overflow-y-auto pb-32 px-4 pt-4">
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-gray-900">Active Runners</h3>
            <span className="px-3 py-1 bg-[#ff1f3d]/10 text-[#ff1f3d] text-sm font-bold rounded-full">{runners.length} Active</span>
        </div>

        {runners.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-sm">
                <span className="material-symbols-outlined text-gray-300 text-6xl mb-3">local_shipping</span>
                <h4 className="text-lg font-bold text-gray-900 mb-1">No Runners Active</h4>
                <p className="text-sm text-gray-500 mb-4">Add runners to track their activity and bucket collection</p>
                <button
                    onClick={onAddRunner}
                    className="px-6 py-3 bg-[#ff1f3d] text-white rounded-xl font-bold text-sm inline-flex items-center gap-2 active:scale-95 transition-transform"
                >
                    <span className="material-symbols-outlined">person_add</span>
                    Add First Runner
                </button>
            </div>
        ) : (
            <div className="space-y-4">
                {runners.map(runner => (
                    <div key={runner.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="relative">
                                <div className="size-12 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-700 text-lg">
                                    {runner.avatar}
                                </div>
                                <span className={`absolute bottom-0 right-0 size-3 rounded-full border-2 border-white ${runner.status === 'Active' ? 'bg-green-500' :
                                    runner.status === 'Break' ? 'bg-orange-500' : 'bg-gray-400'}`}></span>
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-gray-900">{runner.name}</h4>
                                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                                    Started {runner.startTime}
                                </div>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${runner.status === 'Active' ? 'bg-green-100 text-green-700' :
                                runner.status === 'Break' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                                {runner.status}
                            </span>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-3 mb-3">
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div>
                                    <p className="text-xl font-black text-[#ff1f3d]">{runner.bucketsHandled}</p>
                                    <p className="text-[10px] text-gray-500 uppercase font-bold">Buckets</p>
                                </div>
                                <div>
                                    <p className="text-xl font-black text-gray-900">{runner.binsCompleted}</p>
                                    <p className="text-[10px] text-gray-500 uppercase font-bold">Bins</p>
                                </div>
                                <div>
                                    <p className="text-xl font-black text-blue-600">{runner.currentRow || '-'}</p>
                                    <p className="text-[10px] text-gray-500 uppercase font-bold">Row</p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => onViewRunner(runner)}
                            className="w-full py-2.5 bg-[#ff1f3d] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
                        >
                            Manage Runner
                            <span className="material-symbols-outlined text-lg">arrow_forward</span>
                        </button>
                    </div>
                ))}
            </div>
        )}
    </main>
);

export default RunnersView;
