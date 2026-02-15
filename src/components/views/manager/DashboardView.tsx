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
    delay?: number;
}

const StatCard: React.FC<StatCardProps> = React.memo(({ title, value, unit, trend, color = "primary", icon, delay = 0 }) => (
    <div
        className="glass-card glass-card-hover p-5 relative overflow-hidden group transition-all hover:scale-[1.02] animate-slide-up anim-delay"
        style={{ '--delay': `${delay}s` } as React.CSSProperties}
    >
        {/* Gradient icon background */}
        <div className={`absolute -top-2 -right-2 w-20 h-20 rounded-full opacity-[0.04] group-hover:opacity-[0.08] transition-opacity bg-gradient-to-br from-${color} to-${color}/60`} />
        <div className={`absolute top-0 right-0 p-4 opacity-[0.05] group-hover:opacity-[0.10] transition-opacity text-${color}`}>
            <span className="material-symbols-outlined text-4xl">{icon}</span>
        </div>
        <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">{title}</p>
        <div className="flex items-baseline gap-1">
            <h3 className="text-3xl font-black text-text-main">{value}</h3>
            {unit && <span className="text-xs font-bold text-slate-500">{unit}</span>}
        </div>
        {trend && trend !== 0 ? (
            <div className={`flex items-center gap-1 mt-2 text-xs font-bold ${trend > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                <span className="material-symbols-outlined text-sm">{trend > 0 ? 'trending_up' : 'trending_down'}</span>
                <span>{Math.abs(trend)}% vs yesterday</span>
            </div>
        ) : null}
    </div>
));

const DashboardView: React.FC<DashboardViewProps> = ({ stats, teamLeaders, crew = [], presentCount = 0, setActiveTab, bucketRecords = [], onUserSelect }) => {
    const { settings, orchard } = useHarvestStore();

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
    const alerts = useHarvestStore(state => state.alerts);
    const totalCost = (bucketRecords.length > 0) ? (payroll?.finalTotal || 0) : 0;

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
            orchard_name: orchard?.name || 'Orchard',
            is_offline_data: !navigator.onLine
        };

        const csv = analyticsService.generateDailyReport(
            crew,
            bucketRecords,
            { piece_rate: settings.piece_rate || 6.50, min_wage_rate: settings.min_wage_rate || 23.50 },
            teamLeaders,
            metadata
        );

        const filename = `harvest_report_${todayNZST()}.csv`;
        analyticsService.downloadCSV(csv, filename);
    }, [crew, bucketRecords, settings, teamLeaders, orchard?.name]);

    // Empty state when no data at all
    const isEmpty = crew.length === 0 && bucketRecords.length === 0;

    if (isEmpty) {
        return (
            <div className="p-4 md:p-6 max-w-7xl mx-auto pb-24 animate-fade-in">
                <SimulationBanner />
                <TrustBadges />
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center mb-6">
                        <span className="material-symbols-outlined text-4xl text-indigo-400">agriculture</span>
                    </div>
                    <h2 className="text-2xl font-black text-text-main mb-2">No Harvest Data Yet</h2>
                    <p className="text-text-muted max-w-md mb-8">
                        Add your crew and start scanning buckets to see live KPIs, velocity tracking, and cost projections here.
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setActiveTab('teams')}
                            className="gradient-primary glow-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:scale-105 transition-all flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-lg">group_add</span>
                            Add Pickers
                        </button>
                        <button
                            onClick={() => setActiveTab('map')}
                            className="glass-card text-text-sub px-5 py-2.5 font-bold text-sm hover:bg-slate-50 transition-all flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-lg">map</span>
                            View Map
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto pb-24 animate-fade-in">
            <SimulationBanner />
            <TrustBadges />

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
                <div>
                    <h1 className="text-2xl font-black text-text-main">Orchard Overview</h1>
                    <p className="text-sm text-text-muted font-medium">Live monitoring • {orchard?.name || 'Orchard'}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={handleExport}
                        className="glass-card text-text-sub px-4 py-2.5 font-bold text-sm hover:bg-slate-50 transition-all flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-lg">download</span>
                        Export
                    </button>
                    <DayClosureButton />
                    <button
                        onClick={() => setActiveTab('map')}
                        className="gradient-primary glow-primary text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:scale-105 transition-all flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-lg">map</span>
                        Live Map
                    </button>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Velocity (2h)" value={velocity} unit="bkt/hr" icon="speed" color="blue-500" delay={0.05} />
                <StatCard title="Production" value={stats.totalBuckets} unit="buckets" trend={0} icon="shopping_basket" color="primary" delay={0.10} />
                <StatCard title="Est. Cost" value={`$${totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} unit="NZD" icon="payments" color="green-500" delay={0.15} />
                <StatCard title="Active Crew" value={presentCount} unit="pickers" icon="groups" color="purple-500" delay={0.20} />
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
                        settings={{ piece_rate: settings.piece_rate || 6.50, min_wage_rate: settings.min_wage_rate || 23.50 }}
                        alerts={alerts}
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
