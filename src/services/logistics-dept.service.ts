/**
 * Logistics Department Service
 * Handles fleet management, bin tracking, transport requests, and route planning
 */
import { supabase } from '@/services/supabase';

// ── Types ──────────────────────────────────────
export interface Tractor {
    id: string;
    name: string;
    zone: string;
    driver_name: string;
    status: 'active' | 'idle' | 'maintenance' | 'offline';
    load_status: 'empty' | 'partial' | 'full';
    bins_loaded: number;
    max_capacity: number;
    last_update: string;
    fuel_level?: number;
}

export interface BinInventory {
    id: string;
    bin_code: string;
    status: 'empty' | 'filling' | 'full' | 'in_transit' | 'at_warehouse';
    zone: string;
    fill_percentage: number;
    assigned_tractor?: string;
    last_scan: string;
    variety?: string;
}

export interface TransportRequest {
    id: string;
    requested_by: string;
    requester_name: string;
    zone: string;
    bins_count: number;
    priority: 'normal' | 'high' | 'urgent';
    status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
    assigned_tractor?: string;
    created_at: string;
    completed_at?: string;
    notes?: string;
}

export interface TransportLog {
    id: string;
    tractor_id: string;
    tractor_name: string;
    driver_name: string;
    from_zone: string;
    to_zone: string;
    bins_count: number;
    started_at: string;
    completed_at: string;
    duration_minutes: number;
}

// ── Summary Stats ──────────────────────────────
export interface LogisticsSummary {
    fullBins: number;
    emptyBins: number;
    activeTractors: number;
    pendingRequests: number;
    binsInTransit: number;
}

// ── Service Functions ──────────────────────────
export async function fetchLogisticsSummary(orchardId?: string): Promise<LogisticsSummary> {
    try {
        let query = supabase.from('inventory').select('status');
        if (orchardId) query = query.eq('orchard_id', orchardId);

        const { data: bins } = await query;

        const fullBins = bins?.filter(b => b.status === 'full').length || 0;
        const emptyBins = bins?.filter(b => b.status === 'empty').length || 0;

        return {
            fullBins,
            emptyBins,
            activeTractors: 3, // TODO: Replace with real fleet data
            pendingRequests: 2,
            binsInTransit: Math.floor(fullBins * 0.3),
        };
    } catch (error) {
        console.error('Error fetching logistics summary:', error);
        return { fullBins: 0, emptyBins: 0, activeTractors: 0, pendingRequests: 0, binsInTransit: 0 };
    }
}

export async function fetchFleet(orchardId?: string): Promise<Tractor[]> {
    // TODO: Replace with real fleet table when available
    void orchardId;
    const zones = ['A1', 'A2', 'A3', 'B1', 'B2', 'C1'];
    const drivers = ['Tom H.', 'Sarah K.', 'Mike R.', 'Ana P.', 'James L.'];
    const statuses: Tractor['status'][] = ['active', 'active', 'active', 'idle', 'maintenance'];

    return Array.from({ length: 5 }, (_, i) => ({
        id: `tractor-${i + 1}`,
        name: `T-${String(i + 1).padStart(3, '0')}`,
        zone: zones[i % zones.length],
        driver_name: drivers[i],
        status: statuses[i],
        load_status: (['empty', 'partial', 'full'] as const)[Math.floor(Math.random() * 3)],
        bins_loaded: Math.floor(Math.random() * 8),
        max_capacity: 8,
        last_update: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        fuel_level: Math.floor(Math.random() * 60) + 40,
    }));
}

export async function fetchBinInventory(orchardId?: string): Promise<BinInventory[]> {
    try {
        let query = supabase.from('inventory').select('*').order('created_at', { ascending: false }).limit(50);
        if (orchardId) query = query.eq('orchard_id', orchardId);

        const { data, error } = await query;
        if (error) throw error;

        return (data || []).map(bin => ({
            id: bin.id,
            bin_code: bin.bin_code || bin.id.slice(0, 6),
            status: bin.status || 'empty',
            zone: bin.zone || 'A1',
            fill_percentage: bin.fill_percentage || 0,
            assigned_tractor: bin.assigned_tractor,
            last_scan: bin.updated_at || bin.created_at || new Date().toISOString(),
            variety: bin.variety,
        }));
    } catch (error) {
        console.error('Error fetching bin inventory:', error);
        return [];
    }
}

export async function fetchTransportRequests(orchardId?: string): Promise<TransportRequest[]> {
    // TODO: Replace with real transport_requests table
    void orchardId;
    return [
        {
            id: 'req-1',
            requested_by: 'user-1',
            requester_name: 'Team Lead A',
            zone: 'A2',
            bins_count: 4,
            priority: 'high',
            status: 'pending',
            created_at: new Date(Date.now() - 15 * 60000).toISOString(),
            notes: 'Full bins blocking row 12',
        },
        {
            id: 'req-2',
            requested_by: 'user-2',
            requester_name: 'Team Lead B',
            zone: 'B1',
            bins_count: 2,
            priority: 'normal',
            status: 'assigned',
            assigned_tractor: 'T-002',
            created_at: new Date(Date.now() - 45 * 60000).toISOString(),
        },
    ];
}

export async function fetchTransportHistory(orchardId?: string): Promise<TransportLog[]> {
    void orchardId;
    return Array.from({ length: 10 }, (_, i) => ({
        id: `log-${i + 1}`,
        tractor_id: `tractor-${(i % 5) + 1}`,
        tractor_name: `T-${String((i % 5) + 1).padStart(3, '0')}`,
        driver_name: ['Tom H.', 'Sarah K.', 'Mike R.', 'Ana P.', 'James L.'][i % 5],
        from_zone: ['A1', 'A2', 'B1', 'B2', 'C1'][i % 5],
        to_zone: 'Warehouse',
        bins_count: Math.floor(Math.random() * 6) + 2,
        started_at: new Date(Date.now() - (i + 1) * 3600000).toISOString(),
        completed_at: new Date(Date.now() - i * 3600000).toISOString(),
        duration_minutes: Math.floor(Math.random() * 20) + 10,
    }));
}

export async function createTransportRequest(
    request: Omit<TransportRequest, 'id' | 'status' | 'created_at'>
): Promise<TransportRequest> {
    // TODO: Insert into real transport_requests table
    return {
        ...request,
        id: `req-${Date.now()}`,
        status: 'pending',
        created_at: new Date().toISOString(),
    };
}
