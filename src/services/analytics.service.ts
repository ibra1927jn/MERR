/**
 * services/analytics.service.ts
 * Analytics & Reporting Service for Phase 8
 * Provides data transformation and export capabilities
 */
import { logger } from '@/utils/logger';
import { Picker, BucketRecord } from '../types';
import { supabase } from './supabase';
import { nowNZST } from '@/utils/nzst';

interface ReportRow {
    name: string;
    picker_id: string;
    buckets: number;
    hours_worked: number;
    rate: number;
    earnings: number;
    min_wage_earnings: number;
    status: 'safe' | 'at_risk' | 'below_minimum';
    team_leader: string;
}

interface ReportMetadata {
    generated_at: string;
    last_sync: string;
    pending_queue_count: number;
    orchard_name: string;
    is_offline_data: boolean;
}

class AnalyticsService {
    /**
     * Calculate Wage Shield status for a picker
     */
    calculateWageStatus(
        buckets: number,
        hoursWorked: number,
        pieceRate: number,
        minWageRate: number
    ): { status: 'safe' | 'at_risk' | 'below_minimum'; earnings: number; minWageEarnings: number } {
        const earnings = buckets * pieceRate;
        const minWageEarnings = hoursWorked * minWageRate;

        // Calculate percentage of minimum needed
        const percentage = minWageEarnings > 0 ? (earnings / minWageEarnings) * 100 : 100;

        let status: 'safe' | 'at_risk' | 'below_minimum';
        if (percentage >= 100) {
            status = 'safe';
        } else if (percentage >= 80) {
            status = 'at_risk';
        } else {
            status = 'below_minimum';
        }

        return { status, earnings, minWageEarnings };
    }

    /**
     * Group bucket records by hour for velocity chart
     */
    groupByHour(bucketRecords: BucketRecord[], hoursBack: number = 8): { hour: string; count: number }[] {
        // 🔧 L19: Use NZST — bucket records have NZST timestamps
        const now = new Date(nowNZST());
        const result: { hour: string; count: number }[] = [];

        for (let i = hoursBack - 1; i >= 0; i--) {
            const hourStart = new Date(now);
            hourStart.setHours(now.getHours() - i, 0, 0, 0);

            const hourEnd = new Date(hourStart);
            hourEnd.setHours(hourStart.getHours() + 1);

            const count = bucketRecords.filter((r) => {
                const recordTime = new Date(r.scanned_at || '');
                return recordTime >= hourStart && recordTime < hourEnd;
            }).length;

            result.push({
                hour: hourStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                count
            });
        }

        return result;
    }

    /**
     * Calculate ETA to reach target based on current velocity
     */
    calculateETA(
        currentTons: number,
        targetTons: number,
        velocityPerHour: number, // buckets per hour
        bucketsPerTon: number = 72 // ~72 buckets = 1 ton (approx)
    ): { eta: string; status: 'ahead' | 'on_track' | 'behind'; hoursRemaining: number } {
        const remainingTons = targetTons - currentTons;

        if (remainingTons <= 0) {
            return { eta: 'Complete!', status: 'ahead', hoursRemaining: 0 };
        }

        if (velocityPerHour <= 0) {
            return { eta: 'Awaiting data...', status: 'behind', hoursRemaining: Infinity };
        }

        const remainingBuckets = remainingTons * bucketsPerTon;
        const hoursNeeded = remainingBuckets / velocityPerHour;

        // 🔧 L19: Use NZST for ETA calculation
        const etaDate = new Date(nowNZST());
        etaDate.setHours(etaDate.getHours() + hoursNeeded);

        // Determine if we'll finish before 5 PM NZST (typical end of day)
        const endOfDay = new Date(nowNZST());
        endOfDay.setHours(17, 0, 0, 0);

        let status: 'ahead' | 'on_track' | 'behind';
        if (etaDate < endOfDay) {
            status = hoursNeeded <= 2 ? 'ahead' : 'on_track';
        } else {
            status = 'behind';
        }

        const etaString = etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return { eta: etaString, status, hoursRemaining: hoursNeeded };
    }

    /**
     * Generate CSV report with sync timestamp and offline warning
     */
    generateDailyReport(
        crew: Picker[],
        bucketRecords: BucketRecord[],
        settings: { piece_rate: number; min_wage_rate: number },
        teamLeaders: Picker[],
        metadata: ReportMetadata
    ): string {
        const rows: ReportRow[] = crew
            .filter(p => p.role !== 'team_leader' && p.role !== 'runner')
            .map(p => {
                const buckets = p.total_buckets_today || 0;
                // 🔧 L18: Don't fabricate hours — 0 is honest when not tracked
                const hoursWorked = p.hours || 0;
                const rate = hoursWorked > 0 ? buckets / hoursWorked : 0;

                const { status, earnings, minWageEarnings } = this.calculateWageStatus(
                    buckets,
                    hoursWorked,
                    settings.piece_rate,
                    settings.min_wage_rate
                );

                const teamLeader = teamLeaders.find(l => l.id === p.team_leader_id);

                return {
                    name: p.name,
                    picker_id: p.picker_id,
                    buckets,
                    hours_worked: hoursWorked,
                    rate: Math.round(rate * 10) / 10,
                    earnings: Math.round(earnings * 100) / 100,
                    min_wage_earnings: Math.round(minWageEarnings * 100) / 100,
                    status,
                    team_leader: teamLeader?.name || 'Unassigned'
                };
            })
            .sort((a, b) => b.buckets - a.buckets);

        // Build CSV
        const lines: string[] = [];

        // Metadata header
        lines.push('# HarvestPro Daily Report');
        lines.push(`# Orchard: ${metadata.orchard_name}`);
        lines.push(`# Generated: ${metadata.generated_at}`);
        lines.push(`# Last Sync: ${metadata.last_sync}`);

        if (metadata.is_offline_data) {
            lines.push(`# ⚠️ OFFLINE DATA - ${metadata.pending_queue_count} scans pending sync from other devices`);
        }

        lines.push('');

        // CSV Header
        lines.push('Name,Picker ID,Buckets,Hours,Rate (bkt/hr),Earnings ($),Min Wage ($),Status,Team Leader');

        // Data rows
        rows.forEach(r => {
            lines.push([
                `"${r.name}"`,
                r.picker_id,
                r.buckets,
                r.hours_worked,
                r.rate,
                r.earnings.toFixed(2),
                r.min_wage_earnings.toFixed(2),
                r.status.toUpperCase(),
                `"${r.team_leader}"`
            ].join(','));
        });

        // Summary
        const totalBuckets = rows.reduce((sum, r) => sum + r.buckets, 0);
        const totalEarnings = rows.reduce((sum, r) => sum + r.earnings, 0);
        const belowMinimum = rows.filter(r => r.status === 'below_minimum').length;

        lines.push('');
        lines.push(`# SUMMARY: ${rows.length} pickers, ${totalBuckets} buckets, $${totalEarnings.toFixed(2)} total earnings`);
        lines.push(`# COMPLIANCE: ${belowMinimum} pickers below minimum wage`);

        return lines.join('\n');
    }

    /**
     * Trigger browser download of CSV
     */
    downloadCSV(csvContent: string, filename: string): void {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    /**
     * ============================================
     * FASE 6: Historical HeatMap Analytics
     * ============================================
     */

    /**
     * Obtener densidad de cosecha por row para un rango de fechas
     */
    async getRowDensity(
        orchardId: string,
        startDate: string,
        endDate: string,
        targetBucketsPerRow: number = 100
    ): Promise<{
        orchard_id: string;
        date_range: { start: string; end: string };
        total_buckets: number;
        total_rows_harvested: number;
        density_by_row: Array<{
            row_number: number;
            total_buckets: number;
            unique_pickers: number;
            avg_buckets_per_picker: number;
            density_score: number;
            target_completion: number;
        }>;
        top_rows: number[];
        pending_rows: number[];
    }> {
        // Uses unified Supabase singleton from services/supabase.ts

        // Query optimizada: obtener todos los registros del rango
        // Uses bucket_records (canonical table) instead of legacy bucket_events
        const { data: events, error } = await supabase
            .from('bucket_records')
            .select('row_number, picker_id, scanned_at')
            .eq('orchard_id', orchardId)
            .gte('scanned_at', `${startDate}T00:00:00+13:00`)
            .lte('scanned_at', `${endDate}T23:59:59+13:00`);

        if (error) {

            logger.error('[Analytics] Error fetching events:', error);
            throw error;
        }

        if (!events || events.length === 0) {
            return {
                orchard_id: orchardId,
                date_range: { start: startDate, end: endDate },
                total_buckets: 0,
                total_rows_harvested: 0,
                density_by_row: [],
                top_rows: [],
                pending_rows: []
            };
        }

        // Agrupar por row_number
        const rowStatsMap = new Map<number, {
            buckets: number;
            pickers: Set<string>;
        }>();

        events.forEach((event) => {
            const rowNum = event.row_number;
            const pickerId = event.picker_id;

            if (!rowStatsMap.has(rowNum)) {
                rowStatsMap.set(rowNum, {
                    buckets: 0,
                    pickers: new Set()
                });
            }

            const stats = rowStatsMap.get(rowNum)!;
            stats.buckets++;
            stats.pickers.add(pickerId);
        });

        // Calcular densidades y métricas
        const density_by_row: Array<{
            row_number: number;
            total_buckets: number;
            unique_pickers: number;
            avg_buckets_per_picker: number;
            density_score: number;
            target_completion: number;
        }> = [];
        let total_buckets = 0;
        const top_rows: number[] = [];
        const pending_rows: number[] = [];

        for (const [row_number, stats] of rowStatsMap) {
            const avg_buckets_per_picker = stats.pickers.size > 0
                ? stats.buckets / stats.pickers.size
                : 0;

            const target_completion = (stats.buckets / targetBucketsPerRow) * 100;
            const density_score = Math.min(100, target_completion);

            const rowDensity = {
                row_number,
                total_buckets: stats.buckets,
                unique_pickers: stats.pickers.size,
                avg_buckets_per_picker: parseFloat(avg_buckets_per_picker.toFixed(2)),
                density_score: parseFloat(density_score.toFixed(2)),
                target_completion: parseFloat(target_completion.toFixed(2))
            };

            density_by_row.push(rowDensity);
            total_buckets += stats.buckets;

            // Clasificar rows
            if (target_completion >= 100) {
                top_rows.push(row_number);
            } else if (target_completion < 50) {
                pending_rows.push(row_number);
            }
        }

        // Ordenar por row_number
        density_by_row.sort((a, b) => a.row_number - b.row_number);

        return {
            orchard_id: orchardId,
            date_range: {
                start: startDate,
                end: endDate
            },
            total_buckets,
            total_rows_harvested: density_by_row.length,
            density_by_row,
            top_rows: top_rows.sort((a, b) => a - b),
            pending_rows: pending_rows.sort((a, b) => a - b)
        };
    }

    /**
     * Get daily trend data for the last N days.
     * Queries day_closures + daily_attendance for historical metrics.
     * Falls back to realistic mock data when no real data exists.
     */
    async getDailyTrends(orchardId: string, days: number = 7): Promise<{
        costPerBin: { label: string; value: number }[];
        totalBins: { label: string; value: number }[];
        workforceSize: { label: string; value: number }[];
        breakEvenCost: number;
    }> {
        const since = new Date();
        since.setDate(since.getDate() - days);
        const sinceStr = since.toISOString().split('T')[0];

        try {
            // Try fetching real day_closures data
            const { data: closures } = await supabase
                .from('day_closures')
                .select('date, total_buckets, total_cost, total_hours')
                .eq('orchard_id', orchardId)
                .gte('date', sinceStr)
                .order('date', { ascending: true });

            const { data: attendance } = await supabase
                .from('daily_attendance')
                .select('date')
                .eq('orchard_id', orchardId)
                .gte('date', sinceStr);

            if (closures && closures.length >= 2) {
                const dayLabels = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('en-NZ', { weekday: 'short' });

                // Workforce: count unique dates from attendance
                const workforceMap = new Map<string, number>();
                (attendance || []).forEach(a => {
                    workforceMap.set(a.date, (workforceMap.get(a.date) || 0) + 1);
                });

                return {
                    costPerBin: closures.map(c => ({
                        label: dayLabels(c.date),
                        value: c.total_buckets > 0 ? Math.round((c.total_cost / c.total_buckets) * 100) / 100 : 0,
                    })),
                    totalBins: closures.map(c => ({
                        label: dayLabels(c.date),
                        value: c.total_buckets || 0,
                    })),
                    workforceSize: closures.map(c => ({
                        label: dayLabels(c.date),
                        value: workforceMap.get(c.date) || 0,
                    })),
                    breakEvenCost: 8.50, // Default NZ break-even estimate
                };
            }
        } catch (e) {
            logger.warn('[Analytics] Failed to fetch day_closures, using demo data:', e);
        }

        // --- Demo data (realistic NZ kiwifruit harvest) ---
        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].slice(0, days);
        const costs = [7.20, 6.85, 7.50, 8.10, 7.95, 8.60, 7.40];
        const bins = [320, 350, 290, 310, 280, 340, 360];
        const pickers = [24, 26, 22, 25, 20, 27, 28];
        const teamSets = [
            [{ name: 'Team Acid', pickers: 10, buckets: 140 }, { name: 'Team Beta', pickers: 8, buckets: 110 }, { name: 'Team Gamma', pickers: 6, buckets: 70 }],
            [{ name: 'Team Acid', pickers: 11, buckets: 155 }, { name: 'Team Beta', pickers: 9, buckets: 120 }, { name: 'Team Gamma', pickers: 6, buckets: 75 }],
            [{ name: 'Team Acid', pickers: 9, buckets: 120 }, { name: 'Team Beta', pickers: 7, buckets: 95 }, { name: 'Team Gamma', pickers: 6, buckets: 75 }],
            [{ name: 'Team Acid', pickers: 10, buckets: 130 }, { name: 'Team Beta', pickers: 9, buckets: 110 }, { name: 'Team Gamma', pickers: 6, buckets: 70 }],
            [{ name: 'Team Acid', pickers: 8, buckets: 115 }, { name: 'Team Beta', pickers: 7, buckets: 100 }, { name: 'Team Gamma', pickers: 5, buckets: 65 }],
            [{ name: 'Team Acid', pickers: 12, buckets: 160 }, { name: 'Team Beta', pickers: 9, buckets: 110 }, { name: 'Team Gamma', pickers: 6, buckets: 70 }],
            [{ name: 'Team Acid', pickers: 12, buckets: 165 }, { name: 'Team Beta', pickers: 10, buckets: 125 }, { name: 'Team Gamma', pickers: 6, buckets: 70 }],
        ];

        const today = new Date();
        return {
            costPerBin: dayNames.map((d, i) => {
                const date = new Date(today);
                date.setDate(date.getDate() - (days - 1 - i));
                return {
                    label: d,
                    value: costs[i] || 7.50,
                    meta: {
                        date: date.toISOString().split('T')[0],
                        orchardName: 'J&P Cherries — Block C',
                        teams: teamSets[i] || teamSets[0],
                        totalPickers: pickers[i] || 25,
                        totalBuckets: bins[i] || 300,
                        totalTons: ((bins[i] || 300) * 13.5 / 1000),
                        costPerBin: costs[i] || 7.50,
                        topUpCost: Math.max(0, ((costs[i] || 7.50) - 6.50) * (bins[i] || 300)),
                    },
                };
            }),
            totalBins: dayNames.map((d, i) => {
                const date = new Date(today);
                date.setDate(date.getDate() - (days - 1 - i));
                return {
                    label: d,
                    value: bins[i] || 300,
                    meta: {
                        date: date.toISOString().split('T')[0],
                        orchardName: 'J&P Cherries — Block C',
                        teams: teamSets[i] || teamSets[0],
                        totalPickers: pickers[i] || 25,
                        totalBuckets: bins[i] || 300,
                        totalTons: ((bins[i] || 300) * 13.5 / 1000),
                        costPerBin: costs[i] || 7.50,
                        topUpCost: Math.max(0, ((costs[i] || 7.50) - 6.50) * (bins[i] || 300)),
                    },
                };
            }),
            workforceSize: dayNames.map((d, i) => {
                const date = new Date(today);
                date.setDate(date.getDate() - (days - 1 - i));
                return {
                    label: d,
                    value: pickers[i] || 25,
                    meta: {
                        date: date.toISOString().split('T')[0],
                        orchardName: 'J&P Cherries — Block C',
                        teams: teamSets[i] || teamSets[0],
                        totalPickers: pickers[i] || 25,
                        totalBuckets: bins[i] || 300,
                        totalTons: ((bins[i] || 300) * 13.5 / 1000),
                        costPerBin: costs[i] || 7.50,
                        topUpCost: Math.max(0, ((costs[i] || 7.50) - 6.50) * (bins[i] || 300)),
                    },
                };
            }),
            breakEvenCost: 8.50,
        };
    }

    /**
     * Get daily wage bleed (min-wage top-up cost) for the last N days.
     * TODO: In production, cross with day_closures.total_top_up
     */
    async getDailyBleed(_orchardId?: string, days: number = 7): Promise<{ label: string; value: number }[]> {
        const mockData: { label: string; value: number }[] = [];
        const today = new Date();
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        let baseBleed = 900;
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);

            const noise = Math.floor(Math.random() * 300) - 150;
            const dailyBleed = Math.max(0, baseBleed + noise);

            mockData.push({
                label: i === 0 ? 'Today' : daysOfWeek[d.getDay()],
                value: dailyBleed,
            });
            baseBleed -= 40; // Overall downward trend
        }
        return mockData;
    }
}

export const analyticsService = new AnalyticsService();

