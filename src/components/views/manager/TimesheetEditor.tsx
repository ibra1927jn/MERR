/**
 * Timesheet Editor
 *
 * Admin-only view for correcting past attendance records.
 * Shows daily attendance with inline editing of check-in/out times.
 * All corrections require a reason and create an audit trail.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Clock, AlertTriangle, CheckCircle2, Edit3, Save, X, Calendar, Loader2 } from 'lucide-react';
import { attendanceService } from '@/services/attendance.service';
import { todayNZST } from '@/utils/nzst';
import { useAuth } from '@/context/AuthContext';

interface AttendanceRow {
    id: string;
    picker_id: string;
    check_in_time: string | null;
    check_out_time: string | null;
    status: string;
    date: string;
    correction_reason?: string;
    corrected_at?: string;
    picker?: {
        id: string;
        name: string;
        picker_id: string;
    };
}

interface TimesheetEditorProps {
    orchardId: string;
}

export default function TimesheetEditor({ orchardId }: TimesheetEditorProps) {
    const { appUser } = useAuth();
    const [selectedDate, setSelectedDate] = useState(todayNZST());
    const [records, setRecords] = useState<AttendanceRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValues, setEditValues] = useState({ checkIn: '', checkOut: '', reason: '' });
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    // ========================================
    // DATA LOADING
    // ========================================

    const loadRecords = useCallback(async () => {
        if (!orchardId) return;
        setLoading(true);
        try {
            const data = await attendanceService.getAttendanceByDate(orchardId, selectedDate);
            setRecords(data as AttendanceRow[]);
        } catch (err) {
            console.error('Failed to load attendance:', err);
        } finally {
            setLoading(false);
        }
    }, [orchardId, selectedDate]);

    useEffect(() => {
        loadRecords();
    }, [loadRecords]);

    // ========================================
    // EDITING
    // ========================================

    const startEdit = (record: AttendanceRow) => {
        setEditingId(record.id);
        setEditValues({
            checkIn: record.check_in_time ? formatTimeForInput(record.check_in_time) : '',
            checkOut: record.check_out_time ? formatTimeForInput(record.check_out_time) : '',
            reason: '',
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditValues({ checkIn: '', checkOut: '', reason: '' });
    };

    const saveCorrection = async (record: AttendanceRow) => {
        if (!editValues.reason.trim()) {
            alert('A correction reason is required for audit compliance.');
            return;
        }

        if (!appUser?.id) return;

        setSaving(true);
        try {
            const updates: { check_in_time?: string; check_out_time?: string } = {};

            if (editValues.checkIn) {
                updates.check_in_time = `${record.date}T${editValues.checkIn}:00+13:00`;
            }
            if (editValues.checkOut) {
                updates.check_out_time = `${record.date}T${editValues.checkOut}:00+13:00`;
            }

            await attendanceService.correctAttendance(
                record.id,
                updates,
                editValues.reason.trim(),
                appUser.id
            );

            setEditingId(null);
            setSuccessMsg(`Corrected ${record.picker?.name || 'picker'}'s timesheet`);
            setTimeout(() => setSuccessMsg(''), 3000);
            await loadRecords();
        } catch (err) {
            alert(`Error: ${err instanceof Error ? err.message : 'Unknown'}`);
        } finally {
            setSaving(false);
        }
    };

    // ========================================
    // HELPERS
    // ========================================

    function formatTimeForInput(isoString: string): string {
        try {
            const d = new Date(isoString);
            return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        } catch {
            return '';
        }
    }

    function formatTime(isoString: string | null): string {
        if (!isoString) return '—';
        try {
            const d = new Date(isoString);
            return d.toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit', hour12: false });
        } catch {
            return '—';
        }
    }

    function calculateHours(checkIn: string | null, checkOut: string | null): number | null {
        if (!checkIn) return null;
        const start = new Date(checkIn);
        const end = checkOut ? new Date(checkOut) : new Date();
        return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60) * 10) / 10;
    }

    function isAbnormal(hours: number | null): boolean {
        return hours !== null && (hours > 12 || hours < 0);
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                        <Clock size={22} className="text-amber-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Timesheet Editor</h2>
                        <p className="text-sm text-gray-500">Correct attendance records with audit trail</p>
                    </div>
                </div>

                {/* Date Picker */}
                <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-gray-400" />
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        max={todayNZST()}
                        title="Select date"
                        className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                </div>
            </div>

            {/* Success Banner */}
            {successMsg && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                    <CheckCircle2 size={18} className="text-green-600" />
                    <span className="text-sm font-medium text-green-700">{successMsg}</span>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="flex justify-center py-12">
                    <Loader2 size={32} className="text-gray-400 animate-spin" />
                </div>
            )}

            {/* Empty State */}
            {!loading && records.length === 0 && (
                <div className="text-center py-12 bg-white dark:bg-card-dark rounded-xl border border-gray-200">
                    <Clock size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 font-medium">No attendance records for {selectedDate}</p>
                    <p className="text-sm text-gray-400 mt-1">Select a different date to view records</p>
                </div>
            )}

            {/* Table */}
            {!loading && records.length > 0 && (
                <div className="bg-white dark:bg-card-dark rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-white/5">
                            <tr>
                                <th className="text-left px-4 py-3 text-gray-600 font-semibold">Picker</th>
                                <th className="text-left px-4 py-3 text-gray-600 font-semibold">Check-In</th>
                                <th className="text-left px-4 py-3 text-gray-600 font-semibold">Check-Out</th>
                                <th className="text-left px-4 py-3 text-gray-600 font-semibold">Hours</th>
                                <th className="text-left px-4 py-3 text-gray-600 font-semibold">Status</th>
                                <th className="text-right px-4 py-3 text-gray-600 font-semibold">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map((record) => {
                                const hours = calculateHours(record.check_in_time, record.check_out_time);
                                const abnormal = isAbnormal(hours);
                                const isEditing = editingId === record.id;

                                return (
                                    <tr key={record.id} className={`border-t border-gray-100 ${abnormal ? 'bg-red-50' : ''} ${isEditing ? 'bg-amber-50' : ''}`}>
                                        {/* Picker Name */}
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-gray-900">{record.picker?.name || 'Unknown'}</div>
                                            <div className="text-xs text-gray-400">{record.picker?.picker_id}</div>
                                        </td>

                                        {/* Check-In */}
                                        <td className="px-4 py-3">
                                            {isEditing ? (
                                                <input
                                                    type="time"
                                                    value={editValues.checkIn}
                                                    onChange={(e) => setEditValues(v => ({ ...v, checkIn: e.target.value }))}
                                                    title="Check-in time"
                                                    className="px-2 py-1 border border-amber-300 rounded-lg text-sm w-24 focus:ring-2 focus:ring-amber-500 outline-none"
                                                />
                                            ) : (
                                                <span className="font-mono">{formatTime(record.check_in_time)}</span>
                                            )}
                                        </td>

                                        {/* Check-Out */}
                                        <td className="px-4 py-3">
                                            {isEditing ? (
                                                <input
                                                    type="time"
                                                    value={editValues.checkOut}
                                                    onChange={(e) => setEditValues(v => ({ ...v, checkOut: e.target.value }))}
                                                    title="Check-out time"
                                                    className="px-2 py-1 border border-amber-300 rounded-lg text-sm w-24 focus:ring-2 focus:ring-amber-500 outline-none"
                                                />
                                            ) : (
                                                <span className={`font-mono ${!record.check_out_time ? 'text-red-500' : ''}`}>
                                                    {!record.check_out_time && <AlertTriangle size={14} className="inline mr-1 text-red-500" />}
                                                    {formatTime(record.check_out_time)}
                                                </span>
                                            )}
                                        </td>

                                        {/* Hours */}
                                        <td className="px-4 py-3">
                                            <span className={`font-mono font-bold ${abnormal ? 'text-red-600' : 'text-gray-700'}`}>
                                                {hours !== null ? `${hours}h` : '—'}
                                            </span>
                                            {abnormal && (
                                                <AlertTriangle size={14} className="inline ml-1 text-red-500" />
                                            )}
                                        </td>

                                        {/* Status */}
                                        <td className="px-4 py-3">
                                            {record.corrected_at ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                                                    <Edit3 size={10} />
                                                    Corrected
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-400">{record.status}</span>
                                            )}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-4 py-3 text-right">
                                            {isEditing ? (
                                                <div className="space-y-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Reason for correction *"
                                                        value={editValues.reason}
                                                        onChange={(e) => setEditValues(v => ({ ...v, reason: e.target.value }))}
                                                        className="w-full px-2 py-1 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                                                    />
                                                    <div className="flex gap-1 justify-end">
                                                        <button
                                                            onClick={cancelEdit}
                                                            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
                                                            aria-label="Cancel edit"
                                                            disabled={saving}
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => saveCorrection(record)}
                                                            disabled={saving || !editValues.reason.trim()}
                                                            className="p-1.5 text-green-600 hover:text-green-700 rounded-lg disabled:opacity-50"
                                                            aria-label="Save correction"
                                                        >
                                                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => startEdit(record)}
                                                    className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                    aria-label={`Edit ${record.picker?.name}'s timesheet`}
                                                >
                                                    <Edit3 size={16} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Info Box */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <AlertTriangle size={18} className="text-amber-600 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-amber-800">Audit Compliance</p>
                        <p className="text-xs text-amber-700 mt-1">
                            All corrections are logged with your name, timestamp, and reason.
                            This data is immutable and visible in the Audit Log.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
