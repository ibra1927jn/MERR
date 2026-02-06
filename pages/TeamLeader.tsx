/**
 * TEAMLEADER.TSX - Dashboard Corregido
 */
import React, { useState } from 'react';
import { useHarvest } from '../context/HarvestContext';
import { useMessaging } from '../context/MessagingContext'; // ¡Importante!
import { useAuth } from '../context/AuthContext';

// Componentes
import Header from '../components/views/team-leader/Header';
import HomeView from '../components/views/team-leader/HomeView';
import TeamView from '../components/views/team-leader/TeamView';
import TasksView from '../components/views/team-leader/TasksView';
import RunnersView from '../components/views/team-leader/RunnersView';
import ProfileView from '../components/views/team-leader/ProfileView';
import ScannerModal from '../components/modals/ScannerModal';
import AddPickerModal from '../components/modals/AddPickerModal';

// Iconos y Navegación
import { Users, LayoutDashboard, CheckSquare, Truck, UserCircle } from 'lucide-react';

const TeamLeader = () => {
    // 1. Integración de Hooks Correcta
    const {
        crew,
        stats,
        scanBucket,
        addPicker,
        updatePicker, // Usamos esto para assignRow/removePicker
        currentUser,
        orchard
    } = useHarvest();

    const { sendMessage } = useMessaging();
    const { signOut } = useAuth();

    const [activeTab, setActiveTab] = useState('home');
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isAddPickerOpen, setIsAddPickerOpen] = useState(false);

    // 2. Funciones "Polyfill" para compatibilidad con las Vistas
    const assignRow = async (pickerId: string, row: number) => {
        await updatePicker(pickerId, { row });
    };

    const removePicker = async (pickerId: string) => {
        // Soft delete: cambiar estado a 'issue' o 'inactive'
        await updatePicker(pickerId, { status: 'issue' });
    };

    const handleScan = async (data: string) => {
        await scanBucket(data, 'A');
        setIsScannerOpen(false);
    };

    // 3. Renderizado de Contenido
    const renderContent = () => {
        switch (activeTab) {
            case 'home':
                return <HomeView stats={stats} teamSize={crew.length} onScanClick={() => setIsScannerOpen(true)} />;
            case 'team':
                return (
                    <TeamView
                        crew={crew.map(p => ({
                            // MAPEO DE TIPOS VITAL PARA CORREGIR ERRORES
                            id: p.id,
                            name: p.name,
                            avatar: p.avatar,
                            role: 'picker',
                            employeeId: p.picker_id, // Corrección: picker_id -> employeeId
                            harnessId: p.harnessId || 'N/A',
                            onboarded: p.safety_verified,
                            buckets: p.total_buckets_today, // Corrección: total_buckets_today -> buckets
                            hours: p.hours,
                            row: p.row,
                            status: p.status === 'active' ? 'active' : 'inactive',
                            qcStatus: ['good', 'good', 'good']
                        }))}
                        onAddMember={() => setIsAddPickerOpen(true)}
                        onRemoveMember={removePicker}
                        onAssignRow={assignRow}
                        onMessage={(id) => sendMessage('direct', id, 'Check in please.')}
                    />
                );
            case 'tasks': return <TasksView />;
            case 'runners': return <RunnersView />;
            case 'profile':
                return <ProfileView user={{ name: currentUser?.name || 'TL', role: 'Team Leader', email: '', avatar: '' }} onLogout={signOut} />;
            default: return null;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <Header userName={currentUser?.name || 'Líder'} orchardName={orchard?.id || 'Huerto'} />

            <main className="p-4">{renderContent()}</main>

            {/* Navegación Inferior */}
            <nav className="fixed bottom-0 w-full bg-white border-t flex justify-around p-2 z-50">
                <button onClick={() => setActiveTab('home')} className="p-2"><LayoutDashboard /></button>
                <button onClick={() => setActiveTab('team')} className="p-2"><Users /></button>
                <button onClick={() => setIsScannerOpen(true)} className="p-2 -mt-8 bg-red-600 rounded-full text-white shadow-lg"><CheckSquare /></button>
                <button onClick={() => setActiveTab('runners')} className="p-2"><Truck /></button>
                <button onClick={() => setActiveTab('profile')} className="p-2"><UserCircle /></button>
            </nav>

            {/* Modales */}
            {isScannerOpen && <ScannerModal isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} onScan={handleScan} />}
            {isAddPickerOpen && <AddPickerModal isOpen={isAddPickerOpen} onClose={() => setIsAddPickerOpen(false)} onAdd={(d) => { addPicker(d); setIsAddPickerOpen(false); }} />}
        </div>
    );
};

export default TeamLeader;