/**
 * useWeeklyReport — Datos y cálculos para WeeklyReportView
 *
 * KPIs del día (totalBuckets, totalEarnings, costPerBin) provienen
 * de weeklySeries → computePerPicker + computeKPIs para garantizar
 * paridad exacta con el tab Analytics (useHarvestMetrics).
 *
 * teamRankings y pickers (leaderboard) siguen usando payrollService.
 * Los trendings de 7 días siguen usando analyticsService.
 */
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '@/i18n';
import { useHarvestStore } from '@/stores/useHarvestStore';
import { payrollService, PickerBreakdown } from '@/services/payroll.service';
import { analyticsService } from '@/services/analytics.service';
import { weeklySeries } from '@/services/harvestMetrics/weekly';
import { TrendDataPoint, DayMeta } from '@/components/charts/TrendLineChart';
import { logger } from '@/utils/logger';
import { Picker } from '@/types';

export interface TeamRanking {
    name: string;
    buckets: number;
    hours: number;
    earnings: number;
    count: number;
    bpa: number;
}

export interface WeeklyReportData {
    // Raw data
    pickers: PickerBreakdown[];
    binsTrend: TrendDataPoint[];
    workforceTrend: TrendDataPoint[];
    isLoading: boolean;

    // Aggregations
    totalBuckets: number;
    totalHours: number;
    totalEarnings: number;
    avgBPA: number;
    costPerBin: number;
    dailyBinTarget: number | undefined;

    // Team data
    teamRankings: TeamRanking[];

    // Day detail
    selectedDayMeta: DayMeta | null;
    setSelectedDayMeta: React.Dispatch<React.SetStateAction<DayMeta | null>>;

    // Export state
    showExportModal: boolean;
    setShowExportModal: React.Dispatch<React.SetStateAction<boolean>>;

    // Context
    orchard: { id: string; name?: string; total_rows?: number } | null;
    crew: Picker[];

    // Actions
    openProfile: (pickerId: string) => void;
}

export function useWeeklyReport(): WeeklyReportData {
    const { locale } = useTranslation();
    const orchardId = useHarvestStore(s => s.orchard?.id);
    const orchard = useHarvestStore(s => s.orchard);
    const settings = useHarvestStore(s => s.settings);
    const crew = useHarvestStore(s => s.crew);
    const openPickerProfile = useHarvestStore(s => s.openPickerProfile);
    const bucketRecords = useHarvestStore(s => s.bucketRecords);

    const dailyBinTarget = settings?.target_tons
        ? Math.round((settings.target_tons * 72) / 30)
        : undefined;

    const [pickers, setPickers] = useState<PickerBreakdown[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [binsTrend, setBinsTrend] = useState<TrendDataPoint[]>([]);
    const [workforceTrend, setWorkforceTrend] = useState<TrendDataPoint[]>([]);
    const [selectedDayMeta, setSelectedDayMeta] = useState<DayMeta | null>(null);
    const [showExportModal, setShowExportModal] = useState(false);

    useEffect(() => {
        const load = async () => {
            if (!orchardId) { setIsLoading(false); return; }
            setIsLoading(true);
            const payrollPromise = payrollService.calculateToday(orchardId)
                .then(result => setPickers(result.picker_breakdown))
                .catch(e => logger.warn('[WeeklyReport] Payroll failed:', e));
            const trendsPromise = analyticsService.getDailyTrends(orchardId, 7, locale)
                .then(trends => { setBinsTrend(trends.totalBins); setWorkforceTrend(trends.workforceSize); })
                .catch(e => logger.warn('[WeeklyReport] Trends failed:', e));
            await Promise.allSettled([payrollPromise, trendsPromise]);
            setIsLoading(false);
        };
        load();
    }, [orchardId, locale]);

    // KPIs del día — misma ruta de cálculo que useHarvestMetrics para garantizar paridad.
    // nowOverride: new Date() es crítico: sin él, endOfDay se construye como medianoche NZ en hora local,
    // que en UTC+12 equivale al mediodía UTC. Los scans almacenados en UTC (mañana NZ = tarde UTC día anterior)
    // caen DESPUÉS de ese endOfDay → clampedLast < clampedFirst → hoursWorked = 0 → sin top-up de salario mínimo.
    const todaySeries = useMemo(() => {
        const today = new Date().toISOString().slice(0, 10);
        return weeklySeries({
            scans: bucketRecords,
            crew,
            settings: {
                piece_rate: settings?.piece_rate ?? 6.5,
                min_wage_rate: settings?.min_wage_rate ?? 23.95,
                shift_start_time: settings?.shift_start_time ?? '07:00',
            },
            from: today,
            to: today,
            nowOverride: new Date(), // fix paridad: evita que endOfDay sea medianoche local (UTC mediodía)
        });
    }, [bucketRecords, crew, settings]);

    const todayRollup = todaySeries[0];

    const totalBuckets = todayRollup?.bins ?? 0;
    const totalHours = todayRollup?.hoursWorked ?? 0;
    const totalEarnings = todayRollup?.totalLabour ?? 0;
    const costPerBin = todayRollup?.costPerBin ?? 0;
    const avgBPA = totalHours > 0 ? totalBuckets / totalHours : 0;

    // Team rankings — siguen derivándose desde payrollService para el leaderboard
    const teamRankings = useMemo(() => {
        const teamMap = new Map<string, { buckets: number; hours: number; earnings: number; count: number }>();
        pickers.forEach(p => {
            const crewMember = crew.find(c => c.picker_id === p.picker_id || c.name === p.picker_name);
            const leaderId = crewMember?.team_leader_id || 'unassigned';
            const leader = crew.find(c => c.id === leaderId);
            const teamName = leader?.name || 'Unassigned';
            const entry = teamMap.get(teamName) ?? { buckets: 0, hours: 0, earnings: 0, count: 0 };
            const updated = {
                buckets: entry.buckets + p.buckets,
                hours: entry.hours + p.hours_worked,
                earnings: entry.earnings + p.total_earnings,
                count: entry.count + 1,
            };
            teamMap.set(teamName, updated);
        });
        return Array.from(teamMap.entries())
            .map(([name, data]) => ({ name, ...data, bpa: data.hours > 0 ? data.buckets / data.hours : 0 }))
            .sort((a, b) => b.bpa - a.bpa);
    }, [pickers, crew]);

    const openProfile = (pickerId: string) => {
        const picker = crew.find(c => c.picker_id === pickerId);
        if (picker) openPickerProfile(picker.id);
    };

    return {
        pickers, binsTrend, workforceTrend, isLoading,
        totalBuckets, totalHours, totalEarnings, avgBPA, costPerBin, dailyBinTarget,
        teamRankings,
        selectedDayMeta, setSelectedDayMeta,
        showExportModal, setShowExportModal,
        orchard, crew,
        openProfile,
    };
}
