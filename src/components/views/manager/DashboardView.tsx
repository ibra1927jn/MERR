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
import GoalProgress from './GoalProgress';
import LiveFloor from './LiveFloor';
import TeamLeadersSidebar from './TeamLeadersSidebar';
import { SimulationBanner } from '../../SimulationBanner';
import { DayClosureButton } from './DayClosureButton';
import { TrustBadges } from '../../common/TrustBadges';
import ComponentErrorBoundary from '../../common/ComponentErrorBoundary';

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
    trend?: number;
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
    const payroll = useHarvestStore(state => state.payroll);
    const totalCost = payroll?.finalTotal || 0;

    // 3. Progress & ETA
    const target = settings.target_tons || 40;
    const progress = Math.min(100, (stats.tons / target) * 100);

    // 4. ETA Calculation
    const etaInfo = useMemo(() => {
        return analyticsService.calculateETA(stats.tons, target, velocity, 72);
    }, [stats.tons, target, velocity]);

    // 5. Export Handler
    const handleExport = useCallback(() => {
        const now = new Date();
        const metadata = {
            generated_at: now.toLocaleString(),
            last_sync: now.toLocaleString(),
            pending_queue_count: 0,
            orchard_name: 'Block A',
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

    return (
        <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto pb-24">
            <SimulationBanner />
            <TrustBadges />

            {/* Header */}
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
                <StatCard title="Velocity (2h)" value={velocity} unit="bkt/hr" icon="speed" color="blue-500" />
                <StatCard title="Production" value={stats.totalBuckets} unit="buckets" trend={0} icon="shopping_basket" color="primary" />
                <StatCard title="Est. Cost" value={`$${totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} unit="NZD" icon="payments" color="green-500" />
                <StatCard title="Active Crew" value={presentCount} unit="pickers" icon="groups" color="purple-500" />
            </div>

            {/* Main Content Split */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Left Col */}
                <div className="lg:col-span-2 space-y-6">
                    <GoalProgress
                        progress={progress}
                        currentTons={stats.tons}
                        targetTons={target}
                        eta={etaInfo.eta}
                        etaStatus={etaInfo.status}
                    />
                    <ComponentErrorBoundary componentName="Velocity Chart">
                        <VelocityChart
                            bucketRecords={bucketRecords}
                            targetVelocity={Math.round((settings.min_buckets_per_hour || 3.6) * crew.length / 2)}
                        />
                    </ComponentErrorBoundary>
                    <LiveFloor bucketRecords={bucketRecords} onUserSelect={onUserSelect} />
                </div>

                {/* Right Col */}
                <div className="space-y-4">
                    <WageShieldPanel
                        crew={crew}
                        teamLeaders={teamLeaders}
                        settings={{ piece_rate: settings.piece_rate || 6.50, min_wage_rate: settings.min_wage_rate || 23.15 }}
                        alerts={useHarvestStore(state => state.alerts)}
                        onUserSelect={onUserSelect}
                    />
                    <TeamLeadersSidebar
                        teamLeaders={teamLeaders}
                        crew={crew}
                        setActiveTab={setActiveTab}
                        onUserSelect={onUserSelect}
                    />
                </div>
            </div>
        </div>
    );
};

export default DashboardView;
