/**
 * AddPickerModal - Modal para aÃ±adir un nuevo picker
 * VersiÃ³n centralizada para TeamLeader
 */

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useHarvestStore } from '@/stores/useHarvestStore';

const DEFAULT_START_TIME = '07:00';

export interface NewPickerData {
    name: string;
    avatar: string;
    role: 'Picker';
    picker_id: string;
    harness_id: string;
    status: 'active';
    safety_verified: boolean;
    current_row?: number;
    qcStatus?: number[];
    team_leader_id?: string;
    orchard_id?: string;
    visited_rows?: any[];
}

interface AddPickerModalProps {
    isOpen?: boolean;
    onClose: () => void;
    onAdd: (picker: NewPickerData) => Promise<void> | void;
}

const AddPickerModal: React.FC<AddPickerModalProps> = ({ onClose, onAdd }) => {
    const { appUser } = useAuth();
    const { orchard } = useHarvestStore();
    const [name, setName] = useState('');
    const [idNumber, setIdNumber] = useState('');
    const [harnessNumber, setHarnessNumber] = useState('');
    const [startTime, setStartTime] = useState(DEFAULT_START_TIME);
    const [assignedRow, setAssignedRow] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Safety Induction State (Simplified to boolean logic effectively)
    const [safetyChecks, setSafetyChecks] = useState({
        hazards: false,
        branches: false,
        tractorMovement: false
    });

    const allSafetyChecksPassed = safetyChecks.hazards && safetyChecks.branches && safetyChecks.tractorMovement;

    const handleAdd = async () => {
        if (!name || !idNumber || !harnessNumber || !startTime) return;

        setIsSubmitting(true);
        try {
            const avatar = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

            // DEBUG: Verify IDs
            // eslint-disable-next-line no-console
            console.log('[AddPicker] IDs:', {
                teamLeaderId: appUser?.id,
                orchardId: orchard?.id
            });

            const newPicker: NewPickerData = {
                name: name,
                avatar,
                role: 'Picker',
                picker_id: idNumber,
                harness_id: harnessNumber,
                team_leader_id: appUser?.id, // Use appUser.id
                orchard_id: orchard?.id || undefined, // Allow undefined if not in orchard
                status: 'active',
                safety_verified: true,
                current_row: 0,
                visited_rows: []
            };
            // eslint-disable-next-line no-console
            console.log('[AddPicker] Submitting:', newPicker);
            await onAdd(newPicker);
            onClose();
        } catch (error: any) {
            // eslint-disable-next-line no-console
            console.error('Error adding picker:', error);
            alert(`Failed to add: ${error.message || 'Unknown error'}`);
        } finally {
            setIsSubmitting(false);
        }
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

                    {/* SAFETY INDUCTION (Simplified) */}
                    <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 rounded-2xl p-5">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center text-orange-600 dark:text-orange-400">
                                <span className="material-symbols-outlined">health_and_safety</span>
                            </div>
                            <div>
                                <h3 className="font-black text-slate-900 dark:text-white text-sm">Safety Induction</h3>
                                <p className="text-xs font-medium text-slate-500">Cooper Lane Protocols</p>
                            </div>
                        </div>

                        <label className="flex items-center gap-3 p-4 bg-white dark:bg-black/20 rounded-xl border border-orange-200 dark:border-white/10 cursor-pointer hover:border-orange-400 transition-all select-none group">
                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${allSafetyChecksPassed ? 'bg-orange-500 border-orange-500' : 'border-slate-300 group-hover:border-orange-300'}`}>
                                {allSafetyChecksPassed && <span className="material-symbols-outlined text-white text-sm font-bold">check</span>}
                            </div>
                            <input
                                type="checkbox"
                                checked={allSafetyChecksPassed}
                                onChange={(e) => {
                                    const checked = e.target.checked;
                                    setSafetyChecks({ hazards: checked, branches: checked, tractorMovement: checked });
                                }}
                                className="hidden"
                            />
                            <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">Safety Induction Completed (InducciÃ³n Completada)</span>
                        </label>
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
