/**
 * MANAGER.TSX - Clean Command Center
 * Lightweight router for Manager department views.
 * Modals extracted to components/manager/modals/
 */
import React, { useState, useMemo } from 'react';
import { useHarvestStore as useHarvest } from '@/stores/useHarvestStore';
import { useMessaging } from '@/context/MessagingContext';
import { Role, Tab, Picker } from '@/types';
import BottomNav, { NavTab } from '@/components/common/BottomNav';

import { useEffect } from 'react';
import { notificationService } from '@/services/notification.service';

// Modular Views
import DashboardView from '@/components/views/manager/DashboardView';
import TeamsView from '@/components/views/manager/TeamsView';
import LogisticsView from '@/components/views/manager/LogisticsView';
import MessagingView from '@/components/views/manager/MessagingView';
// RowListView is preserved for potential future use but OrchardMapView is the primary map
import OrchardMapView from '@/components/views/manager/OrchardMapView';
import TimesheetEditor from '@/components/views/manager/TimesheetEditor';
import InsightsView from '@/components/views/manager/InsightsView';

import SettingsView from '@/components/views/manager/SettingsView';
import ComponentErrorBoundary from '@/components/common/ComponentErrorBoundary';

// Components
import Header from '@/components/common/Header';

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

    // Start/stop notification checking based on user preferences
    useEffect(() => {
        const prefs = notificationService.getPrefs();
        if (prefs.enabled) {
            notificationService.startChecking();
        }
        return () => {
            notificationService.stopChecking();
        };
    }, []);

    // Filter bucket records for today (performance optimization)
    const filteredBucketRecords = useMemo(() => {
        if (!bucketRecords) return [];
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        return bucketRecords.filter(r => new Date(r.scanned_at).getTime() >= startOfDay.getTime());
    }, [bucketRecords]);

    // Tab State
    const [activeTab, setActiveTab] = useState<Tab>('dashboard');

    // Persist selected orchard ID to localStorage
    const [selectedOrchardId, setSelectedOrchardId] = useState<string | undefined>(
        () => localStorage.getItem('active_orchard_id') || undefined
    );

    React.useEffect(() => {
        if (orchard?.id) {
            setSelectedOrchardId(orchard.id);
            localStorage.setItem('active_orchard_id', orchard.id);
        }
    }, [orchard?.id]);

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
                    <ComponentErrorBoundary componentName="Dashboard">
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
                    </ComponentErrorBoundary>
                );
            case 'teams':
                return (
                    <ComponentErrorBoundary componentName="Teams">
                        <TeamsView
                            crew={crew}
                            setShowAddUser={setShowAddUser}
                            setSelectedUser={setSelectedUser}
                            settings={settings}
                            orchardId={selectedOrchardId || orchard?.id}
                        />
                    </ComponentErrorBoundary>
                );
            case 'logistics':
                return (
                    <ComponentErrorBoundary componentName="Logistics">
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
                    </ComponentErrorBoundary>
                );
            case 'messaging':
                return <ComponentErrorBoundary componentName="Messaging"><MessagingView /></ComponentErrorBoundary>;
            case 'map':
                return (
                    <ComponentErrorBoundary componentName="Orchard Map">
                        <div className="h-full">
                            <div className="p-4">
                                <OrchardMapView
                                    totalRows={orchard?.total_rows || 20}
                                    crew={crew}
                                    bucketRecords={filteredBucketRecords}
                                    blockName={orchard?.name || 'Block A'}
                                    targetBucketsPerRow={50}
                                />
                            </div>
                        </div>
                    </ComponentErrorBoundary>
                );
            case 'settings':
                return <ComponentErrorBoundary componentName="Settings"><SettingsView /></ComponentErrorBoundary>;
            case 'timesheet':
                return (
                    <ComponentErrorBoundary componentName="Timesheet">
                        <div className="p-4 md:p-6">
                            <TimesheetEditor orchardId={selectedOrchardId || orchard?.id || ''} />
                        </div>
                    </ComponentErrorBoundary>
                );
            case 'insights':
            case 'analytics':
            case 'reports':
                return <ComponentErrorBoundary componentName="Insights"><InsightsView /></ComponentErrorBoundary>;
            default:
                return <ComponentErrorBoundary componentName="Dashboard"><DashboardView stats={stats} teamLeaders={teamLeaders} crew={crew} presentCount={presentCount} setActiveTab={setActiveTab} /></ComponentErrorBoundary>;
        }
    };

    return (
        <div className="flex flex-col h-full bg-background-light min-h-screen text-slate-900 pb-20">
            {/* Header (hidden on map) */}
            {activeTab !== 'map' && (
                <Header
                    title="Harvest Manager"
                    subtitle={`Dashboard - ${orchard?.name || 'No Orchard'}`}
                    onProfileClick={() => setShowSettings(true)}
                />
            )}

            {/* Content — animate on tab switch */}
            <main className="flex-1 overflow-y-auto">
                <div key={activeTab} className="animate-fade-in">
                    {renderContent()}
                </div>
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
            <BottomNav
                tabs={[
                    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
                    { id: 'teams', label: 'Teams', icon: 'groups' },
                    { id: 'timesheet', label: 'Timesheet', icon: 'schedule' },
                    { id: 'insights', label: 'Insights', icon: 'insights' },
                    { id: 'logistics', label: 'Logistics', icon: 'local_shipping' },
                    { id: 'map', label: 'Rows', icon: 'list_alt' },
                    { id: 'settings', label: 'Settings', icon: 'settings' },
                ] as NavTab[]}
                activeTab={activeTab}
                onTabChange={(id) => setActiveTab(id as Tab)}
            />

            {/* Broadcast FAB */}
            {activeTab !== 'map' && activeTab !== 'messaging' && (
                <div className="fixed bottom-24 right-4 z-40">
                    <button
                        onClick={() => setShowBroadcast(true)}
                        className="gradient-primary glow-primary text-white rounded-full h-14 px-6 flex items-center justify-center gap-2 transition-all active:scale-95 hover:scale-105">
                        <span className="material-symbols-outlined">campaign</span>
                        <span className="font-bold tracking-wide">Broadcast</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default Manager;
