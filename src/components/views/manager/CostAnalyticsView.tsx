/**
 * CostAnalyticsView — Manager Cost Analytics Dashboard
 * Labour cost per bin, per team, cost breakdown charts
 * Pure CSS bar charts — no external chart library needed
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useHarvestStore } from '@/stores/useHarvestStore';
import { payrollService, PickerBreakdown } from '@/services/payroll.service';


/* ── Types ── */
interface TeamCost {
    teamLeader: string;
    pickers: number;
    totalBuckets: number;
    totalHours: number;
    totalEarnings: number;
    costPerBin: number;
}

/* ── CSS Bar Component ── */
const CSSBar: React.FC<{ label: string; value: number; max: number; color: string; suffix?: string }> = ({ label, value, max, color, suffix = '' }) => (
    <div className="flex items-center gap-3 mb-2">
        <span className="text-xs text-slate-400 w-24 truncate">{label}</span>
        <div className="flex-1 h-6 rounded-full bg-slate-800/50 overflow-hidden relative">
            <div
                className={`h-full rounded-full transition-all duration-700 ${color}`}
                style={{ width: `${Math.min(100, (value / (max || 1)) * 100)}%` }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                {typeof value === 'number' ? value.toFixed(2) : value}{suffix}
            </span>
        </div>
    </div>
);

/* ── Main Component ── */
const CostAnalyticsView: React.FC = () => {
    const orchardId = useHarvestStore(s => s.orchard?.id);
    const settings = useHarvestStore(s => s.settings);

    const [pickers, setPickers] = useState<PickerBreakdown[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            if (!orchardId) { setIsLoading(false); return; }
            setIsLoading(true);
            try {
                const result = await payrollService.calculateToday(orchardId);
                setPickers(result.picker_breakdown);
            } catch {
                console.warn('[CostAnalytics] Failed to load data');
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [orchardId]);

    // Cost per bin
    const totalBuckets = pickers.reduce((sum, p) => sum + p.buckets, 0);
    const totalEarnings = pickers.reduce((sum, p) => sum + p.total_earnings, 0);
    const totalPieceRate = pickers.reduce((sum, p) => sum + (p.buckets * (settings?.piece_rate || 3.50)), 0);
    const totalTopUp = totalEarnings - totalPieceRate;
    const costPerBin = totalBuckets > 0 ? totalEarnings / totalBuckets : 0;

    // Cost per team
    const teamCosts = useMemo<TeamCost[]>(() => {
        const teamMap = new Map<string, PickerBreakdown[]>();
        pickers.forEach(p => {
            const team = p.picker_name.split(' ')[0] || 'Team';
            if (!teamMap.has(team)) teamMap.set(team, []);
            teamMap.get(team)!.push(p);
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
    }, [pickers]);

    // Top/bottom performers
    const sortedByEfficiency = useMemo(() =>
        [...pickers].filter(p => p.buckets > 0).sort((a, b) => {
            const costA = a.total_earnings / a.buckets;
            const costB = b.total_earnings / b.buckets;
            return costA - costB;
        }),
        [pickers]);

    const maxCostPerBin = Math.max(...teamCosts.map(t => t.costPerBin), costPerBin || 1);

    if (isLoading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="w-10 h-10 border-4 border-indigo-300/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-xs text-slate-400">Loading analytics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 space-y-5 max-w-6xl mx-auto">
            {/* Summary Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-4 border border-slate-700/50">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="material-symbols-outlined text-emerald-400 text-lg">payments</span>
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Cost/Bin</span>
                    </div>
                    <p className="text-2xl font-black text-slate-100">${costPerBin.toFixed(2)}</p>
                </div>
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-4 border border-slate-700/50">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="material-symbols-outlined text-sky-400 text-lg">inventory_2</span>
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Bins</span>
                    </div>
                    <p className="text-2xl font-black text-slate-100">{totalBuckets}</p>
                </div>
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-4 border border-slate-700/50">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="material-symbols-outlined text-amber-400 text-lg">account_balance_wallet</span>
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Labour</span>
                    </div>
                    <p className="text-2xl font-black text-slate-100">${totalEarnings.toFixed(0)}</p>
                </div>
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-4 border border-slate-700/50">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="material-symbols-outlined text-red-400 text-lg">trending_up</span>
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Min Wage Top-Up</span>
                    </div>
                    <p className="text-2xl font-black text-slate-100">${totalTopUp.toFixed(0)}</p>
                </div>
            </div>

            {/* Cost Breakdown */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-5 border border-slate-700/50">
                <h3 className="font-bold text-slate-100 mb-1">Cost Breakdown</h3>
                <p className="text-xs text-slate-400 mb-4">Piece rate vs minimum wage top-up</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                            <span>Piece Rate Earnings</span>
                            <span className="text-emerald-400 font-bold">${totalPieceRate.toFixed(0)}</span>
                        </div>
                        <div className="h-4 bg-slate-700/50 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full" style={{ width: `${totalEarnings > 0 ? (totalPieceRate / totalEarnings) * 100 : 0}%` }} />
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                            <span>Minimum Wage Top-Up</span>
                            <span className="text-amber-400 font-bold">${totalTopUp.toFixed(0)}</span>
                        </div>
                        <div className="h-4 bg-slate-700/50 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full" style={{ width: `${totalEarnings > 0 ? (totalTopUp / totalEarnings) * 100 : 0}%` }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Cost Per Team */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-5 border border-slate-700/50">
                <h3 className="font-bold text-slate-100 mb-1">Cost Per Team</h3>
                <p className="text-xs text-slate-400 mb-4">Lower cost/bin = more efficient</p>
                {teamCosts.length === 0 ? (
                    <p className="text-center text-slate-500 py-4 text-sm">No team data available</p>
                ) : (
                    teamCosts.map(team => (
                        <CSSBar
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
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-5 border border-slate-700/50">
                    <h3 className="font-bold text-slate-100 mb-1 flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-400 text-lg">emoji_events</span>
                        Most Efficient
                    </h3>
                    <p className="text-xs text-slate-400 mb-3">Lowest cost per bin</p>
                    {sortedByEfficiency.slice(0, 5).map((p, i) => (
                        <div key={p.picker_id} className="flex items-center justify-between py-1.5 border-b border-slate-700/30 last:border-0">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-500 w-4">{i + 1}</span>
                                <span className="text-sm font-medium text-slate-200">{p.picker_name}</span>
                            </div>
                            <span className="text-xs font-bold text-emerald-400">${(p.total_earnings / p.buckets).toFixed(2)}/bin</span>
                        </div>
                    ))}
                </div>
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-5 border border-slate-700/50">
                    <h3 className="font-bold text-slate-100 mb-1 flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber-400 text-lg">warning</span>
                        Least Efficient
                    </h3>
                    <p className="text-xs text-slate-400 mb-3">Highest cost per bin</p>
                    {sortedByEfficiency.slice(-5).reverse().map((p, i) => (
                        <div key={p.picker_id} className="flex items-center justify-between py-1.5 border-b border-slate-700/30 last:border-0">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-500 w-4">{i + 1}</span>
                                <span className="text-sm font-medium text-slate-200">{p.picker_name}</span>
                            </div>
                            <span className="text-xs font-bold text-amber-400">${(p.total_earnings / p.buckets).toFixed(2)}/bin</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CostAnalyticsView;
