/**
 * MANAGER PAGE - REFACTORED & MODULARIZED
 * 
 * FEATURES:
 * 1. Modular Architecture (Views & Modals separated)
 * 2. Dynamic Settings from Database
 * 3. Real-time Messaging & Broadcasts
 * 4. AI Prediction Integration
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useHarvest } from '../context/HarvestContext';
import { Picker, BucketRecord, HarvestPrediction } from '../types';
import { databaseService, RegisteredUser } from '../services/database.service';
import { generateHarvestPrediction } from '../services/geminiService';

// VIEWS
import Header from '../components/manager/Header';
import DashboardView from '../components/manager/DashboardView';
import TeamsView from '../components/manager/TeamsView';
import LogisticsView from '../components/manager/LogisticsView';
import HeatMapView from '../components/manager/HeatMapView';
import ProfileView from '../components/manager/ProfileView';
import SimpleChat from '../components/SimpleChat';

// MODALS
import RunnerSelectionModal from '../components/modals/RunnerSelectionModal';
import TeamLeaderSelectionModal from '../components/modals/TeamLeaderSelectionModal';
import TeamDetailsModal from '../components/modals/TeamDetailsModal';
import PickerDetailsModal from '../components/modals/PickerDetailsModal';
import BroadcastModal from '../components/modals/BroadcastModal';
import CreateGroupModal, { ChatGroup } from '../components/modals/CreateGroupModal';
import DaySettingsModal from '../components/modals/DaySettingsModal';
import ExportModal from '../components/modals/ExportModal';

// TYPES
type ViewState = 'DASHBOARD' | 'TEAMS' | 'LOGISTICS' | 'MESSAGING' | 'PROFILE' | 'HEATMAP';

const Manager = () => {
    const {
        signOut,
        totalBucketsToday,
        teamVelocity,
        settings,
        updateSettings,
        crew,
        inventory, // This is Bin[]
        alerts,
        broadcasts,
        resolveAlert,
        sendBroadcast,
        updatePicker,
        appUser,
        orchard,
        chatGroups,
        createChatGroup,
        loadChatGroups,
        teamLeaders,
        allRunners
    } = useHarvest();

    // VIEW STATE
    const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');

    // MODAL STATE
    const [showPickerDetails, setShowPickerDetails] = useState<Picker | null>(null);
    const [showBroadcast, setShowBroadcast] = useState(false);
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [showDaySettings, setShowDaySettings] = useState(false);
    const [showExport, setShowExport] = useState(false);

    // LOGOUT & PREDICTION STATE
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [prediction, setPrediction] = useState<HarvestPrediction | null>(null);
    const [isPredicting, setIsPredicting] = useState(false);

    // Mock bucket records for heat map (connect to real data later)
    const bucketRecords: BucketRecord[] = [];

    // LOAD GROUPS
    useEffect(() => {
        if (appUser?.id) {
            loadChatGroups?.();
        }
    }, [appUser?.id]);

    // COMPUTED USERS FOR GROUP CREATION
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
            role: u.role.replace('_', ' ')
        }));

        const pickersList = crew
            .filter(c => c.picker_id && !registeredUsers.find(u => u.id === c.picker_id))
            .map(c => ({
                id: c.picker_id,
                name: c.name,
                role: 'Picker'
            }));

        return [...usersList, ...pickersList];
    }, [crew, registeredUsers]);

    // STATS OBJECT
    const stats = {
        velocity: teamVelocity || 0,
        totalBuckets: totalBucketsToday || 0,
        totalTons: (totalBucketsToday || 0) * 0.005, // Approx tons
        activePickers: crew.filter(p => p.status === 'active').length,
        avgBucketsPerHour: teamVelocity || 0,
        timeData: [30, 45, teamVelocity || 0, (teamVelocity || 0) + 5, (teamVelocity || 0) - 2]
    };

    // LOGISTICS STATE MAPPING
    const logisticsInventory = {
        emptyBins: inventory?.filter(b => b.status === 'empty').length || 0,
        binsOfBuckets: inventory?.filter(b => b.status === 'full').length || 0
    };

    // DAY SETTINGS MAPPING
    const daySettings = {
        bucketRate: settings?.piece_rate,
        targetTons: settings?.target_tons,
        startTime: '07:00',
        teams: ['Main Crew']
    };

    // HANDLERS
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

    const handleGeneratePrediction = async () => {
        setIsPredicting(true);
        try {
            const result = await generateHarvestPrediction({
                currentTons: stats.totalTons,
                targetTons: settings?.target_tons || 40,
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

    const handleLogout = async () => {
        if (!window.confirm('Are you sure you want to logout?')) return;
        setIsLoggingOut(true);
        try {
            await signOut?.();
        } catch (error) {
            console.error('Logout error:', error);
            setIsLoggingOut(false);
        }
    };

    const handleSendBroadcast = async (title: string, message: string, priority: 'normal' | 'high' | 'urgent') => {
        await sendBroadcast?.(title, message, priority);
        alert('✅ Broadcast sent!');
    };

    const handleCreateGroup = async (group: ChatGroup) => {
        if (!appUser?.id || !createChatGroup) return;
        await createChatGroup(group.name, group.members);
        await loadChatGroups?.();
    };

    const handleUpdatePicker = async (id: string, updates: Partial<Picker>) => {
        await updatePicker?.(id, updates);
        setShowPickerDetails(null);
        alert('✅ Picker updated!');
    };

    const handleSaveSettings = (newDaySettings: any) => {
        // Map back to HarvestSettings
        if (updateSettings && settings) {
            updateSettings({
                ...settings,
                piece_rate: newDaySettings.bucketRate,
                target_tons: newDaySettings.targetTons
            });
        }
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
                        settings={settings || { min_wage_rate: 0, piece_rate: 0, min_buckets_per_hour: 0, target_tons: 0 }}
                        crew={crew}
                        alerts={alerts || []}
                        onViewPicker={setShowPickerDetails}
                        onResolveAlert={resolveAlert || (() => { })}
                    />
                )}
                {currentView === 'TEAMS' && (
                    <TeamsView
                        crew={crew}
                        onViewPicker={setShowPickerDetails}
                    />
                )}
                {currentView === 'LOGISTICS' && (
                    <LogisticsView inventory={logisticsInventory} />
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

                {/* Quick Actions (Dashboard Only) */}
                {currentView === 'DASHBOARD' && (
                    <div className="fixed bottom-20 left-4 right-4 z-40 pointer-events-none">
                        <div className="pointer-events-auto bg-[#1e1e1e]/95 backdrop-blur-md rounded-xl border border-[#27272a] p-3 flex gap-2 justify-center shadow-xl mx-auto max-w-md">
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
                            <button
                                onClick={() => setShowBroadcast(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-[#d91e36] text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors"
                            >
                                <span className="material-symbols-outlined text-lg">campaign</span>
                                Broadcast
                            </button>
                        </div>
                    </div>
                )}

                {/* AI Prediction Panel */}
                {prediction && currentView === 'DASHBOARD' && (
                    <div className="fixed top-20 left-4 right-4 z-40">
                        <div className="bg-gradient-to-r from-purple-900/95 to-indigo-900/95 backdrop-blur-md rounded-xl border border-purple-500/30 p-4 shadow-xl max-w-lg mx-auto">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-purple-400">psychology</span>
                                    <span className="text-white font-bold">AI Harvest Prediction</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${prediction.confidence === 0.9 ? 'bg-green-500/20 text-green-400' :
                                        prediction.confidence === 0.5 ? 'bg-yellow-500/20 text-yellow-400' :
                                            'bg-red-500/20 text-red-400'
                                        }`}>
                                        {(prediction.confidence === 1 ? 'high' : prediction.confidence >= 0.7 ? 'high' : prediction.confidence >= 0.4 ? 'medium' : 'low').toUpperCase()}
                                    </span>
                                </div>
                                <button onClick={() => setPrediction(null)} className="text-purple-300 hover:text-white">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <div className="grid grid-cols-3 gap-3 mb-3">
                                <div className="bg-white/10 rounded-lg p-2 text-center">
                                    <p className="text-xs text-purple-300">Predict</p>
                                    <p className="text-lg font-bold text-white">{prediction.predicted_tons}t</p>
                                </div>
                                <div className="bg-white/10 rounded-lg p-2 text-center">
                                    <p className="text-xs text-purple-300">Confidence</p>
                                    <p className="text-lg font-bold text-white">{(prediction.confidence * 100).toFixed(0)}%</p>
                                </div>
                                <div className="bg-white/10 rounded-lg p-2 text-center">
                                    <p className="text-xs text-purple-300">Weather</p>
                                    <p className="text-lg font-bold text-white">{prediction.weather_impact}</p>
                                </div>
                            </div>
                            {prediction.recommended_action && (
                                <div className="text-xs text-purple-200">
                                    💡 {prediction.recommended_action}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* MODALS */}
            {showPickerDetails && (
                <PickerDetailsModal
                    picker={showPickerDetails}
                    onClose={() => setShowPickerDetails(null)}
                    onUpdate={handleUpdatePicker}
                    minWage={settings?.min_wage_rate}
                    pieceRate={settings?.piece_rate}
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
            {showDaySettings && settings && (
                <DaySettingsModal
                    settings={daySettings}
                    onClose={() => setShowDaySettings(false)}
                    onSave={handleSaveSettings}
                    minWage={settings.min_wage_rate}
                />
            )}
            {showExport && (
                <ExportModal
                    crew={crew}
                    onClose={() => setShowExport(false)}
                />
            )}

            {/* BOTTOM NAVIGATION */}
            <nav className="fixed bottom-0 w-full bg-[#1e1e1e] border-t border-[#27272a] z-50 shadow-[0_-8px_30px_rgba(0,0,0,0.5)]">
                <div className="grid grid-cols-5 h-16 items-center max-w-lg mx-auto">
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
