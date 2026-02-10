/**
 * components/views/manager/WageShieldPanel.tsx
 * Wage Compliance Monitoring Panel
 * Shows workers at risk of falling below minimum wage
 */
import React, { useMemo } from 'react';
import { Picker } from '../../../types';
import { analyticsService } from '../../../services/analytics.service';

interface WageShieldPanelProps {
    crew: Picker[];
    teamLeaders: Picker[];
    settings: { piece_rate: number; min_wage_rate: number };
    onUserSelect?: (user: Picker) => void;
}

const StatusBadge = ({ status }: { status: 'safe' | 'at_risk' | 'below_minimum' }) => {
    const config = {
        safe: { bg: 'bg-green-100', text: 'text-green-700', icon: 'check_circle', label: 'Safe' },
        at_risk: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: 'warning', label: 'At Risk' },
        below_minimum: { bg: 'bg-red-100', text: 'text-red-700', icon: 'error', label: 'Below Min' }
    };
    const c = config[status];

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${c.bg} ${c.text}`}>
            <span className="material-symbols-outlined text-xs">{c.icon}</span>
            {c.label}
        </span>
    );
};

const WageShieldPanel: React.FC<WageShieldPanelProps> = ({
    crew,
    teamLeaders,
    settings,
    onUserSelect
}) => {
    const { piece_rate, min_wage_rate } = settings;

    // Calculate wage status for all pickers
    const analysisResults = useMemo(() => {
        const pickers = crew.filter(p =>
            p.role !== 'team_leader' &&
            p.role !== 'runner'
        );

        return pickers.map(p => {
            const buckets = p.total_buckets_today || 0;
            const hoursWorked = p.hours || 4; // Default estimate

            const { status, earnings, minWageEarnings } = analyticsService.calculateWageStatus(
                buckets,
                hoursWorked,
                piece_rate,
                min_wage_rate
            );

            const teamLeader = teamLeaders.find(l => l.id === p.team_leader_id);
            const deficit = Math.max(0, minWageEarnings - earnings);

            return {
                picker: p,
                status,
                earnings,
                minWageEarnings,
                deficit,
                teamLeaderName: teamLeader?.name || 'Unassigned'
            };
        }).sort((a, b) => {
            // Sort by status (worst first), then by deficit
            const statusOrder = { below_minimum: 0, at_risk: 1, safe: 2 };
            if (statusOrder[a.status] !== statusOrder[b.status]) {
                return statusOrder[a.status] - statusOrder[b.status];
            }
            return b.deficit - a.deficit;
        });
    }, [crew, teamLeaders, piece_rate, min_wage_rate]);

    const counts = useMemo(() => ({
        safe: analysisResults.filter(r => r.status === 'safe').length,
        at_risk: analysisResults.filter(r => r.status === 'at_risk').length,
        below_minimum: analysisResults.filter(r => r.status === 'below_minimum').length
    }), [analysisResults]);

    const criticalPickers = analysisResults.filter(r => r.status !== 'safe');
    const hasCritical = criticalPickers.length > 0;

    return (
        <div className={`bg-white dark:bg-card-dark rounded-2xl shadow-sm border overflow-hidden ${hasCritical ? 'border-red-200 dark:border-red-500/20' : 'border-green-200 dark:border-green-500/20'
            }`}>
            {/* Header */}
            <div className={`p-4 border-b ${hasCritical
                    ? 'bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20'
                    : 'bg-green-50 dark:bg-green-500/10 border-green-100 dark:border-green-500/20'
                }`}>
                <div className="flex items-center justify-between">
                    <h3 className={`font-bold flex items-center gap-2 ${hasCritical ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'
                        }`}>
                        <span className="material-symbols-outlined">
                            {hasCritical ? 'shield_lock' : 'verified_user'}
                        </span>
                        Wage Shield
                    </h3>
                    <div className="flex gap-2">
                        <span className="text-[10px] font-bold bg-green-200/50 text-green-700 px-2 py-0.5 rounded-full">
                            {counts.safe} ✓
                        </span>
                        {counts.at_risk > 0 && (
                            <span className="text-[10px] font-bold bg-yellow-200/50 text-yellow-700 px-2 py-0.5 rounded-full">
                                {counts.at_risk} ⚠
                            </span>
                        )}
                        {counts.below_minimum > 0 && (
                            <span className="text-[10px] font-bold bg-red-200/50 text-red-700 px-2 py-0.5 rounded-full">
                                {counts.below_minimum} ✕
                            </span>
                        )}
                    </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                    Min Wage: ${min_wage_rate}/hr • Piece Rate: ${piece_rate}/bucket
                </p>
            </div>

            {/* Content */}
            <div className="max-h-[300px] overflow-y-auto">
                {criticalPickers.length === 0 ? (
                    <div className="p-6 text-center">
                        <span className="material-symbols-outlined text-4xl text-green-500 mb-2">check_circle</span>
                        <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                            All {counts.safe} pickers earning above minimum!
                        </p>
                        <p className="text-xs text-slate-400 mt-1">No compliance issues detected</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-white/5">
                        {criticalPickers.map((result, idx) => (
                            <div
                                key={result.picker.id || idx}
                                onClick={() => onUserSelect?.(result.picker)}
                                className="p-4 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${result.status === 'below_minimum'
                                            ? 'bg-red-100 text-red-600'
                                            : 'bg-yellow-100 text-yellow-600'
                                        }`}>
                                        {result.picker.name?.charAt(0) || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                                {result.picker.name}
                                            </p>
                                            <StatusBadge status={result.status} />
                                        </div>
                                        <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-xs">supervisor_account</span>
                                            {result.teamLeaderName}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                            ${result.earnings.toFixed(0)}
                                        </p>
                                        <p className="text-[10px] text-red-500 font-medium">
                                            -${result.deficit.toFixed(0)} deficit
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default WageShieldPanel;
