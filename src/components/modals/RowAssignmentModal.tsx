/**
 * RowAssignmentModal - Modal para asignar pickers a filas
 * Versión centralizada para TeamLeader
 */

import React, { useState } from 'react';

export interface PickerForAssignment {
    id: string;
    name: string;
    avatar: string;
    idNumber: string;
    status: 'Active' | 'Break' | 'Below Minimum' | 'Off Duty';
}

interface RowAssignmentModalProps {
    onClose: () => void;
    onAssign: (rowNumber: number, side: 'North' | 'South', assignedPickers: string[]) => Promise<void> | void;
    pickers: PickerForAssignment[];
}

const RowAssignmentModal: React.FC<RowAssignmentModalProps> = ({ onClose, onAssign, pickers }) => {
    const [rowNumber, setRowNumber] = useState('');
    const [side, setSide] = useState<'North' | 'South'>('South');
    const [selectedPickers, setSelectedPickers] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const togglePicker = (pickerId: string) => {
        setSelectedPickers(prev => prev.includes(pickerId) ? prev.filter(id => id !== pickerId) : [...prev, pickerId]);
    };

    const handleAssign = async () => {
        if (!rowNumber || selectedPickers.length === 0) return;
        setIsSubmitting(true);
        try {
            await onAssign(parseInt(rowNumber), side, selectedPickers);
            onClose();
        } catch (error) {
            alert('❌ Error assigning row');
        } finally {
            setIsSubmitting(false);
        }
    };

    const activePickers = pickers.filter(p => p.status !== 'Off Duty');

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-3xl p-6 w-[90%] max-w-md shadow-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-gray-900">Assign Row</h3>
                    <button onClick={onClose} className="text-gray-400"><span className="material-symbols-outlined">close</span></button>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Row Number *</label>
                        <input type="number" value={rowNumber} onChange={(e) => setRowNumber(e.target.value)}
                            placeholder="12" className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#ff1f3d] outline-none text-2xl font-black text-center text-gray-900 bg-white" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Side *</label>
                        <select value={side} onChange={(e) => setSide(e.target.value as 'North' | 'South')}
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#ff1f3d] outline-none font-bold text-gray-900 bg-white">
                            <option value="South">South</option>
                            <option value="North">North</option>
                        </select>
                    </div>
                </div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-3">Assign Pickers ({selectedPickers.length})</p>
                {activePickers.length === 0 ? (
                    <div className="bg-gray-50 rounded-xl p-6 text-center border border-gray-200 mb-6">
                        <span className="material-symbols-outlined text-gray-300 text-4xl mb-2">group_off</span>
                        <p className="text-sm text-gray-500">No active pickers available</p>
                    </div>
                ) : (
                    <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
                        {activePickers.map(picker => (
                            <label key={picker.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                                <input type="checkbox" checked={selectedPickers.includes(picker.id)} onChange={() => togglePicker(picker.id)} className="size-5 accent-[#ff1f3d]" />
                                <div className="size-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-700 text-sm">{picker.avatar}</div>
                                <div className="flex-1">
                                    <p className="font-bold text-gray-900 text-sm">{picker.name}</p>
                                    <p className="text-xs text-gray-500">ID: {picker.idNumber}</p>
                                </div>
                            </label>
                        ))}
                    </div>
                )}
                <button onClick={handleAssign} disabled={!rowNumber || selectedPickers.length === 0 || isSubmitting}
                    className="w-full py-4 bg-[#ff1f3d] text-white rounded-xl font-bold uppercase disabled:bg-gray-300 active:scale-95 transition-all">
                    {isSubmitting ? 'Assigning...' : `Assign Row ${rowNumber || ''}`}
                </button>
            </div>
        </div>
    );
};

export default RowAssignmentModal;
