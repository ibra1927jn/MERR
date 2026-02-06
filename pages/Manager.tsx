/**
 * MANAGER.TSX - High Fidelity Command Center
 * Integrates Dashboard, Teams, Logistics, and Messaging views.
 * 
 * REFACTOR NOTE: usage of modular views from src/components/manager/
 */
import React, { useState, useMemo } from 'react';
import { useHarvest } from '../context/HarvestContext';
import { useAuth } from '../context/AuthContext';
import { Role, Alert, Picker } from '../types';

// Modular Views
import DashboardView from '../components/manager/DashboardView';
import TeamsView from '../components/manager/TeamsView';
import LogisticsView from '../components/manager/LogisticsView';
import MessagingView from '../components/manager/MessagingView';

// Navegación interna
type Tab = 'dashboard' | 'teams' | 'logistics' | 'messaging';

const Manager = () => {
    // --------------------------------------------------------
    // 1. DATA CONNECTION (HarvestContext)
    // --------------------------------------------------------
    const {
        stats,
        crew = [],
        inventory = [],
        orchard,
        settings,
        currentUser,
        broadcasts = []
    } = useHarvest();

    // Estado UI
    const [activeTab, setActiveTab] = useState<Tab>('dashboard');
    const [localAlerts, setLocalAlerts] = useState<Alert[]>([]);

    // --------------------------------------------------------
    // UTILITY FUNCTIONS & DERIVED STATE
    // --------------------------------------------------------

    // Calculate bottleneck surplus (picking vs collection difference)
    const bottleneckSurplus = useMemo(() => {
        const pickingRate = stats.velocity || 0;
        const collectionRate = pickingRate * 0.9;
        return Math.round(pickingRate - collectionRate);
    }, [stats.velocity]);

    // Create a synthetic alert for the dashboard if bottleneck exists
    const dashboardAlerts = useMemo(() => {
        const alerts: Alert[] = [...localAlerts];

        if (bottleneckSurplus > 0) {
            alerts.unshift({
                id: 'bottleneck-warning',
                type: 'performance',
                title: 'Bottleneck Warning',
                message: 'Picking velocity exceeds collection capacity.',
                description: `+${bottleneckSurplus} buckets/hr surplus. Consider adding runners.`,
                severity: 'medium', // Yellow warning
                timestamp: new Date().toISOString()
            });
        }
        return alerts;
    }, [localAlerts, bottleneckSurplus]);

    // --------------------------------------------------------
    // HANDLERS (Mocks or Logical)
    // --------------------------------------------------------
    const handleViewPicker = (picker: Picker) => {
        console.log('View picker:', picker.name);
        // TODO: Navigation to picker details
    };

    const handleResolveAlert = (id: string) => {
        if (id === 'bottleneck-warning') return; // Cannot dismiss system status
        setLocalAlerts(prev => prev.filter(a => a.id !== id));
    };

    const handleOpenBroadcast = () => {
        console.log('Open broadcast modal');
    };

    const handleOpenChat = (chat: any) => {
        console.log('Open chat:', chat.name);
    };

    // --------------------------------------------------------
    // RENDER LAYOUT
    // --------------------------------------------------------
    return (
        <div className="bg-background-light dark:bg-background-dark min-h-screen text-gray-900 dark:text-white pb-24 overflow-x-hidden font-sans">
            {/* STICKY HEADER */}
            <div className="sticky top-0 z-50 bg-background-light dark:bg-background-dark/95 backdrop-blur-md border-b border-gray-200 dark:border-white/10 px-4 pt-4 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-primary/20 p-2 rounded-lg text-primary">
                        <span className="material-symbols-outlined">
                            {activeTab === 'dashboard' && 'agriculture'}
                            {activeTab === 'teams' && 'groups'}
                            {activeTab === 'logistics' && 'local_shipping'}
                            {activeTab === 'messaging' && 'forum'}
                        </span>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold leading-tight">
                            {activeTab === 'dashboard' && 'Command Center'}
                            {activeTab === 'teams' && 'Teams Overview'}
                            {activeTab === 'logistics' && 'Logistics Hub'}
                            {activeTab === 'messaging' && 'Messaging Hub'}
                        </h1>
                        <div className="flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Live Sync • {orchard?.id || 'Orchard'}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div onClick={() => console.log('Settings clicked')} className="cursor-pointer">
                        <img
                            src={`https://ui-avatars.com/api/?name=${currentUser?.name || 'Manager'}&background=random`}
                            alt="Profile"
                            className="w-8 h-8 rounded-full border border-gray-200 dark:border-white/20"
                        />
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <main>
                {activeTab === 'dashboard' && (
                    <DashboardView
                        stats={{
                            totalBuckets: stats.totalBuckets,
                            totalTons: stats.tons,
                            activePickers: crew.filter(p => p.status === 'active').length,
                            avgBucketsPerHour: stats.velocity,
                            timeData: [10, 15, 25, 30, 42, 50, stats.velocity] // Mock time data for chart until real history
                        }}
                        settings={settings || { target_tons: 16, piece_rate: 6.5, min_wage_rate: 23, min_buckets_per_hour: 3 }}
                        crew={crew}
                        alerts={dashboardAlerts}
                        onViewPicker={handleViewPicker}
                        onResolveAlert={handleResolveAlert}
                    />
                )}
                {activeTab === 'teams' && (
                    <TeamsView
                        crew={crew}
                        onViewPicker={handleViewPicker}
                    />
                )}
                {activeTab === 'logistics' && (
                    <LogisticsView
                        inventory={{
                            emptyBins: inventory.filter(b => b.status === 'empty').length,
                            binsOfBuckets: inventory.filter(b => b.status === 'full').length
                        }}
                        crew={crew}
                    />
                )}
                {activeTab === 'messaging' && (
                    <MessagingView
                        broadcasts={broadcasts}
                        onOpenBroadcastModal={handleOpenBroadcast}
                        onOpenChat={handleOpenChat}
                    />
                )}
            </main>

            {/* BROADCAST BUTTON (Floating - Global) */}
            <div className="fixed bottom-24 right-4 z-40">
                <button
                    onClick={handleOpenBroadcast}
                    className="bg-primary hover:bg-red-600 text-white shadow-lg shadow-red-900/40 rounded-full h-14 w-14 lg:w-auto lg:px-6 flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                    <span className="material-symbols-outlined">campaign</span>
                    <span className="font-bold tracking-wide hidden lg:inline">Broadcast</span>
                </button>
            </div>

            {/* BOTTOM NAV */}
            <nav className="fixed bottom-0 left-0 w-full bg-white dark:bg-card-dark border-t border-gray-200 dark:border-white/10 pb-6 pt-3 px-6 z-50">
                <ul className="flex justify-between items-center">
                    <li>
                        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 transition-colors group ${activeTab === 'dashboard' ? 'text-primary' : 'text-gray-400 hover:text-gray-200'}`}>
                            <span className={`material-symbols-outlined group-hover:scale-110 transition-transform ${activeTab === 'dashboard' ? 'filled' : ''}`}>dashboard</span>
                            <span className="text-[10px] font-medium">Dashboard</span>
                        </button>
                    </li>
                    <li>
                        <button onClick={() => setActiveTab('teams')} className={`flex flex-col items-center gap-1 transition-colors group ${activeTab === 'teams' ? 'text-primary' : 'text-gray-400 hover:text-gray-200'}`}>
                            <span className={`material-symbols-outlined group-hover:scale-110 transition-transform ${activeTab === 'teams' ? 'filled' : ''}`}>groups</span>
                            <span className="text-[10px] font-medium">Teams</span>
                        </button>
                    </li>
                    <li>
                        <button onClick={() => setActiveTab('logistics')} className={`flex flex-col items-center gap-1 transition-colors group ${activeTab === 'logistics' ? 'text-primary' : 'text-gray-400 hover:text-gray-200'}`}>
                            <span className={`material-symbols-outlined group-hover:scale-110 transition-transform ${activeTab === 'logistics' ? 'filled' : ''}`}>local_shipping</span>
                            <span className="text-[10px] font-medium">Logistics</span>
                        </button>
                    </li>
                    <li>
                        <button onClick={() => setActiveTab('messaging')} className={`flex flex-col items-center gap-1 transition-colors group ${activeTab === 'messaging' ? 'text-primary' : 'text-gray-400 hover:text-gray-200'}`}>
                            <div className="relative">
                                <span className={`material-symbols-outlined group-hover:scale-110 transition-transform ${activeTab === 'messaging' ? 'filled' : ''}`}>chat</span>
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full border-2 border-white dark:border-card-dark"></span>
                            </div>
                            <span className="text-[10px] font-medium">Messaging</span>
                        </button>
                    </li>
                </ul>
            </nav>
        </div>
    );
};

export default Manager;
