/**
 * components/views/manager/DashboardView.tsx
 * Manager Dashboard with KPIs, Live Feed, and Performance Monitoring
 */
import React, { useMemo, useCallback } from 'react';
import { HarvestState, Picker, BucketRecord, Tab } from '../../../types';
import { useHarvestStore } from '../../../stores/useHarvestStore';
import { analyticsService } from '../../../services/analytics.service';
import { todayNZST } from '@/utils/nzst';
import VelocityChart from './VelocityChart';
import WageShieldPanel from './WageShieldPanel';
import { SimulationBanner } from '../../SimulationBanner';
import { DayClosureButton } from './DayClosureButton';
import { TrustBadges } from '../../common/TrustBadges';

interface DashboardViewProps {
    stats: HarvestState['stats'];
    teamLeaders: Picker[];
    crew: Picker[];
    presentCount: number;
    setActiveTab: (tab: Tab) => void;
    bucketRecords?: BucketRecord[];
    onUserSelect?: (user: Partial<Picker>) => void;
}

interface StatCardProps {
    title: string;
    value: string | number;
    unit?: string;
    trend?: number; // Changed from string to number based on usage (trend > 0)
    color?: string;
    icon: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, unit, trend, color = "primary", icon }) => (
    <div className="glass-card glass-card-hover p-5 relative overflow-hidden group transition-all">
        <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-${color}`}>
            <span className="material-symbols-outlined text-6xl">{icon}</span>
        </div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
        <div className="flex items-baseline gap-1">
            <h3 className="text-3xl font-black text-gray-900">{value}</h3>
            {unit && <span className="text-xs font-bold text-slate-500">{unit}</span>}
        </div>
        {trend && trend !== 0 ? (
            <div className={`flex items-center gap-1 mt-2 text-xs font-bold ${trend > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                <span className="material-symbols-outlined text-sm">{trend > 0 ? 'trending_up' : 'trending_down'}</span>
                <span>{Math.abs(trend)}% vs yesterday</span>
            </div>
        ) : null}
    </div>
);

const DashboardView: React.FC<DashboardViewProps> = ({ stats, teamLeaders, crew = [], presentCount = 0, setActiveTab, bucketRecords = [], onUserSelect }) => {
    const { settings } = useHarvestStore();

    // 1. Calculate Velocity (Buckets/Hr) - Last 2 Hours
    const velocity = useMemo(() => {
        if (!bucketRecords.length) return 0;
        const now = Date.now();
        const twoHoursAgo = now - (2 * 60 * 60 * 1000);

        const recentCount = bucketRecords.filter((r: BucketRecord) =>
            new Date(r.created_at || r.scanned_at).getTime() > twoHoursAgo
        ).length;

        return Math.round(recentCount / 2);
    }, [bucketRecords]);

    // 2. Financial Calculations
    // Retrieve precise payroll from store (calculated by calculations.service)
    const payroll = useHarvestStore(state => state.payroll);
    const totalCost = payroll?.finalTotal || 0;

    // 3. Progress & ETA
    const target = settings.target_tons || 40;
    const progress = Math.min(100, (stats.tons / target) * 100);

    // 4. ETA Calculation (Phase 8)
    const etaInfo = useMemo(() => {
        return analyticsService.calculateETA(
            stats.tons,
            target,
            velocity,
            72 // ~72 buckets per ton
        );
    }, [stats.tons, target, velocity]);

    // 5. Export Handler
    const handleExport = useCallback(() => {
        const now = new Date();
        const metadata = {
            generated_at: now.toLocaleString(),
            last_sync: now.toLocaleString(), // TODO: Get actual last sync from syncService
            pending_queue_count: 0, // TODO: Get from syncService
            orchard_name: 'Block A', // TODO: Get from context
            is_offline_data: !navigator.onLine
        };

        const csv = analyticsService.generateDailyReport(
            crew,
            bucketRecords,
            { piece_rate: settings.piece_rate || 6.50, min_wage_rate: settings.min_wage_rate || 23.15 },
            teamLeaders,
            metadata
        );

        const filename = `harvest_report_${todayNZST()}.csv`;
        analyticsService.downloadCSV(csv, filename);
    }, [crew, bucketRecords, settings, teamLeaders]);

    // Removed unused lowPerformers calculation

    return (
        <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto pb-24">
            {/* Simulation Mode Banner */}
            <SimulationBanner />

            {/* Trust Badges — Enterprise Status */}
            <TrustBadges />

            {/* Header / Welcome */}
            <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Orchard Overview</h1>
                    <p className="text-sm text-gray-500 font-medium">Live monitoring • Block A</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={handleExport}
                        className="glass-card text-gray-700 px-4 py-2.5 font-bold text-sm hover:bg-gray-50 transition-all flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-lg">download</span>
                        Export
                    </button>
                    <DayClosureButton />
                    <button
                        onClick={() => setActiveTab('map')}
                        className="gradient-cherry glow-cherry text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:scale-105 transition-all flex items-center gap-2"
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
                    value={presentCount}
                    unit="pickers"
                    icon="groups"
                    color="purple-500"
                />
            </div>

            {/* Main Content Split */}
            <div className="grid lg:grid-cols-3 gap-6">

                {/* Left Col: Live Feed & Progress */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Goal Progress with ETA */}
                    <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white p-6 !rounded-3xl shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-400 rounded-full blur-3xl opacity-20 -mr-16 -mt-16 pointer-events-none"></div>
                        <div className="relative z-10 flex justify-between items-end mb-4">
                            <div>
                                <p className="text-slate-400 text-xs font-bold uppercase mb-1">Daily Target</p>
                                <h3 className="text-3xl font-black">{progress.toFixed(0)}% <span className="text-lg text-slate-400 font-medium">Complete</span></h3>
                            </div>
                            <div className="text-right">
                                <p className="text-xl font-bold">{stats.tons.toFixed(1)} / {target} t</p>
                                {/* ETA Widget */}
                                <div className={`flex items-center gap-1 mt-1 text-sm font-bold ${etaInfo.status === 'ahead' ? 'text-green-400' :
                                    etaInfo.status === 'on_track' ? 'text-yellow-400' : 'text-red-400'
                                    }`}>
                                    <span className="material-symbols-outlined text-sm">
                                        {etaInfo.status === 'ahead' ? 'rocket_launch' :
                                            etaInfo.status === 'on_track' ? 'schedule' : 'warning'}
                                    </span>
                                    <span>ETA: {etaInfo.eta}</span>
                                </div>
                            </div>
                        </div>
                        {/* Custom Progress Bar */}
                        <div className="h-4 bg-white/20 rounded-full overflow-hidden">
                            <div
                                className="h-full dynamic-width bg-gradient-to-r from-white/90 to-indigo-200 transition-all duration-1000 ease-out"
                                style={{ '--w': `${progress}%` } as React.CSSProperties}
                            ></div>
                        </div>
                    </div>

                    {/* Velocity Chart (Phase 8) */}
                    <VelocityChart
                        bucketRecords={bucketRecords}
                        targetVelocity={Math.round((settings.min_buckets_per_hour || 3.6) * crew.length / 2)}
                    />

                    {/* Live Floor (Recent Scans) */}
                    <div className="glass-card overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                Live Floor
                            </h3>
                            <span className="text-xs font-bold text-gray-400 uppercase">Recent Activity</span>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto">
                            {bucketRecords.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-sm font-medium">
                                    No scans recorded yet today.
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {bucketRecords.slice(0, 10).map((record: BucketRecord, idx: number) => (
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
                                            className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer active:scale-[0.99]"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                                                    {record.picker_name ? record.picker_name.substring(0, 1) : '#'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{record.picker_name || 'Unknown Picker'}</p>
                                                    <p className="text-[10px] text-slate-500 font-medium">Row {record.row_number || '--'}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="inline-block px-2 py-1 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase">
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
                    {/* Wage Shield Panel (Phase 8) */}
                    <WageShieldPanel
                        crew={crew}
                        teamLeaders={teamLeaders}
                        settings={{
                            piece_rate: settings.piece_rate || 6.50,
                            min_wage_rate: settings.min_wage_rate || 23.15
                        }}
                        alerts={useHarvestStore(state => state.alerts)}
                        onUserSelect={onUserSelect}
                    />

                    {/* Team Leaders Quick Access */}
                    <div className="glass-card p-5">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-indigo-500">groups</span>
                            Team Leaders
                        </h3>
                        <div className="space-y-3">
                            {teamLeaders.slice(0, 5).map(leader => {
                                const teamSize = crew.filter(p => p.team_leader_id === leader.id).length;
                                return (
                                    <div
                                        key={leader.id}
                                        onClick={() => onUserSelect && onUserSelect(leader)}
                                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer transition-colors"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                                            {leader.name?.charAt(0) || 'L'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm text-gray-900 truncate">{leader.name}</p>
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
                            className="w-full mt-4 py-2 text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors"
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
