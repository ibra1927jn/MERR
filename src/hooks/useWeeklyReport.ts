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
import { startOfWeekNZ, toNZST } from '@/utils/nzst';
import { TrendDataPoint, DayMeta } from '@/components/charts/TrendLineChart';
import { logger } from '@/utils/logger';
import { Picker } from '@/types';
import { supabase } from '@/services/supabase';

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

    const dailyBinTarget = settings?.target_tons
        ? Math.round((settings.target_tons * 72) / 30)
        : undefined;

    const [pickers, setPickers] = useState<PickerBreakdown[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [binsTrend, setBinsTrend] = useState<TrendDataPoint[]>([]);
    const [workforceTrend, setWorkforceTrend] = useState<TrendDataPoint[]>([]);
    const [totalHours, setTotalHours] = useState(0);
    const [selectedDayMeta, setSelectedDayMeta] = useState<DayMeta | null>(null);
    const [showExportModal, setShowExportModal] = useState(false);

    useEffect(() => {
        const load = async () => {
            if (!orchardId) { setIsLoading(false); return; }
            setIsLoading(true);
            const payrollPromise = payrollService.calculateThisWeek(orchardId)
                .then(result => setPickers(result.picker_breakdown))
                .catch(async (e) => {
                    logger.warn('[WeeklyReport] Payroll edge function failed — activating client-side fallback:', e);
                    try {
                        // Fallback: compute picker_breakdown directly from bucket_records + attendance
                        // Usa rango semanal para coincidir con los KPIs de binsTrend
                        const nzFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland' });
                        const todayStr = nzFmt.format(new Date());
                        const weekStart = startOfWeekNZ();
                        const nzOffset = toNZST(new Date()).slice(-6); // "+12:00" o "+13:00"
                        const startOfWeekBoundary = `${weekStart}T00:00:00${nzOffset}`;
                        const endOfWeekBoundary = `${todayStr}T23:59:59${nzOffset}`;

                        const [bucketsRes, attendanceRes] = await Promise.all([
                            supabase
                                .from('bucket_records')
                                .select('picker_id, scanned_at')
                                .eq('orchard_id', orchardId)
                                .is('deleted_at', null)
                                .neq('quality_grade', 'reject')
                                .gte('scanned_at', startOfWeekBoundary)
                                .lte('scanned_at', endOfWeekBoundary),
                            supabase
                                .from('daily_attendance')
                                .select('picker_id, check_in, check_out')
                                .eq('orchard_id', orchardId)
                                .gte('date', weekStart)
                                .lte('date', todayStr),
                        ]);

                        const pieceRate = settings?.piece_rate ?? 6.5;
                        const minWageRate = settings?.min_wage_rate ?? 23.5;
                        // NZ Minimum Wage Order 2026 floor (same as edge function)
                        const effectiveMinWage = Math.max(minWageRate, 23.95);
                        const MEAL_BREAK_THRESHOLD = 4;

                        // Build hours map from weekly attendance
                        const hoursMap = new Map<string, number>();
                        (attendanceRes.data || []).forEach((a: { picker_id: string; check_in: string | null; check_out: string | null }) => {
                            if (a.check_in && a.check_out) {
                                const raw = (new Date(a.check_out).getTime() - new Date(a.check_in).getTime()) / 3_600_000;
                                const adjusted = raw > MEAL_BREAK_THRESHOLD ? raw - 0.5 : raw;
                                hoursMap.set(a.picker_id, (hoursMap.get(a.picker_id) ?? 0) + Math.max(0, adjusted));
                            }
                        });

                        // Group bucket counts by picker
                        const bucketsMap = new Map<string, { count: number; firstScan: Date; lastScan: Date }>();
                        (bucketsRes.data || []).forEach((b: { picker_id: string; scanned_at: string }) => {
                            const scanTime = new Date(b.scanned_at);
                            const existing = bucketsMap.get(b.picker_id);
                            if (!existing) {
                                bucketsMap.set(b.picker_id, { count: 1, firstScan: scanTime, lastScan: scanTime });
                            } else {
                                existing.count++;
                                if (scanTime < existing.firstScan) existing.firstScan = scanTime;
                                if (scanTime > existing.lastScan) existing.lastScan = scanTime;
                            }
                        });

                        // Build PickerBreakdown[] using crew store for names
                        const breakdown: PickerBreakdown[] = [];
                        for (const [pickerId, bucketData] of bucketsMap) {
                            // bucket_records.picker_id references pickers.id (UUID)
                            const crewMember = crew.find(c => c.id === pickerId);
                            const pickerName = crewMember?.name || 'Unknown';

                            let hoursWorked = hoursMap.get(pickerId) ?? 0;
                            if (hoursWorked === 0) {
                                // Estimate from scan span when attendance is unavailable
                                const raw = (bucketData.lastScan.getTime() - bucketData.firstScan.getTime()) / 3_600_000;
                                hoursWorked = raw > MEAL_BREAK_THRESHOLD ? raw - 0.5 : raw;
                            }

                            const pieceRateEarnings = bucketData.count * pieceRate;
                            const hourlyRate = hoursWorked > 0 ? pieceRateEarnings / hoursWorked : 0;
                            const minimumRequired = hoursWorked * effectiveMinWage;
                            const topUpRequired = Math.max(0, minimumRequired - pieceRateEarnings);
                            const totalEarnings = pieceRateEarnings + topUpRequired;

                            breakdown.push({
                                picker_id: pickerId,
                                picker_name: pickerName,
                                buckets: bucketData.count,
                                hours_worked: parseFloat(hoursWorked.toFixed(2)),
                                piece_rate_earnings: parseFloat(pieceRateEarnings.toFixed(2)),
                                hourly_rate: parseFloat(hourlyRate.toFixed(2)),
                                minimum_required: parseFloat(minimumRequired.toFixed(2)),
                                top_up_required: parseFloat(topUpRequired.toFixed(2)),
                                total_earnings: parseFloat(totalEarnings.toFixed(2)),
                                is_below_minimum: hourlyRate < effectiveMinWage && hoursWorked > 0,
                            });
                        }
                        breakdown.sort((a, b) => b.buckets - a.buckets);
                        setPickers(breakdown);
                        logger.info(`[WeeklyReport] Client-side fallback: ${breakdown.length} pickers computed`);
                    } catch (fallbackErr) {
                        logger.error('[WeeklyReport] Both edge function and fallback failed:', fallbackErr);
                    }
                });
            const trendsPromise = (async () => {
                // Formateador de weekday localizado para convertir 'YYYY-MM-DD' → 'Mon', 'Lun', etc.
                // new Date(date + 'T00:00:00Z') = medianoche UTC = mediodía NZ NZST (UTC+12) → día NZ correcto.
                const weekdayFmt = new Intl.DateTimeFormat(locale, {
                    timeZone: 'Pacific/Auckland',
                    weekday: 'short',
                });
                const nzFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland' });
                const endDateNZ = nzFmt.format(new Date());
                const startDateNZ = startOfWeekNZ();

                const [trends, attendanceResult] = await Promise.all([
                    analyticsService.getDailyTrendsV2(orchardId, startDateNZ, endDateNZ),
                    supabase
                        .from('daily_attendance')
                        .select('check_in, check_out')
                        .eq('orchard_id', orchardId)
                        .gte('date', startDateNZ)
                        .lte('date', endDateNZ),
                ]);

                const applyLabel = <T extends { label: string }>(pts: T[]) =>
                    pts.map(p => ({ ...p, label: weekdayFmt.format(new Date(p.label + 'T00:00:00Z')) }));
                setBinsTrend(applyLabel(trends.totalBins));
                setWorkforceTrend(applyLabel(trends.workforceSize));

                // Horas semanales reales desde daily_attendance
                // NZ Employment Relations Act: -30 min de meal break en turnos > 4h
                const MEAL_BREAK_THRESHOLD = 4;
                const weekHours = (attendanceResult.data || []).reduce((sum, a) => {
                    if (a.check_in && a.check_out) {
                        const raw = (new Date(a.check_out).getTime() - new Date(a.check_in).getTime()) / 3_600_000;
                        const adjusted = raw > MEAL_BREAK_THRESHOLD ? raw - 0.5 : raw;
                        return sum + Math.max(0, adjusted);
                    }
                    return sum;
                }, 0);
                setTotalHours(Math.round(weekHours * 100) / 100);
            })().catch(e => logger.warn('[WeeklyReport] Trends failed:', e));
            await Promise.allSettled([payrollPromise, trendsPromise]);
            setIsLoading(false);
        };
        load();
    // crew y settings NO son dependencias intencionales: el re-fetch solo debe dispararse
    // cuando cambia el orchard o el idioma. El fallback usa crew/settings del momento de
    // la llamada (stale closure aceptable — crew ya está hidratado cuando el fallback activa).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orchardId, locale]);

    // KPIs semanales — misma fuente que los gráficos (binsTrend de getDailyTrendsV2).
    // totalHours y avgBPA pendientes Paso 3 (daily_attendance + wage_rates).
    const totalBuckets = useMemo(
        () => binsTrend.reduce((sum, pt) => sum + pt.value, 0),
        [binsTrend],
    );
    const totalEarnings = useMemo(
        () => totalBuckets * (settings?.piece_rate ?? 6.5),
        [totalBuckets, settings?.piece_rate],
    );
    const costPerBin = settings?.piece_rate ?? 0;
    // totalHours viene del estado — se calcula en trendsPromise desde daily_attendance
    const avgBPA = useMemo(
        () => totalHours > 0 ? Math.round((totalBuckets / totalHours) * 10) / 10 : 0,
        [totalBuckets, totalHours],
    );

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
        // bucket_records.picker_id == pickers.id (UUID) — mismo ID que espera openPickerProfile
        openPickerProfile(pickerId);
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
