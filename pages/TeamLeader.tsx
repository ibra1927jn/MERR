import React, { useState, useEffect, useMemo } from 'react';
import { useHarvest } from '../context/HarvestContext';
import { useAuth } from '../context/AuthContext';
import SimpleChat from '../components/SimpleChat';
import { databaseService, RegisteredUser } from '../services/database.service';
import BaseModal from '../components/modals/BaseModal';

type ViewState = 'HOME' | 'TEAM' | 'TASKS' | 'PROFILE' | 'MESSAGING';

// --- INTERFACES ---
interface UIPicker {
    id: string;
    name: string;
    avatar: string;
    idNumber: string;
    harnessNumber: string;
    startTime: string;
    assignedRow?: number;
    bucketsToday: number;
    hoursWorked: number;
    hourlyRate: number;
    status: 'Active' | 'Break' | 'Below Minimum' | 'Off Duty';
    earningsToday: number;
    qcStatus: ('excellent' | 'good' | 'warning')[];
}

interface UIRowAssignment {
    rowNumber: number;
    side: 'North' | 'South';
    assignedPickers: string[];
    completionPercentage: number;
    status: 'Active' | 'Assigned' | 'Completed';
}

interface DayConfig {
    orchard: string;
    variety: string;
    targetSize: string;
    targetColor: string;
    binType: 'Standard' | 'Export' | 'Process';
}

// =============================================
// CONSTANTES
// =============================================
const MIN_WAGE = 23.50;
const PIECE_RATE = 6.50;
const MIN_BUCKETS_PER_HOUR = MIN_WAGE / PIECE_RATE;
const DEFAULT_START_TIME = '07:00';

// =============================================
// UTILIDADES
// =============================================
const calculateHoursWorked = (startTime: string = DEFAULT_START_TIME): number => {
    const now = new Date();
    const [hours, minutes] = startTime.split(':').map(Number);
    const start = new Date();
    start.setHours(hours, minutes, 0, 0);
    if (start > now) return 0;
    const diffMs = now.getTime() - start.getTime();
    return Math.max(0, Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10);
};

const getPickerStatus = (buckets: number, hoursWorked: number, baseStatus: string): 'Active' | 'Break' | 'Below Minimum' | 'Off Duty' => {
    if (baseStatus === 'on_break') return 'Break';
    if (baseStatus === 'inactive' || baseStatus === 'suspended') return 'Off Duty';
    if (hoursWorked > 0 && (buckets / hoursWorked) < MIN_BUCKETS_PER_HOUR) return 'Below Minimum';
    return 'Active';
};

// ====================================
// MODAL: ADD PICKER
// ====================================
const AddPickerModal = ({ onClose, onAdd }: { onClose: () => void, onAdd: (picker: any) => void }) => {
    const [name, setName] = useState('');
    const [idNumber, setIdNumber] = useState('');
    const [harnessNumber, setHarnessNumber] = useState('');
    const [startTime, setStartTime] = useState(DEFAULT_START_TIME);
    const [assignedRow, setAssignedRow] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAdd = async () => {
        if (!name || !idNumber || !harnessNumber || !startTime) return;
        setIsSubmitting(true);
        try {
            const avatar = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
            await onAdd({
                name, avatar, role: 'Picker', employeeId: idNumber, harnessId: harnessNumber,
                status: 'active', onboarded: true, buckets: 0,
                row: assignedRow ? parseInt(assignedRow) : undefined, qcStatus: []
            });
            onClose();
        } catch (error) {
            alert('❌ Error adding picker');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <BaseModal title="Add New Picker" onClose={onClose}>
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
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <p className="text-xs font-bold text-blue-600 uppercase mb-1">⚠️ Safety Compliance</p>
                    <p className="text-sm text-blue-900">Harness number is <strong>mandatory</strong> for safety regulations</p>
                </div>
            </div>
            <button onClick={handleAdd}
                disabled={!name || !idNumber || !harnessNumber || !startTime || isSubmitting}
                className="w-full mt-6 py-4 bg-[#ff1f3d] text-white rounded-xl font-bold uppercase tracking-widest disabled:bg-gray-300 active:scale-95 transition-all">
                {isSubmitting ? 'Adding...' : 'Add Picker to Team'}
            </button>
        </BaseModal>
    );
};

// ====================================
// MODAL: PICKER DETAILS
// ====================================
const PickerDetailsModal = ({ picker, onClose, onUpdate, onDelete }: {
    picker: UIPicker, onClose: () => void,
    onUpdate: (id: string, updates: any) => void, onDelete: (pickerId: string) => void
}) => {
    const [activeTab, setActiveTab] = useState<'INFO' | 'PERFORMANCE' | 'HISTORY'>('INFO');
    const [isEditing, setIsEditing] = useState(false);
    const [editedPicker, setEditedPicker] = useState({ ...picker });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const actualBucketsPerHour = picker.hoursWorked > 0 ? picker.bucketsToday / picker.hoursWorked : 0;
    const isAboveMinimum = actualBucketsPerHour >= MIN_BUCKETS_PER_HOUR;

    const handleSave = async () => {
        setIsSubmitting(true);
        try {
            await onUpdate(picker.id, { harnessId: editedPicker.harnessNumber, row: editedPicker.assignedRow });
            setIsEditing(false);
        } catch (error) {
            alert('❌ Error updating picker');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm(`Remove ${picker.name} from team?`)) return;
        setIsSubmitting(true);
        try {
            await onDelete(picker.id);
            onClose();
        } catch (error) {
            alert('❌ Error removing picker');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Custom Header for BaseModal
    const header = (
        <div className="flex items-center gap-3">
            <div className="size-12 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-700 text-xl">{picker.avatar}</div>
            <div>
                <h3 className="text-xl font-black text-gray-900">{picker.name}</h3>
                <p className="text-sm text-gray-500">ID: {picker.idNumber}</p>
            </div>
        </div>
    );

    return (
        <BaseModal onClose={onClose} title="">
            <div className="flex items-center justify-between mb-6">
                {header}
            </div>

            {/* Status Banner */}
            <div className={`mb-6 p-4 rounded-xl border-2 ${picker.status === 'Below Minimum' ? 'bg-red-50 border-red-300' :
                picker.status === 'Active' ? 'bg-green-50 border-green-300' :
                    picker.status === 'Break' ? 'bg-orange-50 border-orange-300' : 'bg-gray-50 border-gray-300'
                }`}>
                <p className="text-xs font-bold uppercase text-gray-600">Current Status</p>
                <p className={`text-lg font-black ${picker.status === 'Below Minimum' ? 'text-red-600' :
                    picker.status === 'Active' ? 'text-green-600' :
                        picker.status === 'Break' ? 'text-orange-600' : 'text-gray-600'
                    }`}>{picker.status}</p>
            </div>

            {/* Tabs */}
            <div className="flex p-1 bg-gray-100 rounded-lg mb-6">
                {(['INFO', 'PERFORMANCE', 'HISTORY'] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-2 px-3 rounded-md text-xs font-bold transition-all ${activeTab === tab ? 'bg-white shadow-sm text-[#ff1f3d]' : 'text-gray-500'}`}>
                        {tab}
                    </button>
                ))}
            </div>

            {activeTab === 'INFO' && (
                <div className="space-y-4">
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Harness Number</label>
                        {isEditing ? (
                            <input type="text" value={editedPicker.harnessNumber}
                                onChange={(e) => setEditedPicker({ ...editedPicker, harnessNumber: e.target.value.toUpperCase() })}
                                className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-[#ff1f3d] outline-none font-mono uppercase text-gray-900 bg-white" />
                        ) : (
                            <p className="text-lg font-bold text-[#ff1f3d] font-mono">{picker.harnessNumber || 'Not assigned'}</p>
                        )}
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Assigned Row</label>
                        {isEditing ? (
                            <input type="number" value={editedPicker.assignedRow || ''}
                                onChange={(e) => setEditedPicker({ ...editedPicker, assignedRow: e.target.value ? parseInt(e.target.value) : undefined })}
                                className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-[#ff1f3d] outline-none text-gray-900 bg-white" />
                        ) : (
                            <p className="text-lg font-bold text-gray-900">{picker.assignedRow ? `Row ${picker.assignedRow}` : 'Not assigned'}</p>
                        )}
                    </div>
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                        <p className="text-xs font-bold text-blue-600 uppercase mb-3">Today's Stats</p>
                        <div className="grid grid-cols-3 gap-3">
                            <div><p className="text-2xl font-black text-blue-900">{picker.bucketsToday}</p><p className="text-xs text-blue-700">Buckets</p></div>
                            <div><p className="text-2xl font-black text-blue-900">{picker.hoursWorked.toFixed(1)}h</p><p className="text-xs text-blue-700">Hours</p></div>
                            <div><p className="text-2xl font-black text-blue-900">${picker.earningsToday.toFixed(0)}</p><p className="text-xs text-blue-700">Earnings</p></div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {isEditing ? (
                            <>
                                <button onClick={handleSave} disabled={isSubmitting}
                                    className="w-full py-3 bg-[#ff1f3d] text-white rounded-xl font-bold disabled:bg-gray-300">
                                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                                </button>
                                <button onClick={() => { setEditedPicker({ ...picker }); setIsEditing(false); }}
                                    className="w-full py-3 bg-gray-200 text-gray-700 rounded-xl font-bold">Cancel</button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => setIsEditing(true)}
                                    className="w-full py-3 bg-gray-200 text-gray-700 rounded-xl font-bold flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-[20px]">edit</span>Edit Details
                                </button>
                                <button onClick={handleDelete} disabled={isSubmitting}
                                    className="w-full py-3 bg-red-50 text-red-600 border-2 border-red-200 rounded-xl font-bold flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-[20px]">person_remove</span>
                                    {isSubmitting ? 'Removing...' : 'Remove from Team'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'PERFORMANCE' && (
                <div className="space-y-4">
                    <div className={`rounded-xl p-5 border-2 ${isAboveMinimum ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-xs font-bold uppercase text-gray-600">Buckets/Hour</p>
                                <p className={`text-3xl font-black ${isAboveMinimum ? 'text-green-600' : 'text-red-600'}`}>{actualBucketsPerHour.toFixed(1)}</p>
                            </div>
                            <span className={`material-symbols-outlined text-4xl ${isAboveMinimum ? 'text-green-500' : 'text-red-500 animate-pulse'}`}>
                                {isAboveMinimum ? 'trending_up' : 'trending_down'}
                            </span>
                        </div>
                        <div className="bg-white/50 rounded-lg p-3">
                            <p className="text-xs font-bold text-gray-600 mb-1">Minimum Required</p>
                            <p className="text-lg font-black text-gray-900">{MIN_BUCKETS_PER_HOUR.toFixed(1)} buckets/hr</p>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'HISTORY' && (
                <div className="space-y-3">
                    <p className="text-xs font-bold text-gray-500 uppercase">Recent Activity</p>
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <p className="text-sm font-bold text-gray-900">Started shift</p>
                        <p className="text-xs text-gray-600">{picker.assignedRow ? `Assigned to Row ${picker.assignedRow}` : 'No row assigned'}</p>
                    </div>
                </div>
            )}
        </BaseModal>
    );
};

// ====================================
// MODAL: ROW ASSIGNMENT
// ====================================
const RowAssignmentModal = ({ onClose, onAssign, pickers }: {
    onClose: () => void,
    onAssign: (rowNumber: number, side: 'North' | 'South', assignedPickers: string[]) => void,
    pickers: UIPicker[]
}) => {
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
        <BaseModal title="Assign Row" onClose={onClose}>
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
        </BaseModal>
    );
};

// ====================================
// MODAL: DAY CONFIGURATION
// ====================================
const DayConfigModal = ({ config, onClose, onSave }: { config: DayConfig, onClose: () => void, onSave: (config: DayConfig) => void }) => {
    const [editedConfig, setEditedConfig] = useState({ ...config });

    return (
        <BaseModal title="Day Configuration" onClose={onClose}>
            <div className="space-y-4">
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Orchard Block</label>
                    <select value={editedConfig.orchard} onChange={(e) => setEditedConfig({ ...editedConfig, orchard: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#ff1f3d] outline-none text-gray-900 bg-white">
                        <option>El Pedregal - Block 4B</option><option>Sunny Hills - Block 2A</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Variety</label>
                    <select value={editedConfig.variety} onChange={(e) => setEditedConfig({ ...editedConfig, variety: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#ff1f3d] outline-none text-gray-900 bg-white">
                        <option>Lapin</option><option>Santina</option><option>Sweetheart</option>
                    </select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    {(['Standard', 'Export', 'Process'] as const).map(type => (
                        <label key={type} className="cursor-pointer">
                            <input type="radio" name="binType" checked={editedConfig.binType === type}
                                onChange={() => setEditedConfig({ ...editedConfig, binType: type })} className="peer sr-only" />
                            <div className="h-full rounded-xl border-2 border-gray-200 p-3 peer-checked:border-[#ff1f3d] peer-checked:bg-red-50 flex flex-col items-center">
                                <span className="material-symbols-outlined text-[#ff1f3d] mb-1">
                                    {type === 'Standard' ? 'shopping_basket' : type === 'Export' ? 'inventory_2' : 'recycling'}
                                </span>
                                <span className="text-sm font-bold text-gray-900">{type}</span>
                            </div>
                        </label>
                    ))}
                </div>
            </div>
            <button onClick={() => { onSave(editedConfig); onClose(); }}
                className="w-full mt-6 py-4 bg-[#ff1f3d] text-white rounded-xl font-bold uppercase">Save Configuration</button>
        </BaseModal>
    );
};

// ====================================
// HEADER
// ====================================
const Header = ({ title, subtitle, onProfileClick }: { title: string, subtitle: string, onProfileClick: () => void }) => (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="flex items-center px-4 py-3 justify-between">
            <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-white border border-[#ff1f3d]/20 text-[#ff1f3d] shadow-sm flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">agriculture</span>
                </div>
                <div>
                    <h1 className="text-gray-900 text-lg font-bold">{title}</h1>
                    <p className="text-xs text-gray-500">{subtitle}</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button className="size-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 relative">
                    <span className="material-symbols-outlined">notifications</span>
                    <span className="absolute top-2 right-2 size-2 bg-[#ff1f3d] rounded-full border border-white"></span>
                </button>
                <button onClick={onProfileClick} className="size-10 rounded-full bg-[#ff1f3d] text-white flex items-center justify-center font-bold">TL</button>
            </div>
        </div>
    </header>
);

// ====================================
// HOME VIEW
// ====================================
const HomeView = ({ pickers, onViewPicker }: { pickers: UIPicker[], onViewPicker: (picker: UIPicker) => void }) => {
    const totalBuckets = pickers.reduce((sum, p) => sum + p.bucketsToday, 0);
    const totalEarnings = pickers.reduce((sum, p) => sum + p.earningsToday, 0);
    const activeCount = pickers.filter(p => p.status !== 'Off Duty').length;
    const belowMinimum = pickers.filter(p => p.status === 'Below Minimum');

    return (
        <main className="flex-1 overflow-y-auto pb-24 px-4 pt-4 space-y-6">
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                    <span className="text-[10px] text-gray-500 uppercase font-semibold">Buckets</span>
                    <span className="text-[#ff1f3d] text-2xl font-black font-mono block">{totalBuckets}</span>
                </div>
                <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                    <span className="text-[10px] text-gray-500 uppercase font-semibold">Pay Est.</span>
                    <span className="text-gray-900 text-2xl font-black font-mono block">${totalEarnings >= 1000 ? (totalEarnings / 1000).toFixed(1) + 'k' : totalEarnings.toFixed(0)}</span>
                </div>
                <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                    <span className="text-[10px] text-gray-500 uppercase font-semibold">Active</span>
                    <span className="text-gray-900 text-2xl font-black font-mono block">{activeCount}</span>
                </div>
            </div>

            {belowMinimum.length > 0 && (
                <div className="bg-gradient-to-r from-red-50 to-white rounded-2xl p-5 border border-[#ff1f3d]/30">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="material-symbols-outlined text-[#ff1f3d]">warning</span>
                        <h2 className="text-lg font-bold text-[#d91e36]">Performance Alert</h2>
                        <span className="bg-red-100 text-[#ff1f3d] text-[10px] px-2 py-1 rounded-full font-bold animate-pulse">{belowMinimum.length}</span>
                    </div>
                    <div className="space-y-2">
                        {belowMinimum.slice(0, 2).map(picker => (
                            <div key={picker.id} className="bg-white rounded-lg p-3 border border-red-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="size-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-700 text-xs">{picker.avatar}</div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">{picker.name}</p>
                                        <p className="text-xs text-gray-500">{(picker.bucketsToday / Math.max(picker.hoursWorked, 0.1)).toFixed(1)} bkt/hr</p>
                                    </div>
                                </div>
                                <button onClick={() => onViewPicker(picker)} className="px-3 py-1 bg-[#ff1f3d] text-white rounded-lg text-xs font-bold">Assist</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div>
                <h2 className="text-lg font-bold text-[#d91e36] mb-4">My Crew</h2>
                {pickers.length === 0 ? (
                    <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
                        <span className="material-symbols-outlined text-gray-300 text-5xl mb-3">group</span>
                        <p className="text-gray-500">No pickers yet. Go to Team tab to add pickers.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {pickers.slice(0, 5).map(picker => (
                            <div key={picker.id} onClick={() => onViewPicker(picker)}
                                className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm cursor-pointer active:scale-[0.99]">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-bold">{picker.avatar}</div>
                                        <div>
                                            <h3 className="text-gray-900 font-bold">{picker.name}</h3>
                                            <p className="text-xs text-gray-500">ID #{picker.idNumber} • {picker.assignedRow ? `Row ${picker.assignedRow}` : 'Unassigned'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[#ff1f3d] text-2xl font-black font-mono">{picker.bucketsToday}</p>
                                        <p className="text-[10px] text-gray-500 uppercase">Buckets</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-200">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${picker.status === 'Active' ? 'bg-green-100 text-green-700' :
                                        picker.status === 'Below Minimum' ? 'bg-red-100 text-red-700' :
                                            picker.status === 'Break' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'
                                        }`}>{picker.status}</span>
                                    <span className="text-[10px] text-gray-500">{picker.hoursWorked.toFixed(1)}h worked</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
};

// ====================================
// TEAM VIEW
// ====================================
const TeamView = ({ pickers, onViewPicker, onAddPicker }: { pickers: UIPicker[], onViewPicker: (picker: UIPicker) => void, onAddPicker: () => void }) => {
    const harnessed = pickers.filter(p => p.harnessNumber).length;

    return (
        <main className="flex-1 overflow-y-auto pb-32 px-4 pt-4">
            <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                    <span className="text-[10px] text-gray-500 uppercase font-semibold">Total</span>
                    <span className="text-gray-900 text-2xl font-black font-mono block">{pickers.length}</span>
                </div>
                <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                    <span className="text-[10px] text-gray-500 uppercase font-semibold">Harnesses</span>
                    <span className="text-green-600 text-2xl font-black font-mono block">{harnessed}</span>
                </div>
                <div className="bg-white rounded-xl p-3 border-l-4 border-l-orange-500 border-y border-r border-gray-200 shadow-sm">
                    <span className="text-[10px] text-gray-500 uppercase font-semibold">Pending</span>
                    <span className="text-orange-500 text-2xl font-black font-mono block">{pickers.length - harnessed}</span>
                </div>
            </div>

            <h2 className="text-xl font-bold text-[#d91e36] mb-4">Picker List</h2>

            {pickers.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
                    <span className="material-symbols-outlined text-gray-300 text-6xl mb-3">group</span>
                    <p className="text-gray-500 mb-4">No pickers added yet</p>
                    <button onClick={onAddPicker} className="px-6 py-3 bg-[#ff1f3d] text-white rounded-lg font-bold">Add First Picker</button>
                </div>
            ) : (
                <div className="space-y-3">
                    {pickers.map(picker => (
                        <div key={picker.id} onClick={() => onViewPicker(picker)}
                            className={`bg-white rounded-xl p-4 border shadow-sm cursor-pointer ${!picker.harnessNumber ? 'border-l-4 border-l-orange-500' : 'border-gray-200'}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="size-12 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-700">{picker.avatar}</div>
                                    <div>
                                        <h3 className="text-gray-900 font-bold">{picker.name}</h3>
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${picker.harnessNumber ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {picker.harnessNumber ? 'Onboarded' : 'Setup Incomplete'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-lg">
                                <div><label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Picker ID</label><p className="font-mono font-bold text-sm text-gray-900">{picker.idNumber}</p></div>
                                <div><label className="text-[10px] uppercase font-bold text-[#d91e36] block mb-1">Harness No.</label><p className={`font-mono font-bold text-sm uppercase ${picker.harnessNumber ? 'text-[#ff1f3d]' : 'text-orange-500'}`}>{picker.harnessNumber || 'Required'}</p></div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
};

// ====================================
// TASKS VIEW
// ====================================
const TasksView = ({ rowAssignments, pickers, onAssignRow }: { rowAssignments: UIRowAssignment[], pickers: UIPicker[], onAssignRow: () => void }) => {
    const { broadcasts } = useHarvest();
    const broadcast = broadcasts.length > 0 ? broadcasts[0].content : null;
    const avgCompletion = rowAssignments.length > 0 ? rowAssignments.reduce((sum, r) => sum + r.completionPercentage, 0) / rowAssignments.length : 0;

    return (
        <main className="flex-1 overflow-y-auto pb-32 px-4 pt-4 space-y-6">
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] text-gray-500 uppercase">Block Completion</span>
                    <span className="text-[10px] font-bold text-[#ff1f3d]">{avgCompletion.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-gradient-to-r from-[#ff1f3d] to-[#d91e36] h-2 rounded-full" style={{ width: `${avgCompletion}%` }}></div>
                </div>
            </div>

            {broadcast && (
                <div className="bg-gradient-to-r from-red-50 to-white rounded-xl p-4 border border-[#ff1f3d]/30">
                    <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-[#ff1f3d]">priority_high</span>
                        <div><h3 className="text-gray-900 font-bold text-sm">Manager Broadcast</h3><p className="text-sm text-gray-700">{broadcast}</p></div>
                    </div>
                </div>
            )}

            <div>
                <h2 className="text-lg font-bold text-[#d91e36] mb-4">Row Assignments</h2>
                {rowAssignments.length === 0 ? (
                    <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
                        <span className="material-symbols-outlined text-gray-300 text-6xl mb-3">grid_view</span>
                        <p className="text-gray-500 mb-4">No rows assigned yet</p>
                        <button onClick={onAssignRow} className="px-6 py-3 bg-[#ff1f3d] text-white rounded-lg font-bold">Assign First Row</button>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden divide-y divide-gray-200">
                        {rowAssignments.map(row => (
                            <div key={`${row.rowNumber}-${row.side}`} className="p-4">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="size-6 bg-[#d91e36] text-white rounded flex items-center justify-center text-xs font-bold">{row.rowNumber}</span>
                                        <span className="text-sm font-semibold text-gray-900">{row.side} Side</span>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${row.status === 'Active' ? 'bg-green-100 text-green-700' : row.status === 'Completed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{row.status}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                                    <div className="flex -space-x-2">
                                        {pickers.filter(p => row.assignedPickers.includes(p.id)).map(p => (
                                            <div key={p.id} className="size-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[10px] font-bold">{p.avatar}</div>
                                        ))}
                                    </div>
                                    <span>{row.completionPercentage}%</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                    <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${row.completionPercentage}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="bg-gradient-to-br from-[#d91e36] to-[#b3152b] rounded-2xl p-5 text-white">
                <div className="flex justify-between items-start mb-4">
                    <div><p className="text-xs text-white/80 uppercase">Min Wage</p><p className="text-2xl font-bold">${MIN_WAGE}/hr</p></div>
                    <div className="text-right"><p className="text-xs text-white/80 uppercase">Piece Rate</p><p className="text-lg font-bold">${PIECE_RATE}/bkt</p></div>
                </div>
                <div className="pt-4 border-t border-white/20">
                    <p className="text-sm">Minimum Goal: <strong>{MIN_BUCKETS_PER_HOUR.toFixed(1)} buckets/hr</strong></p>
                </div>
            </div>
        </main>
    );
};

// ====================================
// PROFILE VIEW
// ====================================
const ProfileView = ({ dayConfig, onEditConfig, onLogout, isLoggingOut }: { dayConfig: DayConfig, onEditConfig: () => void, onLogout: () => void, isLoggingOut: boolean }) => {
    return (
        <main className="flex-1 overflow-y-auto pb-24 px-4 pt-4 space-y-6">
            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex items-start gap-4">
                <div className="size-16 rounded-full bg-gray-100 flex items-center justify-center text-[#ff1f3d] text-2xl font-bold">TL</div>
                <div className="flex-1">
                    <h2 className="text-gray-900 font-bold text-lg">Team Leader</h2>
                    <p className="text-sm text-gray-500">ID: TL-001</p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-50 text-[#ff1f3d] mt-2">Team Alpha</span>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-5 space-y-4">
                    <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Orchard Block</label><p className="font-semibold text-gray-900">{dayConfig.orchard}</p></div>
                    <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Variety</label><p className="font-semibold text-gray-900">{dayConfig.variety}</p></div>
                    <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Bin Type</label>
                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-red-50 text-[#ff1f3d] border border-red-100">
                            <span className="material-symbols-outlined text-[18px] mr-2">{dayConfig.binType === 'Standard' ? 'shopping_basket' : dayConfig.binType === 'Export' ? 'inventory_2' : 'recycling'}</span>
                            <span className="text-sm font-bold">{dayConfig.binType}</span>
                        </span>
                    </div>
                </div>
                <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 flex justify-end">
                    <button onClick={onEditConfig} className="text-[#ff1f3d] text-sm font-bold">Edit Config</button>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <h2 className="text-gray-900 text-lg font-bold mb-4">Session Control</h2>
                <p className="text-sm text-gray-600 mb-4">End your current session and return to the login screen.</p>
                <button onClick={onLogout} disabled={isLoggingOut}
                    className="w-full bg-gray-100 hover:bg-red-50 text-gray-900 hover:text-red-600 border-2 border-gray-200 hover:border-red-300 font-bold py-3.5 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    <span className="material-symbols-outlined">logout</span>
                    {isLoggingOut ? 'Logging out...' : 'Logout'}
                </button>
            </div>
        </main>
    );
};

// ====================================
// MAIN COMPONENT
// ====================================
const TeamLeader = () => {
    const { crew, addPicker, updatePicker, removePicker, assignRow, rowAssignments } = useHarvest();
    const { signOut, appUser } = useAuth();

    const [currentView, setCurrentView] = useState<ViewState>('HOME');
    const [showAddPicker, setShowAddPicker] = useState(false);
    const [showPickerDetails, setShowPickerDetails] = useState<UIPicker | null>(null);
    const [showAssignRow, setShowAssignRow] = useState(false);
    const [showDayConfig, setShowDayConfig] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [dayConfig, setDayConfig] = useState<DayConfig>({
        orchard: 'El Pedregal - Block 4B', variety: 'Lapin', targetSize: '28mm+', targetColor: 'Dark Red', binType: 'Standard'
    });

    // Mapear crew del contexto a UIPicker
    const pickers = useMemo<UIPicker[]>(() => {
        return crew.map(p => {
            const hoursWorked = calculateHoursWorked(DEFAULT_START_TIME);
            const status = getPickerStatus(p.buckets, hoursWorked, p.status);
            return {
                id: p.id, name: p.name, avatar: p.avatar, idNumber: p.employeeId,
                harnessNumber: p.harnessId || '', startTime: DEFAULT_START_TIME,
                assignedRow: p.row, bucketsToday: p.buckets, hoursWorked,
                hourlyRate: MIN_WAGE, status, earningsToday: p.buckets * PIECE_RATE,
                qcStatus: p.qcStatus as any
            };
        });
    }, [crew]);

    // Mapear row assignments
    const uiRowAssignments = useMemo<UIRowAssignment[]>(() => {
        return rowAssignments.map(r => ({
            rowNumber: r.row_number, side: r.side === 'north' ? 'North' : 'South',
            assignedPickers: r.assigned_pickers, completionPercentage: r.completion_percentage,
            status: r.completion_percentage === 100 ? 'Completed' : r.completion_percentage > 0 ? 'Active' : 'Assigned'
        }));
    }, [rowAssignments]);

    const getTitle = () => {
        switch (currentView) {
            case 'HOME': return 'HarvestPro NZ';
            case 'TEAM': return 'Crew Setup';
            case 'TASKS': return 'Row Logistics';
            case 'PROFILE': return 'Session Setup';
            case 'MESSAGING': return 'Messaging Hub';
        }
    };

    const getSubtitle = () => {
        switch (currentView) {
            case 'HOME': return 'Team Alpha • Block 4B';
            case 'TEAM': return 'Harness & ID Assignment';
            case 'TASKS': return 'Row Logistics & Monitoring';
            case 'PROFILE': return 'Session & Personal Settings';
            case 'MESSAGING': return 'Team Communication';
        }
    };

    // HANDLERS
    const handleAddPicker = async (pickerData: any) => {
        await addPicker(pickerData);
        alert(`✅ ${pickerData.name} added to team!`);
    };

    const handleUpdatePicker = async (id: string, updates: any) => {
        await updatePicker(id, updates);
        alert(`✅ Picker updated!`);
    };

    const handleDeletePicker = async (pickerId: string) => {
        await removePicker(pickerId);
        alert(`✅ Picker removed from team`);
    };

    const handleAssignRow = async (rowNumber: number, side: 'North' | 'South', assignedPickers: string[]) => {
        await assignRow(rowNumber, side.toLowerCase() as 'north' | 'south', assignedPickers);
        alert(`✅ Row ${rowNumber} assigned!`);
    };

    // LOGOUT CORREGIDO - Sin doble confirmación
    const handleLogout = async () => {
        const confirmed = window.confirm('Are you sure you want to logout? Your session will end.');
        if (!confirmed) return;

        setIsLoggingOut(true);
        try {
            await signOut();
        } catch (error) {
            console.error('Logout error:', error);
            alert('❌ Error logging out. Please try again.');
            setIsLoggingOut(false);
        }
    };

    return (
        <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
            <Header title={getTitle()} subtitle={getSubtitle()} onProfileClick={() => setCurrentView('PROFILE')} />

            {currentView === 'HOME' && <HomeView pickers={pickers} onViewPicker={setShowPickerDetails} />}
            {currentView === 'TEAM' && <TeamView pickers={pickers} onViewPicker={setShowPickerDetails} onAddPicker={() => setShowAddPicker(true)} />}
            {currentView === 'TASKS' && <TasksView rowAssignments={uiRowAssignments} pickers={pickers} onAssignRow={() => setShowAssignRow(true)} />}
            {currentView === 'PROFILE' && <ProfileView dayConfig={dayConfig} onEditConfig={() => setShowDayConfig(true)} onLogout={handleLogout} isLoggingOut={isLoggingOut} />}
            {currentView === 'MESSAGING' && appUser?.id && (
                <div className="flex-1 px-4 pb-24">
                    <SimpleChat userId={appUser.id} userName={appUser.full_name || 'User'} />
                </div>
            )}

            {/* MODALS */}
            {showAddPicker && <AddPickerModal onClose={() => setShowAddPicker(false)} onAdd={handleAddPicker} />}
            {showPickerDetails && <PickerDetailsModal picker={showPickerDetails} onClose={() => setShowPickerDetails(null)} onUpdate={handleUpdatePicker} onDelete={handleDeletePicker} />}
            {showAssignRow && <RowAssignmentModal onClose={() => setShowAssignRow(false)} onAssign={handleAssignRow} pickers={pickers} />}
            {showDayConfig && <DayConfigModal config={dayConfig} onClose={() => setShowDayConfig(false)} onSave={setDayConfig} />}

            {/* FAB - Tasks */}
            {currentView === 'TASKS' && (
                <div className="fixed bottom-24 right-4 z-40">
                    <button onClick={() => setShowAssignRow(true)} className="size-14 rounded-full bg-[#ff1f3d] text-white shadow-lg flex items-center justify-center active:scale-95">
                        <span className="material-symbols-outlined text-[28px]">add_location_alt</span>
                    </button>
                </div>
            )}

            {/* Add Picker Button - Team */}
            {currentView === 'TEAM' && (
                <div className="fixed bottom-[5.5rem] left-0 w-full px-4 pb-2 z-40">
                    <button onClick={() => setShowAddPicker(true)} className="w-full bg-[#ff1f3d] text-white text-lg font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-[0.98]">
                        <span className="material-symbols-outlined">person_add</span>Add New Picker
                    </button>
                </div>
            )}

            {/* Bottom Nav */}
            <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 z-50 shadow-[0_-5px_20px_rgba(0,0,0,0.03)]">
                <div className="flex justify-around items-center h-16">
                    {[
                        { id: 'HOME', icon: 'home', label: 'Home' },
                        { id: 'TEAM', icon: 'group', label: 'Team' },
                        { id: 'TASKS', icon: 'assignment', label: 'Tasks' },
                        { id: 'MESSAGING', icon: 'chat', label: 'Messages' },
                        { id: 'PROFILE', icon: 'person', label: 'Profile' }
                    ].map(item => {
                        const isActive = currentView === item.id;
                        return (
                            <button key={item.id} onClick={() => setCurrentView(item.id as ViewState)}
                                className={`flex flex-col items-center justify-center w-full h-full ${isActive ? 'text-[#ff1f3d]' : 'text-gray-400'} active:scale-95`}>
                                <span className="material-symbols-outlined text-[24px]" style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>{item.icon}</span>
                                <span className="text-[10px] font-medium mt-1">{item.label}</span>
                            </button>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
};

export default TeamLeader;
