/**
 * Fraud Detection Service — Frontend Bridge to Server-Side Engine
 * 
 * SECURITY: Real fraud detection runs server-side in the Edge Function
 * `detect-anomalies`. This service acts as a bridge, calling the backend.
 *
 * Three core principles implemented server-side:
 * 1. ELAPSED TIME VELOCITY — buckets ÷ elapsed time since last collection
 * 2. PEER COMPARISON — compare picker to peers in same row
 * 3. GRACE PERIOD — first 90 min = warmup, only extreme outliers flagged
 */

import { edgeFunctionsRepository } from '@/repositories/edgeFunctions.repository';
import { AnomalyResponseSchema, validateResponseSafe } from '@/schemas/api.schemas';

export type AnomalyType =
    | 'impossible_velocity'
    | 'peer_outlier'
    | 'off_hours'
    | 'duplicate_proximity'
    | 'post_collection_spike';

export interface Anomaly {
    id: string;
    type: AnomalyType;
    severity: 'low' | 'medium' | 'high';
    pickerId: string;
    pickerName: string;
    detail: string;
    timestamp: string;
    evidence: Record<string, unknown>;
    rule: 'elapsed_velocity' | 'peer_comparison' | 'grace_period_exempt' | 'off_hours' | 'duplicate';
}

export interface DetectionConfig {
    gracePeriodMinutes: number;
    peerOutlierThreshold: number;
    maxPhysicalRate: number;
    postCollectionWindowMinutes: number;
    shiftStartHour: number;
    shiftEndHour: number;
}

const DEFAULT_CONFIG: DetectionConfig = {
    gracePeriodMinutes: 90,
    peerOutlierThreshold: 3.0,
    maxPhysicalRate: 8,
    postCollectionWindowMinutes: 20,
    shiftStartHour: 6,
    shiftEndHour: 19,
};

/** Smart dismissal examples — for manager trust-building UI */
export interface DismissedExample {
    scenario: string;
    reason: string;
    rule: string;
}

/** Static dismissal explanations (no mock data, just documentation) */
const DISMISSED_EXAMPLES: DismissedExample[] = [
    {
        scenario: 'Runner scanned 6 buckets for Juan in 10 seconds',
        reason: 'Juan worked 2 hours since last collection. 6 ÷ 2h = 3/hr — perfectly normal rate. Buckets were accumulated under trees.',
        rule: 'elapsed_velocity',
    },
    {
        scenario: 'Entire Row 5 was picking at 2× average speed today',
        reason: 'All 8 pickers in Row 5 showed elevated rates. Trees in that section are heavily loaded this season. Group elevation = good trees, not fraud.',
        rule: 'peer_comparison',
    },
    {
        scenario: 'María had zero scans for first 75 minutes of shift',
        reason: 'Grace period (first 90 min) — workers set up ladders, fruit is cold, tractors haven\'t started yet. Normal warmup. No alert generated.',
        rule: 'grace_period',
    },
];

export const fraudDetectionService = {
    config: { ...DEFAULT_CONFIG },

    /**
     * Fetch anomalies from the backend Edge Function.
     * Returns empty array if offline or Edge Function unavailable.
     */
    fetchAnomalies: async (orchardId: string): Promise<Anomaly[]> => {
        try {
            const { data, error } = await edgeFunctionsRepository.invoke('detect-anomalies', {
                orchard_id: orchardId,
            });

            if (error) {
                console.warn('[FraudDetection] Edge Function error:', error.message);
                return [];
            }

            const validated = validateResponseSafe(
                AnomalyResponseSchema,
                data,
                'detectAnomalies',
                { anomalies: [], stats: { total: 0 } }
            );
            return validated.anomalies;
        } catch (err) {
            console.warn('[FraudDetection] Network error:', err);
            return [];
        }
    },

    /**
     * Get smart dismissal examples for the manager trust-building UI.
     * These are static documentation, not mock data.
     */
    getDismissedExamples: (): DismissedExample[] => DISMISSED_EXAMPLES,
};

