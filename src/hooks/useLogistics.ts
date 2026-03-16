/**
 * useLogistics — Data loading + realtime for the LogisticsDept page
 *
 * Extracts data fetching and Supabase Realtime subscriptions from
 * LogisticsDept.tsx following the usePayroll pattern.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabase';
import {
    fetchLogisticsSummary, fetchFleet, fetchBinInventory,
    fetchTransportRequests, fetchTransportHistory,
    type LogisticsSummary, type Tractor, type BinInventory,
    type TransportRequest, type TransportLog
} from '@/services/logistics-dept.service';
import { logger } from '@/utils/logger';

export interface UseLogisticsResult {
    summary: LogisticsSummary;
    tractors: Tractor[];
    bins: BinInventory[];
    requests: TransportRequest[];
    history: TransportLog[];
    isLoading: boolean;
    reload: () => Promise<void>;
}

export function useLogistics(): UseLogisticsResult {
    const [summary, setSummary] = useState<LogisticsSummary>({
        fullBins: 0, emptyBins: 0, activeTractors: 0, pendingRequests: 0, binsInTransit: 0,
    });
    const [tractors, setTractors] = useState<Tractor[]>([]);
    const [bins, setBins] = useState<BinInventory[]>([]);
    const [requests, setRequests] = useState<TransportRequest[]>([]);
    const [history, setHistory] = useState<TransportLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const reload = useCallback(async () => {
        setIsLoading(true);
        try {
            const [sum, fleet, binData, reqs, hist] = await Promise.all([
                fetchLogisticsSummary(),
                fetchFleet(),
                fetchBinInventory(),
                fetchTransportRequests(),
                fetchTransportHistory(),
            ]);
            setSummary(sum);
            setTractors(fleet);
            setBins(binData);
            setRequests(reqs);
            setHistory(hist);
        } catch (err) {
            logger.warn('[Logistics] Failed to load logistics data:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        reload();

        // Supabase Realtime — auto-refresh on transport_requests & fleet_vehicles changes
        const channel = supabase
            .channel('logistics-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transport_requests' }, () => {
                Promise.all([fetchTransportRequests(), fetchLogisticsSummary()]).then(([reqs, sum]) => {
                    setRequests(reqs);
                    setSummary(sum);
                });
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'fleet_vehicles' }, () => {
                Promise.all([fetchFleet(), fetchLogisticsSummary()]).then(([fleet, sum]) => {
                    setTractors(fleet);
                    setSummary(sum);
                });
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [reload]);

    return { summary, tractors, bins, requests, history, isLoading, reload };
}
