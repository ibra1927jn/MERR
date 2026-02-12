/**
 * bucketSlice - Bucket Scanning & Offline Sync
 * 
 * Manages local bucket state (offline-first), marking as synced,
 * and the bucket scan pipeline.
 */
import { StateCreator } from 'zustand';
import { supabase } from '@/services/supabase';
import { offlineService } from '@/services/offline.service';
import { auditService } from '@/services/audit.service';
import { logger } from '@/utils/logger';
import type { HarvestStoreState, BucketSlice, ScannedBucket } from '../storeTypes';

// Max allowed clock skew for anti-fraud (5 minutes)
const MAX_ALLOWED_SKEW = 5 * 60 * 1000;

// --- Slice Creator ---
export const createBucketSlice: StateCreator<
    HarvestStoreState,
    [],
    [],
    BucketSlice
> = (set, get) => ({
    buckets: [],
    isScanning: false,
    lastScanTime: null,
    bucketRecords: [],

    addBucket: (bucketData) => {
        // 🔴 VALIDATION: Reject if picker is archived
        const picker = get().crew.find(p => p.id === bucketData.picker_id);
        if (picker?.status === 'archived') {
            logger.error(`[Store] Rejected bucket: picker ${bucketData.picker_id} is archived`);
            return;
        }

        // 🔴 VALIDATION: Reject if picker not checked in today (attendance gate)
        if (picker && !picker.checked_in_today) {
            logger.error(`[Store] Rejected bucket: picker ${bucketData.picker_id} not checked in`);
            return;
        }

        // 🔴 VALIDATION: Reject if clock skew > 5 minutes (anti-fraud)
        const clockSkew = get().clockSkew;
        if (Math.abs(clockSkew) > MAX_ALLOWED_SKEW) {
            logger.error(`[Store] Rejected bucket: clock skew ${clockSkew}ms exceeds ${MAX_ALLOWED_SKEW}ms`);
            return;
        }

        const newBucket: ScannedBucket = {
            ...bucketData,
            id: crypto.randomUUID(),
            synced: false,
        };

        // Instant local update
        set(state => ({
            buckets: [newBucket, ...state.buckets],
            lastScanTime: Date.now(),
        }));

        // 🔍 Audit log the scan
        auditService.logAudit(
            'bucket.scanned',
            `Bucket scanned for picker ${bucketData.picker_id}`,
            {
                severity: 'info',
                userId: get().currentUser?.id,
                orchardId: bucketData.orchard_id,
                entityType: 'bucket',
                entityId: newBucket.id,
                details: {
                    quality_grade: bucketData.quality_grade,
                    picker_id: bucketData.picker_id,
                }
            }
        );

        // 📦 Persist to Dexie (offline insurance)
        offlineService.queueBucket({
            id: newBucket.id,
            picker_id: newBucket.picker_id,
            quality_grade: newBucket.quality_grade,
            timestamp: newBucket.timestamp,
            orchard_id: newBucket.orchard_id,
        }).catch(e => logger.error('Failed to save to Dexie:', e));

        // ☁️ Attempt cloud sync
        supabase.from('bucket_records').insert({
            id: newBucket.id,
            picker_id: newBucket.picker_id,
            quality_grade: newBucket.quality_grade,
            scanned_at: newBucket.timestamp,
            orchard_id: newBucket.orchard_id,
        }).then(({ error }) => {
            if (!error) {
                set(state => ({
                    buckets: state.buckets.map(b =>
                        b.id === newBucket.id ? { ...b, synced: true } : b
                    )
                }));
                // Remove from Dexie after successful sync
                offlineService.markAsSynced(newBucket.id)
                    .catch(e => logger.error('Failed to mark synced in Dexie:', e));
            }
        });

        // Recalculate intelligence after adding bucket
        get().recalculateIntelligence();
    },

    markAsSynced: (id) => {
        set(state => ({
            buckets: state.buckets.map(b =>
                b.id === id ? { ...b, synced: true } : b
            )
        }));
        // Also mark in Dexie
        offlineService.markAsSynced(id)
            .catch(e => logger.error('Failed to mark synced in Dexie:', e));
    },

    clearSynced: () => {
        set(state => ({
            buckets: state.buckets.filter(b => !b.synced)
        }));
    },
});
