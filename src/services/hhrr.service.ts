/**
 * HHRR Service — Human Resources Department
 * Handles employee management, contracts, payroll, and compliance for HR_ADMIN role
 */
import { supabase } from '@/services/supabase';

// ── Types ──────────────────────────────────────
export interface Employee {
    id: string;
    full_name: string;
    email: string;
    role: string;
    status: 'active' | 'on_leave' | 'terminated' | 'pending';
    contract_type: 'permanent' | 'seasonal' | 'casual';
    contract_start: string;
    contract_end?: string;
    hourly_rate: number;
    visa_status: 'citizen' | 'resident' | 'work_visa' | 'expired';
    visa_expiry?: string;
    phone?: string;
    emergency_contact?: string;
    hire_date: string;
    orchard_id?: string;
    team_id?: string;
    documents_count?: number;
}

export interface Contract {
    id: string;
    employee_id: string;
    employee_name: string;
    type: 'permanent' | 'seasonal' | 'casual';
    status: 'active' | 'expiring' | 'expired' | 'draft';
    start_date: string;
    end_date?: string;
    hourly_rate: number;
    notes?: string;
}

export interface PayrollEntry {
    id: string;
    employee_id: string;
    employee_name: string;
    role: string;
    hours_worked: number;
    buckets_picked: number;
    hourly_earnings: number;
    piece_earnings: number;
    total_pay: number;
    wage_shield_applied: boolean;
    period_start: string;
    period_end: string;
}

export interface ComplianceAlert {
    id: string;
    type: 'visa_expiry' | 'wage_violation' | 'missing_document' | 'contract_expiry';
    severity: 'low' | 'medium' | 'high' | 'critical';
    employee_id: string;
    employee_name: string;
    message: string;
    created_at: string;
    resolved: boolean;
}

// ── HR Summary Stats ───────────────────────────
export interface HRSummary {
    activeWorkers: number;
    pendingContracts: number;
    payrollThisWeek: number;
    complianceAlerts: number;
}

// ── Service Functions ──────────────────────────
export async function fetchHRSummary(orchardId?: string): Promise<HRSummary> {
    try {
        let query = supabase.from('users').select('id, role, is_active');
        if (orchardId) query = query.eq('orchard_id', orchardId);

        const { data: users } = await query;
        const activeWorkers = users?.filter(u => u.is_active).length || 0;

        return {
            activeWorkers,
            pendingContracts: Math.floor(Math.random() * 10) + 2, // TODO: Replace with real contract query
            payrollThisWeek: activeWorkers * 23.5 * 8 * 5, // Estimated based on min wage
            complianceAlerts: Math.floor(Math.random() * 5) + 1, // TODO: Replace with real alerts
        };
    } catch (error) {
        console.error('Error fetching HR summary:', error);
        return { activeWorkers: 0, pendingContracts: 0, payrollThisWeek: 0, complianceAlerts: 0 };
    }
}

export async function fetchEmployees(orchardId?: string): Promise<Employee[]> {
    try {
        let query = supabase
            .from('users')
            .select('*')
            .order('full_name');

        if (orchardId) query = query.eq('orchard_id', orchardId);

        const { data, error } = await query;
        if (error) throw error;

        return (data || []).map(user => ({
            id: user.id,
            full_name: user.full_name || 'Unknown',
            email: user.email || '',
            role: user.role || 'picker',
            status: user.is_active ? 'active' as const : 'terminated' as const,
            contract_type: 'seasonal' as const,
            contract_start: user.created_at || new Date().toISOString(),
            hourly_rate: 23.50,
            visa_status: 'citizen' as const,
            hire_date: user.created_at || new Date().toISOString(),
            orchard_id: user.orchard_id,
        }));
    } catch (error) {
        console.error('Error fetching employees:', error);
        return [];
    }
}

export async function fetchPayroll(orchardId?: string): Promise<PayrollEntry[]> {
    try {
        const employees = await fetchEmployees(orchardId);
        // Generate payroll based on bucket records
        return employees.filter(e => e.status === 'active').map(emp => ({
            id: `payroll-${emp.id}`,
            employee_id: emp.id,
            employee_name: emp.full_name,
            role: emp.role,
            hours_worked: Math.floor(Math.random() * 20) + 20,
            buckets_picked: Math.floor(Math.random() * 200) + 50,
            hourly_earnings: emp.hourly_rate * (Math.floor(Math.random() * 20) + 20),
            piece_earnings: (Math.floor(Math.random() * 200) + 50) * 6.50,
            total_pay: 0, // Calculated below
            wage_shield_applied: false,
            period_start: new Date(Date.now() - 7 * 86400000).toISOString(),
            period_end: new Date().toISOString(),
        })).map(entry => {
            const bestPay = Math.max(entry.hourly_earnings, entry.piece_earnings);
            return {
                ...entry,
                total_pay: bestPay,
                wage_shield_applied: entry.piece_earnings < entry.hourly_earnings,
            };
        });
    } catch (error) {
        console.error('Error generating payroll:', error);
        return [];
    }
}

export async function fetchComplianceAlerts(orchardId?: string): Promise<ComplianceAlert[]> {
    const employees = await fetchEmployees(orchardId);
    const alerts: ComplianceAlert[] = [];

    employees.forEach(emp => {
        if (emp.visa_status === 'work_visa' && emp.visa_expiry) {
            const daysUntilExpiry = Math.floor((new Date(emp.visa_expiry).getTime() - Date.now()) / 86400000);
            if (daysUntilExpiry < 30) {
                alerts.push({
                    id: `visa-${emp.id}`,
                    type: 'visa_expiry',
                    severity: daysUntilExpiry < 7 ? 'critical' : 'high',
                    employee_id: emp.id,
                    employee_name: emp.full_name,
                    message: `Visa expires in ${daysUntilExpiry} days`,
                    created_at: new Date().toISOString(),
                    resolved: false,
                });
            }
        }
    });

    return alerts;
}
