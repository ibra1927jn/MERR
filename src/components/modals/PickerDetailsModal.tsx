/**
 * PickerDetailsModal — Role-aware profile modal
 * 
 * Picker: buckets, speed, earnings, effective rate, row, harness
 * Team Leader: team size, team output, team avg, hours on-site
 * Runner: bins collected, rounds, hours on-site
 */

import React, { useState, useMemo } from 'react';
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
    allCrew?: Picker[];
}

/* ── Role helpers ──────────────────────────────────────────── */
const isPicker = (role: string) => role === 'picker';
const isTeamLeader = (role: string) => role === 'team_leader';
const isRunner = (role: string) => role === 'runner' || role === 'bucket_runner';

const roleLabel = (role: string) =>
    isTeamLeader(role) ? 'Team Leader' : isRunner(role) ? 'Bucket Runner' : 'Picker';

const roleGradient = (role: string) =>
    isTeamLeader(role)
        ? 'from-emerald-600 via-emerald-700 to-teal-700'
        : isRunner(role)
            ? 'from-amber-600 via-amber-700 to-orange-700'
            : 'from-indigo-600 via-indigo-700 to-purple-700';

const roleIcon = (role: string) =>
    isTeamLeader(role) ? 'shield_person' : isRunner(role) ? 'local_shipping' : 'agriculture';

/* ── Component ─────────────────────────────────────────────── */
const PickerDetailsModal: React.FC<PickerDetailsModalProps> = ({
    picker,
    onClose,
    onUpdate,
    onDelete,
    showDeleteButton = false,
    variant: _variant = 'dark',
    minWage = 23.50,
    pieceRate = 6.50,
    allCrew = [],
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [assignedRow, setAssignedRow] = useState(picker.current_row?.toString() || '');
    const [status, setStatus] = useState<PickerStatus>(picker.status);
    const [isDeleting, setIsDeleting] = useState(false);

    const role = picker.role || 'picker';

    // ── Picker-specific calculations ──
    const earnings = picker.total_buckets_today * pieceRate;
    const hourlyRate = picker.hours && picker.hours > 0 ? earnings / picker.hours : 0;
    const isAboveMinimum = hourlyRate >= minWage;
    const speed = picker.hours && picker.hours > 0
        ? Math.round(picker.total_buckets_today / picker.hours)
        : 0;

    // ── Team Leader stats ──
    const tlStats = useMemo(() => {
        if (!isTeamLeader(role)) return null;
        const myPickers = allCrew.filter(p => p.team_leader_id === picker.id && isPicker(p.role || 'picker'));
        const activePickers = myPickers.filter(p => p.status === 'active');
        const totalBuckets = myPickers.reduce((s, p) => s + (p.total_buckets_today || 0), 0);
        const avgBuckets = myPickers.length > 0 ? Math.round(totalBuckets / myPickers.length) : 0;
        const belowMin = myPickers.filter(p => {
            const pRate = p.hours && p.hours > 0 ? (p.total_buckets_today * pieceRate) / p.hours : 0;
            return pRate < minWage && pRate > 0;
        }).length;
        return { teamSize: myPickers.length, activePickers: activePickers.length, totalBuckets, avgBuckets, belowMin };
    }, [allCrew, picker.id, role, pieceRate, minWage]);

    // ── Team context for pickers ──
    const teamStats = useMemo(() => {
        if (!isPicker(role)) return { avgBuckets: 0, avgSpeed: 0 };
        const activePickers = allCrew.filter(p => isPicker(p.role || 'picker') && p.status === 'active');
        if (activePickers.length === 0) return { avgBuckets: 0, avgSpeed: 0 };
        const totalBuckets = activePickers.reduce((s, p) => s + (p.total_buckets_today || 0), 0);
        const avgBuckets = Math.round(totalBuckets / activePickers.length);
        const pickersWithHours = activePickers.filter(p => p.hours && p.hours > 0);
        const avgSpeed = pickersWithHours.length > 0
            ? Math.round(pickersWithHours.reduce((s, p) => s + ((p.total_buckets_today || 0) / (p.hours || 1)), 0) / pickersWithHours.length)
            : 0;
        return { avgBuckets, avgSpeed };
    }, [allCrew, role]);

    const bucketDiff = picker.total_buckets_today - teamStats.avgBuckets;
    const speedDiff = speed - teamStats.avgSpeed;

    const handleSave = () => {
        onUpdate(picker.id, {
            ...(isPicker(role) ? { current_row: assignedRow ? parseInt(assignedRow) : undefined } : {}),
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

    const ComparisonBadge = ({ diff, suffix = '' }: { diff: number; suffix?: string }) => {
        if (diff === 0 && teamStats.avgBuckets === 0) return null;
        const isPositive = diff >= 0;
        return (
            <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full ${isPositive ? 'text-emerald-700 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
                <span className="material-symbols-outlined text-[12px]">
                    {isPositive ? 'trending_up' : 'trending_down'}
                </span>
                {isPositive ? '+' : ''}{diff}{suffix}
            </span>
        );
    };

    return (
        <ModalOverlay onClose={onClose}>
            <div className="max-h-[85vh] overflow-y-auto">
                {/* ── Gradient Header (role-colored) ─────────── */}
                <div className={`bg-gradient-to-br ${roleGradient(role)} px-6 pt-6 pb-10 relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-12 -mt-12"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-8 -mb-8"></div>

                    <button onClick={onClose} className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors z-20">
                        <span className="material-symbols-outlined">close</span>
                    </button>

                    <div className="relative z-10 flex items-center gap-4">
                        <div className="size-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold text-2xl text-white border border-white/20 shadow-lg">
                            {picker.avatar || (
                                <span className="material-symbols-outlined text-3xl">{roleIcon(role)}</span>
                            )}
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white tracking-tight">{picker.name}</h3>
                            <p className="text-white/70 text-sm font-medium">
                                {roleLabel(role)} • {picker.picker_id}
                            </p>
                        </div>
                    </div>

                    <div className={`relative z-10 inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-bold ${statusConfig.bg} ${statusConfig.text}`}>
                        <span className={`w-2 h-2 rounded-full ${statusConfig.dot} ${picker.status === 'active' ? 'animate-pulse' : ''}`}></span>
                        {statusConfig.label}
                    </div>
                </div>

                {/* ── Content ────────────────────────────────── */}
                <div className="px-6 pb-6 -mt-5 space-y-4">

                    {/* ════════════════════════════════════════════
                        PICKER VIEW — Buckets, Speed, Earnings
                    ════════════════════════════════════════════ */}
                    {isPicker(role) && (
                        <>
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-md p-5">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                                    Today's Performance
                                </p>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-slate-50 rounded-xl p-3 text-center">
                                        <p className="text-2xl font-black text-slate-900">{picker.total_buckets_today}</p>
                                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">Buckets</p>
                                        {teamStats.avgBuckets > 0 && (
                                            <div className="mt-2 space-y-0.5">
                                                <ComparisonBadge diff={bucketDiff} />
                                                <p className="text-[10px] text-slate-400">Avg: {teamStats.avgBuckets}</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-3 text-center">
                                        <p className="text-2xl font-black text-slate-900">{speed}</p>
                                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">/hr Speed</p>
                                        {teamStats.avgSpeed > 0 && (
                                            <div className="mt-2 space-y-0.5">
                                                <ComparisonBadge diff={speedDiff} suffix="/hr" />
                                                <p className="text-[10px] text-slate-400">Avg: {teamStats.avgSpeed}/hr</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-3 text-center">
                                        <p className={`text-2xl font-black ${earnings > 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                                            ${earnings.toFixed(0)}
                                        </p>
                                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">Earnings</p>
                                        {earnings > 0 && (
                                            <div className="mt-2">
                                                <span className="text-[10px] text-slate-400">@ ${pieceRate}/bkt</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Rate bar */}
                                <div className="mt-4 pt-4 border-t border-slate-100">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm text-slate-500">Effective Rate</span>
                                        <span className={`text-lg font-bold ${isAboveMinimum ? 'text-emerald-600' : 'text-red-500'}`}>
                                            ${hourlyRate.toFixed(2)}/hr
                                        </span>
                                    </div>
                                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden relative">
                                        <div
                                            className="absolute top-0 bottom-0 w-0.5 bg-slate-300 z-10"
                                            style={{ left: `${Math.min(100, (minWage / (minWage * 1.5)) * 100)}%` }}
                                        ></div>
                                        <div
                                            className={`h-full rounded-full transition-all duration-700 ${isAboveMinimum
                                                ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                                                : 'bg-gradient-to-r from-red-300 to-red-400'
                                                }`}
                                            style={{ width: `${Math.min(100, (hourlyRate / (minWage * 1.5)) * 100)}%` }}
                                        ></div>
                                    </div>
                                    <div className="flex justify-between mt-1.5">
                                        <span className="text-[10px] text-slate-400">$0</span>
                                        <span className={`text-[10px] font-medium ${isAboveMinimum ? 'text-slate-400' : 'text-red-500'}`}>
                                            Min ${minWage}/hr {!isAboveMinimum && '⬇ Below'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Picker Details */}
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Details</p>
                                    {!isEditing && (
                                        <button onClick={() => setIsEditing(true)} className="text-indigo-600 text-xs font-bold hover:text-indigo-800 transition-colors flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">edit</span>
                                            Edit
                                        </button>
                                    )}
                                </div>
                                {isEditing ? (
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-slate-500 text-xs block mb-1">Row Number</label>
                                            <input type="number" value={assignedRow} onChange={(e) => setAssignedRow(e.target.value)} placeholder="e.g. 12"
                                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-slate-900 bg-white transition-all" />
                                        </div>
                                        <div>
                                            <label className="text-slate-500 text-xs block mb-1">Status</label>
                                            <select value={status} onChange={(e) => setStatus(e.target.value as PickerStatus)} aria-label="Picker Status"
                                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-slate-900 bg-white transition-all">
                                                <option value="active">Active</option>
                                                <option value="on_break">On Break</option>
                                                <option value="inactive">Inactive</option>
                                            </select>
                                        </div>
                                        <div className="flex gap-2 pt-1">
                                            <button onClick={handleSave} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-colors">Save</button>
                                            <button onClick={() => setIsEditing(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors">Cancel</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-slate-50 rounded-xl p-3">
                                            <p className="text-[11px] text-slate-400 font-medium mb-0.5">Current Row</p>
                                            <p className="text-sm font-bold text-slate-900">{picker.current_row ? `Row ${picker.current_row}` : 'Unassigned'}</p>
                                        </div>
                                        <div className="bg-slate-50 rounded-xl p-3">
                                            <p className="text-[11px] text-slate-400 font-medium mb-0.5">Harness</p>
                                            <p className={`text-sm font-bold ${picker.harness_id ? 'text-slate-900' : 'text-amber-600'}`}>{picker.harness_id || 'Not assigned'}</p>
                                        </div>
                                        <div className="bg-slate-50 rounded-xl p-3">
                                            <p className="text-[11px] text-slate-400 font-medium mb-0.5">Team</p>
                                            <p className="text-sm font-bold text-slate-900">{picker.team_leader_id ? 'Assigned' : 'No team'}</p>
                                        </div>
                                        <div className="bg-slate-50 rounded-xl p-3">
                                            <p className="text-[11px] text-slate-400 font-medium mb-0.5">Hours Today</p>
                                            <p className="text-sm font-bold text-slate-900">{picker.hours?.toFixed(1) || '0'}h</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* ════════════════════════════════════════════
                        TEAM LEADER VIEW — Team overview
                    ════════════════════════════════════════════ */}
                    {isTeamLeader(role) && tlStats && (
                        <>
                            {/* Team Overview Card */}
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-md p-5">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                                    Team Overview
                                </p>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-emerald-50 rounded-xl p-3 text-center">
                                        <p className="text-2xl font-black text-emerald-700">{tlStats.teamSize}</p>
                                        <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Pickers</p>
                                        <p className="text-[10px] text-emerald-500 mt-1">
                                            {tlStats.activePickers} active
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-3 text-center">
                                        <p className="text-2xl font-black text-slate-900">{tlStats.totalBuckets}</p>
                                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">Team Buckets</p>
                                        <p className="text-[10px] text-slate-400 mt-1">today</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-3 text-center">
                                        <p className="text-2xl font-black text-slate-900">{tlStats.avgBuckets}</p>
                                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">Avg/Picker</p>
                                        <p className="text-[10px] text-slate-400 mt-1">buckets</p>
                                    </div>
                                </div>

                                {/* Compliance alert */}
                                {tlStats.belowMin > 0 && (
                                    <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-amber-600 text-[20px]">warning</span>
                                        <p className="text-sm text-amber-700 font-medium">
                                            {tlStats.belowMin} picker{tlStats.belowMin > 1 ? 's' : ''} below minimum wage rate
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* TL Details */}
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Details</p>
                                    {!isEditing && (
                                        <button onClick={() => setIsEditing(true)} className="text-emerald-600 text-xs font-bold hover:text-emerald-800 transition-colors flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">edit</span>
                                            Edit
                                        </button>
                                    )}
                                </div>
                                {isEditing ? (
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-slate-500 text-xs block mb-1">Status</label>
                                            <select value={status} onChange={(e) => setStatus(e.target.value as PickerStatus)} aria-label="Status"
                                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-slate-900 bg-white transition-all">
                                                <option value="active">Active</option>
                                                <option value="on_break">On Break</option>
                                                <option value="inactive">Inactive</option>
                                            </select>
                                        </div>
                                        <div className="flex gap-2 pt-1">
                                            <button onClick={handleSave} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-colors">Save</button>
                                            <button onClick={() => setIsEditing(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors">Cancel</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-slate-50 rounded-xl p-3">
                                            <p className="text-[11px] text-slate-400 font-medium mb-0.5">Hours On-Site</p>
                                            <p className="text-sm font-bold text-slate-900">{picker.hours?.toFixed(1) || '0'}h</p>
                                        </div>
                                        <div className="bg-slate-50 rounded-xl p-3">
                                            <p className="text-[11px] text-slate-400 font-medium mb-0.5">Team Earnings</p>
                                            <p className="text-sm font-bold text-emerald-600">${(tlStats.totalBuckets * pieceRate).toFixed(0)}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* ════════════════════════════════════════════
                        RUNNER VIEW — Logistics focus
                    ════════════════════════════════════════════ */}
                    {isRunner(role) && (
                        <>
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-md p-5">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                                    Today's Activity
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-amber-50 rounded-xl p-4 text-center">
                                        <p className="text-3xl font-black text-amber-700">{picker.total_buckets_today}</p>
                                        <p className="text-[11px] text-amber-600 font-medium mt-0.5">Buckets Collected</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                                        <p className="text-3xl font-black text-slate-900">{picker.hours?.toFixed(1) || '0'}h</p>
                                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">Hours On-Site</p>
                                    </div>
                                </div>
                            </div>

                            {/* Runner Details */}
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Details</p>
                                    {!isEditing && (
                                        <button onClick={() => setIsEditing(true)} className="text-amber-600 text-xs font-bold hover:text-amber-800 transition-colors flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">edit</span>
                                            Edit
                                        </button>
                                    )}
                                </div>
                                {isEditing ? (
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-slate-500 text-xs block mb-1">Status</label>
                                            <select value={status} onChange={(e) => setStatus(e.target.value as PickerStatus)} aria-label="Status"
                                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none text-slate-900 bg-white transition-all">
                                                <option value="active">Active</option>
                                                <option value="on_break">On Break</option>
                                                <option value="inactive">Inactive</option>
                                            </select>
                                        </div>
                                        <div className="flex gap-2 pt-1">
                                            <button onClick={handleSave} className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-sm transition-colors">Save</button>
                                            <button onClick={() => setIsEditing(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors">Cancel</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-slate-50 rounded-xl p-3">
                                            <p className="text-[11px] text-slate-400 font-medium mb-0.5">Zone</p>
                                            <p className="text-sm font-bold text-slate-900">{picker.current_row ? `Zone ${picker.current_row}` : 'Roaming'}</p>
                                        </div>
                                        <div className="bg-slate-50 rounded-xl p-3">
                                            <p className="text-[11px] text-slate-400 font-medium mb-0.5">Assigned Team</p>
                                            <p className="text-sm font-bold text-slate-900">{picker.team_leader_id ? 'Assigned' : 'Unassigned'}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* ── Quick Actions (shared) ─────────────── */}
                    <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                            <button className={`flex items-center justify-center gap-2 rounded-xl py-3 font-bold text-sm transition-colors ${isTeamLeader(role) ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                                    : isRunner(role) ? 'bg-amber-50 hover:bg-amber-100 text-amber-700'
                                        : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
                                }`}>
                                <span className="material-symbols-outlined text-[20px]">chat</span>
                                Message
                            </button>
                            <button className="flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl py-3 font-bold text-sm transition-colors">
                                <span className="material-symbols-outlined text-[20px]">history</span>
                                History
                            </button>
                        </div>
                        {showDeleteButton && onDelete && (
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-[20px]">person_remove</span>
                                {isDeleting ? 'Removing...' : `Remove ${roleLabel(role)}`}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </ModalOverlay>
    );
};

export default PickerDetailsModal;
