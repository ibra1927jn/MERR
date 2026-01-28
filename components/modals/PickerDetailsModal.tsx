/**
 * PickerDetailsModal - Modal para ver y editar detalles de un picker
 * Versión unificada para Manager y TeamLeader
 */

import React, { useState } from 'react';
import { Picker, PickerStatus } from '../../types';

const MIN_WAGE = 23.50;
const PIECE_RATE = 6.50;

interface PickerDetailsModalProps {
    picker: Picker;
    onClose: () => void;
    onUpdate: (id: string, updates: Partial<Picker>) => void;
    onDelete?: (id: string) => void;
    showDeleteButton?: boolean;
}

const PickerDetailsModal: React.FC<PickerDetailsModalProps> = ({
    picker,
    onClose,
    onUpdate,
    onDelete,
    showDeleteButton = false
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [assignedRow, setAssignedRow] = useState(picker.row?.toString() || '');
    const [status, setStatus] = useState<PickerStatus>(picker.status);
    const [isDeleting, setIsDeleting] = useState(false);

    const hourlyRate = picker.hours && picker.hours > 0
        ? (picker.buckets * PIECE_RATE) / picker.hours
        : 0;
    const isAboveMinimum = hourlyRate >= MIN_WAGE;

    const handleSave = () => {
        onUpdate(picker.id, {
            row: assignedRow ? parseInt(assignedRow) : undefined,
            status
        });
        setIsEditing(false);
    };

    const handleDelete = async () => {
        if (!onDelete) return;
        if (!confirm(`Are you sure you want to remove ${picker.name}?`)) return;

        setIsDeleting(true);
        try {
            await onDelete(picker.id);
            onClose();
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[#1e1e1e] rounded-3xl p-6 w-[90%] max-w-md shadow-2xl border border-[#333] max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="size-14 rounded-full bg-[#121212] border-2 border-primary flex items-center justify-center font-bold text-white text-xl">
                            {picker.avatar}
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white">{picker.name}</h3>
                            <p className="text-sm text-[#a1a1aa]">ID: {picker.employeeId}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-[#a1a1aa] hover:text-white">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Status Banner */}
                <div className={`mb-6 p-4 rounded-xl border ${picker.status === 'active' ? 'bg-green-500/10 border-green-500/30' :
                        picker.status === 'on_break' ? 'bg-orange-500/10 border-orange-500/30' :
                            'bg-red-500/10 border-red-500/30'
                    }`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase text-[#a1a1aa]">Current Status</p>
                            <p className={`text-lg font-black capitalize ${picker.status === 'active' ? 'text-green-500' :
                                    picker.status === 'on_break' ? 'text-orange-500' : 'text-red-500'
                                }`}>{picker.status.replace('_', ' ')}</p>
                        </div>
                        <span className={`material-symbols-outlined text-3xl ${picker.status === 'active' ? 'text-green-500' :
                                picker.status === 'on_break' ? 'text-orange-500' : 'text-red-500'
                            }`}>
                            {picker.status === 'active' ? 'check_circle' :
                                picker.status === 'on_break' ? 'coffee' : 'cancel'}
                        </span>
                    </div>
                </div>

                {/* Performance Stats */}
                <div className={`p-5 rounded-xl border mb-6 ${isAboveMinimum ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                    <p className="text-xs font-bold uppercase text-[#a1a1aa] mb-3">Today's Performance</p>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <p className="text-3xl font-black text-white">{picker.buckets}</p>
                            <p className="text-xs text-[#a1a1aa]">Buckets</p>
                        </div>
                        <div>
                            <p className="text-3xl font-black text-white">{picker.hours?.toFixed(1) || '0'}h</p>
                            <p className="text-xs text-[#a1a1aa]">Hours</p>
                        </div>
                        <div>
                            <p className={`text-3xl font-black ${isAboveMinimum ? 'text-green-500' : 'text-red-500'}`}>
                                ${(picker.buckets * PIECE_RATE).toFixed(0)}
                            </p>
                            <p className="text-xs text-[#a1a1aa]">Earnings</p>
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/10">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-[#a1a1aa]">Hourly Rate</span>
                            <span className={`text-lg font-bold ${isAboveMinimum ? 'text-green-500' : 'text-red-500'}`}>
                                ${hourlyRate.toFixed(2)}/hr
                            </span>
                        </div>
                        {!isAboveMinimum && (
                            <p className="text-xs text-red-400 mt-2">⚠️ Below minimum wage threshold (${MIN_WAGE}/hr)</p>
                        )}
                    </div>
                </div>

                {/* Assignment Info */}
                <div className="bg-[#121212] rounded-xl p-4 border border-[#333] mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-bold uppercase text-[#a1a1aa]">Assignment</p>
                        {!isEditing && (
                            <button onClick={() => setIsEditing(true)} className="text-primary text-xs font-bold">
                                Edit
                            </button>
                        )}
                    </div>

                    {isEditing ? (
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-[#a1a1aa] block mb-1">Row Number</label>
                                <input
                                    type="number"
                                    value={assignedRow}
                                    onChange={(e) => setAssignedRow(e.target.value)}
                                    placeholder="e.g. 12"
                                    className="w-full bg-[#1e1e1e] border border-[#333] rounded-lg px-3 py-2 text-white focus:border-primary outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-[#a1a1aa] block mb-1">Status</label>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value as PickerStatus)}
                                    className="w-full bg-[#1e1e1e] border border-[#333] rounded-lg px-3 py-2 text-white focus:border-primary outline-none"
                                >
                                    <option value="active">Active</option>
                                    <option value="on_break">On Break</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button onClick={handleSave} className="flex-1 py-2 bg-primary text-white rounded-lg font-bold">
                                    Save
                                </button>
                                <button onClick={() => setIsEditing(false)} className="flex-1 py-2 bg-[#333] text-white rounded-lg font-bold">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-[#a1a1aa]">Current Row</p>
                                <p className="text-lg font-bold text-white">{picker.row ? `Row ${picker.row}` : 'Unassigned'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-[#a1a1aa]">Harness</p>
                                <p className="text-lg font-bold text-primary font-mono">{picker.harnessId || 'N/A'}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="space-y-2">
                    <button className="w-full py-3 bg-[#121212] border border-[#333] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:border-primary transition-colors">
                        <span className="material-symbols-outlined text-[20px]">chat</span>
                        Send Message
                    </button>
                    {showDeleteButton && onDelete && (
                        <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="w-full py-3 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                        >
                            <span className="material-symbols-outlined text-[20px]">person_remove</span>
                            {isDeleting ? 'Removing...' : 'Remove Picker'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PickerDetailsModal;
