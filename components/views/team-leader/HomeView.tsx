import React, { useMemo } from 'react';
import { useHarvest } from '../../../context/HarvestContext';
import { useAuth } from '../../../context/AuthContext';

const HomeView = () => {
    const { crew, bucketRecords, stats } = useHarvest();
    const { appUser } = useAuth();

    // 1. Filter my crew
    const myCrew = useMemo(() => {
        if (!appUser) return [];
        return crew.filter(p => p.team_leader_id === appUser.id);
    }, [crew, appUser]);

    // 2. Calculate Team Stats (Today)
    const teamStats = useMemo(() => {
        const myPickerIds = myCrew.map(p => p.id);
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const todayRecords = bucketRecords.filter(r =>
            myPickerIds.includes(r.picker_id) &&
            new Date(r.scanned_at).getTime() >= startOfDay.getTime()
        );

        const totalBuckets = todayRecords.length;
        // Fallback or use context stats if applicable
        const pieceRate = (stats as any)?.piece_rate || 6.50;
        const estimatedPay = totalBuckets * pieceRate;
        const estimatedTons = totalBuckets * 0.018; // approx

        return { totalBuckets, estimatedPay, estimatedTons };
    }, [myCrew, bucketRecords, stats]);

    // 3. Sort Crew by Performance
    const sortedCrew = useMemo(() => {
        return [...myCrew].sort((a, b) => (b.total_buckets_today || 0) - (a.total_buckets_today || 0));
    }, [myCrew]);

    const targetBuckets = 60; // Example target for progress bar

    return (
        <div className="bg-background-light min-h-screen pb-24">
            {/* HEADER */}
            <header className="bg-surface-white border-b border-border-light sticky top-0 z-30 pt-safe-top">
                <div className="px-6 py-4">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-2xl font-black text-text-main tracking-tight">
                                Good Morning, <br />
                                <span className="text-primary">{appUser?.full_name?.split(' ')[0] || 'Leader'}</span>
                            </h1>
                            <p className="text-sm text-text-sub font-medium mt-1">
                                {new Date().toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </p>
                        </div>
                        <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20">
                            {appUser?.full_name?.substring(0, 2).toUpperCase() || 'TL'}
                        </div>
                    </div>

                    {/* KPI CARDS */}
                    <div className="grid grid-cols-3 gap-3">
                        <KpiCard label="Buckets" value={teamStats.totalBuckets} icon="shopping_basket" color="primary" />
                        <KpiCard label="Pay Est." value={`$${Math.round(teamStats.estimatedPay)}`} icon="payments" color="text-main" />
                        <KpiCard label="Tons" value={teamStats.estimatedTons.toFixed(1)} icon="scale" color="text-main" />
                    </div>
                </div>
            </header>

            <div className="px-4 mt-6 space-y-8">
                {/* SAFETY SECTION */}
                <section>
                    <div className="bg-gradient-to-br from-[#111827] to-[#1f2937] rounded-3xl p-5 text-white shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-3 opacity-10">
                            <span className="material-symbols-outlined text-9xl">health_and_safety</span>
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="material-symbols-outlined text-warning">warning</span>
                                <h3 className="font-bold uppercase tracking-wider text-xs text-gray-400">Safety First</h3>
                            </div>
                            <h2 className="text-xl font-bold mb-1">Morning Huddle</h2>
                            <p className="text-gray-400 text-sm mb-4">Ensure all pickers have checked their ladders.</p>
                            <button className="w-full bg-white/10 hover:bg-white/20 py-2 rounded-xl text-sm font-bold transition-colors border border-white/10">
                                View Checklist
                            </button>
                        </div>
                    </div>
                </section>

                {/* PERFORMANCE ANALYTICS */}
                <section>
                    <h3 className="font-bold text-text-main text-lg mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">bar_chart</span>
                        Crew Performance
                    </h3>
                    <div className="bg-surface-white rounded-3xl p-5 border border-border-light shadow-sm space-y-4">
                        {sortedCrew.slice(0, 5).map(picker => {
                            const progress = Math.min(((picker.total_buckets_today || 0) / targetBuckets) * 100, 100);
                            return (
                                <div key={picker.id}>
                                    <div className="flex justify-between text-xs font-bold mb-1">
                                        <span className="text-text-main">{picker.name}</span>
                                        <span className="text-text-sub">{picker.total_buckets_today} / {targetBuckets}</span>
                                    </div>
                                    <div className="h-2 w-full bg-background-light rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary-vibrant rounded-full"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                        {sortedCrew.length === 0 && <p className="text-sm text-text-sub text-center py-2">No active pickers</p>}

                        <button className="w-full text-center text-xs font-bold text-primary-vibrant uppercase tracking-wider mt-2">
                            View Full Report
                        </button>
                    </div>
                </section>

                {/* MY CREW LIST */}
                <section>
                    <h3 className="font-bold text-text-main text-lg mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">group</span>
                        Active Crew ({myCrew.length})
                    </h3>
                    <div className="space-y-3">
                        {sortedCrew.map(picker => (
                            <div key={picker.id} className="bg-surface-white p-4 rounded-2xl border border-border-light shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="size-12 rounded-full bg-background-light flex items-center justify-center text-text-sub font-bold border border-border-light text-sm">
                                        {picker.avatar || (picker.name || '??').substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-text-main">{picker.name}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] bg-background-light px-2 py-0.5 rounded text-text-sub font-mono border border-border-light">
                                                #{picker.picker_id}
                                            </span>
                                            {/* QC Dots */}
                                            <div className="flex gap-1">
                                                {(picker.qcStatus || [1, 1, 1]).map((status, i) => (
                                                    <div key={i} className={`size-2 rounded-full ${status === 1 ? 'bg-success' : 'bg-primary'}`} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="block text-2xl font-black text-text-main leading-none">
                                        {picker.total_buckets_today || 0}
                                    </span>
                                    <span className="text-[10px] font-bold text-text-sub uppercase">Buckets</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

const KpiCard = ({ label, value, icon, color }: any) => (
    <div className="bg-background-light p-3 rounded-2xl border border-border-light flex flex-col items-center justify-center h-24">
        <span className={`material-symbols-outlined text-2xl mb-1 ${color === 'primary' ? 'text-primary' : 'text-text-sub'}`}>
            {icon}
        </span>
        <span className={`text-xl font-black ${color === 'primary' ? 'text-primary' : 'text-text-main'}`}>
            {value}
        </span>
        <span className="text-[10px] font-bold text-text-sub uppercase tracking-wider">{label}</span>
    </div>
);

export default HomeView;
