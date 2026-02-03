/**
 * BUCKET LEDGER SERVICE
 * Append-only bucket counting to prevent sync conflicts
 * 
 * Instead of updating a counter (which can lose data with LWW conflicts),
 * we record each bucket as an individual event. The total is computed
 * by counting events.
 */

import { supabase } from './supabase';
import { generateUUID } from './uuid.service';
import { syncService } from './sync.service';

// Types
export interface BucketEvent {
    id: string;
    picker_id: string;
    recorded_at: string;
    device_id: string;
    orchard_id?: string;
    row_number?: number;
    quality_grade?: 'A' | 'B' | 'C' | 'reject';
    synced: boolean;
}

interface BucketCount {
    total: number;
    byGrade: { A: number; B: number; C: number; reject: number };
}

class BucketLedgerService {
    private deviceId: string;

    constructor() {
        // Generate or retrieve persistent device ID
        this.deviceId = this.getOrCreateDeviceId();
    }

    /**
     * Get or create a persistent device ID for conflict resolution
     */
    private getOrCreateDeviceId(): string {
        const stored = localStorage.getItem('harvestpro_device_id');
        if (stored) return stored;

        const newId = generateUUID();
        localStorage.setItem('harvestpro_device_id', newId);
        return newId;
    }

    /**
     * Record a bucket event (append-only - never updates)
     * This is the primary method for recording buckets
     */
    async recordBucket(
        pickerId: string,
        options?: {
            orchardId?: string;
            rowNumber?: number;
            qualityGrade?: 'A' | 'B' | 'C' | 'reject';
        }
    ): Promise<BucketEvent> {
        const event: BucketEvent = {
            id: generateUUID(),
            picker_id: pickerId,
            recorded_at: new Date().toISOString(),
            device_id: this.deviceId,
            orchard_id: options?.orchardId,
            row_number: options?.rowNumber,
            quality_grade: options?.qualityGrade || 'A',
            synced: false,
        };

        try {
            // Try to insert into DB
            const { error } = await supabase
                .from('bucket_events')
                .insert({
                    id: event.id,
                    picker_id: event.picker_id,
                    recorded_at: event.recorded_at,
                    device_id: event.device_id,
                    orchard_id: event.orchard_id,
                    row_number: event.row_number,
                    quality_grade: event.quality_grade,
                });

            if (error) throw error;
            event.synced = true;
        } catch (e) {
            console.error('[BucketLedger] Error recording bucket:', e);
            // Queue for later sync - spread to create plain Record
            syncService.queueOperation('bucket_events', 'INSERT', { ...event });
        }

        return event;
    }

    /**
     * Get bucket count for a picker on a specific date
     * Counts are computed from the ledger, never stored directly
     */
    async getBucketCount(
        pickerId: string,
        date?: string
    ): Promise<BucketCount> {
        const targetDate = date || new Date().toISOString().split('T')[0];
        const startOfDay = `${targetDate}T00:00:00.000Z`;
        const endOfDay = `${targetDate}T23:59:59.999Z`;

        try {
            const { data, error } = await supabase
                .from('bucket_events')
                .select('quality_grade')
                .eq('picker_id', pickerId)
                .gte('recorded_at', startOfDay)
                .lte('recorded_at', endOfDay);

            if (error) throw error;

            const events = data || [];
            const byGrade = { A: 0, B: 0, C: 0, reject: 0 };

            events.forEach(e => {
                const grade = e.quality_grade as keyof typeof byGrade;
                if (grade in byGrade) byGrade[grade]++;
            });

            return {
                total: events.length,
                byGrade,
            };
        } catch (e) {
            console.error('[BucketLedger] Error getting count:', e);
            return { total: 0, byGrade: { A: 0, B: 0, C: 0, reject: 0 } };
        }
    }

    /**
     * Get bucket counts for all pickers on a date
     */
    async getAllPickerCounts(
        orchardId: string,
        date?: string
    ): Promise<Map<string, BucketCount>> {
        const targetDate = date || new Date().toISOString().split('T')[0];
        const startOfDay = `${targetDate}T00:00:00.000Z`;
        const endOfDay = `${targetDate}T23:59:59.999Z`;

        const counts = new Map<string, BucketCount>();

        try {
            const { data, error } = await supabase
                .from('bucket_events')
                .select('picker_id, quality_grade')
                .eq('orchard_id', orchardId)
                .gte('recorded_at', startOfDay)
                .lte('recorded_at', endOfDay);

            if (error) throw error;

            const events = data || [];

            // Group by picker
            events.forEach(e => {
                let count = counts.get(e.picker_id);
                if (!count) {
                    count = { total: 0, byGrade: { A: 0, B: 0, C: 0, reject: 0 } };
                    counts.set(e.picker_id, count);
                }

                count.total++;
                const grade = e.quality_grade as keyof typeof count.byGrade;
                if (grade in count.byGrade) count.byGrade[grade]++;
            });
        } catch (e) {
            console.error('[BucketLedger] Error getting all counts:', e);
        }

        return counts;
    }

    /**
     * Subscribe to real-time bucket updates for an orchard
     */
    subscribeToUpdates(
        orchardId: string,
        onNewBucket: (event: BucketEvent) => void
    ): () => void {
        const channel = supabase
            .channel(`bucket-events-${orchardId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'bucket_events',
                    filter: `orchard_id=eq.${orchardId}`,
                },
                (payload) => {
                    onNewBucket(payload.new as BucketEvent);
                }
            )
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }
}

export const bucketLedger = new BucketLedgerService();
export default bucketLedger;
