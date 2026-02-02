/**
 * TEAM LEADER PAGE - VERSIÓN REFACTORIZADA v2
 * 
 * CAMBIOS:
 * 1. ✅ Modales extraídos a /components/modals/
 * 2. ✅ Vistas extraídas a /components/views/team-leader/
 * 3. ✅ Usa constantes centralizadas de types.ts
 * 4. ✅ Logout funciona correctamente
 * 5. ✅ hoursWorked calculado dinámicamente
 * 6. ✅ ChatModal conectado a Supabase
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useHarvest } from '../context/HarvestContext';
import SimpleChat from '../components/SimpleChat';
import { databaseService, RegisteredUser } from '../services/database.service';
import { Picker, MINIMUM_WAGE, PIECE_RATE } from '../types';

// Importar vistas centralizadas
import {
    Header,
    HomeView,
    TeamView,
    TasksView,
    ProfileView,
    RunnersView,
    UIPicker,
    UIRowAssignment,
    DayConfig
} from '../components/views/team-leader';

// Importar modales centralizados
import {
    AddPickerModal,
    PickerDetailsModal,
    RowAssignmentModal,
    CreateGroupModal,
    SendDirectMessageModal,
    DayConfigModal,
    AddRunnerModal,
    RunnerDetailsModal,
    type ChatGroup,
    type PickerForAssignment,
    type Recipient,
    type RunnerData
} from '../components/modals';

type ViewState = 'HOME' | 'TEAM' | 'TASKS' | 'PROFILE' | 'MESSAGING' | 'RUNNERS';

// =============================================
// CONSTANTES (usando tipos centralizados)
// =============================================
const MIN_BUCKETS_PER_HOUR = MINIMUM_WAGE / PIECE_RATE;
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

    // Estado para Bucket Runners
    const [runners, setRunners] = useState<RunnerData[]>([]);
    const [showAddRunner, setShowAddRunner] = useState(false);
    const [showRunnerDetails, setShowRunnerDetails] = useState<RunnerData | null>(null);

    // Mapear crew del contexto a UIPicker
    const pickers = useMemo<UIPicker[]>(() => {
        return crew.map(p => {
            const hoursWorked = calculateHoursWorked(DEFAULT_START_TIME);
            const status = getPickerStatus(p.buckets, hoursWorked, p.status);
            return {
                id: p.id, name: p.name, avatar: p.avatar, idNumber: p.employeeId,
                harnessNumber: p.harnessId || '', startTime: DEFAULT_START_TIME,
                assignedRow: p.row, bucketsToday: p.buckets, hoursWorked,
                hourlyRate: MINIMUM_WAGE, status, earningsToday: p.buckets * PIECE_RATE,
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
            case 'RUNNERS': return 'Bucket Runners';
        }
    };

    const getSubtitle = () => {
        switch (currentView) {
            case 'HOME': return 'Team Alpha • Block 4B';
            case 'TEAM': return 'Harness & ID Assignment';
            case 'TASKS': return 'Row Logistics & Monitoring';
            case 'PROFILE': return 'Session & Personal Settings';
            case 'MESSAGING': return 'Team Communication';
            case 'RUNNERS': return 'Manage Field Runners';
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

    // Handlers para Bucket Runners
    const handleAddRunner = (runner: RunnerData) => {
        setRunners([...runners, runner]);
        setShowAddRunner(false);
        alert(`✅ Runner added!\n\n👤 ${runner.name}\n⏰ Started at ${runner.startTime}\n📍 ${runner.currentRow ? `Row ${runner.currentRow}` : 'No assignment'}`);
    };

    const handleUpdateRunner = (updatedRunner: RunnerData) => {
        setRunners(runners.map(r => r.id === updatedRunner.id ? updatedRunner : r));
        alert(`✅ Runner updated!\n\n👤 ${updatedRunner.name}\n📊 Status: ${updatedRunner.status}`);
    };

    const handleDeleteRunner = (runnerId: string) => {
        setRunners(runners.filter(r => r.id !== runnerId));
        setShowRunnerDetails(null);
        alert(`✅ Runner removed from active list`);
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
            {currentView === 'RUNNERS' && (
                <RunnersView
                    runners={runners}
                    onAddRunner={() => setShowAddRunner(true)}
                    onViewRunner={setShowRunnerDetails}
                />
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

            {/* Runner Modals */}
            {showAddRunner && (
                <AddRunnerModal
                    onClose={() => setShowAddRunner(false)}
                    onAdd={handleAddRunner}
                />
            )}

            {showRunnerDetails && (
                <RunnerDetailsModal
                    runner={showRunnerDetails}
                    onClose={() => setShowRunnerDetails(null)}
                    onUpdate={handleUpdateRunner}
                    onDelete={handleDeleteRunner}
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

            {/* Add Runner Button - Runners */}
            {currentView === 'RUNNERS' && (
                <div className="fixed bottom-[5.5rem] left-0 w-full px-4 pb-2 z-40">
                    <button onClick={() => setShowAddRunner(true)} className="w-full bg-[#ff1f3d] text-white text-lg font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-[0.98]">
                        <span className="material-symbols-outlined">local_shipping</span>Add New Runner
                    </button>
                </div>
            )}

            {/* Bottom Nav */}
            <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 z-50 shadow-[0_-5px_20px_rgba(0,0,0,0.03)]">
                <div className="flex justify-around items-center h-16">
                    {[
                        { id: 'HOME', icon: 'home', label: 'Home' },
                        { id: 'TEAM', icon: 'group', label: 'Team' },
                        { id: 'RUNNERS', icon: 'local_shipping', label: 'Runners' },
                        { id: 'TASKS', icon: 'assignment', label: 'Tasks' },
                        { id: 'MESSAGING', icon: 'chat', label: 'Chat' }
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