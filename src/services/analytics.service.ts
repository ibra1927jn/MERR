/**
 * services/analytics.service.ts
 * Analytics & Reporting Service for Phase 8
 * Provides data transformation and export capabilities
 */
import { logger } from '@/utils/logger';
import { Picker, BucketRecord } from '../types';
import { supabase } from './supabase';

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
        const now = new Date();
        const result: { hour: string; count: number }[] = [];

        for (let i = hoursBack - 1; i >= 0; i--) {
            const hourStart = new Date(now);
            hourStart.setHours(now.getHours() - i, 0, 0, 0);

            const hourEnd = new Date(hourStart);
            hourEnd.setHours(hourStart.getHours() + 1);

            const count = bucketRecords.filter((r) => {
                const recordTime = new Date(r.scanned_at);
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

        const etaDate = new Date();
        etaDate.setHours(etaDate.getHours() + hoursNeeded);

        // Determine if we'll finish before 5 PM (typical end of day)
        const endOfDay = new Date();
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
                const hoursWorked = p.hours || 4; // Default 4 hours if not tracked
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

        // Query optimizada: obtener todos los eventos del rango
        const { data: events, error } = await supabase
            .from('bucket_events')
            .select('row_number, picker_id, recorded_at')
            .eq('orchard_id', orchardId)
            .gte('recorded_at', `${startDate}T00:00:00Z`)
            .lte('recorded_at', `${endDate}T23:59:59Z`);

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
}

export const analyticsService = new AnalyticsService();
