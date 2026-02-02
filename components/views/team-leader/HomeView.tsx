/**
 * HomeView Component - Team Leader Dashboard
 * Shows KPIs, performance alerts, and crew overview
 */
import React from 'react';

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

interface HomeViewProps {
    pickers: UIPicker[];
    onViewPicker: (picker: UIPicker) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ pickers, onViewPicker }) => {
    const totalBuckets = pickers.reduce((sum, p) => sum + p.bucketsToday, 0);
    const totalEarnings = pickers.reduce((sum, p) => sum + p.earningsToday, 0);
    const activeCount = pickers.filter(p => p.status !== 'Off Duty').length;
    const belowMinimum = pickers.filter(p => p.status === 'Below Minimum');

    return (
        <main className="flex-1 overflow-y-auto pb-24 px-4 pt-4 space-y-6">
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                    <span className="text-[10px] text-gray-500 uppercase font-semibold">Buckets</span>
                    <span className="text-[#ff1f3d] text-2xl font-black font-mono block">{totalBuckets}</span>
                </div>
                <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                    <span className="text-[10px] text-gray-500 uppercase font-semibold">Pay Est.</span>
                    <span className="text-gray-900 text-2xl font-black font-mono block">${totalEarnings >= 1000 ? (totalEarnings / 1000).toFixed(1) + 'k' : totalEarnings.toFixed(0)}</span>
                </div>
                <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                    <span className="text-[10px] text-gray-500 uppercase font-semibold">Active</span>
                    <span className="text-gray-900 text-2xl font-black font-mono block">{activeCount}</span>
                </div>
            </div>

            {belowMinimum.length > 0 && (
                <div className="bg-gradient-to-r from-red-50 to-white rounded-2xl p-5 border border-[#ff1f3d]/30">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="material-symbols-outlined text-[#ff1f3d]">warning</span>
                        <h2 className="text-lg font-bold text-[#d91e36]">Performance Alert</h2>
                        <span className="bg-red-100 text-[#ff1f3d] text-[10px] px-2 py-1 rounded-full font-bold animate-pulse">{belowMinimum.length}</span>
                    </div>
                    <div className="space-y-2">
                        {belowMinimum.slice(0, 2).map(picker => (
                            <div key={picker.id} className="bg-white rounded-lg p-3 border border-red-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="size-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-700 text-xs">{picker.avatar}</div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">{picker.name}</p>
                                        <p className="text-xs text-gray-500">{(picker.bucketsToday / Math.max(picker.hoursWorked, 0.1)).toFixed(1)} bkt/hr</p>
                                    </div>
                                </div>
                                <button onClick={() => onViewPicker(picker)} className="px-3 py-1 bg-[#ff1f3d] text-white rounded-lg text-xs font-bold">Assist</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div>
                <h2 className="text-lg font-bold text-[#d91e36] mb-4">My Crew</h2>
                {pickers.length === 0 ? (
                    <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
                        <span className="material-symbols-outlined text-gray-300 text-5xl mb-3">group</span>
                        <p className="text-gray-500">No pickers yet. Go to Team tab to add pickers.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {pickers.slice(0, 5).map(picker => (
                            <div key={picker.id} onClick={() => onViewPicker(picker)}
                                className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm cursor-pointer active:scale-[0.99]">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-bold">{picker.avatar}</div>
                                        <div>
                                            <h3 className="text-gray-900 font-bold">{picker.name}</h3>
                                            <p className="text-xs text-gray-500">ID #{picker.idNumber} • {picker.assignedRow ? `Row ${picker.assignedRow}` : 'Unassigned'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[#ff1f3d] text-2xl font-black font-mono">{picker.bucketsToday}</p>
                                        <p className="text-[10px] text-gray-500 uppercase">Buckets</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-200">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${picker.status === 'Active' ? 'bg-green-100 text-green-700' :
                                        picker.status === 'Below Minimum' ? 'bg-red-100 text-red-700' :
                                            picker.status === 'Break' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'
                                        }`}>{picker.status}</span>
                                    <span className="text-[10px] text-gray-500">{picker.hoursWorked.toFixed(1)}h worked</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
};

export default HomeView;
