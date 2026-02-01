/**
 * PickerDetailsModal - Modal para ver y editar detalles de un picker
 * Versión unificada para Manager y TeamLeader
 * Soporta tema claro y oscuro
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
    variant?: 'light' | 'dark';
}

const PickerDetailsModal: React.FC<PickerDetailsModalProps> = ({
    picker,
    onClose,
    onUpdate,
    onDelete,
    showDeleteButton = false,
    variant = 'dark'
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [assignedRow, setAssignedRow] = useState(picker.row?.toString() || '');
    const [status, setStatus] = useState<PickerStatus>(picker.status);
    const [isDeleting, setIsDeleting] = useState(false);

    const isLight = variant === 'light';

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

    // Estilos según el tema
    const s = {
        overlay: 'fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm',
        modal: isLight
            ? 'bg-white rounded-3xl p-6 w-[90%] max-w-md shadow-2xl max-h-[85vh] overflow-y-auto'
            : 'bg-[#1e1e1e] rounded-3xl p-6 w-[90%] max-w-md shadow-2xl border border-[#333] max-h-[85vh] overflow-y-auto',
        avatarBg: isLight ? 'bg-gray-200 text-gray-700' : 'bg-[#121212] border-2 border-primary text-white',
        title: isLight ? 'text-xl font-black text-gray-900' : 'text-xl font-black text-white',
        subtitle: isLight ? 'text-sm text-gray-500' : 'text-sm text-[#a1a1aa]',
        closeBtn: isLight ? 'text-gray-400 hover:text-gray-600' : 'text-[#a1a1aa] hover:text-white',
        label: isLight ? 'text-xs font-bold uppercase text-gray-500' : 'text-xs font-bold uppercase text-[#a1a1aa]',
        statValue: isLight ? 'text-2xl font-black text-gray-900' : 'text-3xl font-black text-white',
        statLabel: isLight ? 'text-xs text-gray-500' : 'text-xs text-[#a1a1aa]',
        sectionBg: isLight ? 'bg-gray-50 border border-gray-200' : 'bg-[#121212] border border-[#333]',
        input: isLight
            ? 'w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-[#ff1f3d] outline-none text-gray-900 bg-white'
            : 'w-full bg-[#1e1e1e] border border-[#333] rounded-lg px-3 py-2 text-white focus:border-primary outline-none',
        primaryBtn: isLight
            ? 'py-3 bg-[#ff1f3d] text-white rounded-xl font-bold'
            : 'py-2 bg-primary text-white rounded-lg font-bold',
        secondaryBtn: isLight
            ? 'py-3 bg-gray-200 text-gray-700 rounded-xl font-bold'
            : 'py-2 bg-[#333] text-white rounded-lg font-bold',
        text: isLight ? 'text-gray-900' : 'text-white',
        textMuted: isLight ? 'text-gray-500' : 'text-[#a1a1aa]',
    };

    const statusColors = picker.status === 'active'
        ? { bg: 'bg-green-500/10 border-green-500/30', text: 'text-green-500', icon: 'check_circle' }
        : picker.status === 'on_break'
            ? { bg: 'bg-orange-500/10 border-orange-500/30', text: 'text-orange-500', icon: 'coffee' }
            : { bg: 'bg-red-500/10 border-red-500/30', text: 'text-red-500', icon: 'cancel' };

    return (
        <div className={s.overlay} onClick={onClose}>
            <div className={s.modal} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className={`size-14 rounded-full flex items-center justify-center font-bold text-xl ${s.avatarBg}`}>
                            {picker.avatar}
                        </div>
                        <div>
                            <h3 className={s.title}>{picker.name}</h3>
                            <p className={s.subtitle}>ID: {picker.employeeId}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className={s.closeBtn}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Status Banner */}
                <div className={`mb-6 p-4 rounded-xl border ${statusColors.bg}`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className={s.label}>Current Status</p>
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
                <div className={`p-5 rounded-xl border mb-6 ${isAboveMinimum ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                    <p className={s.label + ' mb-3'}>Today's Performance</p>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <p className={s.statValue}>{picker.buckets}</p>
                            <p className={s.statLabel}>Buckets</p>
                        </div>
                        <div>
                            <p className={s.statValue}>{picker.hours?.toFixed(1) || '0'}h</p>
                            <p className={s.statLabel}>Hours</p>
                        </div>
                        <div>
                            <p className={`text-2xl font-black ${isAboveMinimum ? 'text-green-500' : 'text-red-500'}`}>
                                ${(picker.buckets * PIECE_RATE).toFixed(0)}
                            </p>
                            <p className={s.statLabel}>Earnings</p>
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/10">
                        <div className="flex items-center justify-between">
                            <span className={s.textMuted + ' text-sm'}>Hourly Rate</span>
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
                <div className={`rounded-xl p-4 mb-6 ${s.sectionBg}`}>
                    <div className="flex items-center justify-between mb-3">
                        <p className={s.label}>Assignment</p>
                        {!isEditing && (
                            <button onClick={() => setIsEditing(true)} className="text-[#ff1f3d] text-xs font-bold">
                                Edit
                            </button>
                        )}
                    </div>

                    {isEditing ? (
                        <div className="space-y-3">
                            <div>
                                <label className={s.textMuted + ' text-xs block mb-1'}>Row Number</label>
                                <input
                                    type="number"
                                    value={assignedRow}
                                    onChange={(e) => setAssignedRow(e.target.value)}
                                    placeholder="e.g. 12"
                                    className={s.input}
                                />
                            </div>
                            <div>
                                <label className={s.textMuted + ' text-xs block mb-1'}>Status</label>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value as PickerStatus)}
                                    className={s.input}
                                >
                                    <option value="active">Active</option>
                                    <option value="on_break">On Break</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button onClick={handleSave} className={`flex-1 ${s.primaryBtn}`}>
                                    Save
                                </button>
                                <button onClick={() => setIsEditing(false)} className={`flex-1 ${s.secondaryBtn}`}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className={s.textMuted + ' text-sm'}>Current Row</p>
                                <p className={`text-lg font-bold ${s.text}`}>
                                    {picker.row ? `Row ${picker.row}` : 'Unassigned'}
                                </p>
                            </div>
                            <div>
                                <p className={s.textMuted + ' text-sm'}>Harness</p>
                                <p className="text-lg font-bold text-[#ff1f3d] font-mono">
                                    {picker.harnessId || 'N/A'}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="space-y-2">
                    <button className={`w-full flex items-center justify-center gap-2 ${s.sectionBg} ${s.text} rounded-xl py-3 font-bold hover:border-[#ff1f3d] transition-colors`}>
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
