/**
 * HHRR Service — Human Resources Department
 * Handles employee management, contracts, payroll, and compliance for HR_ADMIN role
 *
 * Architecture:
 *   READS  → Direct Supabase queries
 *   WRITES → Via syncService.addToQueue() for offline-first
 *   Conflict Resolution: Last-write-wins (documented decision)
 */
import { supabase } from '@/services/supabase';
import { syncService } from '@/services/sync.service';
import { logger } from '@/utils/logger';

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
    status: 'active' | 'expiring' | 'expired' | 'draft' | 'terminated';
    start_date: string;
    end_date?: string;
    hourly_rate: number;
    notes?: string;
    created_at: string;
    updated_at: string;
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

/**
 * Fetch HR summary with REAL data from users + contracts tables
 */
export async function fetchHRSummary(orchardId?: string): Promise<HRSummary> {
    try {
        // Real active worker count
        let usersQ = supabase.from('users').select('id, is_active');
        if (orchardId) usersQ = usersQ.eq('orchard_id', orchardId);
        const { data: users } = await usersQ;
        const activeWorkers = users?.filter(u => u.is_active).length || 0;

        // Real pending/draft contracts
        let contractsQ = supabase
            .from('contracts')
            .select('id, status')
            .in('status', ['draft', 'expiring']);
        if (orchardId) contractsQ = contractsQ.eq('orchard_id', orchardId);
        const { data: contracts } = await contractsQ;
        const pendingContracts = contracts?.length || 0;

        // Real compliance alerts (contract expiry within 30 days)
        const alerts = await fetchComplianceAlerts(orchardId);

        // Real payroll estimate (based on attendance this week)
        let attendanceQ = supabase
            .from('daily_attendance')
            .select('check_in_time, check_out_time')
            .gte('date', new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]);
        if (orchardId) attendanceQ = attendanceQ.eq('orchard_id', orchardId);
        const { data: attendance } = await attendanceQ;

        let totalHours = 0;
        (attendance || []).forEach(a => {
            if (a.check_in_time && a.check_out_time) {
                const hrs = (new Date(a.check_out_time).getTime() - new Date(a.check_in_time).getTime()) / 3600000;
                totalHours += Math.min(hrs, 12); // Cap at 12h per day
            }
        });

        return {
            activeWorkers,
            pendingContracts,
            payrollThisWeek: totalHours * 23.50, // Minimum wage as baseline
            complianceAlerts: alerts.length,
        };
    } catch (error) {
        logger.error('[HHRR] Error fetching HR summary:', error);
        return { activeWorkers: 0, pendingContracts: 0, payrollThisWeek: 0, complianceAlerts: 0 };
    }
}

/**
 * Fetch employees from users table — enriched with contract data
 */
export async function fetchEmployees(orchardId?: string): Promise<Employee[]> {
    try {
        let query = supabase
            .from('users')
            .select('*')
            .order('full_name');

        if (orchardId) query = query.eq('orchard_id', orchardId);

        const { data, error } = await query;
        if (error) throw error;

        // Fetch contracts for all these employees to enrich data
        const userIds = (data || []).map(u => u.id);
        let contracts: Array<{ employee_id: string; type: string; status: string; start_date: string; end_date: string | null; hourly_rate: number }> = [];

        if (userIds.length > 0) {
            const { data: contractData } = await supabase
                .from('contracts')
                .select('employee_id, type, status, start_date, end_date, hourly_rate')
                .in('employee_id', userIds)
                .in('status', ['active', 'expiring']);
            contracts = contractData || [];
        }

        return (data || []).map(user => {
            const contract = contracts.find(c => c.employee_id === user.id);
            return {
                id: user.id,
                full_name: user.full_name || 'Unknown',
                email: user.email || '',
                role: user.role || 'picker',
                status: user.is_active ? 'active' as const : 'terminated' as const,
                contract_type: (contract?.type || 'seasonal') as 'permanent' | 'seasonal' | 'casual',
                contract_start: contract?.start_date || user.created_at || new Date().toISOString(),
                contract_end: contract?.end_date || undefined,
                hourly_rate: contract?.hourly_rate || 23.50,
                visa_status: 'citizen' as const, // TODO: Add visa tracking column when needed
                hire_date: user.created_at || new Date().toISOString(),
                orchard_id: user.orchard_id,
            };
        });
    } catch (error) {
        logger.error('[HHRR] Error fetching employees:', error);
        return [];
    }
}

/**
 * Fetch contracts from the contracts table (REAL DATA)
 */
export async function fetchContracts(orchardId?: string): Promise<Contract[]> {
    try {
        let query = supabase
            .from('contracts')
            .select(`
                id, employee_id, type, status, start_date, end_date,
                hourly_rate, notes, created_at, updated_at
            `)
            .order('status')
            .order('end_date', { ascending: true, nullsFirst: false });

        if (orchardId) query = query.eq('orchard_id', orchardId);

        const { data, error } = await query;
        if (error) throw error;

        // Enrich with employee names
        const employeeIds = [...new Set((data || []).map(c => c.employee_id))];
        let names: Record<string, string> = {};
        if (employeeIds.length > 0) {
            const { data: users } = await supabase
                .from('users')
                .select('id, full_name')
                .in('id', employeeIds);
            names = Object.fromEntries((users || []).map(u => [u.id, u.full_name || 'Unknown']));
        }

        return (data || []).map(c => ({
            id: c.id,
            employee_id: c.employee_id,
            employee_name: names[c.employee_id] || 'Unknown',
            type: c.type,
            status: c.status,
            start_date: c.start_date,
            end_date: c.end_date || undefined,
            hourly_rate: c.hourly_rate,
            notes: c.notes || undefined,
            created_at: c.created_at,
            updated_at: c.updated_at,
        }));
    } catch (error) {
        logger.error('[HHRR] Error fetching contracts:', error);
        return [];
    }
}

/**
 * Create contract — via syncService queue (offline-first)
 */
export async function createContract(contract: {
    employee_id: string;
    orchard_id: string;
    type: 'permanent' | 'seasonal' | 'casual';
    start_date: string;
    end_date?: string;
    hourly_rate: number;
    notes?: string;
}): Promise<string> {
    return syncService.addToQueue('CONTRACT', {
        action: 'create',
        ...contract,
    });
}

/**
 * Update contract — via syncService queue (offline-first)
 * Pass currentUpdatedAt to enable optimistic locking (prevents silent overwrites)
 */
export async function updateContract(contractId: string, updates: {
    status?: string;
    end_date?: string;
    hourly_rate?: number;
    notes?: string;
}, currentUpdatedAt?: string): Promise<string> {
    return syncService.addToQueue('CONTRACT', {
        action: 'update',
        contractId,
        ...updates,
    }, currentUpdatedAt);
}

/**
 * Fetch payroll from REAL bucket_records + daily_attendance
 */
export async function fetchPayroll(orchardId?: string): Promise<PayrollEntry[]> {
    try {
        const periodStart = new Date(Date.now() - 7 * 86400000).toISOString();
        const periodEnd = new Date().toISOString();

        // Get active employees
        const employees = await fetchEmployees(orchardId);
        const activeEmployees = employees.filter(e => e.status === 'active');

        // Get bucket counts per picker (from pickers table, mapped by team_leader/user)
        let bucketsQ = supabase
            .from('bucket_records')
            .select('picker_id, id')
            .gte('scanned_at', periodStart);
        if (orchardId) bucketsQ = bucketsQ.eq('orchard_id', orchardId);
        const { data: buckets } = await bucketsQ;

        // Count buckets per picker
        const bucketCounts: Record<string, number> = {};
        (buckets || []).forEach(b => {
            bucketCounts[b.picker_id] = (bucketCounts[b.picker_id] || 0) + 1;
        });

        // Get attendance hours
        let attendanceQ = supabase
            .from('daily_attendance')
            .select('picker_id, check_in_time, check_out_time')
            .gte('date', periodStart.split('T')[0]);
        if (orchardId) attendanceQ = attendanceQ.eq('orchard_id', orchardId);
        const { data: attendance } = await attendanceQ;

        const hoursByPicker: Record<string, number> = {};
        (attendance || []).forEach(a => {
            if (a.check_in_time && a.check_out_time) {
                const hrs = (new Date(a.check_out_time).getTime() - new Date(a.check_in_time).getTime()) / 3600000;
                hoursByPicker[a.picker_id] = (hoursByPicker[a.picker_id] || 0) + Math.min(hrs, 12);
            }
        });

        const PIECE_RATE = 6.50; // From day_setups default

        return activeEmployees.map(emp => {
            const hours = hoursByPicker[emp.id] || 0;
            const bucketsCount = bucketCounts[emp.id] || 0;
            const hourlyEarnings = hours * emp.hourly_rate;
            const pieceEarnings = bucketsCount * PIECE_RATE;
            const totalPay = Math.max(hourlyEarnings, pieceEarnings);

            return {
                id: `payroll-${emp.id}`,
                employee_id: emp.id,
                employee_name: emp.full_name,
                role: emp.role,
                hours_worked: Math.round(hours * 100) / 100,
                buckets_picked: bucketsCount,
                hourly_earnings: Math.round(hourlyEarnings * 100) / 100,
                piece_earnings: Math.round(pieceEarnings * 100) / 100,
                total_pay: Math.round(totalPay * 100) / 100,
                wage_shield_applied: pieceEarnings < hourlyEarnings,
                period_start: periodStart,
                period_end: periodEnd,
            };
        });
    } catch (error) {
        logger.error('[HHRR] Error generating payroll:', error);
        return [];
    }
}

/**
 * Fetch compliance alerts — REAL contract expiry checks
 */
export async function fetchComplianceAlerts(orchardId?: string): Promise<ComplianceAlert[]> {
    const alerts: ComplianceAlert[] = [];

    try {
        // Check contracts expiring within 30 days
        const thirtyDaysFromNow = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
        const today = new Date().toISOString().split('T')[0];

        let contractsQ = supabase
            .from('contracts')
            .select('id, employee_id, type, end_date, hourly_rate')
            .not('end_date', 'is', null)
            .lte('end_date', thirtyDaysFromNow)
            .gte('end_date', today)
            .in('status', ['active', 'expiring']);
        if (orchardId) contractsQ = contractsQ.eq('orchard_id', orchardId);

        const { data: expiringContracts } = await contractsQ;

        if (expiringContracts && expiringContracts.length > 0) {
            // Get employee names
            const ids = expiringContracts.map(c => c.employee_id);
            const { data: users } = await supabase
                .from('users')
                .select('id, full_name')
                .in('id', ids);
            const names = Object.fromEntries((users || []).map(u => [u.id, u.full_name || 'Unknown']));

            expiringContracts.forEach(c => {
                const daysUntilExpiry = Math.floor(
                    (new Date(c.end_date).getTime() - Date.now()) / 86400000
                );
                alerts.push({
                    id: `contract-${c.id}`,
                    type: 'contract_expiry',
                    severity: daysUntilExpiry < 7 ? 'critical' : daysUntilExpiry < 14 ? 'high' : 'medium',
                    employee_id: c.employee_id,
                    employee_name: names[c.employee_id] || 'Unknown',
                    message: `${c.type} contract expires in ${daysUntilExpiry} days (${c.end_date})`,
                    created_at: new Date().toISOString(),
                    resolved: false,
                });
            });
        }

        // Check expired contracts still marked active
        let expiredQ = supabase
            .from('contracts')
            .select('id, employee_id')
            .lt('end_date', today)
            .eq('status', 'active');
        if (orchardId) expiredQ = expiredQ.eq('orchard_id', orchardId);
        const { data: expired } = await expiredQ;

        if (expired && expired.length > 0) {
            const ids = expired.map(c => c.employee_id);
            const { data: users } = await supabase
                .from('users')
                .select('id, full_name')
                .in('id', ids);
            const names = Object.fromEntries((users || []).map(u => [u.id, u.full_name || 'Unknown']));

            expired.forEach(c => {
                alerts.push({
                    id: `expired-${c.id}`,
                    type: 'contract_expiry',
                    severity: 'critical',
                    employee_id: c.employee_id,
                    employee_name: names[c.employee_id] || 'Unknown',
                    message: 'Contract has expired but is still marked as active',
                    created_at: new Date().toISOString(),
                    resolved: false,
                });
            });
        }
    } catch (error) {
        logger.error('[HHRR] Error fetching compliance alerts:', error);
    }

    return alerts;
}
