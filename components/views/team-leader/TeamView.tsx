/**
 * TeamView Component - Picker List with Onboarding Status
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

interface TeamViewProps {
    pickers: UIPicker[];
    onViewPicker: (picker: UIPicker) => void;
    onAddPicker: () => void;
}

export const TeamView: React.FC<TeamViewProps> = ({ pickers, onViewPicker, onAddPicker }) => {
    const harnessed = pickers.filter(p => p.harnessNumber).length;

    return (
        <main className="flex-1 overflow-y-auto pb-32 px-4 pt-4">
            <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                    <span className="text-[10px] text-gray-500 uppercase font-semibold">Total</span>
                    <span className="text-gray-900 text-2xl font-black font-mono block">{pickers.length}</span>
                </div>
                <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                    <span className="text-[10px] text-gray-500 uppercase font-semibold">Harnesses</span>
                    <span className="text-green-600 text-2xl font-black font-mono block">{harnessed}</span>
                </div>
                <div className="bg-white rounded-xl p-3 border-l-4 border-l-orange-500 border-y border-r border-gray-200 shadow-sm">
                    <span className="text-[10px] text-gray-500 uppercase font-semibold">Pending</span>
                    <span className="text-orange-500 text-2xl font-black font-mono block">{pickers.length - harnessed}</span>
                </div>
            </div>

            <h2 className="text-xl font-bold text-[#d91e36] mb-4">Picker List</h2>

            {pickers.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
                    <span className="material-symbols-outlined text-gray-300 text-6xl mb-3">group</span>
                    <p className="text-gray-500 mb-4">No pickers added yet</p>
                    <button onClick={onAddPicker} className="px-6 py-3 bg-[#ff1f3d] text-white rounded-lg font-bold">Add First Picker</button>
                </div>
            ) : (
                <div className="space-y-3">
                    {pickers.map(picker => (
                        <div key={picker.id} onClick={() => onViewPicker(picker)}
                            className={`bg-white rounded-xl p-4 border shadow-sm cursor-pointer ${!picker.harnessNumber ? 'border-l-4 border-l-orange-500' : 'border-gray-200'}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="size-12 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-700">{picker.avatar}</div>
                                    <div>
                                        <h3 className="text-gray-900 font-bold">{picker.name}</h3>
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${picker.harnessNumber ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {picker.harnessNumber ? 'Onboarded' : 'Setup Incomplete'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-lg">
                                <div><label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Picker ID</label><p className="font-mono font-bold text-sm text-gray-900">{picker.idNumber}</p></div>
                                <div><label className="text-[10px] uppercase font-bold text-[#d91e36] block mb-1">Harness No.</label><p className={`font-mono font-bold text-sm uppercase ${picker.harnessNumber ? 'text-[#ff1f3d]' : 'text-orange-500'}`}>{picker.harnessNumber || 'Required'}</p></div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
};

export default TeamView;
