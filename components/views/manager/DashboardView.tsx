/**
 * components/views/manager/DashboardView.tsx
 */
import React from 'react';
import { HarvestState } from '../../../types';

interface DashboardViewProps {
    stats: HarvestState['stats'];
    teamLeaders: any[];
    setActiveTab: (tab: any) => void;
    bucketRecords?: any[]; // Datos en tiempo real
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
        {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-bold ${trend > 0 ? 'text-green-600' : 'text-red-500'}`}>
                <span className="material-symbols-outlined text-sm">{trend > 0 ? 'trending_up' : 'trending_down'}</span>
                <span>{Math.abs(trend)}% vs yesterday</span>
            </div>
        )}
    </div>
);

const DashboardView: React.FC<DashboardViewProps> = ({ stats, teamLeaders, setActiveTab, bucketRecords = [] }) => {
    // Calcular progreso
    const target = 40; // Hardcoded or from settings
    const progress = Math.min(100, (stats.tons / target) * 100);

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
                    title="Velocity"
                    value={stats.velocity}
                    unit="bkt/hr"
                    icon="speed"
                    color="blue-500"
                />
                <StatCard
                    title="Production"
                    value={stats.totalBuckets}
                    unit="buckets"
                    trend={12}
                    icon="shopping_basket"
                    color="primary"
                />
                <StatCard
                    title="Harvested"
                    value={stats.tons.toFixed(1)}
                    unit="tons"
                    icon="scale"
                    color="amber-500"
                />
                <StatCard
                    title="Active Crew"
                    value={teamLeaders.length * 4 + 2} // Ejemplo estimado
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
                                        <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
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

                {/* Right Col: Team Status */}
                <div className="bg-white dark:bg-card-dark rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-white/5 h-fit">
                    <h3 className="font-bold text-slate-800 dark:text-white mb-4">Team Leaders</h3>
                    <div className="space-y-4">
                        {teamLeaders.map(leader => (
                            <div key={leader.id} className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
                                        <img src={`https://ui-avatars.com/api/?name=${leader.name}&background=random`} alt={leader.name} />
                                    </div>
                                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{leader.name}</p>
                                    <p className="text-xs text-slate-500">Block A • Active</p>
                                </div>
                            </div>
                        ))}
                        {teamLeaders.length === 0 && (
                            <p className="text-xs text-slate-400 italic">No team leaders assigned.</p>
                        )}
                        <button
                            onClick={() => setActiveTab('teams')}
                            className="w-full mt-4 py-2 text-xs font-bold text-[#d91e36] bg-[#d91e36]/5 hover:bg-gray-200 rounded-lg transition-colors"
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
