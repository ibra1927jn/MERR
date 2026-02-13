import { bucketLedgerService } from './bucket-ledger.service';
import { simpleMessagingService } from './simple-messaging.service';
import { attendanceService } from './attendance.service';
import { userService } from './user.service';
import { conflictService } from './conflict.service';
import { supabase } from './supabase';
import { toNZST, nowNZST } from '@/utils/nzst';
import { logger } from '@/utils/logger';

// Payload types for different sync operations
type ScanPayload = {
    picker_id: string;
    orchard_id: string;
    quality_grade: 'A' | 'B' | 'C' | 'reject';
    timestamp: string;
    row_number?: number;
};

type MessagePayload = {
    channel_type: 'direct' | 'group' | 'team';
    recipient_id: string;
    sender_id: string;
    content: string;
    timestamp: string;
    priority?: string;
};

type AttendancePayload = {
    picker_id: string;
    orchard_id: string;
    check_in_time?: string;
    check_out_time?: string;
};

// Phase 2: Offline-first payloads for HR, Logistics, Payroll
// CONFLICT RESOLUTION: Last-write-wins for all types below.
// This is a deliberate architectural decision for current scale.
// The updated_at column on DB tables allows future optimistic-locking.
type ContractPayload = {
    action: 'create' | 'update';
    contractId?: string;
    employee_id?: string;
    orchard_id?: string;
    type?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    hourly_rate?: number;
    notes?: string;
};

type TransportPayload = {
    action: 'create' | 'assign' | 'complete';
    requestId?: string;
    vehicleId?: string;
    assignedBy?: string;
    orchard_id?: string;
    requested_by?: string;
    requester_name?: string;
    zone?: string;
    bins_count?: number;
    priority?: string;
    notes?: string;
};

type TimesheetPayload = {
    action: 'approve' | 'reject';
    attendanceId: string;
    verifiedBy: string;
    notes?: string;
};

type SyncPayload = ScanPayload | MessagePayload | AttendancePayload | ContractPayload | TransportPayload | TimesheetPayload;

interface PendingItem {
    id: string; // UUID (generated client-side)
    type: 'SCAN' | 'MESSAGE' | 'ATTENDANCE' | 'ASSIGNMENT' | 'CONTRACT' | 'TRANSPORT' | 'TIMESHEET';
    payload: SyncPayload;
    timestamp: number;
    retryCount: number;
    updated_at?: string; // ISO timestamp for conflict detection
}

const STORAGE_KEY = 'harvest_sync_queue';
const LAST_SYNC_KEY = 'harvest_last_sync';

export type { PendingItem };

export const syncService = {

    // 1. Add to Queue (Persist immediately)
    addToQueue(type: 'SCAN' | 'MESSAGE' | 'ATTENDANCE' | 'CONTRACT' | 'TRANSPORT' | 'TIMESHEET', payload: SyncPayload) {
        const queue = this.getQueue();
        const newItem: PendingItem = {
            id: crypto.randomUUID(),
            type,
            payload,
            timestamp: Date.now(),
            retryCount: 0
        };

        queue.push(newItem);
        this.saveQueue(queue);

        // Try to sync immediately if online
        if (navigator.onLine) {
            this.processQueue();
        }

        return newItem.id;
    },

    // 2. Get Queue
    getQueue(): PendingItem[] {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error("SyncService: Failed to parse queue", e);
            return [];
        }
    },

    // 3. Save Queue
    saveQueue(queue: PendingItem[]) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    },

    // 4. Process Queue (The "Background" Worker)
    async processQueue() {
        if (!navigator.onLine) return;

        const queue = this.getQueue();
        if (queue.length === 0) return;

        const remainingQueue: PendingItem[] = [];

        for (const item of queue) {
            try {
                switch (item.type) {
                    case 'SCAN':
                        await bucketLedgerService.recordBucket({
                            ...item.payload,
                            scanned_at: toNZST(new Date(item.timestamp)) // Preserve original time in NZST
                        });
                        break;

                    case 'ATTENDANCE':
                        // Check-in picker to daily attendance
                        await attendanceService.checkInPicker(
                            item.payload.pickerId,
                            item.payload.orchardId,
                            item.payload.verifiedBy
                        );
                        break;

                    case 'ASSIGNMENT':
                        // Assign user to orchard
                        await userService.assignUserToOrchard(
                            item.payload.userId,
                            item.payload.orchardId
                        );
                        break;

                    case 'MESSAGE':
                        // Send message via messaging service
                        await simpleMessagingService.sendMessage(
                            item.payload.receiverId,
                            item.payload.content,
                            item.payload.type || 'direct'
                        );
                        break;

                    case 'CONTRACT':
                        await this.processContract(item.payload as ContractPayload);
                        break;

                    case 'TRANSPORT':
                        await this.processTransport(item.payload as TransportPayload);
                        break;

                    case 'TIMESHEET':
                        await this.processTimesheet(item.payload as TimesheetPayload);
                        break;

                    default:
                        logger.warn(`[SyncService] Unknown item type: ${item.type}`);
                        // Remove unknown items to avoid queue blockage
                        break;
                }

                // If we reach here, sync was successful

            } catch (e) {
                const errorCategory = this.categorizeError(e);
                logger.error(`[SyncService] Failed to sync item ${item.id} (${errorCategory})`, e);
                item.retryCount++;

                // Smart retry based on error category
                const maxRetries = errorCategory === 'validation' ? 5 : 50;
                if (item.retryCount < maxRetries) {
                    remainingQueue.push(item);
                } else {
                    logger.error(`[SyncService] Giving up on item ${item.id} after ${item.retryCount} retries (${errorCategory}).`);
                    // Log to conflict service as a dead-letter record
                    conflictService.detect(
                        item.type.toLowerCase(),
                        item.id,
                        toNZST(new Date(item.timestamp)),
                        nowNZST(),
                        item.payload as Record<string, unknown>,
                        { error: 'max_retries_exceeded', category: errorCategory, retryCount: item.retryCount }
                    );
                }
            }
        }

        this.saveQueue(remainingQueue);

        // Track last successful sync time
        if (remainingQueue.length < queue.length) {
            this.setLastSyncTime();
        }
    },

    // 5. Get Pending Count (For UI Badges)
    getPendingCount() {
        return this.getQueue().length;
    },

    // 6. Last Sync Timestamp
    getLastSyncTime(): number | null {
        try {
            const stored = localStorage.getItem(LAST_SYNC_KEY);
            return stored ? Number(stored) : null;
        } catch {
            return null;
        }
    },

    setLastSyncTime() {
        try {
            localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
        } catch {
            // localStorage quota — ignore
        }
    },

    // 7. Get Max Retry Count (for UI display)
    getMaxRetryCount(): number {
        const queue = this.getQueue();
        if (queue.length === 0) return 0;
        return Math.max(...queue.map(item => item.retryCount));
    },

    // ── Phase 2: Queue Processors ──────────────────

    async processContract(payload: ContractPayload) {
        if (payload.action === 'create') {
            const { error } = await supabase.from('contracts').insert({
                employee_id: payload.employee_id!,
                orchard_id: payload.orchard_id!,
                type: payload.type as 'permanent' | 'seasonal' | 'casual',
                start_date: payload.start_date!,
                end_date: payload.end_date || null,
                hourly_rate: payload.hourly_rate || 23.50,
                notes: payload.notes || null,
            });
            if (error) throw error;
        } else if (payload.action === 'update' && payload.contractId) {
            const updates: Record<string, unknown> = {};
            if (payload.status) updates.status = payload.status;
            if (payload.end_date) updates.end_date = payload.end_date;
            if (payload.hourly_rate) updates.hourly_rate = payload.hourly_rate;
            if (payload.notes !== undefined) updates.notes = payload.notes;

            const { error } = await supabase
                .from('contracts')
                .update(updates)
                .eq('id', payload.contractId);
            if (error) throw error;
        }
    },

    async processTransport(payload: TransportPayload) {
        if (payload.action === 'create') {
            const { error } = await supabase.from('transport_requests').insert({
                orchard_id: payload.orchard_id!,
                requested_by: payload.requested_by!,
                requester_name: payload.requester_name || 'Unknown',
                zone: payload.zone!,
                bins_count: payload.bins_count || 1,
                priority: (payload.priority || 'normal') as 'normal' | 'high' | 'urgent',
                notes: payload.notes || null,
            });
            if (error) throw error;
        } else if (payload.action === 'assign' && payload.requestId) {
            // Last-write-wins: if two coordinators assign offline, last sync wins
            const { error } = await supabase
                .from('transport_requests')
                .update({
                    assigned_vehicle: payload.vehicleId,
                    assigned_by: payload.assignedBy,
                    status: 'assigned',
                })
                .eq('id', payload.requestId);
            if (error) throw error;
        } else if (payload.action === 'complete' && payload.requestId) {
            const { error } = await supabase
                .from('transport_requests')
                .update({
                    status: 'completed',
                    completed_at: nowNZST(),
                })
                .eq('id', payload.requestId);
            if (error) throw error;
        }
    },

    async processTimesheet(payload: TimesheetPayload) {
        if (payload.action === 'approve') {
            const { error } = await supabase
                .from('daily_attendance')
                .update({ verified_by: payload.verifiedBy })
                .eq('id', payload.attendanceId);
            if (error) throw error;
        }
    },

    /**
     * 8. Queue Summary — Per-type breakdown with retry stats
     */
    getQueueSummary(): {
        total: number;
        byType: Record<string, number>;
        maxRetry: number;
        oldestTimestamp: number | null;
        lastSync: number | null;
    } {
        const queue = this.getQueue();
        const byType: Record<string, number> = {};

        for (const item of queue) {
            byType[item.type] = (byType[item.type] || 0) + 1;
        }

        return {
            total: queue.length,
            byType,
            maxRetry: queue.length > 0 ? Math.max(...queue.map(i => i.retryCount)) : 0,
            oldestTimestamp: queue.length > 0 ? Math.min(...queue.map(i => i.timestamp)) : null,
            lastSync: this.getLastSyncTime(),
        };
    },

    /**
     * 9. Categorize Error — network | server | validation | unknown
     */
    categorizeError(error: unknown): 'network' | 'server' | 'validation' | 'unknown' {
        if (!navigator.onLine) return 'network';

        if (error instanceof Error) {
            const msg = error.message.toLowerCase();
            if (msg.includes('fetch') || msg.includes('network') || msg.includes('timeout') || msg.includes('aborted')) {
                return 'network';
            }
            if (msg.includes('500') || msg.includes('502') || msg.includes('503') || msg.includes('429')) {
                return 'server';
            }
            if (msg.includes('23') || msg.includes('constraint') || msg.includes('violat') || msg.includes('unique') || msg.includes('foreign key')) {
                return 'validation';
            }
        }

        // Supabase error objects
        if (typeof error === 'object' && error !== null && 'code' in error) {
            const code = String((error as Record<string, unknown>).code);
            if (code.startsWith('23')) return 'validation'; // PostgreSQL constraint errors
            if (code === 'PGRST') return 'server';
        }

        return 'unknown';
    },
};

// Auto-start processing when online
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        syncService.processQueue();
    });

    // Also try on load
    setTimeout(() => syncService.processQueue(), 5000);
}