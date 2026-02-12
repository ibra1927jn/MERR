/**
 * MANAGER.TSX - Clean Command Center
 * Lightweight router for Manager department views.
 * Modals extracted to components/manager/modals/
 */
import React, { useState, useMemo } from 'react';
import { useHarvestStore as useHarvest } from '@/stores/useHarvestStore';
import { useMessaging } from '@/context/MessagingContext';
import { Role, Tab, Picker } from '@/types';

import { useEffect } from 'react'; // Ensure useEffect is imported

// Modular Views
import DashboardView from '@/components/views/manager/DashboardView';
import TeamsView from '@/components/views/manager/TeamsView';
import LogisticsView from '@/components/views/manager/LogisticsView';
import MessagingView from '@/components/views/manager/MessagingView';
import RowListView from '@/components/views/manager/RowListView';
import TimesheetEditor from '@/components/views/manager/TimesheetEditor';

import { AuditLogViewer } from '@/components/AuditLogViewer';

// Components
import Header from '@/components/views/team-leader/Header';

// Modals
import DaySettingsModal from '@/components/modals/DaySettingsModal';
import AddPickerModal from '@/components/modals/AddPickerModal';
import BroadcastModal from '@/components/views/manager/BroadcastModal';
import RowAssignmentModal from '@/components/views/manager/RowAssignmentModal';
import PickerDetailsModal from '@/components/modals/PickerDetailsModal';

const Manager = () => {
    const {
        stats,
        crew = [],
        inventory = [],
        orchard,
        settings,
        updateSettings,
        addPicker,
        removePicker,

        presentCount,
        bucketRecords,
        fetchGlobalData,
        updatePicker // Add updatePicker
    } = useHarvest();

    const { sendBroadcast } = useMessaging();

    // Trigger data fetch on mount
    useEffect(() => {
        fetchGlobalData();
    }, [fetchGlobalData]);



    // Filter bucket records for today (performance optimization)
    const filteredBucketRecords = useMemo(() => {
        if (!bucketRecords) return [];
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        return bucketRecords.filter(r => new Date(r.scanned_at).getTime() >= startOfDay.getTime());
    }, [bucketRecords]);

    // Tab State
    const [activeTab, setActiveTab] = useState<Tab>('dashboard');

    // PILAR 1: Persistencia del Contexto (Architecture of Resilience)
    const [selectedOrchardId, setSelectedOrchardId] = useState<string | undefined>(
        () => localStorage.getItem('active_orchard_id') || undefined
    );

    // Sincronizar ID con localStorage
    React.useEffect(() => {
        if (orchard?.id) {
            setSelectedOrchardId(orchard.id);
            localStorage.setItem('active_orchard_id', orchard.id);
        } else if (selectedOrchardId) {
            // Si el context aún no tiene el ID pero localStorage sí, mantenemos el local
            // (Opcional: Podríamos intentar forzar la carga en el context aquí si hubiera un método)
        }
    }, [orchard?.id, selectedOrchardId]);

    // Modal States
    const [showSettings, setShowSettings] = useState(false);
    const [showAddUser, setShowAddUser] = useState(false);
    const [showBroadcast, setShowBroadcast] = useState(false);
    const [showAssignment, setShowAssignment] = useState<{ show: boolean, row: number }>({ show: false, row: 1 });
    const [selectedUser, setSelectedUser] = useState<Picker | null>(null);

    // Derived Data
    const activeRunners = crew.filter(p => p.role === 'runner' || p.role === Role.RUNNER);
    const teamLeaders = crew.filter(p => p.role === 'team_leader' || p.role === Role.TEAM_LEADER);
    const fullBins = inventory.filter(b => b.status === 'full').length;
    const emptyBins = inventory.filter(b => b.status === 'empty').length;

    // Broadcast Handler
    const handleBroadcast = async (title: string, message: string, priority: 'normal' | 'high' | 'urgent') => {
        await sendBroadcast?.(title, message, priority);
        setShowBroadcast(false);
    };

    // Content Renderer
    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return (
                    <DashboardView
                        stats={stats}
                        teamLeaders={teamLeaders}
                        crew={crew}
                        presentCount={presentCount}
                        setActiveTab={setActiveTab}
                        bucketRecords={filteredBucketRecords}
                        onUserSelect={(user) => {
                            const fullUser = crew.find(p => p.id === user.id || p.picker_id === user.picker_id) || user as Picker;
                            setSelectedUser(fullUser);
                        }}
                    />
                );
            case 'teams':
                return (
                    <TeamsView
                        crew={crew}
                        setShowAddUser={setShowAddUser}
                        setSelectedUser={setSelectedUser}
                        settings={settings}
                        orchardId={selectedOrchardId || orchard?.id} // PILAR 1: Use persisted ID first
                    />
                );
            case 'logistics':
                return (
                    <LogisticsView
                        fullBins={fullBins}
                        emptyBins={emptyBins}
                        activeRunners={activeRunners}
                        _setActiveTab={setActiveTab}
                        onRequestPickup={() => handleBroadcast(
                            '🚜 Pickup Requested',
                            'A logistics pickup has been requested at the loading zone.',
                            'urgent'
                        )}
                    />
                );
            case 'messaging':
                return <MessagingView />;
            case 'map':
                return (
                    <div className="h-full bg-black relative">
                        <RowListView
                            // FIX: Pass ALL active crew (Pickers + Runners) so Manager sees row progress
                            runners={crew.filter(p => p.status !== 'inactive')}
                            setActiveTab={setActiveTab}
                            onRowClick={(row) => setShowAssignment({ show: true, row })}
                            // CONEXIÓN DE DATOS REALES:
                            blockName={orchard?.name || 'Loading Block...'}
                            totalRows={orchard?.total_rows || 20}
                            variety={settings?.variety || 'Mix'}
                            targetYield={(settings?.target_tons || 40) * 2500} // Convirtiendo tons a buckets aprox
                        />
                    </div>
                );
            case 'settings':
                return <AuditLogViewer />;
            case 'timesheet':
                return (
                    <div className="p-4 md:p-6">
                        <TimesheetEditor orchardId={selectedOrchardId || orchard?.id || ''} />
                    </div>
                );
            default:
                return <DashboardView stats={stats} teamLeaders={teamLeaders} crew={crew} presentCount={presentCount} setActiveTab={setActiveTab} />;
        }
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-black min-h-screen text-gray-900 pb-20">
            {/* Header (hidden on map) */}
            {activeTab !== 'map' && (
                <Header
                    title="Harvest Manager"
                    subtitle={`Dashboard - ${orchard?.name || 'No Orchard'}`}
                    onProfileClick={() => setShowSettings(true)}
                />
            )}

            {/* Content */}
            <main className="flex-1 overflow-y-auto">
                {renderContent()}
            </main>

            {/* Modals */}
            {showSettings && (
                <DaySettingsModal
                    onClose={() => setShowSettings(false)}
                    settings={{
                        bucketRate: settings?.piece_rate,
                        targetTons: settings?.target_tons
                    }}
                    onSave={(newSettings) => updateSettings({
                        piece_rate: newSettings.bucketRate,
                        target_tons: newSettings.targetTons
                    })}
                />
            )}
            {showAddUser && (
                <AddPickerModal
                    onClose={() => setShowAddUser(false)}
                    onAdd={addPicker}
                />
            )}
            {showBroadcast && (
                <BroadcastModal
                    onClose={() => setShowBroadcast(false)}
                />
            )}
            {showAssignment.show && (
                <RowAssignmentModal
                    initialRow={showAssignment.row}
                    onClose={() => setShowAssignment({ show: false, row: 1 })}
                />
            )}
            {selectedUser && (
                <PickerDetailsModal
                    picker={selectedUser}
                    onClose={() => setSelectedUser(null)}
                    onDelete={removePicker}
                    onUpdate={updatePicker}
                />
            )}

            {/* Navigation Bar */}
            <nav className="fixed bottom-0 left-0 w-full bg-white dark:bg-card-dark border-t border-gray-200 dark:border-white/10 pb-6 pt-3 px-6 z-50">
                <ul className="flex justify-between items-center">
                    {(['dashboard', 'teams', 'timesheet', 'logistics', 'messaging', 'map', 'settings'] as Tab[]).map(tab => (
                        <li key={tab}>
                            <button
                                onClick={() => setActiveTab(tab)}
                                className={`flex flex-col items-center gap-1 transition-all group ${activeTab === tab ? 'text-primary' : 'text-gray-400 hover:text-gray-200'}`}
                            >
                                <div className="relative">
                                    <span className={`material-symbols-outlined group-active:scale-95 transition-transform ${activeTab === tab ? 'filled' : ''}`}>
                                        {tab === 'dashboard' ? 'dashboard' : tab === 'teams' ? 'groups' : tab === 'timesheet' ? 'schedule' : tab === 'logistics' ? 'local_shipping' : tab === 'map' ? 'list_alt' : tab === 'settings' ? 'settings' : 'chat'}
                                    </span>
                                    {tab === 'messaging' && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full border-2 border-white dark:border-card-dark"></span>}
                                </div>
                                <span className="text-[10px] font-medium capitalize">{tab === 'map' ? 'Rows' : tab}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* Broadcast FAB */}
            {activeTab !== 'map' && activeTab !== 'messaging' && (
                <div className="fixed bottom-24 right-4 z-40">
                    <button
                        onClick={() => setShowBroadcast(true)}
                        className="bg-primary hover:bg-red-600 text-white shadow-lg shadow-red-900/40 rounded-full h-14 px-6 flex items-center justify-center gap-2 transition-all active:scale-95">
                        <span className="material-symbols-outlined">campaign</span>
                        <span className="font-bold tracking-wide">Broadcast</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default Manager;
