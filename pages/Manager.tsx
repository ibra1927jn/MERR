/**
 * MANAGER PAGE - VERSIÓN RENOVADA
 * 
 * MEJORAS APLICADAS:
 * 1. ✅ Sistema de mensajería con Supabase Realtime (ChatModal)
 * 2. ✅ Modales interactivos completos
 * 3. ✅ Gestión real de equipos y pickers
 * 4. ✅ Dashboard con datos dinámicos
 * 5. ✅ Alertas y broadcasts funcionales
 * 6. ✅ Logout funcional
 * 7. ✅ Profile view completo
 * 8. ✅ Soporte multi-idioma
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useHarvest } from '../context/HarvestContext';
import SimpleChat from '../components/SimpleChat';
import LanguageSelector from '../components/LanguageSelector';
import { Picker, Alert, Broadcast, BucketRecord } from '../types';
import { databaseService, RegisteredUser } from '../services/database.service';
import HeatMapView from '../components/manager/HeatMapView';
import ExportModal from '../components/modals/ExportModal';
import { generateHarvestPrediction, HarvestPrediction } from '../services/geminiService';

// --- TYPES ---
type ViewState = 'DASHBOARD' | 'TEAMS' | 'LOGISTICS' | 'MESSAGING' | 'PROFILE' | 'HEATMAP';

interface ChatGroup {
    id: string;
    name: string;
    members: string[];
    isGroup: boolean;
    lastMsg: string;
    time: string;
    unread?: boolean;
}

// =============================================
// CONSTANTES (from centralized types)
// =============================================
import { MINIMUM_WAGE, PIECE_RATE } from '../types';
const MIN_WAGE = MINIMUM_WAGE; // Alias for existing code

// =============================================
// UTILIDADES
// =============================================
const getSmoothPath = (points: number[], width: number, height: number) => {
    if (points.length === 0) return "";
    const stepX = width / (points.length - 1);
    const mapY = (val: number) => height - (val / 100 * height);

    let path = `M0,${mapY(points[0])}`;
    for (let i = 0; i < points.length - 1; i++) {
        const x0 = i * stepX;
        const y0 = mapY(points[i]);
        const x1 = (i + 1) * stepX;
        const y1 = mapY(points[i + 1]);
        const cp1x = x0 + (stepX / 2);
        const cp2x = x1 - (stepX / 2);
        path += ` C${cp1x},${y0} ${cp2x},${y1} ${x1},${y1}`;
    }
    return path;
};

// =============================================
// MODAL: RUNNER SELECTION
// =============================================
const RunnerSelectionModal = ({
    availableRunners,
    selectedRunnerIds,
    onClose,
    onSave
}: {
    availableRunners: RegisteredUser[];
    selectedRunnerIds: string[];
    onClose: () => void;
    onSave: (ids: string[]) => void;
}) => {
    const [selected, setSelected] = useState<string[]>(selectedRunnerIds);

    const toggleRunner = (id: string) => {
        setSelected(prev =>
            prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
        );
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[#1e1e1e] rounded-3xl p-6 w-[90%] max-w-md shadow-2xl border border-[#333] max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-white">Select Active Runners</h3>
                    <button onClick={onClose} className="text-[#a1a1aa] hover:text-white">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="space-y-2 mb-6">
                    {availableRunners.map(runner => (
                        <div
                            key={runner.id}
                            onClick={() => toggleRunner(runner.id)}
                            className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${selected.includes(runner.id)
                                ? 'bg-blue-500/20 border-blue-500'
                                : 'bg-[#121212] border-[#333] hover:border-gray-500'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`size-10 rounded-full flex items-center justify-center font-bold text-white ${selected.includes(runner.id) ? 'bg-blue-500' : 'bg-[#27272a]'
                                    }`}>
                                    {runner.full_name?.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-white font-bold">{runner.full_name}</p>
                                    <p className="text-xs text-[#a1a1aa]">{runner.email}</p>
                                </div>
                            </div>
                            {selected.includes(runner.id) && (
                                <span className="material-symbols-outlined text-blue-500">check_circle</span>
                            )}
                        </div>
                    ))}
                    {availableRunners.length === 0 && (
                        <p className="text-center text-[#666] py-8">No runners found.</p>
                    )}
                </div>

                <button
                    onClick={() => { onSave(selected); onClose(); }}
                    className="w-full py-4 bg-blue-500 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-blue-600 transition-all"
                >
                    Confirm Selection ({selected.length})
                </button>
            </div>
        </div>
    );
};

// =============================================
// MODAL: TEAM LEADER SELECTION
// =============================================
const TeamLeaderSelectionModal = ({
    availableLeaders,
    selectedLeaderIds,
    onClose,
    onSave,
    onViewDetails
}: {
    availableLeaders: RegisteredUser[];
    selectedLeaderIds: string[];
    onClose: () => void;
    onSave: (ids: string[]) => void;
    onViewDetails: (leader: RegisteredUser) => void;
}) => {
    const [selected, setSelected] = useState<string[]>(selectedLeaderIds);

    const toggleLeader = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelected(prev =>
            prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]
        );
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[#1e1e1e] rounded-3xl p-6 w-[90%] max-w-md shadow-2xl border border-[#333] max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-white">Select Active Leaders</h3>
                    <button onClick={onClose} className="text-[#a1a1aa] hover:text-white">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <p className="text-xs text-[#a1a1aa] mb-4">
                    Tap the checkbox to select as active. Tap the card to view team details.
                </p>

                <div className="space-y-2 mb-6">
                    {availableLeaders.map(leader => (
                        <div
                            key={leader.id}
                            onClick={() => onViewDetails(leader)}
                            className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${selected.includes(leader.id)
                                ? 'bg-purple-500/10 border-purple-500/50'
                                : 'bg-[#121212] border-[#333] hover:border-gray-500'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    onClick={(e) => toggleLeader(leader.id, e)}
                                    className={`size-6 rounded-md border flex items-center justify-center transition-colors ${selected.includes(leader.id)
                                        ? 'bg-purple-500 border-purple-500'
                                        : 'border-[#444] hover:border-white'
                                        }`}
                                >
                                    {selected.includes(leader.id) && (
                                        <span className="material-symbols-outlined text-white text-sm">check</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-full bg-[#27272a] flex items-center justify-center font-bold text-white">
                                        {leader.full_name?.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-white font-bold">{leader.full_name}</p>
                                        <p className="text-xs text-[#a1a1aa]">View Team Details</p>
                                    </div>
                                </div>
                            </div>
                            <span className="material-symbols-outlined text-[#333]">chevron_right</span>
                        </div>
                    ))}
                    {availableLeaders.length === 0 && (
                        <p className="text-center text-[#666] py-8">No team leaders found.</p>
                    )}
                </div>

                <button
                    onClick={() => { onSave(selected); onClose(); }}
                    className="w-full py-4 bg-purple-500 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-purple-600 transition-all"
                >
                    Confirm Selection ({selected.length})
                </button>
            </div>
        </div>
    );
};

// =============================================
// MODAL: TEAM DETAILS
// =============================================
const TeamDetailsModal = ({
    leader,
    teamMembers,
    onClose
}: {
    leader: RegisteredUser;
    teamMembers: Picker[];
    onClose: () => void;
}) => {
    // Calculate stats
    const totalBuckets = teamMembers.reduce((sum, p) => sum + p.buckets, 0);
    const avgBuckets = teamMembers.length > 0 ? (totalBuckets / teamMembers.length).toFixed(1) : '0';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[#1e1e1e] rounded-3xl p-6 w-[90%] max-w-2xl shadow-2xl border border-[#333] max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between mb-6 border-b border-[#333] pb-4">
                    <div className="flex items-center gap-4">
                        <div className="size-16 rounded-full bg-purple-500 flex items-center justify-center font-bold text-white text-2xl">
                            {leader.full_name?.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-white">{leader.full_name}'s Team</h3>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-sm text-[#a1a1aa]">{teamMembers.length} Members</span>
                                <span className="w-1 h-1 rounded-full bg-[#333]"></span>
                                <span className="text-sm text-primary font-bold">{totalBuckets} Total Buckets</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-[#a1a1aa] hover:text-white bg-[#27272a] p-2 rounded-full">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Team Members List */}
                <div className="space-y-1">
                    <div className="grid grid-cols-12 gap-2 text-xs font-bold text-[#a1a1aa] uppercase px-4 pb-2">
                        <div className="col-span-5">Picker</div>
                        <div className="col-span-2 text-center">Buckets</div>
                        <div className="col-span-3 text-center">Performance</div>
                        <div className="col-span-2 text-right">Row</div>
                    </div>

                    {teamMembers.length === 0 ? (
                        <div className="text-center py-10 text-[#666]">
                            <span className="material-symbols-outlined text-4xl mb-2">group_off</span>
                            <p>No pickers assigned to this team.</p>
                        </div>
                    ) : (
                        teamMembers.map(picker => {
                            const hourlyRate = picker.hours && picker.hours > 0
                                ? (picker.buckets * PIECE_RATE) / picker.hours
                                : 0;
                            const isAboveMin = hourlyRate >= MIN_WAGE;

                            return (
                                <div key={picker.id} className="grid grid-cols-12 gap-2 items-center bg-[#121212] p-3 rounded-xl border border-[#27272a]">
                                    {/* Name & ID */}
                                    <div className="col-span-5 flex items-center gap-3">
                                        <div className="size-8 rounded-full bg-[#1e1e1e] flex items-center justify-center text-xs font-bold">
                                            {picker.avatar}
                                        </div>
                                        <div>
                                            <p className="text-white font-bold text-sm truncate">{picker.name}</p>
                                            <p className="text-[10px] text-[#666]">{picker.employeeId || 'No ID'}</p>
                                        </div>
                                    </div>

                                    {/* Buckets */}
                                    <div className="col-span-2 text-center">
                                        <span className="text-white font-black text-lg">{picker.buckets}</span>
                                    </div>

                                    {/* Rate */}
                                    <div className="col-span-3 text-center">
                                        <div className={`text-xs font-bold ${isAboveMin ? 'text-green-500' : 'text-red-500'}`}>
                                            ${hourlyRate.toFixed(2)}/hr
                                        </div>
                                        <div className="text-[10px] text-[#666]">
                                            {picker.hours ? `${picker.hours.toFixed(1)}h` : '0h'}
                                        </div>
                                    </div>

                                    {/* Row */}
                                    <div className="col-span-2 text-right">
                                        <span className="bg-[#27272a] px-2 py-1 rounded text-xs text-white">
                                            {picker.row ? `R${picker.row}` : '--'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

// =============================================
// MODAL: PICKER DETAILS (Manager View)
// =============================================
const PickerDetailsModal = ({
    picker,
    onClose,
    onUpdate
}: {
    picker: Picker;
    onClose: () => void;
    onUpdate: (id: string, updates: Partial<Picker>) => void;
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [assignedRow, setAssignedRow] = useState(picker.row?.toString() || '');
    const [status, setStatus] = useState(picker.status);

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
                                    onChange={(e) => setStatus(e.target.value as any)}
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
                    <button className="w-full py-3 bg-[#121212] border border-[#333] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:border-orange-500 transition-colors">
                        <span className="material-symbols-outlined text-[20px]">flag</span>
                        Flag for Review
                    </button>
                </div>
            </div>
        </div>
    );
};

// =============================================
// MODAL: BROADCAST
// =============================================
const BroadcastModal = ({
    onClose,
    onSend
}: {
    onClose: () => void;
    onSend: (title: string, message: string, priority: 'normal' | 'high' | 'urgent') => void;
}) => {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
    const [isSending, setIsSending] = useState(false);

    const handleSend = async () => {
        if (!title.trim() || !message.trim()) return;
        setIsSending(true);
        try {
            await onSend(title, message, priority);
            onClose();
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[#1e1e1e] rounded-3xl p-6 w-[90%] max-w-md shadow-2xl border border-[#333]" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="size-12 rounded-xl bg-primary/20 flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary text-2xl">campaign</span>
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white">New Broadcast</h3>
                            <p className="text-xs text-[#a1a1aa]">Send to all field staff</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-[#a1a1aa] hover:text-white">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-[#a1a1aa] uppercase mb-2 block">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Weather Alert"
                            className="w-full bg-[#121212] border border-[#333] rounded-xl px-4 py-3 text-white focus:border-primary outline-none"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-[#a1a1aa] uppercase mb-2 block">Message</label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Type your broadcast message..."
                            rows={4}
                            className="w-full bg-[#121212] border border-[#333] rounded-xl px-4 py-3 text-white focus:border-primary outline-none resize-none"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-[#a1a1aa] uppercase mb-2 block">Priority</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { value: 'normal', label: 'Normal', color: 'bg-gray-500' },
                                { value: 'high', label: 'High', color: 'bg-orange-500' },
                                { value: 'urgent', label: 'Urgent', color: 'bg-red-500' },
                            ].map((p) => (
                                <button
                                    key={p.value}
                                    onClick={() => setPriority(p.value as any)}
                                    className={`py-2 px-3 rounded-lg text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 ${priority === p.value
                                        ? `${p.color} text-white`
                                        : 'bg-[#121212] text-[#a1a1aa] border border-[#333]'
                                        }`}
                                >
                                    <span className={`size-2 rounded-full ${p.color}`}></span>
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {priority === 'urgent' && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                            <p className="text-xs text-red-400">
                                ⚠️ Urgent broadcasts will trigger push notifications and audio alerts on all devices.
                            </p>
                        </div>
                    )}
                </div>

                <button
                    onClick={handleSend}
                    disabled={!title.trim() || !message.trim() || isSending}
                    className="w-full mt-6 py-4 bg-primary text-white rounded-xl font-bold uppercase tracking-widest disabled:bg-gray-600 active:scale-[0.98] transition-all"
                >
                    {isSending ? 'Sending...' : 'Send Broadcast'}
                </button>
            </div>
        </div>
    );
};

// =============================================
// MODAL: CREATE GROUP
// =============================================
const CreateGroupModal = ({
    onClose,
    onCreate,
    availableMembers,
    currentUserId,
    orchardId
}: {
    onClose: () => void;
    onCreate: (group: ChatGroup) => Promise<void>;
    availableMembers: Array<{ id: string; name: string; role: string }>;
    currentUserId: string;
    orchardId?: string;
}) => {
    const [groupName, setGroupName] = useState('');
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const toggleMember = (id: string) => {
        setSelectedMembers(prev =>
            prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
        );
    };

    const handleCreate = async () => {
        if (!groupName.trim() || selectedMembers.length === 0) return;

        setIsCreating(true);
        setError(null);

        try {
            // Los selectedMembers ya son UUIDs de usuarios reales
            const memberIds = selectedMembers;

            // Crear grupo con miembros (el currentUserId se añade automáticamente en el servicio)
            const newGroup: ChatGroup = {
                id: '', // Se llenará con el UUID real de Supabase
                name: groupName,
                members: memberIds,
                isGroup: true,
                lastMsg: `Group created with ${memberIds.length} members`,
                time: new Date().toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' })
            };

            await onCreate(newGroup);
            onClose();
        } catch (err: any) {
            console.error('Error creating group:', err);
            setError(err.message || 'Failed to create group');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[#1e1e1e] rounded-3xl p-6 w-[90%] max-w-md shadow-2xl border border-[#333] max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-white">Create Group</h3>
                    <button onClick={onClose} className="text-[#a1a1aa] hover:text-white" disabled={isCreating}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
                        <p className="text-sm text-red-400">{error}</p>
                    </div>
                )}

                <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Group name"
                    disabled={isCreating}
                    className="w-full bg-[#121212] border border-[#333] rounded-xl px-4 py-3 text-white focus:border-primary outline-none mb-4 disabled:opacity-50"
                />

                <p className="text-xs font-bold text-[#a1a1aa] uppercase mb-3">Select Members ({selectedMembers.length})</p>
                <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
                    {availableMembers.map(member => (
                        <label key={member.id} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${selectedMembers.includes(member.id) ? 'bg-primary/20 border border-primary/50' : 'bg-[#121212] border border-[#333]'
                            } ${isCreating ? 'opacity-50 pointer-events-none' : ''}`}>
                            <input
                                type="checkbox"
                                checked={selectedMembers.includes(member.id)}
                                onChange={() => toggleMember(member.id)}
                                disabled={isCreating}
                                className="size-5 accent-primary"
                            />
                            <div>
                                <p className="font-bold text-white text-sm">{member.name}</p>
                                <p className="text-xs text-[#a1a1aa]">{member.role}</p>
                            </div>
                        </label>
                    ))}
                </div>

                <button
                    onClick={handleCreate}
                    disabled={!groupName.trim() || selectedMembers.length === 0 || isCreating}
                    className="w-full py-4 bg-primary text-white rounded-xl font-bold uppercase disabled:bg-gray-600 flex items-center justify-center gap-2"
                >
                    {isCreating ? (
                        <>
                            <span className="animate-spin">⏳</span>
                            Creating...
                        </>
                    ) : (
                        'Create Group'
                    )}
                </button>
            </div>
        </div>
    );
};

// =============================================
// MODAL: DAY SETTINGS
// =============================================
const DaySettingsModal = ({
    settings,
    onClose,
    onSave
}: {
    settings: any;
    onClose: () => void;
    onSave: (settings: any) => void;
}) => {
    const [bucketRate, setBucketRate] = useState(settings.bucketRate?.toString() || '6.50');
    const [targetTons, setTargetTons] = useState(settings.targetTons?.toString() || '40');

    const handleSave = () => {
        onSave({
            ...settings,
            bucketRate: parseFloat(bucketRate),
            targetTons: parseFloat(targetTons)
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[#1e1e1e] rounded-3xl p-6 w-[90%] max-w-md shadow-2xl border border-[#333]" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-white">Day Settings</h3>
                    <button onClick={onClose} className="text-[#a1a1aa] hover:text-white">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-[#a1a1aa] uppercase mb-2 block">Bucket Rate ($)</label>
                        <input
                            type="number"
                            step="0.50"
                            value={bucketRate}
                            onChange={(e) => setBucketRate(e.target.value)}
                            className="w-full bg-[#121212] border border-[#333] rounded-xl px-4 py-3 text-white font-mono text-lg focus:border-primary outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-[#a1a1aa] uppercase mb-2 block">Daily Target (Tons)</label>
                        <input
                            type="number"
                            value={targetTons}
                            onChange={(e) => setTargetTons(e.target.value)}
                            className="w-full bg-[#121212] border border-[#333] rounded-xl px-4 py-3 text-white font-mono text-lg focus:border-primary outline-none"
                        />
                    </div>

                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                        <p className="text-xs font-bold text-blue-400 uppercase mb-2">Calculated Minimums</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-lg font-bold text-white">${MIN_WAGE}/hr</p>
                                <p className="text-xs text-[#a1a1aa]">Min Wage</p>
                            </div>
                            <div>
                                <p className="text-lg font-bold text-white">{(MIN_WAGE / parseFloat(bucketRate || '6.50')).toFixed(1)} bkt/hr</p>
                                <p className="text-xs text-[#a1a1aa]">Min Rate</p>
                            </div>
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    className="w-full mt-6 py-4 bg-primary text-white rounded-xl font-bold uppercase"
                >
                    Save Settings
                </button>
            </div>
        </div>
    );
};

// =============================================
// HEADER COMPONENT
// =============================================
const Header = ({
    title,
    onProfileClick,
    onSettingsClick
}: {
    title: string;
    onProfileClick: () => void;
    onSettingsClick: () => void;
}) => (
    <header className="sticky top-0 z-40 bg-[#121212]/95 backdrop-blur-md border-b border-[#27272a]">
        <div className="px-4 h-16 flex justify-between items-center">
            <div>
                <h1 className="text-xl font-[800] text-white tracking-tight">{title}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-[10px] font-[500] text-green-500 uppercase tracking-wide">Live Sync</span>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={onSettingsClick}
                    className="size-10 rounded-full bg-[#27272a] flex items-center justify-center text-[#a1a1aa] hover:text-white transition-colors"
                >
                    <span className="material-symbols-outlined text-[20px]">settings</span>
                </button>
                <button
                    onClick={onProfileClick}
                    className="size-10 rounded-full bg-primary flex items-center justify-center text-white font-bold"
                >
                    MG
                </button>
            </div>
        </div>
    </header>
);

// =============================================
// DASHBOARD VIEW
// =============================================
const DashboardView = ({
    stats,
    settings,
    crew,
    alerts,
    onViewPicker,
    onResolveAlert
}: {
    stats: any;
    settings: any;
    crew: Picker[];
    alerts: Alert[];
    onViewPicker: (picker: Picker) => void;
    onResolveAlert: (id: string) => void;
}) => {
    const width = 500;
    const height = 120;

    const baseCurve = [30, 45, 55, 48, 65, 58, 70];
    const velocityFactor = stats.velocity > 0 ? stats.velocity / 5 : 0;
    const dynamicPick = baseCurve.map(p => Math.min(100, p + velocityFactor));
    const dynamicColl = baseCurve.map(p => Math.min(100, p * 0.8));

    const pathPick = getSmoothPath(dynamicPick, width, height);
    const pathColl = getSmoothPath(dynamicColl, width, height);

    const radius = 56;
    const circumference = 2 * Math.PI * radius;

    const targetTons = settings.targetTons || 40;
    const currentTons = stats.tons || 0;
    const progressPercent = Math.min(100, (currentTons / targetTons) * 100);
    const offset = circumference - (progressPercent / 100) * circumference;

    const remainingTons = Math.max(0, targetTons - currentTons);
    const tonsPerHour = stats.velocity * 0.0051;
    const hoursRemaining = tonsPerHour > 0 ? (remainingTons / tonsPerHour).toFixed(1) : '--';

    const topPickers = [...crew].sort((a, b) => b.buckets - a.buckets).slice(0, 4);
    const belowMinimum = crew.filter(p => {
        const hourlyRate = p.hours && p.hours > 0 ? (p.buckets * PIECE_RATE) / p.hours : 0;
        return p.hours && p.hours > 1 && hourlyRate < MIN_WAGE;
    });

    const activeAlerts = alerts.filter(a => !a.is_resolved);

    return (
        <div className="space-y-6 pb-8">
            {/* Active Alerts */}
            {activeAlerts.length > 0 && (
                <div className="space-y-2">
                    {activeAlerts.slice(0, 2).map(alert => (
                        <div key={alert.id} className={`rounded-xl p-4 border flex items-start gap-3 ${alert.severity === 'critical' ? 'bg-red-500/10 border-red-500/30' :
                            alert.severity === 'warning' ? 'bg-orange-500/10 border-orange-500/30' :
                                'bg-blue-500/10 border-blue-500/30'
                            }`}>
                            <span className={`material-symbols-outlined ${alert.severity === 'critical' ? 'text-red-500 animate-pulse' :
                                alert.severity === 'warning' ? 'text-orange-500' : 'text-blue-500'
                                }`}>
                                {alert.severity === 'critical' ? 'error' : 'warning'}
                            </span>
                            <div className="flex-1">
                                <p className="text-white font-bold text-sm">{alert.title}</p>
                                <p className="text-[#a1a1aa] text-xs mt-0.5">{alert.description}</p>
                            </div>
                            <button
                                onClick={() => onResolveAlert(alert.id)}
                                className="text-xs text-[#a1a1aa] hover:text-white"
                            >
                                Dismiss
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Velocity Monitor */}
                <div className="lg:col-span-2 bg-[#1e1e1e] rounded-2xl p-5 border border-[#27272a] shadow-xl">
                    <div className="flex justify-between items-start mb-4">
                        <h2 className="text-lg font-[800] text-white">Velocity Monitor</h2>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2">
                                <span className="size-2.5 rounded-full bg-primary"></span>
                                <span className="text-[10px] font-[500] text-[#a1a1aa] uppercase">Picking</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="size-2.5 rounded-full bg-blue-500"></span>
                                <span className="text-[10px] font-[500] text-[#a1a1aa] uppercase">Logistics</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-6">
                        <div>
                            <div className="flex items-baseline gap-2 mb-1">
                                <span className="text-4xl font-[800] text-white tracking-tighter">{stats.velocity}</span>
                                <span className="text-sm font-[500] text-[#a1a1aa]">bkt/hr</span>
                            </div>
                            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${stats.velocity >= 50 ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'
                                }`}>
                                <span className="material-symbols-outlined text-[14px]">
                                    {stats.velocity >= 50 ? 'trending_up' : 'trending_flat'}
                                </span>
                                <span className="text-[11px] font-[800]">
                                    {stats.velocity >= 50 ? 'Optimal' : 'Below Target'}
                                </span>
                            </div>
                        </div>
                        <div>
                            <div className="flex items-baseline gap-2 mb-1">
                                <span className="text-4xl font-[800] text-white tracking-tighter">{stats.totalBuckets}</span>
                                <span className="text-sm font-[500] text-[#a1a1aa]">Total</span>
                            </div>
                            <p className="text-[10px] font-bold text-[#52525b] uppercase tracking-widest">Captured Units</p>
                        </div>
                    </div>

                    <div className="w-full h-[100px] relative">
                        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-full overflow-visible">
                            <defs>
                                <linearGradient id="gradientPick" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#d91e36" stopOpacity="0.3" />
                                    <stop offset="100%" stopColor="#d91e36" stopOpacity="0" />
                                </linearGradient>
                                <linearGradient id="gradientColl" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            <path d={`${pathColl} V ${height} H 0 Z`} fill="url(#gradientColl)" />
                            <path d={pathColl} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
                            <path d={`${pathPick} V ${height} H 0 Z`} fill="url(#gradientPick)" />
                            <path d={pathPick} fill="none" stroke="#d91e36" strokeWidth="3" strokeLinecap="round" />
                            <circle cx={width} cy={height - (dynamicPick[dynamicPick.length - 1] / 100 * height)} r="5" fill="#d91e36" stroke="#fff" strokeWidth="2" className="animate-pulse" />
                        </svg>
                    </div>
                </div>

                {/* Forecast Gauge */}
                <div className="bg-[#1e1e1e] rounded-2xl p-5 border border-[#27272a] shadow-xl flex flex-col items-center">
                    <div className="w-full text-left mb-4">
                        <h2 className="text-lg font-[800] text-white">Forecast</h2>
                        <p className="text-xs font-[500] text-[#a1a1aa]">Estimated Completion</p>
                    </div>

                    <div className="relative size-40 flex items-center justify-center">
                        <svg className="size-full transform -rotate-90">
                            <circle cx="80" cy="80" r={radius} fill="none" stroke="#27272a" strokeWidth="10" strokeLinecap="round" />
                            <circle cx="80" cy="80" r={radius} fill="none" stroke="#d91e36" strokeWidth="10" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-1000 ease-out" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-xs font-[800] text-[#52525b] uppercase">ETA</span>
                            <span className="text-3xl font-[800] text-white">{hoursRemaining}h</span>
                        </div>
                    </div>

                    <div className="w-full mt-4">
                        <div className="flex items-baseline justify-center gap-1 mb-2">
                            <span className="text-2xl font-[800] text-white">{currentTons.toFixed(1)}</span>
                            <span className="text-sm font-[800] text-[#a1a1aa]">/ {targetTons} T</span>
                        </div>
                        <div className="w-full h-1.5 bg-[#27272a] rounded-full overflow-hidden">
                            <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Below Minimum Alert */}
            {belowMinimum.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="material-symbols-outlined text-red-500 animate-pulse">warning</span>
                        <h2 className="text-lg font-bold text-red-500">Performance Alert</h2>
                        <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">{belowMinimum.length}</span>
                    </div>
                    <div className="space-y-2">
                        {belowMinimum.slice(0, 3).map(picker => (
                            <div key={picker.id} className="bg-[#1e1e1e] rounded-lg p-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-full bg-[#121212] border-2 border-red-500 flex items-center justify-center text-white font-bold">
                                        {picker.avatar}
                                    </div>
                                    <div>
                                        <p className="text-white font-bold text-sm">{picker.name}</p>
                                        <p className="text-xs text-[#a1a1aa]">
                                            {picker.hours ? ((picker.buckets * PIECE_RATE) / picker.hours).toFixed(2) : '0'}/hr
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onViewPicker(picker)}
                                    className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-bold"
                                >
                                    Review
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Top Performers */}
            <div>
                <h2 className="text-sm font-[800] text-[#a1a1aa] uppercase tracking-widest mb-4">Top Performers</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {topPickers.map((picker, index) => (
                        <div
                            key={picker.id}
                            onClick={() => onViewPicker(picker)}
                            className="bg-[#1e1e1e] rounded-xl p-4 border border-[#27272a] cursor-pointer hover:border-primary transition-all"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className={`size-10 rounded-full bg-[#121212] flex items-center justify-center font-bold text-white border-2 ${index === 0 ? 'border-yellow-500' : 'border-[#333]'
                                    }`}>
                                    {picker.avatar}
                                </div>
                                {index === 0 && (
                                    <span className="material-symbols-outlined text-yellow-500 text-sm filled">emoji_events</span>
                                )}
                            </div>
                            <p className="text-white font-bold text-sm truncate">{picker.name}</p>
                            <div className="flex items-baseline gap-1 mt-1">
                                <span className="text-primary font-black text-xl">{picker.buckets}</span>
                                <span className="text-[10px] text-[#a1a1aa]">buckets</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// =============================================
// TEAMS VIEW
// =============================================
// =============================================
// TEAMS VIEW
// =============================================
// =============================================
// TEAMS VIEW
// =============================================
const TeamsView = ({
    crew,
    onViewPicker,
    teamLeaders,
    runners
}: {
    crew: Picker[];
    onViewPicker: (picker: Picker) => void;
    teamLeaders?: RegisteredUser[];
    runners?: RegisteredUser[];
}) => {
    // Selection State
    // Persisted to localStorage to survive reloads
    const [activeRunners, setActiveRunners] = useState<string[]>(() => {
        const saved = localStorage.getItem('harvestpro_active_runners');
        return saved ? JSON.parse(saved) : [];
    });

    const [activeLeaders, setActiveLeaders] = useState<string[]>(() => {
        const saved = localStorage.getItem('harvestpro_active_leaders');
        return saved ? JSON.parse(saved) : [];
    });

    // Persist changes
    useEffect(() => {
        localStorage.setItem('harvestpro_active_runners', JSON.stringify(activeRunners));
    }, [activeRunners]);

    useEffect(() => {
        localStorage.setItem('harvestpro_active_leaders', JSON.stringify(activeLeaders));
    }, [activeLeaders]);

    // View State
    const [showRunnerSelection, setShowRunnerSelection] = useState(false);
    const [showLeaderSelection, setShowLeaderSelection] = useState(false);
    const [selectedTeamLeader, setSelectedTeamLeader] = useState<RegisteredUser | null>(null);

    // Filtered lists
    const visibleRunners = runners?.filter(r => activeRunners.includes(r.id)) || [];
    const visibleLeaders = teamLeaders?.filter(l => activeLeaders.includes(l.id)) || [];

    // Auto-select all ONLY if nothing stored in localStorage (first visit)
    useEffect(() => {
        const hasStoredRunners = localStorage.getItem('harvestpro_active_runners');
        const hasStoredLeaders = localStorage.getItem('harvestpro_active_leaders');

        if (!hasStoredRunners && runners && runners.length > 0 && activeRunners.length === 0) {
            setActiveRunners(runners.map(r => r.id));
        }
        if (!hasStoredLeaders && teamLeaders && teamLeaders.length > 0 && activeLeaders.length === 0) {
            setActiveLeaders(teamLeaders.map(l => l.id));
        }
    }, [runners?.length, teamLeaders?.length]);

    return (
        <div className="space-y-6 pb-8">
            {/* Stats Cards - Selection Triggers */}
            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={() => setShowRunnerSelection(true)}
                    className="relative bg-[#1e1e1e] rounded-2xl p-5 border border-[#27272a] shadow-lg hover:border-blue-500 transition-all group text-left"
                >
                    <div className="flex items-start justify-between mb-4">
                        <div className="size-12 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                            <span className="material-symbols-outlined text-blue-500 text-2xl">running_with_errors</span>
                        </div>
                        <span className="bg-[#27272a] text-[#a1a1aa] text-xs font-bold px-2 py-1 rounded-full group-hover:bg-blue-500/10 group-hover:text-blue-500 transition-colors">
                            {activeRunners.length} / {runners?.length || 0}
                        </span>
                    </div>
                    <div>
                        <h3 className="text-3xl font-[800] text-white tracking-tight">{activeRunners.length}</h3>
                        <p className="text-xs font-bold text-[#a1a1aa] uppercase mt-1">Bucket Runners</p>
                    </div>
                    <div className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-blue-500">edit</span>
                    </div>
                </button>

                <button
                    onClick={() => setShowLeaderSelection(true)}
                    className="relative bg-[#1e1e1e] rounded-2xl p-5 border border-[#27272a] shadow-lg hover:border-purple-500 transition-all group text-left"
                >
                    <div className="flex items-start justify-between mb-4">
                        <div className="size-12 rounded-xl bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                            <span className="material-symbols-outlined text-purple-500 text-2xl">groups</span>
                        </div>
                        <span className="bg-[#27272a] text-[#a1a1aa] text-xs font-bold px-2 py-1 rounded-full group-hover:bg-purple-500/10 group-hover:text-purple-500 transition-colors">
                            {activeLeaders.length} / {teamLeaders?.length || 0}
                        </span>
                    </div>
                    <div>
                        <h3 className="text-3xl font-[800] text-white tracking-tight">{activeLeaders.length}</h3>
                        <p className="text-xs font-bold text-[#a1a1aa] uppercase mt-1">Team Leaders</p>
                    </div>
                    <div className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-purple-500">edit</span>
                    </div>
                </button>
            </div>

            {/* Active List View */}
            <div>
                <h2 className="text-white font-[800] text-lg mb-4 flex items-center gap-2">
                    <span className="size-2 rounded-full bg-green-500"></span>
                    Active on Orchard
                </h2>

                <div className="space-y-3">
                    {/* Active Runners */}
                    {visibleRunners.map((runner) => (
                        <div
                            key={runner.id}
                            className="bg-[#1e1e1e] rounded-xl p-4 border border-[#27272a] flex items-center gap-4 hover:border-blue-500/50 transition-all"
                        >
                            <div className="size-12 rounded-full bg-[#121212] border-2 border-blue-500 flex items-center justify-center font-bold text-white relative">
                                {runner.full_name?.substring(0, 2).toUpperCase()}
                                <div className="absolute -bottom-1 -right-1 size-5 bg-blue-500 rounded-full border-2 border-[#1e1e1e] flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[10px] text-white">running_with_errors</span>
                                </div>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-white font-bold">{runner.full_name}</h3>
                                <p className="text-xs text-[#a1a1aa]">Bucket Runner</p>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-xs font-bold text-blue-500 bg-blue-500/10 px-2 py-1 rounded">ACTIVE</span>
                            </div>
                        </div>
                    ))}

                    {/* Active Leaders */}
                    {visibleLeaders.map((leader) => {
                        // Find stats for this leader from crew list
                        const teamMembers = crew.filter(p => p.team_leader_id === leader.id);
                        const teamBuckets = teamMembers.reduce((sum, p) => sum + p.buckets, 0);

                        return (
                            <div
                                key={leader.id}
                                onClick={() => setSelectedTeamLeader(leader)}
                                className="bg-[#1e1e1e] rounded-xl p-4 border border-[#27272a] flex items-center gap-4 cursor-pointer hover:border-purple-500 transition-all"
                            >
                                <div className="size-12 rounded-full bg-[#121212] border-2 border-purple-500 flex items-center justify-center font-bold text-white relative">
                                    {leader.full_name?.substring(0, 2).toUpperCase()}
                                    <div className="absolute -bottom-1 -right-1 size-5 bg-purple-500 rounded-full border-2 border-[#1e1e1e] flex items-center justify-center">
                                        <span className="material-symbols-outlined text-[10px] text-white">groups</span>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-white font-bold">{leader.full_name}</h3>
                                    <p className="text-xs text-[#a1a1aa]">Team Leader • {teamMembers.length} Members</p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className="text-lg font-black text-white">{teamBuckets}</span>
                                    <span className="text-[10px] text-[#a1a1aa] uppercase">Buckets</span>
                                </div>
                                <span className="material-symbols-outlined text-[#333]">chevron_right</span>
                            </div>
                        );
                    })}

                    {visibleRunners.length === 0 && visibleLeaders.length === 0 && (
                        <div className="p-12 text-center border-2 border-dashed border-[#27272a] rounded-3xl">
                            <span className="material-symbols-outlined text-4xl text-[#333] mb-3">person_off</span>
                            <p className="text-[#a1a1aa] font-bold">No staff active</p>
                            <p className="text-xs text-[#666] mt-1">Select Runners or Leaders to see them here.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {showRunnerSelection && runners && (
                <RunnerSelectionModal
                    availableRunners={runners}
                    selectedRunnerIds={activeRunners}
                    onClose={() => setShowRunnerSelection(false)}
                    onSave={setActiveRunners}
                />
            )}

            {showLeaderSelection && teamLeaders && (
                <TeamLeaderSelectionModal
                    availableLeaders={teamLeaders}
                    selectedLeaderIds={activeLeaders}
                    onClose={() => setShowLeaderSelection(false)}
                    onSave={setActiveLeaders}
                    onViewDetails={(leader) => {
                        setShowLeaderSelection(false);
                        setSelectedTeamLeader(leader);
                    }}
                />
            )}

            {selectedTeamLeader && (
                <TeamDetailsModal
                    leader={selectedTeamLeader}
                    teamMembers={crew.filter(c => c.team_leader_id === selectedTeamLeader.id)}
                    onClose={() => setSelectedTeamLeader(null)}
                />
            )}
        </div>
    );
};

// =============================================
// LOGISTICS VIEW
// =============================================
const LogisticsView = ({ inventory }: { inventory: any }) => {
    return (
        <div className="space-y-6 pb-8">
            {/* Map Placeholder */}
            <div className="bg-[#1e1e1e] rounded-2xl h-56 border border-[#27272a] relative overflow-hidden">
                <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)',
                    backgroundSize: '30px 30px'
                }}></div>
                <div className="absolute top-4 left-4">
                    <h2 className="text-white font-[800] text-lg">Field Overview</h2>
                    <p className="text-xs text-[#a1a1aa] font-medium flex items-center gap-1">
                        <span className="size-1.5 bg-green-500 rounded-full animate-pulse"></span>
                        Live Tracking
                    </p>
                </div>

                {inventory.binsOfBuckets > 0 && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3">
                        <div className="size-14 bg-primary rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(217,30,54,0.5)] border-4 border-[#1e1e1e] animate-bounce">
                            <span className="material-symbols-outlined text-white text-2xl">inventory_2</span>
                        </div>
                        <div className="bg-black/80 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md">
                            <span className="text-xs font-black text-white">{inventory.binsOfBuckets} Full Bins</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Inventory Cards */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#1e1e1e] p-5 rounded-2xl border border-[#27272a]">
                    <span className="material-symbols-outlined text-blue-500 mb-2">grid_view</span>
                    <p className="text-[10px] font-bold text-[#a1a1aa] uppercase">Empty Bins</p>
                    <p className="text-3xl font-black text-white mt-1">{inventory.emptyBins}</p>
                    {inventory.emptyBins < 10 && (
                        <p className="text-xs text-orange-500 mt-2">⚠️ Low stock</p>
                    )}
                </div>
                <div className="bg-[#1e1e1e] p-5 rounded-2xl border border-[#27272a]">
                    <span className="material-symbols-outlined text-primary mb-2">inventory_2</span>
                    <p className="text-[10px] font-bold text-[#a1a1aa] uppercase">Full Bins</p>
                    <p className="text-3xl font-black text-white mt-1">{inventory.binsOfBuckets}</p>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
                <button className="w-full bg-[#1e1e1e] border border-[#27272a] rounded-xl p-4 flex items-center gap-4 hover:border-primary transition-colors">
                    <div className="size-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-blue-500">local_shipping</span>
                    </div>
                    <div className="flex-1 text-left">
                        <p className="text-white font-bold">Request Transport</p>
                        <p className="text-xs text-[#a1a1aa]">Schedule pickup for full bins</p>
                    </div>
                    <span className="material-symbols-outlined text-[#333]">chevron_right</span>
                </button>
                <button className="w-full bg-[#1e1e1e] border border-[#27272a] rounded-xl p-4 flex items-center gap-4 hover:border-primary transition-colors">
                    <div className="size-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-green-500">add_box</span>
                    </div>
                    <div className="flex-1 text-left">
                        <p className="text-white font-bold">Request Supplies</p>
                        <p className="text-xs text-[#a1a1aa]">Order more empty bins</p>
                    </div>
                    <span className="material-symbols-outlined text-[#333]">chevron_right</span>
                </button>
            </div>
        </div>
    );
};

// =============================================
// MESSAGING VIEW
// =============================================
const MessagingView = ({
    onOpenBroadcast,
    onOpenChat,
    onCreateGroup,
    groups,
    broadcasts
}: {
    onOpenBroadcast: () => void;
    onOpenChat: (chat: ChatGroup) => void;
    onCreateGroup: () => void;
    groups: ChatGroup[];
    broadcasts: Broadcast[];
}) => {
    return (
        <div className="space-y-6 pb-8">
            {/* Broadcast Card */}
            <div className="bg-gradient-to-br from-primary to-[#b3152b] rounded-2xl p-5 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                    <span className="material-symbols-outlined text-[100px]">campaign</span>
                </div>
                <h2 className="text-xl font-black mb-2 relative z-10">Manager Broadcast</h2>
                <p className="text-white/70 text-sm mb-4 relative z-10">Send urgent alerts to all field staff.</p>
                <button
                    onClick={onOpenBroadcast}
                    className="bg-white text-primary font-bold px-6 py-3 rounded-xl shadow-lg hover:bg-gray-100 transition-all active:scale-95 relative z-10"
                >
                    New Broadcast
                </button>
            </div>

            {/* Recent Broadcasts */}
            {broadcasts.length > 0 && (
                <div>
                    <h3 className="text-sm font-bold text-[#a1a1aa] uppercase tracking-widest mb-3">Recent Broadcasts</h3>
                    <div className="space-y-2">
                        {broadcasts.slice(0, 3).map((broadcast) => (
                            <div key={broadcast.id} className="bg-[#1e1e1e] rounded-xl p-4 border border-[#27272a]">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`size-2 rounded-full ${broadcast.priority === 'urgent' ? 'bg-red-500' :
                                            broadcast.priority === 'high' ? 'bg-orange-500' : 'bg-gray-500'
                                            }`}></span>
                                        <p className="text-white font-bold text-sm">{broadcast.title}</p>
                                    </div>
                                    <span className="text-[10px] text-[#666]">
                                        {new Date(broadcast.created_at).toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <p className="text-[#a1a1aa] text-xs line-clamp-2">{broadcast.content}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Chat Groups */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-[#a1a1aa] uppercase tracking-widest">Chat Groups</h3>
                    <button onClick={onCreateGroup} className="text-primary text-xs font-bold">
                        + New Group
                    </button>
                </div>

                {groups.length === 0 ? (
                    <div className="bg-[#1e1e1e] rounded-xl p-8 text-center border border-[#27272a]">
                        <span className="material-symbols-outlined text-[#333] text-5xl mb-3">forum</span>
                        <p className="text-[#a1a1aa]">No chat groups yet</p>
                        <button onClick={onCreateGroup} className="text-primary text-sm font-bold mt-2">
                            Create your first group
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {groups.map(group => (
                            <div
                                key={group.id}
                                onClick={() => onOpenChat(group)}
                                className="bg-[#1e1e1e] rounded-xl p-4 border border-[#27272a] flex items-center gap-4 cursor-pointer hover:border-primary transition-all"
                            >
                                <div className="size-12 rounded-full bg-[#121212] border border-[#333] flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[#a1a1aa]">
                                        {group.isGroup ? 'groups' : 'person'}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-bold truncate">{group.name}</p>
                                    <p className="text-xs text-[#a1a1aa] truncate">{group.lastMsg}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-[#666]">{group.time}</p>
                                    {group.unread && (
                                        <span className="inline-block size-2 bg-primary rounded-full mt-1"></span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// =============================================
// PROFILE VIEW
// =============================================
const ProfileView = ({
    onLogout,
    onOpenSettings,
    isLoggingOut
}: {
    onLogout: () => void;
    onOpenSettings: () => void;
    isLoggingOut: boolean;
}) => {
    const { appUser, orchard } = useHarvest();

    return (
        <div className="space-y-6 pb-8">
            {/* Profile Card */}
            <div className="bg-[#1e1e1e] rounded-2xl p-6 border border-[#27272a] flex flex-col items-center">
                <div className="size-20 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold mb-4">
                    {appUser?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'MG'}
                </div>
                <h2 className="text-xl font-bold text-white">{appUser?.full_name || 'Manager'}</h2>
                <p className="text-[#a1a1aa] text-sm">{appUser?.email || 'manager@harvestpro.nz'}</p>
                <div className="flex gap-2 mt-3">
                    <span className="bg-primary/20 text-primary text-xs font-bold px-3 py-1 rounded-full uppercase">
                        Manager
                    </span>
                    <span className="bg-[#27272a] text-[#a1a1aa] text-xs font-bold px-3 py-1 rounded-full">
                        {orchard?.name || 'Central Pac'}
                    </span>
                </div>
            </div>

            {/* Quick Settings */}
            <div className="space-y-2">
                {/* Language Selection */}
                <div className="w-full bg-[#1e1e1e] border border-[#27272a] rounded-xl p-4">
                    <div className="flex items-center gap-4 mb-3">
                        <div className="size-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-orange-500">translate</span>
                        </div>
                        <div className="flex-1">
                            <p className="text-white font-bold">Language / Idioma</p>
                            <p className="text-xs text-[#a1a1aa]">Multi-language support</p>
                        </div>
                    </div>
                    <LanguageSelector />
                </div>
                <button
                    onClick={onOpenSettings}
                    className="w-full bg-[#1e1e1e] border border-[#27272a] rounded-xl p-4 flex items-center gap-4 hover:border-primary transition-colors"
                >
                    <div className="size-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-blue-500">tune</span>
                    </div>
                    <div className="flex-1 text-left">
                        <p className="text-white font-bold">Day Settings</p>
                        <p className="text-xs text-[#a1a1aa]">Rates, targets, and configuration</p>
                    </div>
                    <span className="material-symbols-outlined text-[#333]">chevron_right</span>
                </button>

                <button className="w-full bg-[#1e1e1e] border border-[#27272a] rounded-xl p-4 flex items-center gap-4 hover:border-primary transition-colors">
                    <div className="size-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-green-500">assessment</span>
                    </div>
                    <div className="flex-1 text-left">
                        <p className="text-white font-bold">Reports</p>
                        <p className="text-xs text-[#a1a1aa]">View and export daily reports</p>
                    </div>
                    <span className="material-symbols-outlined text-[#333]">chevron_right</span>
                </button>

                <button className="w-full bg-[#1e1e1e] border border-[#27272a] rounded-xl p-4 flex items-center gap-4 hover:border-primary transition-colors">
                    <div className="size-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-purple-500">groups</span>
                    </div>
                    <div className="flex-1 text-left">
                        <p className="text-white font-bold">Team Management</p>
                        <p className="text-xs text-[#a1a1aa]">Manage team leaders and crews</p>
                    </div>
                    <span className="material-symbols-outlined text-[#333]">chevron_right</span>
                </button>
            </div>

            {/* Logout */}
            <button
                onClick={onLogout}
                disabled={isLoggingOut}
                className="w-full bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl p-4 font-bold flex items-center justify-center gap-2 hover:bg-red-500/20 transition-colors disabled:opacity-50"
            >
                <span className="material-symbols-outlined">logout</span>
                {isLoggingOut ? 'Logging out...' : 'Logout'}
            </button>
        </div>
    );
};

// =============================================
// MAIN COMPONENT
// =============================================
const Manager = () => {
    const {
        signOut,
        totalBucketsToday,
        teamVelocity,
        settings,
        updateSettings,
        crew,
        inventory,
        alerts,
        broadcasts,
        resolveAlert,
        sendBroadcast,
        updatePicker,
        sendMessage,
        appUser,
        orchard,
        chatGroups,
        createChatGroup,
        loadChatGroups,
        teamLeaders,
        allRunners
    } = useHarvest();

    const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
    const [showPickerDetails, setShowPickerDetails] = useState<Picker | null>(null);
    const [showBroadcast, setShowBroadcast] = useState(false);
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [showDaySettings, setShowDaySettings] = useState(false);
    const [showChat, setShowChat] = useState<ChatGroup | null>(null);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [showExport, setShowExport] = useState(false);
    const [prediction, setPrediction] = useState<HarvestPrediction | null>(null);
    const [isPredicting, setIsPredicting] = useState(false);

    // Mock bucket records for heat map (in production, these would come from context)
    const bucketRecords: BucketRecord[] = [];

    // Cargar grupos al montar
    React.useEffect(() => {
        if (appUser?.id) {
            loadChatGroups?.();
        }
    }, [appUser?.id]);

    // Convertir chatGroups del contexto al formato local
    const groups: ChatGroup[] = useMemo(() => {
        if (!chatGroups) return [];
        return chatGroups.map(g => ({
            id: g.id,
            name: g.name,
            members: g.members || [],
            isGroup: true,
            lastMsg: 'Tap to open chat',
            time: new Date((g as any).updated_at || (g as any).created_at || Date.now()).toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' }),
            unread: false
        }));
    }, [chatGroups]);

    const stats = {
        velocity: teamVelocity,
        totalBuckets: totalBucketsToday,
        tons: totalBucketsToday * 0.005
    };

    // Miembros disponibles para crear grupos - CARGAR USUARIOS REALES
    const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);

    useEffect(() => {
        const loadUsers = async () => {
            const users = await databaseService.getAllUsers();
            setRegisteredUsers(users);
        };
        loadUsers();
    }, []);

    const availableMembers = useMemo(() => {
        // Usuarios registrados en Supabase
        const usersList = registeredUsers.map(u => ({
            id: u.id,
            name: u.full_name,
            role: u.role.replace('_', ' ')
        }));

        // Añadir pickers que no estén ya en la lista
        const pickersList = crew
            .filter(c => c.employeeId && !registeredUsers.find(u => u.id === c.employeeId))
            .map(c => ({
                id: c.employeeId!,
                name: c.name,
                role: c.role || 'Picker'
            }));

        return [...usersList, ...pickersList];
    }, [crew, registeredUsers]);

    const getTitle = () => {
        switch (currentView) {
            case 'DASHBOARD': return 'Command Center';
            case 'TEAMS': return 'Live Rankings';
            case 'LOGISTICS': return 'Inventory Hub';
            case 'MESSAGING': return 'Communication';
            case 'PROFILE': return 'Profile';
            case 'HEATMAP': return 'Activity Map';
        }
    };

    // Generate AI prediction
    const handleGeneratePrediction = async () => {
        setIsPredicting(true);
        try {
            const result = await generateHarvestPrediction({
                currentTons: stats.tons,
                targetTons: settings.targetTons || 40,
                velocity: stats.velocity,
                hoursRemaining: 6,
                crewSize: crew.filter(p => p.status === 'active').length,
            });
            setPrediction(result);
        } catch (error) {
            console.error('Prediction error:', error);
        } finally {
            setIsPredicting(false);
        }
    };

    // Handlers
    const handleLogout = async () => {
        const confirmed = window.confirm('Are you sure you want to logout?');
        if (!confirmed) return;

        setIsLoggingOut(true);
        try {
            await signOut();
        } catch (error) {
            console.error('Logout error:', error);
            setIsLoggingOut(false);
        }
    };

    const handleSendBroadcast = async (title: string, message: string, priority: 'normal' | 'high' | 'urgent') => {
        await sendBroadcast(title, message, priority);
        alert('✅ Broadcast sent to all field staff!');
    };

    const handleCreateGroup = async (group: ChatGroup) => {
        if (!appUser?.id || !createChatGroup) {
            throw new Error('User not authenticated or createChatGroup not available');
        }

        // Crear grupo en Supabase usando el contexto
        await createChatGroup(group.name, group.members);

        // Recargar grupos
        await loadChatGroups?.();
    };

    const handleUpdatePicker = async (id: string, updates: Partial<Picker>) => {
        await updatePicker(id, updates);
        setShowPickerDetails(null);
        alert('✅ Picker updated!');
    };

    const handleResolveAlert = async (alertId: string) => {
        await resolveAlert(alertId);
    };

    return (
        <div className="min-h-screen bg-[#121212] font-sans text-white flex flex-col">
            <Header
                title={getTitle()}
                onProfileClick={() => setCurrentView('PROFILE')}
                onSettingsClick={() => setShowDaySettings(true)}
            />

            <main className="flex-1 px-4 py-4 pb-24 overflow-x-hidden">
                {currentView === 'DASHBOARD' && (
                    <DashboardView
                        stats={stats}
                        settings={settings}
                        crew={crew}
                        alerts={alerts}
                        onViewPicker={setShowPickerDetails}
                        onResolveAlert={handleResolveAlert}
                    />
                )}
                {currentView === 'TEAMS' && (
                    <TeamsView
                        crew={crew}
                        onViewPicker={setShowPickerDetails}
                        teamLeaders={teamLeaders}
                        runners={allRunners}
                    />
                )}
                {currentView === 'LOGISTICS' && (
                    <LogisticsView inventory={inventory} />
                )}
                {currentView === 'MESSAGING' && appUser?.id && (
                    <div className="h-[calc(100vh-200px)]">
                        <SimpleChat
                            userId={appUser.id}
                            userName={appUser.full_name || 'User'}
                        />
                    </div>
                )}
                {currentView === 'PROFILE' && (
                    <ProfileView
                        onLogout={handleLogout}
                        onOpenSettings={() => setShowDaySettings(true)}
                        isLoggingOut={isLoggingOut}
                    />
                )}
                {currentView === 'HEATMAP' && (
                    <HeatMapView
                        bucketRecords={bucketRecords}
                        crew={crew}
                        blockName="Block A"
                        rows={20}
                    />
                )}

                {/* Quick Actions Bar - visible on Dashboard */}
                {currentView === 'DASHBOARD' && (
                    <div className="fixed bottom-20 left-4 right-4 z-40">
                        <div className="bg-[#1e1e1e]/95 backdrop-blur-md rounded-xl border border-[#27272a] p-3 flex gap-2 justify-center shadow-xl">
                            <button
                                onClick={() => setShowExport(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-colors"
                            >
                                <span className="material-symbols-outlined text-lg">download</span>
                                Export
                            </button>
                            <button
                                onClick={handleGeneratePrediction}
                                disabled={isPredicting}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700 transition-colors disabled:opacity-50"
                            >
                                <span className={`material-symbols-outlined text-lg ${isPredicting ? 'animate-spin' : ''}`}>
                                    {isPredicting ? 'refresh' : 'psychology'}
                                </span>
                                AI Predict
                            </button>
                        </div>
                    </div>
                )}

                {/* AI Prediction Panel */}
                {prediction && currentView === 'DASHBOARD' && (
                    <div className="fixed top-20 left-4 right-4 z-40">
                        <div className="bg-gradient-to-r from-purple-900/95 to-indigo-900/95 backdrop-blur-md rounded-xl border border-purple-500/30 p-4 shadow-xl">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-purple-400">psychology</span>
                                    <span className="text-white font-bold">AI Harvest Prediction</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${prediction.confidence === 'high' ? 'bg-green-500/20 text-green-400' :
                                        prediction.confidence === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                            'bg-red-500/20 text-red-400'
                                        }`}>
                                        {prediction.confidence} confidence
                                    </span>
                                </div>
                                <button onClick={() => setPrediction(null)} className="text-purple-300 hover:text-white">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <div className="grid grid-cols-3 gap-3 mb-3">
                                <div className="bg-white/10 rounded-lg p-2 text-center">
                                    <p className="text-xs text-purple-300">ETA</p>
                                    <p className="text-lg font-bold text-white">{prediction.estimatedCompletionTime}</p>
                                </div>
                                <div className="bg-white/10 rounded-lg p-2 text-center">
                                    <p className="text-xs text-purple-300">Success</p>
                                    <p className="text-lg font-bold text-white">{prediction.probabilityOfSuccess}%</p>
                                </div>
                                <div className="bg-white/10 rounded-lg p-2 text-center">
                                    <p className="text-xs text-purple-300">Final</p>
                                    <p className="text-lg font-bold text-white">{prediction.predictedFinalTons}t</p>
                                </div>
                            </div>
                            {prediction.recommendations.length > 0 && (
                                <div className="text-xs text-purple-200">
                                    💡 {prediction.recommendations[0]}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* Modals */}
            {showPickerDetails && (
                <PickerDetailsModal
                    picker={showPickerDetails}
                    onClose={() => setShowPickerDetails(null)}
                    onUpdate={handleUpdatePicker}
                />
            )}
            {showBroadcast && (
                <BroadcastModal
                    onClose={() => setShowBroadcast(false)}
                    onSend={handleSendBroadcast}
                />
            )}
            {showCreateGroup && appUser?.id && (
                <CreateGroupModal
                    onClose={() => setShowCreateGroup(false)}
                    onCreate={handleCreateGroup}
                    availableMembers={availableMembers}
                    currentUserId={appUser.id}
                    orchardId={orchard?.id}
                />
            )}
            {showDaySettings && (
                <DaySettingsModal
                    settings={settings}
                    onClose={() => setShowDaySettings(false)}
                    onSave={updateSettings}
                />
            )}
            {showExport && (
                <ExportModal
                    crew={crew}
                    onClose={() => setShowExport(false)}
                />
            )}


            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 w-full bg-[#1e1e1e] border-t border-[#27272a] z-50 shadow-[0_-8px_30px_rgba(0,0,0,0.5)]">
                <div className="grid grid-cols-5 h-16 items-center">
                    {[
                        { id: 'DASHBOARD', icon: 'dashboard', label: 'Monitor' },
                        { id: 'TEAMS', icon: 'groups', label: 'Crew' },
                        { id: 'HEATMAP', icon: 'heat_pump', label: 'Map' },
                        { id: 'MESSAGING', icon: 'chat', label: 'Comms' },
                        { id: 'PROFILE', icon: 'person', label: 'Profile' },
                    ].map((item) => {
                        const isActive = currentView === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setCurrentView(item.id as ViewState)}
                                className={`flex flex-col items-center justify-center h-full transition-all ${isActive ? 'text-primary' : 'text-[#71717a] hover:text-white'
                                    }`}
                            >
                                <span
                                    className={`material-symbols-outlined text-[24px] mb-0.5 ${isActive ? 'scale-110' : ''}`}
                                    style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                                >
                                    {item.icon}
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
                            </button>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
};

export default Manager;
