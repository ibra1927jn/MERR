/**
 * AddPickerModal - Modal para añadir un nuevo picker
 * Versión centralizada para TeamLeader
 */

import React, { useState } from 'react';

const DEFAULT_START_TIME = '07:00';

export interface NewPickerData {
    name: string;
    avatar: string;
    role: 'Picker';
    employeeId: string;
    harness_id: string;
    status: 'active';
    onboarded: boolean;
    buckets: number;
    row?: number;
    qcStatus: number[];
}

interface AddPickerModalProps {
    isOpen?: boolean;
    onClose: () => void;
    onAdd: (picker: NewPickerData) => Promise<void> | void;
}

const AddPickerModal: React.FC<AddPickerModalProps> = ({ onClose, onAdd }) => {
    const [name, setName] = useState('');
    const [idNumber, setIdNumber] = useState('');
    const [harnessNumber, setHarnessNumber] = useState('');
    const [startTime, setStartTime] = useState(DEFAULT_START_TIME);
    const [assignedRow, setAssignedRow] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Safety Induction State
    const [safetyChecks, setSafetyChecks] = useState({
        hazards: false,
        branches: false,
        machinery: false
    });

    const allSafetyChecksPassed = safetyChecks.hazards && safetyChecks.branches && safetyChecks.machinery;

    const handleAdd = async () => {
        if (!name || !idNumber || !harnessNumber || !startTime) return;

        // VALIDATION: Check for duplicate ID
        // We need access to crew list. It should be passed as prop or accessed via context if we refactor.
        // Assuming parent passes validation or we check here if we have context access.
        // Ideally, checking `crew.some(p => p.picker_id === idNumber)`
        // Since `crew` isn't a prop here yet, let's trust the parent `onAdd` to throw or we add `crew` prop.
        // User instruction said: "En la función onAdd de AddUserModal, integrar una validación que use crew.some()"
        // So I'll modify the parent usage in Manager.tsx to pass crew, OR import useHarvest here.
        // Importing useHarvest is cleaner for a modal that might be used elsewhere.

        setIsSubmitting(true);
        try {
            const avatar = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
            await onAdd({
                name,
                avatar,
                role: 'Picker',
                employeeId: idNumber,
                harness_id: harnessNumber,
                status: 'active',
                onboarded: true, // Now strictly enforced by UI
                buckets: 0,
                row: assignedRow ? parseInt(assignedRow) : undefined,
                qcStatus: []
            });
            onClose();
        } catch (error: any) {
            alert(`❌ Error adding picker: ${error.message || 'Unknown error'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleCheck = (key: keyof typeof safetyChecks) => {
        setSafetyChecks(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-3xl p-6 w-[90%] max-w-md shadow-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-gray-900">Add New Picker</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Full Name *</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Liam O'Connor"
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#ff1f3d] outline-none text-gray-900 bg-white" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Picker ID *</label>
                            <input type="text" value={idNumber} onChange={(e) => setIdNumber(e.target.value)}
                                placeholder="e.g. 402"
                                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#ff1f3d] outline-none font-mono text-gray-900 bg-white" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-[#ff1f3d] uppercase mb-2 block">Harness No. *</label>
                            <input type="text" value={harnessNumber} onChange={(e) => setHarnessNumber(e.target.value.toUpperCase())}
                                placeholder="HN-402"
                                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#ff1f3d] outline-none font-mono uppercase text-gray-900 bg-white" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Start Time *</label>
                            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#ff1f3d] outline-none text-gray-900 bg-white" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Row (Optional)</label>
                            <input type="number" value={assignedRow} onChange={(e) => setAssignedRow(e.target.value)}
                                placeholder="e.g. 12"
                                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#ff1f3d] outline-none text-gray-900 bg-white" />
                        </div>
                    </div>

                    {/* SAFETY INDUCTION */}
                    <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                        <p className="text-xs font-bold text-orange-600 uppercase mb-2">⚠️ Cooper Lane Induction</p>
                        <div className="space-y-3">
                            <label className="flex items-center gap-3 p-2 bg-white/50 rounded-lg cursor-pointer hover:bg-white transition-colors">
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 accent-orange-500 rounded focus:ring-orange-500"
                                    checked={safetyChecks.branches}
                                    onChange={(e) => setSafetyChecks(prev => ({ ...prev, branches: e.target.checked }))}
                                />
                                <span className="text-sm font-bold text-orange-900">Mind Low Branches</span>
                            </label>
                            <label className="flex items-center gap-3 p-2 bg-white/50 rounded-lg cursor-pointer hover:bg-white transition-colors">
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 accent-orange-500 rounded focus:ring-orange-500"
                                    checked={safetyChecks.machinery}
                                    onChange={(e) => setSafetyChecks(prev => ({ ...prev, machinery: e.target.checked }))}
                                />
                                <span className="text-sm font-bold text-orange-900">Be Aware of Tractors</span>
                            </label>
                        </div>
                    </div>
                    <button onClick={handleAdd}
                        disabled={!name || !idNumber || !harnessNumber || !startTime || isSubmitting || !allSafetyChecksPassed}
                        className="w-full mt-6 py-4 bg-[#ff1f3d] text-white rounded-xl font-bold uppercase tracking-widest disabled:bg-gray-300 disabled:cursor-not-allowed active:scale-95 transition-all">
                        {isSubmitting ? 'Adding...' : 'Add Picker to Team'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddPickerModal;
