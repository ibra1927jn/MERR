/**
 * qc.service.ts — Quality Control Service
 * 
 * Handles fruit quality inspections: logging grades, fetching history,
 * and computing grade distributions. Works with the qc_inspections table.
 */
import { logger } from '@/utils/logger';
import { supabase } from './supabase';
import { syncService } from './sync.service';
import type { QCInspectionPayload } from './sync-processors/types';
import { todayNZST, toNZST } from '@/utils/nzst';

export interface QCInspection {
    id: string;
    orchard_id: string;
    picker_id: string;
    picker_name?: string;
    inspector_id: string;
    grade: 'A' | 'B' | 'C' | 'reject';
    notes?: string;
    photo_url?: string;
    created_at: string;
}

export interface GradeDistribution {
    A: number;
    B: number;
    C: number;
    reject: number;
    total: number;
}

export const qcService = {
    /**
     * Log a new quality inspection
     */
    async logInspection(params: {
        orchardId: string;
        pickerId: string;
        inspectorId: string;
        grade: 'A' | 'B' | 'C' | 'reject';
        notes?: string;
        photoUrl?: string;
    }): Promise<QCInspection | null> {
        const payload = {
            orchard_id: params.orchardId,
            picker_id: params.pickerId,
            inspector_id: params.inspectorId,
            grade: params.grade,
            notes: params.notes || null,
            photo_url: params.photoUrl || null,
        };

        const { data, error } = await supabase
            .from('qc_inspections')
            .insert(payload)
            .select()
            .single();

        if (error) {
            // 🔧 L31: Queue offline instead of silently dropping the inspection
            if (error.message?.includes('Failed to fetch') || error.message?.includes('Network') || !navigator.onLine) {
                await syncService.addToQueue('QC_INSPECTION', payload as QCInspectionPayload);
                logger.warn('[QCService] Inspection queued for offline sync');
                return { ...payload, id: 'pending-sync', created_at: new Date().toISOString() } as QCInspection;
            }
            logger.error('[QCService] Failed to log inspection:', error.message);
            return null;
        }

        return data as QCInspection;
    },

    /**
     * Get inspections for a specific orchard and date
     */
    async getInspections(
        orchardId: string,
        date?: string
    ): Promise<QCInspection[]> {
        // 🔧 L31: Use NZST for date boundaries (prevents missing morning inspections)
        const targetDate = date || todayNZST();
        const startOfDayNZ = new Date(`${targetDate}T00:00:00`);
        const endOfDayNZ = new Date(`${targetDate}T23:59:59`);
        const startISO = toNZST(startOfDayNZ);
        const endISO = toNZST(endOfDayNZ);

        const { data, error } = await supabase
            .from('qc_inspections')
            .select('*')
            .eq('orchard_id', orchardId)
            .gte('created_at', startISO)
            .lte('created_at', endISO)
            .order('created_at', { ascending: false });

        if (error) {
            logger.error('[QCService] Failed to fetch inspections:', error.message);
            return [];
        }

        return (data || []) as QCInspection[];
    },

    /**
     * Get grade distribution for today
     */
    async getGradeDistribution(
        orchardId: string,
        date?: string
    ): Promise<GradeDistribution> {
        const inspections = await this.getInspections(orchardId, date);

        const dist: GradeDistribution = { A: 0, B: 0, C: 0, reject: 0, total: 0 };

        for (const insp of inspections) {
            if (insp.grade in dist) {
                dist[insp.grade as keyof Omit<GradeDistribution, 'total'>]++;
            }
            dist.total++;
        }

        return dist;
    },

    /**
     * Get inspections for a specific picker
     */
    async getPickerInspections(
        pickerId: string,
        limit = 20
    ): Promise<QCInspection[]> {
        const { data, error } = await supabase
            .from('qc_inspections')
            .select('*')
            .eq('picker_id', pickerId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            logger.error('[QCService] Failed to fetch picker inspections:', error.message);
            return [];
        }

        return (data || []) as QCInspection[];
    },
};
