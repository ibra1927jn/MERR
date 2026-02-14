/**
 * PickerDetailsModal - Modal para ver y editar detalles de un picker
 * Versión unificada para Manager y TeamLeader
 */

import React, { useState } from 'react';
import { Picker, PickerStatus } from '../../types';
import ModalOverlay from '../common/ModalOverlay';

interface PickerDetailsModalProps {
    picker: Picker;
    onClose: () => void;
    onUpdate: (id: string, updates: Partial<Picker>) => void;
    onDelete?: (id: string) => void;
    showDeleteButton?: boolean;
    variant?: 'light' | 'dark';
    minWage?: number;
    pieceRate?: number;
}

const PickerDetailsModal: React.FC<PickerDetailsModalProps> = ({
    picker,
    onClose,
    onUpdate,
    onDelete,
    showDeleteButton = false,
    variant: _variant = 'dark',
    minWage = 23.50,
    pieceRate = 6.50
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [assignedRow, setAssignedRow] = useState(picker.current_row?.toString() || '');
    const [status, setStatus] = useState<PickerStatus>(picker.status);
    const [isDeleting, setIsDeleting] = useState(false);

    const hourlyRate = picker.hours && picker.hours > 0
        ? (picker.total_buckets_today * pieceRate) / picker.hours
        : 0;
    const isAboveMinimum = hourlyRate >= minWage;

    const handleSave = () => {
        onUpdate(picker.id, {
            current_row: assignedRow ? parseInt(assignedRow) : undefined,
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

    const statusColors = picker.status === 'active'
        ? { bg: 'bg-green-50 border-success/30', text: 'text-success', icon: 'check_circle' }
        : picker.status === 'on_break'
            ? { bg: 'bg-orange-50 border-warning/30', text: 'text-warning', icon: 'coffee' }
            : { bg: 'bg-red-50 border-danger/30', text: 'text-danger', icon: 'cancel' };

    return (
        <ModalOverlay onClose={onClose}>
            <div className="max-h-[85vh] overflow-y-auto p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="size-14 rounded-full flex items-center justify-center font-bold text-xl bg-slate-100 border-2 border-border-light text-text-sub">
                            {picker.avatar}
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-text-main">{picker.name}</h3>
                            <p className="text-sm text-text-muted">ID: {picker.picker_id}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-text-muted hover:text-text-main transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Status Banner */}
                <div className={`mb-6 p-4 rounded-xl border ${statusColors.bg}`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase text-text-muted">Current Status</p>
                            <p className={`text-lg font-black capitalize ${statusColors.text}`}>
                                {picker.status.replace('_', ' ')}
                            </p>
                        </div>
                        <span className={`material-symbols-outlined text-3xl ${statusColors.text}`}>
                            {statusColors.icon}
                        </span>
                    </div>
                </div>

                {/* Performance Stats */}
                <div className={`p-5 rounded-xl border mb-6 ${isAboveMinimum ? 'bg-green-50 border-success/30' : 'bg-red-50 border-danger/30'}`}>
                    <p className="text-xs font-bold uppercase text-text-muted mb-3">Today's Performance</p>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <p className="text-2xl font-black text-text-main">{picker.total_buckets_today}</p>
                            <p className="text-xs text-text-muted">Buckets</p>
                        </div>
                        <div>
                            <p className="text-2xl font-black text-text-main">{picker.hours?.toFixed(1) || '0'}h</p>
                            <p className="text-xs text-text-muted">Hours</p>
                        </div>
                        <div>
                            <p className={`text-2xl font-black ${isAboveMinimum ? 'text-success' : 'text-danger'}`}>
                                ${(picker.total_buckets_today * pieceRate).toFixed(0)}
                            </p>
                            <p className="text-xs text-text-muted">Earnings</p>
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-border-light">
                        <div className="flex items-center justify-between">
                            <span className="text-text-muted text-sm">Hourly Rate</span>
                            <span className={`text-lg font-bold ${isAboveMinimum ? 'text-success' : 'text-danger'}`}>
                                ${hourlyRate.toFixed(2)}/hr
                            </span>
                        </div>
                        {!isAboveMinimum && (
                            <p className="text-xs text-danger mt-2">⚠️ Below minimum wage threshold (${minWage}/hr)</p>
                        )}
                    </div>
                </div>

                {/* Assignment Info */}
                <div className="rounded-xl p-4 mb-6 bg-slate-50 border border-border-light">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-bold uppercase text-text-muted">Assignment</p>
                        {!isEditing && (
                            <button onClick={() => setIsEditing(true)} className="text-primary text-xs font-bold">
                                Edit
                            </button>
                        )}
                    </div>

                    {isEditing ? (
                        <div className="space-y-3">
                            <div>
                                <label className="text-text-muted text-xs block mb-1">Row Number</label>
                                <input
                                    type="number"
                                    value={assignedRow}
                                    onChange={(e) => setAssignedRow(e.target.value)}
                                    placeholder="e.g. 12"
                                    className="w-full px-4 py-2 rounded-lg border-2 border-border-light focus:border-primary outline-none text-text-main bg-white transition-colors"
                                />
                            </div>
                            <div>
                                <label className="text-text-muted text-xs block mb-1">Status</label>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value as PickerStatus)}
                                    className="w-full px-4 py-2 rounded-lg border-2 border-border-light focus:border-primary outline-none text-text-main bg-white transition-colors"
                                >
                                    <option value="active">Active</option>
                                    <option value="on_break">On Break</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button onClick={handleSave} className="flex-1 py-3 gradient-primary glow-primary text-white rounded-xl font-bold">
                                    Save
                                </button>
                                <button onClick={() => setIsEditing(false)} className="flex-1 py-3 bg-slate-100 text-text-sub rounded-xl font-bold hover:bg-slate-200 transition-colors">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-text-muted text-sm">Current Row</p>
                                <p className="text-lg font-bold text-text-main">
                                    {picker.current_row ? `Row ${picker.current_row}` : 'Unassigned'}
                                </p>
                            </div>
                            <div>
                                <p className="text-text-muted text-sm">Harness</p>
                                <div className="text-sm font-mono font-bold text-primary bg-primary-light px-2 py-1 rounded border border-primary/20 uppercase">
                                    {picker.harness_id || 'MISSING'}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="space-y-2">
                    <button className="w-full flex items-center justify-center gap-2 bg-slate-50 border border-border-light text-text-main rounded-xl py-3 font-bold hover:border-primary transition-colors">
                        <span className="material-symbols-outlined text-[20px]">chat</span>
                        Send Message
                    </button>
                    {showDeleteButton && onDelete && (
                        <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="w-full py-3 bg-red-50 border border-red-200 text-danger rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                            <span className="material-symbols-outlined text-[20px]">person_remove</span>
                            {isDeleting ? 'Removing...' : 'Remove Picker'}
                        </button>
                    )}
                </div>
            </div>
        </ModalOverlay>
    );
};

export default PickerDetailsModal;
