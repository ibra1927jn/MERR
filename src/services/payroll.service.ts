/**
 * Payroll Service - Cliente para Edge Function de cálculo de nómina
 * 
 * Este servicio REEMPLAZA la lógica local de calculations.service.ts
 * para garantizar que los cálculos se hagan en el servidor (inmutables)
 */

import { supabase } from '@/services/supabase';
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
};
