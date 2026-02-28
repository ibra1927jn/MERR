/**
 * CostAnalyticsView — Manager Cost Analytics Dashboard
 * Labour cost per bin, per team, cost breakdown with donut chart
 * Premium visual design with shadows, gradients, and micro-animations
 */
import { logger } from '@/utils/logger';
import React, { useState, useEffect, useMemo } from 'react';
import { useHarvestStore } from '@/stores/useHarvestStore';
import { payrollService, PickerBreakdown } from '@/services/payroll.service';
import { analyticsService } from '@/services/analytics.service';
import { TrendLineChart, TrendDataPoint, DayMeta } from '@/components/charts/TrendLineChart';
import LoadingSkeleton from '@/components/common/LoadingSkeleton';


const useOpenProfile = () => {
    const openPickerProfile = useHarvestStore(s => s.openPickerProfile);
    const crew = useHarvestStore(s => s.crew);
    return (pickerId: string) => {
        const picker = crew.find(c => c.picker_id === pickerId);
        if (picker) openPickerProfile(picker.id);
    };
};
/* ── Types ── */
interface TeamCost {
    teamLeader: string;
    pickers: number;
    totalBuckets: number;
    totalHours: number;
    totalEarnings: number;
    costPerBin: number;
}

/* ── SVG Donut Chart ── */
const DonutChart: React.FC<{ pieceRate: number; topUp: number }> = ({ pieceRate, topUp }) => {
    const total = pieceRate + topUp;
    if (total === 0) {
        return (
            <div className="relative w-40 h-40 mx-auto">
                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xs text-text-muted">No data</span>
                </div>
            </div>
        );
    }
    const pieceRatePct = (pieceRate / total) * 100;
    const topUpPct = (topUp / total) * 100;
    const topUpOffset = pieceRatePct;

    return (
        <div className="relative w-40 h-40 mx-auto">
            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                {/* Background */}
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                {/* Piece Rate segment */}
                <circle
                    cx="18" cy="18" r="15.9" fill="none" stroke="url(#greenGrad)"
                    strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={`${pieceRatePct} ${100 - pieceRatePct}`}
                    strokeDashoffset="0"
                    className="transition-all duration-1000 ease-out"
                />
                {/* Top-Up segment */}
                {topUp > 0 && (
                    <circle
                        cx="18" cy="18" r="15.9" fill="none" stroke="url(#amberGrad)"
                        strokeWidth="3" strokeLinecap="round"
                        strokeDasharray={`${topUpPct} ${100 - topUpPct}`}
                        strokeDashoffset={`-${topUpOffset}`}
                        className="transition-all duration-1000 ease-out"
                    />
                )}
                <defs>
                    <linearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#34d399" />
                    </linearGradient>
                    <linearGradient id="amberGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#fbbf24" />
                    </linearGradient>
                </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-black text-text-main">{pieceRatePct.toFixed(0)}%</span>
                <span className="text-[9px] text-text-muted">Piece Rate</span>
            </div>
        </div>
    );
};

/* ── Horizontal Bar ── */
const HBar: React.FC<{ label: string; value: number; max: number; color: string; suffix?: string }> = ({ label, value, max, color, suffix = '' }) => (
    <div className="flex items-center gap-3 mb-3">
        <span className="text-xs font-medium text-text-sub w-28 truncate">{label}</span>
        <div className="flex-1 h-7 rounded-xl bg-slate-100 overflow-hidden relative shadow-inner">
            <div
                className={`h-full rounded-xl transition-all duration-700 ease-out ${color}`}
                style={{ width: `${Math.min(100, (value / (max || 1)) * 100)}%`, minWidth: value > 0 ? '24px' : '0' }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-text-main drop-shadow-sm">
                ${typeof value === 'number' ? value.toFixed(2) : value}{suffix}
            </span>
        </div>
    </div>
);

/* ── KPI Card ── */
const KPICard: React.FC<{ icon: string; label: string; value: string; gradient: string; iconColor: string; delay: number }> = (
    { icon, label, value, gradient, iconColor, delay }
) => (
    <div
        className={`relative overflow-hidden rounded-2xl p-4 shadow-lg shadow-slate-200/50 border border-white/80 ${gradient} dash-card-enter`}
        style={{ animationDelay: `${delay}ms` }}
    >
        <div className="flex items-center gap-2 mb-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconColor} bg-white/60 shadow-sm`}>
                <span className="material-symbols-outlined text-base">{icon}</span>
            </div>
            <span className="text-[10px] text-text-sub uppercase font-bold tracking-wider">{label}</span>
        </div>
        <p className="text-2xl font-black text-text-main">{value}</p>
    </div>
);

/* ── Main Component ── */
const CostAnalyticsView: React.FC = () => {
    const orchardId = useHarvestStore(s => s.orchard?.id);
    const settings = useHarvestStore(s => s.settings);
    const crew = useHarvestStore(s => s.crew);

    const [pickers, setPickers] = useState<PickerBreakdown[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [costTrend, setCostTrend] = useState<TrendDataPoint[]>([]);
    const [selectedDayMeta, setSelectedDayMeta] = useState<DayMeta | null>(null);

    // Break-even = piece_rate from settings (what you pay per bin)
    const breakEven = settings?.piece_rate;

    useEffect(() => {
        const load = async () => {
            if (!orchardId) { setIsLoading(false); return; }
            setIsLoading(true);
            // Load payroll and trends independently — if one fails, the other still works
            const payrollPromise = payrollService.calculateToday(orchardId)
                .then(result => setPickers(result.picker_breakdown))
                .catch(e => logger.warn('[CostAnalytics] Payroll failed:', e));
            const trendsPromise = analyticsService.getDailyTrends(orchardId, 7)
                .then(trends => { setCostTrend(trends.costPerBin); })
                .catch(e => logger.warn('[CostAnalytics] Trends failed:', e));
            await Promise.allSettled([payrollPromise, trendsPromise]);
            setIsLoading(false);
        };
        load();
    }, [orchardId]);

    // Cost per bin
    const totalBuckets = pickers.reduce((sum, p) => sum + p.buckets, 0);
    const totalEarnings = pickers.reduce((sum, p) => sum + p.total_earnings, 0);
    const totalPieceRate = pickers.reduce((sum, p) => sum + (p.buckets * (settings?.piece_rate || 3.50)), 0);
    const totalTopUp = Math.max(0, totalEarnings - totalPieceRate);
    const costPerBin = totalBuckets > 0 ? totalEarnings / totalBuckets : 0;

    // Cost per team — use team_leader_id from crew store for proper grouping
    const teamCosts = useMemo<TeamCost[]>(() => {
        const teamMap = new Map<string, PickerBreakdown[]>();
        pickers.forEach(p => {
            const crewMember = crew.find(c => c.picker_id === p.picker_id || c.name === p.picker_name);
            const leaderId = crewMember?.team_leader_id || 'unassigned';
            const leader = crew.find(c => c.id === leaderId);
            const teamName = leader?.name || 'Unassigned';
            if (!teamMap.has(teamName)) teamMap.set(teamName, []);
            teamMap.get(teamName)!.push(p);
        });
        return Array.from(teamMap.entries()).map(([teamLeader, members]) => {
            const totalBuckets = members.reduce((s, m) => s + m.buckets, 0);
            const totalHours = members.reduce((s, m) => s + m.hours_worked, 0);
            const totalEarnings = members.reduce((s, m) => s + m.total_earnings, 0);
            return {
                teamLeader,
                pickers: members.length,
                totalBuckets,
                totalHours,
                totalEarnings,
                costPerBin: totalBuckets > 0 ? totalEarnings / totalBuckets : 0,
            };
        }).sort((a, b) => a.costPerBin - b.costPerBin);
    }, [pickers, crew]);

    // Top/bottom performers
    const sortedByEfficiency = useMemo(() =>
        [...pickers].filter(p => p.buckets > 0).sort((a, b) => {
            const costA = a.total_earnings / a.buckets;
            const costB = b.total_earnings / b.buckets;
            return costA - costB;
        }),
        [pickers]);

    const maxCostPerBin = Math.max(...teamCosts.map(t => t.costPerBin), costPerBin || 1);
    const openProfile = useOpenProfile();

    if (isLoading) {
        return (
            <div className="space-y-5 max-w-6xl mx-auto">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <LoadingSkeleton type="metric" count={4} />
                </div>
                <LoadingSkeleton type="card" count={2} />
            </div>
        );
    }

    return (
        <div className="space-y-5 max-w-6xl mx-auto">
            {/* KPI Summary Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KPICard icon="payments" label="Cost/Bin" value={`$${costPerBin.toFixed(2)}`}
                    gradient="bg-gradient-to-br from-emerald-50 to-teal-50" iconColor="text-emerald-600" delay={0} />
                <KPICard icon="inventory_2" label="Total Bins" value={totalBuckets.toString()}
                    gradient="bg-gradient-to-br from-sky-50 to-blue-50" iconColor="text-sky-600" delay={50} />
                <KPICard icon="account_balance_wallet" label="Total Labour" value={`$${totalEarnings.toFixed(0)}`}
                    gradient="bg-gradient-to-br from-amber-50 to-orange-50" iconColor="text-amber-600" delay={100} />
                <KPICard icon="trending_up" label="Min Wage Top-Up" value={`$${totalTopUp.toFixed(0)}`}
                    gradient="bg-gradient-to-br from-rose-50 to-pink-50" iconColor="text-rose-600" delay={150} />
            </div>

            {/* Cost Breakdown with Donut Chart */}
            <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 dash-card-enter" style={{ animationDelay: '200ms' }}>
                <h3 className="font-bold text-text-main mb-1 flex items-center gap-2">
                    <span className="material-symbols-outlined text-indigo-500">donut_large</span>
                    Cost Breakdown
                </h3>
                <p className="text-xs text-text-muted mb-4">Piece rate vs minimum wage top-up</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    {/* Donut Chart */}
                    <div className="md:col-span-1">
                        <DonutChart pieceRate={totalPieceRate} topUp={totalTopUp} />
                    </div>
                    {/* Legend + Bars */}
                    <div className="md:col-span-2 space-y-4">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/50">
                            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" />
                            <div className="flex-1">
                                <p className="text-sm font-bold text-text-main">Piece Rate Earnings</p>
                                <p className="text-xs text-text-muted">Performance-based pay</p>
                            </div>
                            <span className="text-lg font-black text-emerald-600">${totalPieceRate.toFixed(0)}</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50/50">
                            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-amber-500 to-amber-400" />
                            <div className="flex-1">
                                <p className="text-sm font-bold text-text-main">Minimum Wage Top-Up</p>
                                <p className="text-xs text-text-muted">Legal compliance cost</p>
                            </div>
                            <span className="text-lg font-black text-amber-600">${totalTopUp.toFixed(0)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Daily Cost Trend */}
            <div className="glass-card card-hover p-5 relative overflow-hidden group section-enter stagger-3">
                <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                    <span className="material-symbols-outlined text-7xl text-rose-400">trending_up</span>
                </div>
                <div className="relative z-10">
                    <h3 className="font-bold text-text-main mb-1 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center shadow-sm">
                            <span className="material-symbols-outlined text-base text-rose-500">trending_up</span>
                        </div>
                        Cost Per Bin — 7 Day Trend
                    </h3>
                    <p className="text-xs text-text-muted mb-3 ml-10">Red dots = above break-even threshold</p>
                    <TrendLineChart
                        data={costTrend}
                        targetLine={breakEven}
                        targetLabel="Break-even"
                        colorTheme="rose"
                        valuePrefix="$"
                        higherIsBetter={false}
                        height={220}
                        onPointClick={(point) => {
                            if (point.meta) {
                                setSelectedDayMeta(prev =>
                                    prev?.date === point.meta?.date ? null : point.meta!
                                );
                            }
                        }}
                    />
                </div>

                {/* Day Detail Panel (appears on click) */}
                {selectedDayMeta && (
                    <div className="relative z-10 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 p-5 mt-4 animate-fade-in shadow-sm">
                        <button
                            onClick={() => setSelectedDayMeta(null)}
                            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                        >
                            <span className="material-symbols-outlined text-sm text-slate-500">close</span>
                        </button>

                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                                <span className="material-symbols-outlined text-base text-indigo-500">calendar_today</span>
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800">
                                    {selectedDayMeta.date ? new Date(selectedDayMeta.date + 'T00:00:00').toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'short' }) : 'Day Detail'}
                                </h4>
                                <p className="text-xs text-slate-500">{selectedDayMeta.orchardName || 'Orchard'}</p>
                            </div>
                        </div>

                        {/* KPI row */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                            <div className="bg-white rounded-lg p-3 border border-slate-100">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Pickers</p>
                                <p className="text-lg font-black text-slate-800">{selectedDayMeta.totalPickers}</p>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-slate-100">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Buckets</p>
                                <p className="text-lg font-black text-slate-800">{selectedDayMeta.totalBuckets}</p>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-slate-100">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Tons</p>
                                <p className="text-lg font-black text-slate-800">{selectedDayMeta.totalTons?.toFixed(1)}</p>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-slate-100">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Top-Up Cost</p>
                                <p className={`text-lg font-black ${(selectedDayMeta.topUpCost || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    ${(selectedDayMeta.topUpCost || 0).toFixed(0)}
                                </p>
                            </div>
                        </div>

                        {/* Team breakdown */}
                        {selectedDayMeta.teams && selectedDayMeta.teams.length > 0 && (
                            <div>
                                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">groups</span>
                                    Teams on Site
                                </h5>
                                <div className="space-y-2">
                                    {selectedDayMeta.teams.map((team, idx) => {
                                        const maxBuckets = Math.max(...(selectedDayMeta.teams?.map(t => t.buckets) || [1]));
                                        return (
                                            <div key={idx} className="flex items-center gap-3">
                                                <span className="text-sm font-semibold text-slate-700 w-28 truncate">{team.name}</span>
                                                <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                                                    <div
                                                        className="bg-indigo-400 h-full rounded-full transition-all duration-500"
                                                        style={{ width: `${(team.buckets / maxBuckets) * 100}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-bold text-slate-500 w-20 text-right">
                                                    {team.pickers}p / {team.buckets}b
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Cost Per Team */}
            <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 dash-card-enter" style={{ animationDelay: '300ms' }}>
                <h3 className="font-bold text-text-main mb-1 flex items-center gap-2">
                    <span className="material-symbols-outlined text-purple-500">groups</span>
                    Cost Per Team
                </h3>
                <p className="text-xs text-text-muted mb-4">Lower cost/bin = more efficient</p>
                {teamCosts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8">
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                            <span className="material-symbols-outlined text-3xl text-slate-300">analytics</span>
                        </div>
                        <p className="text-sm font-bold text-text-sub">No team data available</p>
                        <p className="text-xs text-text-muted mt-1">Data appears as pickers submit scans</p>
                    </div>
                ) : (
                    teamCosts.map(team => (
                        <HBar
                            key={team.teamLeader}
                            label={team.teamLeader}
                            value={team.costPerBin}
                            max={maxCostPerBin}
                            color="bg-gradient-to-r from-indigo-500 to-purple-500"
                            suffix="/bin"
                        />
                    ))
                )}
            </div>

            {/* Top Performers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 dash-card-enter" style={{ animationDelay: '400ms' }}>
                    <h3 className="font-bold text-text-main mb-1 flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-500">emoji_events</span>
                        Most Efficient
                    </h3>
                    <p className="text-xs text-text-muted mb-3">Lowest cost per bin</p>
                    {sortedByEfficiency.length === 0 ? (
                        <p className="text-center text-text-muted py-4 text-sm">No data yet</p>
                    ) : sortedByEfficiency.slice(0, 5).map((p, i) => (
                        <div key={p.picker_id} onClick={() => openProfile(p.picker_id)} className="flex items-center justify-between py-2 border-b border-border-light last:border-0 hover:bg-emerald-50/30 transition-colors rounded-lg px-2 -mx-2 cursor-pointer">
                            <div className="flex items-center gap-2">
                                <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${i === 0 ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-text-muted'}`}>{i + 1}</span>
                                <span className="text-sm font-medium text-text-main hover:text-indigo-600 transition-colors">{p.picker_name}</span>
                            </div>
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">${(p.total_earnings / p.buckets).toFixed(2)}/bin</span>
                        </div>
                    ))}
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 dash-card-enter" style={{ animationDelay: '450ms' }}>
                    <h3 className="font-bold text-text-main mb-1 flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber-500">warning</span>
                        Least Efficient
                    </h3>
                    <p className="text-xs text-text-muted mb-3">Highest cost per bin</p>
                    {sortedByEfficiency.length === 0 ? (
                        <p className="text-center text-text-muted py-4 text-sm">No data yet</p>
                    ) : sortedByEfficiency.slice(-5).reverse().map((p, i) => (
                        <div key={p.picker_id} onClick={() => openProfile(p.picker_id)} className="flex items-center justify-between py-2 border-b border-border-light last:border-0 hover:bg-amber-50/30 transition-colors rounded-lg px-2 -mx-2 cursor-pointer">
                            <div className="flex items-center gap-2">
                                <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${i === 0 ? 'bg-amber-500 text-white' : 'bg-slate-100 text-text-muted'}`}>{i + 1}</span>
                                <span className="text-sm font-medium text-text-main hover:text-indigo-600 transition-colors">{p.picker_name}</span>
                            </div>
                            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">${(p.total_earnings / p.buckets).toFixed(2)}/bin</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CostAnalyticsView;
