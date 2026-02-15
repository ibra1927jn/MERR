/**
 * PickerDetailsModal — Professional profile card for picker/worker details
 * Clean executive design with status pill, performance metrics, and actions
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

    const earnings = picker.total_buckets_today * pieceRate;
    const hourlyRate = picker.hours && picker.hours > 0
        ? earnings / picker.hours
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

    const statusConfig = picker.status === 'active'
        ? { label: 'Active', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' }
        : picker.status === 'on_break'
            ? { label: 'On Break', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' }
            : { label: 'Inactive', bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' };

    return (
        <ModalOverlay onClose={onClose}>
            <div className="max-h-[85vh] overflow-y-auto">
                {/* Profile Header — Gradient top band */}
                <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 px-6 pt-6 pb-8 relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>

                    <div className="flex items-center gap-4">
                        <div className="size-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold text-2xl text-white border border-white/30">
                            {picker.avatar}
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white">{picker.name}</h3>
                            <p className="text-indigo-200 text-sm font-medium">ID: {picker.picker_id}</p>
                        </div>
                    </div>

                    {/* Status pill */}
                    <div className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-bold ${statusConfig.bg} ${statusConfig.text}`}>
                        <span className={`w-2 h-2 rounded-full ${statusConfig.dot} ${picker.status === 'active' ? 'animate-pulse' : ''}`}></span>
                        {statusConfig.label}
                    </div>
                </div>

                {/* Content */}
                <div className="px-6 pb-6 -mt-3">
                    {/* Performance Card */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                            Today's Performance
                        </p>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <p className="text-2xl font-black text-slate-900">{picker.total_buckets_today}</p>
                                <p className="text-[11px] text-slate-500 font-medium mt-0.5">Buckets</p>
                            </div>
                            <div>
                                <p className="text-2xl font-black text-slate-900">{picker.hours?.toFixed(1) || '0'}h</p>
                                <p className="text-[11px] text-slate-500 font-medium mt-0.5">Hours</p>
                            </div>
                            <div>
                                <p className={`text-2xl font-black ${isAboveMinimum ? 'text-emerald-600' : 'text-slate-900'}`}>
                                    ${earnings.toFixed(0)}
                                </p>
                                <p className="text-[11px] text-slate-500 font-medium mt-0.5">Earnings</p>
                            </div>
                        </div>

                        {/* Hourly rate bar */}
                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-slate-500">Effective Rate</span>
                                <span className={`text-lg font-bold ${isAboveMinimum ? 'text-emerald-600' : 'text-red-500'}`}>
                                    ${hourlyRate.toFixed(2)}/hr
                                </span>
                            </div>
                            {/* Rate visual bar */}
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-700 ${isAboveMinimum ? 'bg-emerald-500' : 'bg-red-400'}`}
                                    style={{ width: `${Math.min(100, (hourlyRate / (minWage * 1.5)) * 100)}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between mt-1">
                                <span className="text-[10px] text-slate-400">$0</span>
                                <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                    Min ${minWage}
                                    {!isAboveMinimum && (
                                        <span className="text-red-400 font-bold ml-1">⬇ Below</span>
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Assignment Card */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-4">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Assignment</p>
                            {!isEditing && (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="text-indigo-600 text-xs font-bold hover:text-indigo-800 transition-colors flex items-center gap-1"
                                >
                                    <span className="material-symbols-outlined text-[14px]">edit</span>
                                    Edit
                                </button>
                            )}
                        </div>

                        {isEditing ? (
                            <div className="space-y-3">
                                <div>
                                    <label className="text-slate-500 text-xs block mb-1">Row Number</label>
                                    <input
                                        type="number"
                                        value={assignedRow}
                                        onChange={(e) => setAssignedRow(e.target.value)}
                                        placeholder="e.g. 12"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-slate-900 bg-white transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-slate-500 text-xs block mb-1">Status</label>
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value as PickerStatus)}
                                        aria-label="Picker Status"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-slate-900 bg-white transition-all"
                                    >
                                        <option value="active">Active</option>
                                        <option value="on_break">On Break</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                                <div className="flex gap-2 pt-1">
                                    <button onClick={handleSave} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-colors">
                                        Save Changes
                                    </button>
                                    <button onClick={() => setIsEditing(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 rounded-xl p-3">
                                    <p className="text-[11px] text-slate-400 font-medium mb-1">Current Row</p>
                                    <p className="text-base font-bold text-slate-900">
                                        {picker.current_row ? `Row ${picker.current_row}` : 'Unassigned'}
                                    </p>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-3">
                                    <p className="text-[11px] text-slate-400 font-medium mb-1">Harness</p>
                                    <p className={`text-base font-bold ${picker.harness_id ? 'text-slate-900' : 'text-amber-600'}`}>
                                        {picker.harness_id || 'Not assigned'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Quick Actions */}
                    <div className="space-y-2">
                        <button className="w-full flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl py-3 font-bold text-sm transition-colors">
                            <span className="material-symbols-outlined text-[20px]">chat</span>
                            Send Message
                        </button>
                        {showDeleteButton && onDelete && (
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-[20px]">person_remove</span>
                                {isDeleting ? 'Removing...' : 'Remove Picker'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </ModalOverlay>
    );
};

export default PickerDetailsModal;
