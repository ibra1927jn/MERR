/**
 * Payroll Service - Cliente para Edge Function de cálculo de nómina
 * 
 * Este servicio REEMPLAZA la lógica local de calculations.service.ts
 * para garantizar que los cálculos se hagan en el servidor (inmutables)
 */

import { logger } from '@/utils/logger';
import { supabase } from '@/services/supabase';
import { syncService } from '@/services/sync.service';
import { getConfig } from '@/services/config.service';
import { todayNZST } from '@/utils/nzst';

export interface PickerBreakdown {
    picker_id: string;
    picker_name: string;
    buckets: number;
    hours_worked: number;
    piece_rate_earnings: number;
    hourly_rate: number;
    minimum_required: number;
    top_up_required: number;
    total_earnings: number;
    is_below_minimum: boolean;
}

export interface PayrollResult {
    orchard_id: string;
    date_range: {
        start: string;
        end: string;
    };
    summary: {
        total_buckets: number;
        total_hours: number;
        total_piece_rate_earnings: number;
        total_top_up: number;
        total_earnings: number;
    };
    compliance: {
        workers_below_minimum: number;
        workers_total: number;
        compliance_rate: number;
    };
    picker_breakdown: PickerBreakdown[];
    settings: {
        bucket_rate: number;
        min_wage_rate: number;
    };
}

// Phase 2: Timesheet types for approval workflow
export interface TimesheetEntry {
    id: string;
    picker_id: string;
    picker_name: string;
    date: string;
    check_in_time: string | null;
    check_out_time: string | null;
    hours_worked: number;
    verified_by: string | null;
    is_verified: boolean;
    orchard_id: string;
}

export const payrollService = {
    /**
     * Calcular nómina usando Edge Function (servidor)
     * 
     * @param orchardId - ID del orchard
     * @param startDate - Fecha inicio (YYYY-MM-DD)
     * @param endDate - Fecha fin (YYYY-MM-DD)
     * @returns PayrollResult con cálculos completos
     */
    async calculatePayroll(
        orchardId: string,
        startDate: string,
        endDate: string
    ): Promise<PayrollResult> {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            throw new Error('No authenticated session');
        }

        const response = await fetch(
            `${getConfig().SUPABASE_URL}/functions/v1/calculate-payroll`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    orchard_id: orchardId,
                    start_date: startDate,
                    end_date: endDate,
                }),
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to calculate payroll');
        }

        const result: PayrollResult = await response.json();
        return result;
    },

    /**
     * Calcular nómina para el día actual
     */
    async calculateToday(orchardId: string): Promise<PayrollResult> {
        const today = todayNZST();
        return this.calculatePayroll(orchardId, today, today);
    },

    /**
     * Calcular nómina para la semana actual
     */
    async calculateThisWeek(orchardId: string): Promise<PayrollResult> {
        const today = new Date();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay()); // Domingo

        const startDate = todayNZST(); // weekStart is still UTC-derived, but date is NZ
        // TODO: properly handle week start in NZST
        const endDate = todayNZST();

        return this.calculatePayroll(orchardId, startDate, endDate);
    },

    /**
     * Obtener resumen simplificado para dashboard
     */
    async getDashboardSummary(orchardId: string) {
        const result = await this.calculateToday(orchardId);

        return {
            totalBuckets: result.summary.total_buckets,
            totalCost: result.summary.total_earnings,
            workersAtRisk: result.compliance.workers_below_minimum,
            complianceRate: result.compliance.compliance_rate,
        };
    },

    /**
     * Fetch timesheets from daily_attendance (Phase 2)
     */
    async fetchTimesheets(orchardId: string, date?: string): Promise<TimesheetEntry[]> {
        const targetDate = date || todayNZST();

        const { data: attendance, error } = await supabase
            .from('daily_attendance')
            .select('id, picker_id, date, check_in_time, check_out_time, verified_by, orchard_id')
            .eq('orchard_id', orchardId)
            .eq('date', targetDate)
            .order('check_in_time', { ascending: true });

        if (error) {
            logger.error('[Payroll] Error fetching timesheets:', error);
            return [];
        }

        // Get picker names
        const pickerIds = [...new Set((attendance || []).map(a => a.picker_id))];
        let pickerNames: Record<string, string> = {};
        if (pickerIds.length > 0) {
            const { data: pickers } = await supabase
                .from('pickers')
                .select('id, name')
                .in('id', pickerIds);
            pickerNames = Object.fromEntries((pickers || []).map(p => [p.id, p.name]));
        }

        return (attendance || []).map(a => {
            let hoursWorked = 0;
            if (a.check_in_time && a.check_out_time) {
                hoursWorked = (new Date(a.check_out_time).getTime() - new Date(a.check_in_time).getTime()) / 3600000;
                hoursWorked = Math.min(Math.round(hoursWorked * 100) / 100, 12);
            }

            return {
                id: a.id,
                picker_id: a.picker_id,
                picker_name: pickerNames[a.picker_id] || 'Unknown',
                date: a.date,
                check_in_time: a.check_in_time,
                check_out_time: a.check_out_time,
                hours_worked: hoursWorked,
                verified_by: a.verified_by,
                is_verified: !!a.verified_by,
                orchard_id: a.orchard_id,
            };
        });
    },

    /**
     * Approve timesheet — via syncService queue (offline-first)
     */
    approveTimesheet(attendanceId: string, verifiedBy: string): string {
        return syncService.addToQueue('TIMESHEET', {
            action: 'approve',
            attendanceId,
            verifiedBy,
        });
    },
};
