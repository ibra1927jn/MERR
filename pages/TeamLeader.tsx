/**
 * TEAMLEADER.TSX - Dashboard Corregido
 */
import React, { useState } from 'react';
import { useHarvest } from '../context/HarvestContext';
import { useMessaging } from '../context/MessagingContext';
import { useAuth } from '../context/AuthContext';
import { PIECE_RATE } from '../types';

// Componentes
import Header from '../components/views/team-leader/Header';
import HomeView from '../components/views/team-leader/HomeView';
import TeamView from '../components/views/team-leader/TeamView';
import TasksView from '../components/views/team-leader/TasksView';
import RunnersView from '../components/views/team-leader/RunnersView';
import ProfileView from '../components/views/team-leader/ProfileView';
import ScannerModal from '../components/modals/ScannerModal';
import AddPickerModal, { NewPickerData } from '../components/modals/AddPickerModal';
import { UIPicker, UIRowAssignment, DayConfig } from '../components/views/team-leader/types';
import { RunnerData } from '../components/modals'; // From index export

// Iconos y Navegación
import { Users, LayoutDashboard, CheckSquare, Truck, UserCircle, MessageSquare } from 'lucide-react';
import SimpleChat from '../components/SimpleChat';

const TeamLeader = () => {
    // 1. Integración de Hooks Correcta
    const {
        crew,
        stats,
        scanBucket,
        addPicker,
        updatePicker,
        currentUser,
        orchard,
        allRunners = []
    } = useHarvest();

    const { sendMessage } = useMessaging();
    const { signOut } = useAuth();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const [activeTab, setActiveTab] = useState('home');
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isAddPickerOpen, setIsAddPickerOpen] = useState(false);

    // Helpers de Mapeo
    const mapToUIPicker = (p: any): UIPicker => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        idNumber: p.picker_id || p.employeeId || 'N/A',
        harnessNumber: p.harnessId || '',
        startTime: '07:00', // Default or from context
        assignedRow: p.row,
        bucketsToday: p.total_buckets_today || 0,
        hoursWorked: p.hours || 0,
        hourlyRate: ((p.total_buckets_today || 0) / (p.hours || 1)),
        status: p.status === 'active' ? 'Active' : p.status === 'on_break' ? 'Break' : 'Off Duty',
        earningsToday: (p.total_buckets_today || 0) * PIECE_RATE, // Using constant
        qcStatus: ['good', 'good', 'good'] // Placeholder
    });

    const mapToRunnerData = (r: any): RunnerData => ({
        id: r.id,
        name: r.name,
        avatar: r.avatar,
        startTime: '08:00',
        status: 'Active',
        bucketsHandled: r.bucketsHandled || 0,
        binsCompleted: r.binsCompleted || 0,
        currentRow: r.currentRow || undefined
    });

    // Mock Row Assignments (Context doesn't have this yet)
    const mockRowAssignments: UIRowAssignment[] = [
        { rowNumber: 12, side: 'North', assignedPickers: [], completionPercentage: 45, status: 'Active' },
        { rowNumber: 14, side: 'South', assignedPickers: [], completionPercentage: 10, status: 'Assigned' }
    ];

    // Mock Day Config
    const dayConfig: DayConfig = {
        orchard: orchard?.id || 'Unknown',
        variety: 'Cherry',
        targetSize: '28mm',
        targetColor: 'Dark Red',
        binType: 'Export'
    };

    // Handlers
    const handleScan = async (data: string) => {
        await scanBucket(data, 'A');
        setIsScannerOpen(false);
    };

    const handleLogout = async () => {
        setIsLoggingOut(true);
        await signOut();
    };

    const handleAddPicker = async (data: NewPickerData) => {
        await addPicker({
            name: data.name,
            picker_id: data.employeeId,
            harnessId: data.harnessId,
            status: 'active',
            safety_verified: data.onboarded,
            row: data.row
        });
        setIsAddPickerOpen(false);
    };

    // 3. Renderizado de Contenido
    const renderContent = () => {
        const uiPickers = crew.map(mapToUIPicker);
        const uiRunners = allRunners.map(mapToRunnerData);

        switch (activeTab) {
            case 'home':
                return (
                    <HomeView
                        pickers={uiPickers}
                        onViewPicker={(p) => console.log('View picker', p)}
                    />
                );
            case 'team':
                return (
                    <TeamView
                        pickers={uiPickers}
                        onViewPicker={(p) => console.log('View picker', p)}
                        onAddPicker={() => setIsAddPickerOpen(true)}
                    />
                );
            case 'tasks':
                return (
                    <TasksView
                        pickers={uiPickers}
                        rowAssignments={mockRowAssignments}
                        onAssignRow={() => console.log('Assign row')}
                    />
                );

            case 'profile':
                return (
                    <ProfileView
                        dayConfig={dayConfig}
                        onEditConfig={() => console.log('Edit config')}
                        onLogout={handleLogout}
                        isLoggingOut={isLoggingOut}
                    />
                );
            case 'messaging':
                return currentUser?.id ? (
                    <div className="h-[calc(100vh-140px)]">
                        <SimpleChat
                            userId={currentUser.id}
                            userName={currentUser.name}
                        />
                    </div>
                ) : null;
            default: return null;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <Header
                title={orchard?.id || 'Huerto'}
                subtitle={currentUser?.name || 'Team Leader'}
                onProfileClick={() => setActiveTab('profile')}
            />

            <main>{renderContent()}</main>



            {/* Navegación Inferior */}
            <nav className="fixed bottom-0 w-full bg-white border-t flex justify-around p-2 z-50">
                <button onClick={() => setActiveTab('home')} className={`p-2 ${activeTab === 'home' ? 'text-[#ff1f3d]' : 'text-gray-400'}`}><LayoutDashboard /></button>
                <button onClick={() => setActiveTab('team')} className={`p-2 ${activeTab === 'team' ? 'text-[#ff1f3d]' : 'text-gray-400'}`}><Users /></button>
                <div className="w-12"></div> {/* Spacer for missing scanner button layout/balance or just remove */}
                <button onClick={() => setActiveTab('messaging')} className={`p-2 ${activeTab === 'messaging' ? 'text-[#ff1f3d]' : 'text-gray-400'}`}><MessageSquare /></button>
                <button onClick={() => setActiveTab('profile')} className={`p-2 ${activeTab === 'profile' ? 'text-[#ff1f3d]' : 'text-gray-400'}`}><UserCircle /></button>
            </nav>

            {/* Modales */}
            {isScannerOpen && (
                <ScannerModal
                    onClose={() => setIsScannerOpen(false)}
                    onScan={handleScan}
                    scanType="BUCKET"
                />
            )}

            {isAddPickerOpen && (
                <AddPickerModal
                    onClose={() => setIsAddPickerOpen(false)}
                    onAdd={handleAddPicker}
                />
            )}
        </div>
    );
};

export default TeamLeader;