/**
 * TEAM LEADER PAGE - VERSIÓN REFACTORIZADA
 * 
 * CAMBIOS:
 * 1. ✅ Modales extraídos a /components/modals/
 * 2. ✅ Logout funciona correctamente (sin doble confirmación)
 * 3. ✅ hoursWorked calculado dinámicamente
 * 4. ✅ Mejor manejo de errores
 * 5. ✅ Estados de loading en botones
 * 6. ✅ Persistencia preparada para Supabase
 * 7. ✅ ChatModal conectado a Supabase
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useHarvest } from '../context/HarvestContext';
import SimpleChat from '../components/SimpleChat';
import { databaseService, RegisteredUser } from '../services/database.service';
import { Picker } from '../types';

// Importar modales centralizados
import {
    AddPickerModal,
    PickerDetailsModal,
    RowAssignmentModal,
    CreateGroupModal,
    SendDirectMessageModal,
    DayConfigModal,
    type ChatGroup,
    type DayConfig,
    type PickerForAssignment,
    type Recipient
} from '../components/modals';

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
                                    <div className={`h-1.5 rounded-full ${row.status === 'Completed' ? 'bg-blue-500' : 'bg-[#ff1f3d]'}`} style={{ width: `${row.completionPercentage}%` }}></div>
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
// PROFILE VIEW
// ====================================
const ProfileView = ({ dayConfig, onEditConfig, onLogout, isLoggingOut }: { dayConfig: DayConfig, onEditConfig: () => void, onLogout: () => void, isLoggingOut: boolean }) => (
    <main className="flex-1 overflow-y-auto pb-24 px-4 pt-4 space-y-6">
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
                <div className="size-16 rounded-full bg-[#ff1f3d] flex items-center justify-center text-white text-2xl font-bold">TL</div>
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Team Leader</h2>
                    <p className="text-sm text-gray-500">Team Alpha • Block 4B</p>
                </div>
            </div>
            <div className="space-y-3">
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-gray-600">Orchard</span>
                    <span className="font-bold text-gray-900">{dayConfig.orchard}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-gray-600">Variety</span>
                    <span className="font-bold text-gray-900">{dayConfig.variety}</span>
                </div>
                <div className="flex justify-between items-center py-3">
                    <span className="text-gray-600">Bin Type</span>
                    <span className="font-bold text-[#ff1f3d]">{dayConfig.binType}</span>
                </div>
            </div>
            <button onClick={onEditConfig} className="w-full mt-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[20px]">settings</span>Edit Day Config
            </button>
        </div>
        <button onClick={onLogout} disabled={isLoggingOut}
            className="w-full py-4 bg-red-50 text-red-600 border-2 border-red-200 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">
            <span className="material-symbols-outlined text-[20px]">logout</span>
            {isLoggingOut ? 'Logging out...' : 'Logout'}
        </button>
    </main>
);

// ====================================
// MAIN COMPONENT
// ====================================
const TeamLeader = () => {
    const { signOut, crew, addPicker, updatePicker, removePicker, assignRow, rowAssignments, sendMessage, appUser } = useHarvest();

    const [currentView, setCurrentView] = useState<ViewState>('HOME');
    const [showAddPicker, setShowAddPicker] = useState(false);
    const [showPickerDetails, setShowPickerDetails] = useState<UIPicker | null>(null);
    const [showAssignRow, setShowAssignRow] = useState(false);
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [showSendDM, setShowSendDM] = useState(false);
    const [showDayConfig, setShowDayConfig] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [groups, setGroups] = useState<ChatGroup[]>([]);
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

    // Miembros disponibles para grupos/mensajes - CARGAR USUARIOS REALES
    const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);

    useEffect(() => {
        const loadUsers = async () => {
            const users = await databaseService.getAllUsers();
            setRegisteredUsers(users);
        };
        loadUsers();
    }, []);

    const availableMembers = useMemo(() => {
        const usersList = registeredUsers.map(u => ({
            id: u.id,
            name: u.full_name,
            role: u.role.replace('_', ' '),
            department: u.role === 'manager' ? 'Management' :
                u.role === 'runner' ? 'Logistics' : 'Field Team'
        }));

        const pickersList = crew
            .filter(c => !registeredUsers.find(u => u.id === c.id))
            .map(c => ({
                id: c.id,
                name: c.name,
                role: 'Picker',
                department: 'Field Team'
            }));

        return [...usersList, ...pickersList];
    }, [crew, registeredUsers]);

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

    const handleCreateGroup = (group: ChatGroup) => {
        setGroups([...groups, group]);
        alert(`✅ Group "${group.name}" created!`);
    };

    const handleSendDM = async (recipient: Recipient, message: string) => {
        try {
            await sendMessage('direct', recipient.id, message);
            const newChat: ChatGroup = {
                id: recipient.id,
                name: recipient.name,
                members: [recipient.name],
                isGroup: false,
                lastMsg: message,
                time: new Date().toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' })
            };
            if (!groups.find(g => g.id === recipient.id)) {
                setGroups(prev => [...prev, newChat]);
            }
            alert(`✅ Message sent to ${recipient.name}!`);
        } catch (error) {
            console.error('Error sending DM:', error);
            alert('❌ Error sending message. Please try again.');
        }
    };

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

    // Convertir UIPicker a Picker para el modal centralizado
    const selectedPickerForModal = showPickerDetails ? {
        id: showPickerDetails.id,
        name: showPickerDetails.name,
        avatar: showPickerDetails.avatar,
        role: 'Picker',
        employeeId: showPickerDetails.idNumber,
        harnessId: showPickerDetails.harnessNumber || undefined,
        onboarded: !!showPickerDetails.harnessNumber,
        buckets: showPickerDetails.bucketsToday,
        hours: showPickerDetails.hoursWorked,
        row: showPickerDetails.assignedRow,
        status: showPickerDetails.status === 'Active' ? 'active' as const :
            showPickerDetails.status === 'Break' ? 'on_break' as const :
                showPickerDetails.status === 'Off Duty' ? 'inactive' as const : 'active' as const,
        qcStatus: showPickerDetails.qcStatus as ('good' | 'warning' | 'bad')[]
    } : null;

    // Convertir UIPicker[] a PickerForAssignment[]
    const pickersForAssignment: PickerForAssignment[] = pickers.map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        idNumber: p.idNumber,
        status: p.status
    }));

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

            {/* MODALS - Usando componentes centralizados */}
            {showAddPicker && <AddPickerModal onClose={() => setShowAddPicker(false)} onAdd={handleAddPicker} />}

            {showPickerDetails && selectedPickerForModal && (
                <PickerDetailsModal
                    picker={selectedPickerForModal}
                    onClose={() => setShowPickerDetails(null)}
                    onUpdate={handleUpdatePicker}
                    onDelete={handleDeletePicker}
                    showDeleteButton={true}
                    variant="light"
                />
            )}

            {showAssignRow && (
                <RowAssignmentModal
                    onClose={() => setShowAssignRow(false)}
                    onAssign={handleAssignRow}
                    pickers={pickersForAssignment}
                />
            )}

            {showCreateGroup && (
                <CreateGroupModal
                    onClose={() => setShowCreateGroup(false)}
                    onCreate={handleCreateGroup}
                    availableMembers={availableMembers}
                    variant="light"
                />
            )}

            {showSendDM && (
                <SendDirectMessageModal
                    onClose={() => setShowSendDM(false)}
                    onSend={handleSendDM}
                    recipients={availableMembers}
                />
            )}

            {showDayConfig && (
                <DayConfigModal
                    config={dayConfig}
                    onClose={() => setShowDayConfig(false)}
                    onSave={setDayConfig}
                />
            )}

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