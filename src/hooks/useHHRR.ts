/**
 * useHHRR — Data loading for the HHRR page
 *
 * Extracts data fetching logic from HHRR.tsx following
 * the usePayroll pattern (thin hook, page becomes pure orchestrator).
 */
import { useState, useEffect, useCallback } from 'react';
import {
    fetchHRSummary, fetchEmployees, fetchPayroll, fetchComplianceAlerts,
    type HRSummary, type Employee, type PayrollEntry, type ComplianceAlert
} from '@/services/hhrr.service';
import { logger } from '@/utils/logger';

export interface UseHHRRResult {
    summary: HRSummary;
    employees: Employee[];
    payroll: PayrollEntry[];
    alerts: ComplianceAlert[];
    isLoading: boolean;
    reload: () => Promise<void>;
}

export function useHHRR(): UseHHRRResult {
    const [summary, setSummary] = useState<HRSummary>({
        activeWorkers: 0, pendingContracts: 0, payrollThisWeek: 0, complianceAlerts: 0,
    });
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [payroll, setPayroll] = useState<PayrollEntry[]>([]);
    const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const reload = useCallback(async () => {
        setIsLoading(true);
        try {
            const [sum, emps, pay, alts] = await Promise.all([
                fetchHRSummary(),
                fetchEmployees(),
                fetchPayroll(),
                fetchComplianceAlerts(),
            ]);
            setSummary(sum);
            setEmployees(emps);
            setPayroll(pay);
            setAlerts(alts);
        } catch (err) {
            logger.warn('[HHRR] Failed to load HR data:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        reload();
    }, [reload]);

    return { summary, employees, payroll, alerts, isLoading, reload };
}
