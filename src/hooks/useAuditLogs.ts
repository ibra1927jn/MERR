/**
 * useAuditLogs Hook
 * 
 * React hook for fetching and managing audit logs
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';

// =============================================
// TYPES
// =============================================

export interface AuditLog {
    id: string;
    user_id: string | null;
    user_email: string | null;
    action: 'INSERT' | 'UPDATE' | 'DELETE' | 'CUSTOM';
    table_name: string;
    record_id: string | null;
    old_values: Record<string, unknown> | null;
    new_values: Record<string, unknown> | null;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
}

export interface AuditFilters {
    fromDate?: string;
    toDate?: string;
    userId?: string;
    tableName?: string;
    action?: 'INSERT' | 'UPDATE' | 'DELETE' | 'CUSTOM';
    limit?: number;
}

// =============================================
// HOOK
// =============================================

export function useAuditLogs(filters: AuditFilters = {}) {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchLogs = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            let query = supabase
                .from('audit_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(filters.limit || 100);

            // Apply filters
            if (filters.fromDate) {
                query = query.gte('created_at', filters.fromDate);
            }

            if (filters.toDate) {
                query = query.lte('created_at', filters.toDate);
            }

            if (filters.userId) {
                query = query.eq('user_id', filters.userId);
            }

            if (filters.tableName) {
                query = query.eq('table_name', filters.tableName);
            }

            if (filters.action) {
                query = query.eq('action', filters.action);
            }

            const { data, error: fetchError } = await query;

            if (fetchError) {
                throw fetchError;
            }

            setLogs((data as AuditLog[]) || []);
        } catch (err) {

            console.error('[useAuditLogs] Error fetching logs:', err);
            setError(err as Error);
        } finally {
            setIsLoading(false);
        }
    }, [filters.fromDate, filters.toDate, filters.userId, filters.tableName, filters.action, filters.limit]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    return {
        logs,
        isLoading,
        error,
        refetch: fetchLogs,
    };
}

// =============================================
// HOOK FOR RECORD HISTORY
// =============================================

export function useRecordHistory(tableName: string, recordId: string) {
    const [history, setHistory] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchHistory = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const { data, error: fetchError } = await supabase
                    .from('audit_logs')
                    .select('*')
                    .eq('table_name', tableName)
                    .eq('record_id', recordId)
                    .order('created_at', { ascending: false });

                if (fetchError) {
                    throw fetchError;
                }

                setHistory((data as AuditLog[]) || []);
            } catch (err) {

                console.error('[useRecordHistory] Error fetching history:', err);
                setError(err as Error);
            } finally {
                setIsLoading(false);
            }
        };

        if (tableName && recordId) {
            fetchHistory();
        }
    }, [tableName, recordId]);

    return {
        history,
        isLoading,
        error,
    };
}

// =============================================
// HOOK FOR AUDIT STATS
// =============================================

export function useAuditStats(fromDate?: string) {
    const [stats, setStats] = useState<{
        totalLogs: number;
        byAction: Record<string, number>;
        byTable: Record<string, number>;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            setIsLoading(true);
            setError(null);

            try {
                let query = supabase
                    .from('audit_logs')
                    .select('action, table_name');

                if (fromDate) {
                    query = query.gte('created_at', fromDate);
                }

                const { data, error: fetchError } = await query;

                if (fetchError) {
                    throw fetchError;
                }

                const logs = data || [];
                const byAction: Record<string, number> = {};
                const byTable: Record<string, number> = {};

                logs.forEach((log) => {
                    byAction[log.action] = (byAction[log.action] || 0) + 1;
                    byTable[log.table_name] = (byTable[log.table_name] || 0) + 1;
                });

                setStats({
                    totalLogs: logs.length,
                    byAction,
                    byTable,
                });
            } catch (err) {

                console.error('[useAuditStats] Error fetching stats:', err);
                setError(err as Error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
    }, [fromDate]);

    return {
        stats,
        isLoading,
        error,
    };
}