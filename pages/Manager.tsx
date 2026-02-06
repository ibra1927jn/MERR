/**
 * MANAGER.TSX - High Fidelity Command Center
 * Integrates Dashboard, Teams, Logistics, and Messaging views.
 */
import React, { useState, useMemo } from 'react';
import { useHarvest } from '../context/HarvestContext';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';

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
        currentUser // Connected correctly via HarvestContext
    } = useHarvest();

    const { currentUser: authUser } = useAuth() as any; // Safe fallback or just remove if unused. Better to rely on HarvestContext.

    // Estado UI
    const [activeTab, setActiveTab] = useState<Tab>('dashboard');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortAscending, setSortAscending] = useState(false);

    // --------------------------------------------------------
    // UTILITY FUNCTIONS
    // --------------------------------------------------------

    // Calculate remaining work time based on progress
    const getRemainingTime = (): string => {
        const targetTons = settings?.target_tons || 16;
        const currentTons = stats.tons || 0;
        const velocity = stats.velocity || 1; // buckets per hour
        const tonsPerBucket = 0.005; // Approx tons per bucket

        if (currentTons >= targetTons) return '0h';

        const remainingTons = targetTons - currentTons;
        const remainingBuckets = remainingTons / tonsPerBucket;
        const hoursRemaining = velocity > 0 ? remainingBuckets / velocity : 0;

        const hours = Math.floor(hoursRemaining);
        const minutes = Math.round((hoursRemaining - hours) * 60);

        if (hours === 0) return `${minutes}m`;
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    };

    // Calculate bottleneck surplus (picking vs collection difference)
    const getBottleneckSurplus = (): number => {
        const pickingRate = stats.velocity || 0;
        const collectionRate = pickingRate * 0.9; // Collection is typically 90% of picking
        return Math.round(pickingRate - collectionRate);
    };

    // Datos Derivados para UI
    const activeRunners = crew.filter(p => p.role === 'runner' || p.role === Role.RUNNER); // Ajustar según tus datos reales
    const activePickers = crew.filter(p => !p.role || p.role === 'picker'); // Asumiendo pickers si no tienen rol específico
    const fullBins = inventory.filter(b => b.status === 'full').length;
    const emptyBins = inventory.filter(b => b.status === 'empty').length;

    // Sort crew by yield (mock logic or real if available)
    const topPerformers = [...activePickers].sort((a, b) => (b.total_buckets_today || 0) - (a.total_buckets_today || 0));

    // --------------------------------------------------------
    // 2. SUB-VIEWS (Based on HTML Snippets)
    // --------------------------------------------------------

    const DashboardView = () => (
        <div className="flex flex-col gap-6 p-4">
            {/* Velocity Monitor */}
            <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold tracking-tight">Velocity Monitor</h2>
                    <button className="text-xs text-primary font-medium hover:text-primary/80 transition-colors">View Report</button>
                </div>
                <div className="bg-white dark:bg-card-dark rounded-xl p-5 shadow-sm border border-gray-100 dark:border-white/5">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Picking vs Collection</p>
                            <h3 className="text-2xl font-bold tracking-tight">Bottleneck Warning</h3>
                        </div>
                        {getBottleneckSurplus() > 0 && (
                            <div className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-2.5 py-1 rounded-full text-xs font-bold border border-yellow-500/20 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[16px]">warning</span>
                                +{getBottleneckSurplus()} Surplus
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-6 mb-6">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="w-2 h-2 rounded-full bg-primary"></span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">Picking</span>
                            </div>
                            <p className="text-2xl font-bold">{Math.round(stats.velocity)} <span className="text-sm font-normal text-gray-500">bkt/hr</span></p>
                        </div>
                        <div className="w-px h-12 bg-gray-200 dark:bg-white/10"></div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">Collection</span>
                            </div>
                            <p className="text-2xl font-bold">{Math.round(stats.velocity * 0.9)} <span className="text-sm font-normal text-gray-500">bkt/hr</span></p>
                        </div>
                    </div>
                    {/* SVG Graph Placeholder */}
                    <div className="h-[140px] w-full relative">
                        <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 50">
                            <defs>
                                <linearGradient id="gradientPick" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor="#ec1337" stopOpacity="0.3"></stop>
                                    <stop offset="100%" stopColor="#ec1337" stopOpacity="0"></stop>
                                </linearGradient>
                            </defs>
                            <path d="M0,40 Q10,38 20,35 T40,30 T60,32 T80,38 T100,42" fill="none" stroke="#3b82f6" strokeWidth="2"></path>
                            <path d="M0,35 Q10,30 20,25 T40,15 T60,18 T80,12 T100,10" fill="url(#gradientPick)" stroke="none"></path>
                            <path d="M0,35 Q10,30 20,25 T40,15 T60,18 T80,12 T100,10" fill="none" stroke="#ec1337" strokeLinecap="round" strokeWidth="2"></path>
                        </svg>
                    </div>
                </div>
            </section>

            {/* Orchard Forecast */}
            <section className="flex flex-col gap-3">
                <h2 className="text-lg font-bold tracking-tight">Orchard Forecast</h2>
                <div className="bg-white dark:bg-card-dark rounded-xl p-5 shadow-sm border border-gray-100 dark:border-white/5 flex items-center justify-between relative overflow-hidden">
                    <div className="z-10 flex flex-col gap-1">
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Daily Target (Tons)</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold dark:text-white text-gray-900">{stats.tons.toFixed(1)}</span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">/ {settings?.target_tons || 16}</span>
                        </div>
                        <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-bold w-fit">
                            {Math.round((stats.tons / (settings?.target_tons || 16)) * 100)}% Complete
                        </div>
                    </div>
                    {/* Circular Progress SVG */}
                    <div className="relative w-24 h-24 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                            <path className="text-gray-200 dark:text-white/10" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3"></path>
                            <path className="text-primary" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${Math.round((stats.tons / (settings?.target_tons || 16)) * 100)}, 100`} strokeLinecap="round" strokeWidth="3"></path>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-[10px] text-gray-400 font-semibold uppercase">Rem</span>
                            <span className="text-sm font-bold">{getRemainingTime()}</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Teams Overview (Horizontal Scroll) */}
            <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold tracking-tight">Top Performers</h2>
                    <button onClick={() => setActiveTab('teams')} className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors mr-1">View All</button>
                </div>
                <div className="-mx-4 px-4 overflow-x-auto hide-scrollbar pb-2">
                    <div className="flex gap-4 w-max">
                        {topPerformers.slice(0, 5).map((picker, idx) => (
                            <div key={picker.id} className="min-w-[200px] w-[200px] bg-white dark:bg-card-dark rounded-xl p-4 shadow-sm border border-gray-100 dark:border-white/5 flex flex-col gap-3 relative group">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full border-2 border-green-500 overflow-hidden">
                                        <img src={`https://ui-avatars.com/api/?name=${picker.name}&background=random`} alt={picker.name} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{picker.name}</span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">Row {picker.row || '--'}</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-gray-500 dark:text-gray-400">Buckets</span>
                                        <span className="font-medium dark:text-gray-200">{picker.total_buckets_today}</span>
                                    </div>
                                    <div className="pt-2 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Quality</span>
                                        <span className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded">A+</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );

    const TeamsView = () => {
        // Filter and sort pickers based on search and sort state
        const filteredPickers = topPerformers.filter(picker =>
            picker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (picker.picker_id && picker.picker_id.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        const sortedPickers = sortAscending
            ? [...filteredPickers].sort((a, b) => (a.total_buckets_today || 0) - (b.total_buckets_today || 0))
            : filteredPickers;

        return (
            <div className="flex flex-col gap-6 p-4">
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-500 dark:text-gray-400">search</span>
                    <input
                        className="w-full bg-white dark:bg-card-dark border border-gray-200 dark:border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder-gray-500 dark:placeholder-gray-500 dark:text-white shadow-sm transition-all"
                        placeholder="Search team or leader..."
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                    )}
                </div>

                <section className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold tracking-tight">
                            Leaderboard
                            {searchTerm && <span className="text-sm font-normal text-gray-500 ml-2">({sortedPickers.length} results)</span>}
                        </h2>
                        <button
                            onClick={() => setSortAscending(!sortAscending)}
                            className="text-xs text-primary font-medium flex items-center gap-1 hover:text-primary/80"
                        >
                            Sort by Yield
                            <span className={`material-symbols-outlined text-[14px] transition-transform ${sortAscending ? 'rotate-180' : ''}`}>
                                {sortAscending ? 'arrow_upward' : 'arrow_downward'}
                            </span>
                        </button>
                    </div>
                    <div className="flex flex-col gap-3">
                        {sortedPickers.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <span className="material-symbols-outlined text-4xl mb-2 block">search_off</span>
                                <p className="font-medium">No pickers found for "{searchTerm}"</p>
                            </div>
                        ) : (
                            sortedPickers.map((picker, idx) => (
                                <div key={picker.id} className="bg-white dark:bg-card-dark rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-white/5 active:scale-[0.99] transition-transform cursor-pointer">
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <div className="w-14 h-14 rounded-full border-2 border-green-500 shadow-sm overflow-hidden">
                                                <img src={`https://ui-avatars.com/api/?name=${picker.name}&background=random`} alt={picker.name} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="absolute -bottom-1 -right-1 bg-gray-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-gray-700">#{idx + 1}</div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">{picker.name}</h3>
                                                    <p className="text-xs font-medium text-primary mb-1">Picker ID: {picker.picker_id}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-lg font-bold leading-none dark:text-white">{picker.total_buckets_today} <span className="text-xs font-normal text-gray-500">bkts</span></p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </div>
        );
    };

    const LogisticsView = () => (
        <div className="flex flex-col gap-6 p-4">
            <section className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-card-dark rounded-xl p-4 shadow-sm border border-gray-100 dark:border-white/5 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <span className="material-symbols-outlined text-6xl text-primary">inventory_2</span>
                    </div>
                    <div className="relative z-10">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-1">Awaiting Pickup</p>
                        <div className="flex items-end gap-2">
                            <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{fullBins}</h3>
                            <span className="text-xs font-bold text-primary mb-1.5">Full Bins</span>
                        </div>
                        <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                            High Priority
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-card-dark rounded-xl p-4 shadow-sm border border-gray-100 dark:border-white/5 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <span className="material-symbols-outlined text-6xl text-green-500">check_box_outline_blank</span>
                    </div>
                    <div className="relative z-10">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-1">Empty Supply</p>
                        <div className="flex items-end gap-2">
                            <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{emptyBins}</h3>
                            <span className="text-xs font-bold text-green-500 mb-1.5">Bins</span>
                        </div>
                        <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                            Sufficient
                        </div>
                    </div>
                </div>
            </section>

            <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold tracking-tight">Live Geo-Tracking</h2>
                    <button className="text-xs text-primary font-medium hover:text-primary/80 transition-colors">Expand Map</button>
                </div>
                <div className="w-full h-48 bg-card-dark rounded-xl overflow-hidden relative border border-white/5">
                    {/* Placeholder Map Pattern */}
                    <div className="absolute inset-0 bg-[#2b2b2b]">
                        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#444 1px, transparent 1px)', backgroundSize: '20px 20px', opacity: 0.5 }}></div>
                        <div className="absolute top-[10%] left-[10%] w-[80%] h-[80%] border-2 border-dashed border-white/10 rounded-lg"></div>
                    </div>
                    {/* Mock Markers */}
                    <div className="absolute top-[35%] left-[45%] flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2">
                        <div className="w-6 h-6 bg-blue-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center z-10">
                            <span className="material-symbols-outlined text-[12px] text-white">agriculture</span>
                        </div>
                        <span className="text-[9px] font-bold text-white bg-black/50 px-1 rounded mt-0.5 backdrop-blur-sm">T-01</span>
                    </div>
                </div>
            </section>
        </div>
    );

    const MessagingView = () => (
        <div className="flex flex-col gap-4 p-4">
            <div className="bg-gray-200 dark:bg-card-dark p-1 rounded-xl flex items-center text-sm font-medium">
                <button className="flex-1 py-2 rounded-lg bg-white dark:bg-primary text-gray-900 dark:text-white shadow-sm transition-all text-center">Groups</button>
                <button className="flex-1 py-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-all text-center">Direct</button>
            </div>
            <div className="bg-gradient-to-r from-cherry-dark to-card-dark rounded-2xl p-0.5 shadow-lg relative overflow-hidden group">
                <div className="bg-card-dark rounded-[14px] p-4 relative z-10">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shadow-lg shadow-red-900/50">
                                <span className="material-symbols-outlined filled">campaign</span>
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white leading-none">Manager Broadcast</h3>
                                <span className="text-xs text-primary font-medium">Official Channel • All Teams</span>
                            </div>
                        </div>
                        <span className="text-[10px] text-gray-400 font-medium bg-white/5 px-2 py-1 rounded-full">12m ago</span>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                        <p className="text-sm text-gray-200 leading-snug">
                            <span className="text-primary font-bold">@All</span> System connected. Real-time data sync active.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );

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
                            {activeTab === 'logistics' && 'Logistics'}
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
                {activeTab === 'dashboard' && <DashboardView />}
                {activeTab === 'teams' && <TeamsView />}
                {activeTab === 'logistics' && <LogisticsView />}
                {activeTab === 'messaging' && <MessagingView />}
            </main>

            {/* BROADCAST BUTTON (Floating) */}
            <div className="fixed bottom-24 right-4 z-40">
                <button className="bg-primary hover:bg-red-600 text-white shadow-lg shadow-red-900/40 rounded-full h-14 w-14 lg:w-auto lg:px-6 flex items-center justify-center gap-2 transition-all active:scale-95">
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
