/**
 * Logistics Department Service
 * Handles fleet management, bin tracking, transport requests, and route planning
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
export interface Tractor {
    id: string;
    name: string;
    registration?: string;
    zone: string;
    driver_id?: string;
    driver_name: string;
    status: 'active' | 'idle' | 'maintenance' | 'offline';
    load_status: 'empty' | 'partial' | 'full';
    bins_loaded: number;
    max_capacity: number;
    fuel_level?: number;
    wof_expiry?: string;
    last_update: string;
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
    assigned_by?: string;
    created_at: string;
    completed_at?: string;
    notes?: string;
    updated_at?: string;
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

/**
 * Fetch logistics summary — REAL data from bins, fleet, and transport tables
 */
export async function fetchLogisticsSummary(orchardId?: string): Promise<LogisticsSummary> {
    try {
        // Real bin counts from bins table
        let binsQ = supabase.from('bins').select('status');
        if (orchardId) binsQ = binsQ.eq('orchard_id', orchardId);
        const { data: bins } = await binsQ;

        const fullBins = bins?.filter(b => b.status === 'full').length || 0;
        const emptyBins = bins?.filter(b => b.status === 'empty').length || 0;

        // Real active tractor count
        let fleetQ = supabase.from('fleet_vehicles').select('status');
        if (orchardId) fleetQ = fleetQ.eq('orchard_id', orchardId);
        const { data: fleet } = await fleetQ;
        const activeTractors = fleet?.filter(f => f.status === 'active').length || 0;

        // Real pending requests count
        let reqQ = supabase
            .from('transport_requests')
            .select('status')
            .in('status', ['pending', 'assigned']);
        if (orchardId) reqQ = reqQ.eq('orchard_id', orchardId);
        const { data: requests } = await reqQ;
        const pendingRequests = requests?.length || 0;

        // Bins in transit = bins assigned to active transport
        const binsInTransit = bins?.filter(b => b.status === 'collected').length || 0;

        return {
            fullBins,
            emptyBins,
            activeTractors,
            pendingRequests,
            binsInTransit,
        };
    } catch (error) {
        logger.error('[Logistics] Error fetching summary:', error);
        return { fullBins: 0, emptyBins: 0, activeTractors: 0, pendingRequests: 0, binsInTransit: 0 };
    }
}

/**
 * Fetch fleet vehicles — REAL data from fleet_vehicles table
 */
export async function fetchFleet(orchardId?: string): Promise<Tractor[]> {
    try {
        let query = supabase
            .from('fleet_vehicles')
            .select('*')
            .order('name');
        if (orchardId) query = query.eq('orchard_id', orchardId);

        const { data, error } = await query;
        if (error) throw error;

        return (data || []).map(v => ({
            id: v.id,
            name: v.name,
            registration: v.registration || undefined,
            zone: v.zone || 'Unassigned',
            driver_id: v.driver_id || undefined,
            driver_name: v.driver_name || 'No driver',
            status: v.status,
            load_status: v.load_status,
            bins_loaded: v.bins_loaded,
            max_capacity: v.max_capacity,
            fuel_level: v.fuel_level || undefined,
            wof_expiry: v.wof_expiry || undefined,
            last_update: v.updated_at,
        }));
    } catch (error) {
        logger.error('[Logistics] Error fetching fleet:', error);
        return [];
    }
}

/**
 * Fetch bin inventory — uses existing bins table
 */
export async function fetchBinInventory(orchardId?: string): Promise<BinInventory[]> {
    try {
        let query = supabase
            .from('bins')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
        if (orchardId) query = query.eq('orchard_id', orchardId);

        const { data, error } = await query;
        if (error) throw error;

        return (data || []).map(bin => ({
            id: bin.id,
            bin_code: bin.bin_code || bin.id.slice(0, 6),
            status: mapBinStatus(bin.status),
            zone: (bin.location as { zone?: string })?.zone || 'A1',
            fill_percentage: calculateFillPercentage(bin.status),
            assigned_tractor: undefined,
            last_scan: bin.filled_at || bin.created_at || new Date().toISOString(),
            variety: bin.variety,
        }));
    } catch (error) {
        logger.error('[Logistics] Error fetching bin inventory:', error);
        return [];
    }
}

/** Map DB bin status to logistics display status */
function mapBinStatus(dbStatus: string): BinInventory['status'] {
    switch (dbStatus) {
        case 'empty': return 'empty';
        case 'partial': return 'filling';
        case 'full': return 'full';
        case 'collected': return 'in_transit';
        default: return 'empty';
    }
}

/** Calculate fill percentage from status */
function calculateFillPercentage(status: string): number {
    switch (status) {
        case 'empty': return 0;
        case 'partial': return 50;
        case 'full': return 100;
        case 'collected': return 100;
        default: return 0;
    }
}

/**
 * Fetch active transport requests — REAL data from transport_requests table
 */
export async function fetchTransportRequests(orchardId?: string): Promise<TransportRequest[]> {
    try {
        let query = supabase
            .from('transport_requests')
            .select('*')
            .in('status', ['pending', 'assigned', 'in_progress'])
            .order('created_at', { ascending: false });
        if (orchardId) query = query.eq('orchard_id', orchardId);

        const { data, error } = await query;
        if (error) throw error;

        return (data || []).map(mapTransportRequest);
    } catch (error) {
        logger.error('[Logistics] Error fetching transport requests:', error);
        return [];
    }
}

/**
 * Fetch transport history — completed/cancelled requests from transport_requests
 */
export async function fetchTransportHistory(orchardId?: string): Promise<TransportLog[]> {
    try {
        let query = supabase
            .from('transport_requests')
            .select(`
                id, zone, bins_count, created_at, completed_at, assigned_vehicle,
                requester_name, notes, status
            `)
            .in('status', ['completed', 'cancelled'])
            .order('completed_at', { ascending: false })
            .limit(50);
        if (orchardId) query = query.eq('orchard_id', orchardId);

        const { data, error } = await query;
        if (error) throw error;

        // Get vehicle names
        const vehicleIds = [...new Set((data || []).map(r => r.assigned_vehicle).filter(Boolean))];
        let vehicleNames: Record<string, string> = {};
        if (vehicleIds.length > 0) {
            const { data: vehicles } = await supabase
                .from('fleet_vehicles')
                .select('id, name, driver_name')
                .in('id', vehicleIds as string[]);
            vehicleNames = Object.fromEntries(
                (vehicles || []).map(v => [v.id, v.name])
            );
        }

        return (data || [])
            .filter(r => r.completed_at) // Only completed ones have meaningful history
            .map(r => {
                const started = new Date(r.created_at).getTime();
                const completed = new Date(r.completed_at).getTime();
                return {
                    id: r.id,
                    tractor_id: r.assigned_vehicle || '',
                    tractor_name: vehicleNames[r.assigned_vehicle || ''] || 'Unknown',
                    driver_name: r.requester_name,
                    from_zone: r.zone,
                    to_zone: 'Warehouse',
                    bins_count: r.bins_count,
                    started_at: r.created_at,
                    completed_at: r.completed_at,
                    duration_minutes: Math.round((completed - started) / 60000),
                };
            });
    } catch (error) {
        logger.error('[Logistics] Error fetching transport history:', error);
        return [];
    }
}

/**
 * Create transport request — via syncService queue (offline-first)
 */
export async function createTransportRequest(
    request: Omit<TransportRequest, 'id' | 'status' | 'created_at'>
): Promise<string> {
    return syncService.addToQueue('TRANSPORT', {
        action: 'create',
        ...request,
    });
}

/**
 * Assign vehicle to request — via syncService queue (offline-first)
 * Pass currentUpdatedAt to enable optimistic locking (prevents double-assignment)
 */
export async function assignVehicleToRequest(
    requestId: string,
    vehicleId: string,
    assignedBy: string,
    currentUpdatedAt?: string,
): Promise<string> {
    return syncService.addToQueue('TRANSPORT', {
        action: 'assign',
        requestId,
        vehicleId,
        assignedBy,
    }, currentUpdatedAt);
}

/**
 * Complete a transport request — via syncService queue
 * Pass currentUpdatedAt to enable optimistic locking
 */
export async function completeTransportRequest(requestId: string, currentUpdatedAt?: string): Promise<string> {
    return syncService.addToQueue('TRANSPORT', {
        action: 'complete',
        requestId,
    }, currentUpdatedAt);
}

/** Map DB row to TransportRequest interface */
function mapTransportRequest(row: Record<string, unknown>): TransportRequest {
    return {
        id: row.id as string,
        requested_by: row.requested_by as string,
        requester_name: row.requester_name as string,
        zone: row.zone as string,
        bins_count: row.bins_count as number,
        priority: row.priority as TransportRequest['priority'],
        status: row.status as TransportRequest['status'],
        assigned_tractor: (row.assigned_vehicle as string) || undefined,
        assigned_by: (row.assigned_by as string) || undefined,
        created_at: row.created_at as string,
        completed_at: (row.completed_at as string) || undefined,
        notes: (row.notes as string) || undefined,
        updated_at: (row.updated_at as string) || undefined,
    };
}
