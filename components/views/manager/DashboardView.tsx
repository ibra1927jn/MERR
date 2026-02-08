/**
 * components/views/manager/DashboardView.tsx
 * Manager Dashboard with KPIs, Live Feed, and Performance Monitoring
 */
import React, { useMemo } from 'react';
import { HarvestState, Picker, Role } from '../../../types';
import { useHarvest } from '../../../context/HarvestContext';

interface DashboardViewProps {
    stats: HarvestState['stats'];
    teamLeaders: Picker[];
    crew: Picker[];
    setActiveTab: (tab: any) => void;
    bucketRecords?: any[];
    onUserSelect?: (user: any) => void;
}

const StatCard = ({ title, value, unit, trend, color = "primary", icon }: any) => (
    <div className="bg-white dark:bg-card-dark p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 relative overflow-hidden group">
        <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-${color}`}>
            <span className="material-symbols-outlined text-6xl">{icon}</span>
        </div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
        <div className="flex items-baseline gap-1">
            <h3 className="text-3xl font-black text-slate-900 dark:text-white">{value}</h3>
            {unit && <span className="text-xs font-bold text-slate-500">{unit}</span>}
        </div>
        {trend && trend !== 0 ? (
            <div className={`flex items-center gap-1 mt-2 text-xs font-bold ${trend > 0 ? 'text-green-600' : 'text-red-500'}`}>
                <span className="material-symbols-outlined text-sm">{trend > 0 ? 'trending_up' : 'trending_down'}</span>
                <span>{Math.abs(trend)}% vs yesterday</span>
            </div>
        ) : null}
    </div>
);

const DashboardView: React.FC<DashboardViewProps> = ({ stats, teamLeaders, crew = [], setActiveTab, bucketRecords = [], onUserSelect }) => {
    const { settings } = useHarvest();
    const minBucketsPerHour = settings.min_buckets_per_hour || 3.6;

    // 1. Calculate Velocity (Buckets/Hr) - Last 2 Hours
    const velocity = useMemo(() => {
        if (!bucketRecords.length) return 0;
        const now = Date.now();
        const twoHoursAgo = now - (2 * 60 * 60 * 1000);

        const recentCount = bucketRecords.filter((r: any) =>
            new Date(r.created_at || r.scanned_at).getTime() > twoHoursAgo
        ).length;

        return Math.round(recentCount / 2);
    }, [bucketRecords]);

    // 2. Financial Calculations
    const totalCost = (stats.totalBuckets * (settings.piece_rate || 6.50));

    // 3. Progress
    const target = settings.target_tons || 40;
    const progress = Math.min(100, (stats.tons / target) * 100);

    // 4. LOW PERFORMANCE DETECTION
    const lowPerformers = useMemo(() => {
        // Filter only pickers (not leaders or runners)
        const pickers = crew.filter(p =>
            p.role !== Role.TEAM_LEADER &&
            p.role !== 'team_leader' &&
            p.role !== Role.RUNNER &&
            p.role !== 'runner'
        );

        // Calculate each picker's rate and filter those below minimum
        return pickers
            .map(p => {
                // Calculate hourly rate based on buckets today / hours worked
                const bucketsToday = p.total_buckets_today || 0;
                // Estimate ~4 hours worked (no timestamp data available)
                const hoursWorked = 4;
                const rate = hoursWorked > 0 ? bucketsToday / hoursWorked : 0;

                // Find their Team Leader
                const teamLeader = teamLeaders.find(l => l.id === p.team_leader_id);

                return {
                    ...p,
                    rate: rate,
                    teamLeaderName: teamLeader?.name || 'Unassigned'
                };
            })
            .filter(p => p.rate < minBucketsPerHour)
            .sort((a, b) => a.rate - b.rate); // Worst first
    }, [crew, teamLeaders, minBucketsPerHour]);

    return (
        <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto pb-24">
            {/* Header / Welcome */}
            <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white">Orchard Overview</h1>
                    <p className="text-sm text-slate-500 font-medium">Live monitoring • Block A</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('map')}
                        className="bg-slate-900 dark:bg-white dark:text-black text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-lg">map</span>
                        Live Map
                    </button>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Velocity (2h)"
                    value={velocity}
                    unit="bkt/hr"
                    icon="speed"
                    color="blue-500"
                />
                <StatCard
                    title="Production"
                    value={stats.totalBuckets}
                    unit="buckets"
                    trend={0}
                    icon="shopping_basket"
                    color="primary"
                />
                <StatCard
                    title="Est. Cost"
                    value={`$${totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                    unit="NZD"
                    icon="payments"
                    color="green-500"
                />
                <StatCard
                    title="Active Crew"
                    value={crew.length}
                    unit="pickers"
                    icon="groups"
                    color="purple-500"
                />
            </div>

            {/* Main Content Split */}
            <div className="grid lg:grid-cols-3 gap-6">

                {/* Left Col: Live Feed & Progress */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Goal Progress */}
                    <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#d91e36] rounded-full blur-3xl opacity-20 -mr-16 -mt-16 pointer-events-none"></div>
                        <div className="relative z-10 flex justify-between items-end mb-4">
                            <div>
                                <p className="text-slate-400 text-xs font-bold uppercase mb-1">Daily Target</p>
                                <h3 className="text-3xl font-black">{progress.toFixed(0)}% <span className="text-lg text-slate-400 font-medium">Complete</span></h3>
                            </div>
                            <div className="text-right">
                                <p className="text-xl font-bold">{stats.tons.toFixed(1)} / {target} t</p>
                            </div>
                        </div>
                        {/* Custom Progress Bar */}
                        <div className="h-4 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-[#d91e36] to-orange-500 transition-all duration-1000 ease-out"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Live Floor (Recent Scans) */}
                    <div className="bg-white dark:bg-card-dark rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                Live Floor
                            </h3>
                            <span className="text-xs font-bold text-slate-400 uppercase">Recent Activity</span>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto">
                            {bucketRecords.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-sm font-medium">
                                    No scans recorded yet today.
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-50 dark:divide-white/5">
                                    {bucketRecords.slice(0, 10).map((record: any, idx: number) => (
                                        <div
                                            key={idx}
                                            onClick={() => {
                                                if (onUserSelect) {
                                                    onUserSelect({
                                                        id: record.picker_id,
                                                        picker_id: record.picker_id,
                                                        name: record.picker_name || 'Unknown',
                                                        role: 'picker'
                                                    });
                                                }
                                            }}
                                            className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer active:scale-[0.99]"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                                                    {record.picker_name ? record.picker_name.substring(0, 1) : '#'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{record.picker_name || 'Unknown Picker'}</p>
                                                    <p className="text-[10px] text-slate-500 font-medium">Row {record.row_number || '--'}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="inline-block px-2 py-1 rounded bg-green-100 text-green-700 text-[10px] font-bold uppercase">
                                                    Bucket +1
                                                </span>
                                                <p className="text-[10px] text-slate-400 mt-0.5">
                                                    {new Date(record.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Col: Performance Monitoring */}
                <div className="space-y-4">
                    {/* LOW PERFORMANCE ALERT MODULE */}
                    <div className="bg-white dark:bg-card-dark rounded-2xl shadow-sm border border-red-200 dark:border-red-500/20 overflow-hidden">
                        <div className="bg-red-50 dark:bg-red-500/10 p-4 border-b border-red-100 dark:border-red-500/20">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
                                    <span className="material-symbols-outlined">warning</span>
                                    Low Performance
                                </h3>
                                <span className="text-xs font-bold bg-red-200 dark:bg-red-500/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full">
                                    {lowPerformers.length} alerts
                                </span>
                            </div>
                            <p className="text-[10px] text-red-600/70 dark:text-red-400/70 mt-1">
                                Below {minBucketsPerHour} bkts/hr minimum
                            </p>
                        </div>

                        <div className="max-h-[350px] overflow-y-auto">
                            {lowPerformers.length === 0 ? (
                                <div className="p-6 text-center">
                                    <span className="material-symbols-outlined text-3xl text-green-500 mb-2">check_circle</span>
                                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300">All pickers above minimum!</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-red-50 dark:divide-red-500/10">
                                    {lowPerformers.map((p, idx) => (
                                        <div
                                            key={p.id || idx}
                                            onClick={() => onUserSelect && onUserSelect(p)}
                                            className="p-4 hover:bg-red-50/50 dark:hover:bg-red-500/5 cursor-pointer transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 overflow-hidden">
                                                    <img src={`https://ui-avatars.com/api/?name=${p.name}&background=fecaca&color=dc2626`} className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{p.name}</p>
                                                    {/* TEAM LEADER CONTEXT */}
                                                    <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-xs">supervisor_account</span>
                                                        {p.teamLeaderName}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="block text-lg font-black text-red-600">{p.rate.toFixed(1)}</span>
                                                    <span className="text-[10px] font-bold text-slate-400">bkt/hr</span>
                                                </div>
                                            </div>
                                            {/* Progress bar relative to minimum */}
                                            <div className="mt-2 h-1.5 bg-red-100 dark:bg-red-900/30 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-red-500 transition-all"
                                                    style={{ width: `${Math.min(100, (p.rate / minBucketsPerHour) * 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-3 border-t border-red-100 dark:border-red-500/20">
                            <button
                                onClick={() => setActiveTab('teams')}
                                className="w-full py-2 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg transition-colors"
                            >
                                View All Teams →
                            </button>
                        </div>
                    </div>

                    {/* Team Leaders Quick Access */}
                    <div className="bg-white dark:bg-card-dark rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-white/5">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-orange-500">groups</span>
                            Team Leaders
                        </h3>
                        <div className="space-y-3">
                            {teamLeaders.slice(0, 5).map(leader => {
                                const teamSize = crew.filter(p => p.team_leader_id === leader.id).length;
                                return (
                                    <div
                                        key={leader.id}
                                        onClick={() => onUserSelect && onUserSelect(leader)}
                                        className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-white/5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer transition-colors"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 flex items-center justify-center font-bold">
                                            {leader.name?.charAt(0) || 'L'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{leader.name}</p>
                                            <p className="text-[10px] text-slate-500">{teamSize} pickers</p>
                                        </div>
                                    </div>
                                );
                            })}
                            {teamLeaders.length === 0 && (
                                <p className="text-xs text-slate-400 italic">No Team Leaders assigned.</p>
                            )}
                        </div>
                        <button
                            onClick={() => setActiveTab('teams')}
                            className="w-full mt-4 py-2 text-xs font-bold text-[#d91e36] bg-[#d91e36]/5 hover:bg-[#d91e36]/10 rounded-lg transition-colors"
                        >
                            Manage Teams
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardView;
