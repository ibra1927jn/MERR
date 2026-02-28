/**
 * Fraud Detection Service — Intelligent Orchard-Aware Anomaly Engine
 * 
 * Three core principles to avoid false positives:
 * 
 * 1. ELAPSED TIME VELOCITY — Don't flag burst scans. When a tractor runner
 *    collects accumulated buckets, they scan 5-6 in seconds. Instead, measure
 *    buckets_produced / elapsed_time_since_last_collection. If Juan worked
 *    2 hours and runner scans 6 buckets → 3/hr = normal ✅
 *    If 15 min later runner scans 5 MORE → impossible rate → 🚨
 * 
 * 2. PEER COMPARISON — Don't use a fixed threshold. Compare each picker to
 *    peers in the SAME row/block. If everyone is fast → great tree, no alert.
 *    If ONLY one person is 3× faster than neighbors → suspicious 🚨
 * 
 * 3. GRACE PERIOD — First 90 minutes of shift = warmup. Workers are setting
 *    up ladders, fruit is cold, tractors aren't running yet. No velocity
 *    alerts during this window — system observes silently to calibrate.
 */

export type AnomalyType =
    | 'impossible_velocity'    // Buckets ÷ elapsed time = physically impossible
    | 'peer_outlier'           // 3× faster than peers in SAME row — only this person
    | 'off_hours'              // Scan outside shift window (before 6am / after 7pm)
    | 'duplicate_proximity'    // Same bin scanned by 2 pickers within 2 minutes
    | 'post_collection_spike'; // New buckets appearing impossibly fast AFTER runner pickup

export interface Anomaly {
    id: string;
    type: AnomalyType;
    severity: 'low' | 'medium' | 'high';
    pickerId: string;
    pickerName: string;
    detail: string;
    timestamp: string;
    evidence: Record<string, unknown>;
    /** The smart rule that generated this anomaly */
    rule: 'elapsed_velocity' | 'peer_comparison' | 'grace_period_exempt' | 'off_hours' | 'duplicate';
}

/** Configuration for the detection engine */
export interface DetectionConfig {
    /** Minutes at start of shift where velocity alerts are suppressed */
    gracePeriodMinutes: number;
    /** Multiplier vs peer average that triggers peer_outlier (e.g. 3.0 = 300%) */
    peerOutlierThreshold: number;
    /** Max buckets/hr physically possible for single picker */
    maxPhysicalRate: number;
    /** Minutes after runner collection where new buckets trigger spike check */
    postCollectionWindowMinutes: number;
    /** Shift start hour (24h format) */
    shiftStartHour: number;
    /** Shift end hour (24h format) */
    shiftEndHour: number;
}

const DEFAULT_CONFIG: DetectionConfig = {
    gracePeriodMinutes: 90,
    peerOutlierThreshold: 3.0,
    maxPhysicalRate: 8,        // Cherry/kiwi: ~6-8 buckets/hr max for elite picker
    postCollectionWindowMinutes: 20,
    shiftStartHour: 6,
    shiftEndHour: 19,
};

export const fraudDetectionService = {
    config: { ...DEFAULT_CONFIG },

    /**
     * Analyze bucket records using smart rules.
     * In production, this processes real bucket_records + crew assignments.
     */
    analyzeRecords: (_bucketRecords: unknown[], _crew: unknown[]): Anomaly[] => {
        // TODO: Wire to real Supabase bucket_records table
        // Will implement: elapsed_velocity check, peer row comparison, grace period filter
        return [];
    },

    /**
     * Get mock anomalies that demonstrate the SMART detection logic.
     * Each anomaly shows why it passed the intelligent filters.
     */
    getMockAnomalies: (): Anomaly[] => {
        const now = new Date();
        const shiftStart = new Date(now);
        shiftStart.setHours(6, 0, 0, 0);

        return [
            // ── Rule 1: Elapsed Velocity — POST-COLLECTION SPIKE ──
            // Runner collected Juan's 6 buckets at 10:00 AM.
            // 15 minutes later, runner finds 5 MORE buckets from Juan.
            // 5 buckets in 15 min = 20/hr → physically impossible.
            {
                id: 'anm-001',
                type: 'post_collection_spike',
                severity: 'high',
                pickerId: 'p-1',
                pickerName: 'Sione Tupou',
                detail: '5 buckets appeared 15 min after runner collected all his stock. Rate: 20/hr (max physical: 8/hr). Possible buddy punching.',
                timestamp: new Date(now.getTime() - 15 * 60000).toISOString(),
                evidence: {
                    bucketsAfterPickup: 5,
                    minutesSinceCollection: 15,
                    impliedRate: 20,
                    maxPhysicalRate: 8,
                    lastCollectionTime: new Date(now.getTime() - 30 * 60000).toISOString(),
                },
                rule: 'elapsed_velocity',
            },

            // ── Rule 1: Elapsed Velocity — NORMAL (NOT flagged) ──
            // This would NOT appear because it's legitimate:
            // Runner scans 6 buckets at 10:00 AM after 2 hours → 3/hr ✅

            // ── Rule 2: Peer Comparison — SOLO OUTLIER ──
            // Row 7: María 3.2/hr, Pedro 2.8/hr, Ana 3.0/hr, John 12.5/hr
            // John is 4× the row average — tree isn't magic just for him.
            {
                id: 'anm-002',
                type: 'peer_outlier',
                severity: 'high',
                pickerId: 'p-3',
                pickerName: 'John Doe',
                detail: '12.5 bins/hr while row mates average 3.0/hr (4.2× faster). Same trees, same conditions — only he is racing.',
                timestamp: new Date(now.getTime() - 120 * 60000).toISOString(),
                evidence: {
                    pickerRate: 12.5,
                    rowAverage: 3.0,
                    rowPeers: ['María López (3.2)', 'Pedro Reyes (2.8)', 'Ana Tonga (3.0)'],
                    multiplier: 4.2,
                    rowId: 'Row 7',
                    blockName: 'Block C',
                },
                rule: 'peer_comparison',
            },

            // ── Rule 3: Off-Hours ──
            // Scan at 4:15 AM. No grace period applies — this is before shift.
            {
                id: 'anm-003',
                type: 'off_hours',
                severity: 'medium',
                pickerId: 'p-2',
                pickerName: 'Maria Garcia',
                detail: 'Scan at 04:15 AM — 1h 45min before shift start (06:00). Equipment may have been used without authorization.',
                timestamp: new Date(new Date().setHours(4, 15, 0)).toISOString(),
                evidence: {
                    scanTime: '04:15 AM',
                    shiftStart: '06:00 AM',
                    minutesBeforeShift: 105,
                },
                rule: 'off_hours',
            },

            // ── Rule 2: Peer Comparison — DUPLICATE PROXIMITY ──
            // Same bin ID scanned by 2 different pickers < 2 min apart.
            {
                id: 'anm-004',
                type: 'duplicate_proximity',
                severity: 'medium',
                pickerId: 'p-4',
                pickerName: 'David Smith',
                detail: 'Scanned bin #B-2847 — same bin was already scanned by Sione Tupou 45s earlier. Possible tag sharing.',
                timestamp: new Date(now.getTime() - 45 * 60000).toISOString(),
                evidence: {
                    binId: 'B-2847',
                    conflictPicker: 'Sione Tupou',
                    timeDiffSeconds: 45,
                    rowId: 'Row 12',
                },
                rule: 'duplicate',
            },

            // ── Rule 1: Impossible Velocity ──
            // Ana started work at 8 AM. First collection at 8:20 (20 min).
            // Runner found 7 buckets. 7 ÷ 0.33hr = 21/hr → impossible ramp.
            {
                id: 'anm-005',
                type: 'impossible_velocity',
                severity: 'high',
                pickerId: 'p-5',
                pickerName: 'Ana Tonga',
                detail: '7 buckets in first 20 min of work (21/hr). Grace period had not expired — flagged as impossible velocity regardless of warmup.',
                timestamp: new Date(now.getTime() - 60 * 60000).toISOString(),
                evidence: {
                    buckets: 7,
                    minutesWorked: 20,
                    impliedRate: 21,
                    maxPhysicalRate: 8,
                    shiftStarted: new Date(now.getTime() - 80 * 60000).toISOString(),
                    note: 'Grace period suppresses normal velocity alerts, but impossible rates (>2.5× physical max) always trigger.',
                },
                rule: 'elapsed_velocity',
            },

            // ── Rule 2: Peer Comparison — LOW severity (borderline) ──
            // Liam is 2.5× faster than row — just under the 3× threshold.
            // System flags as LOW for manager awareness, not blocking.
            {
                id: 'anm-006',
                type: 'peer_outlier',
                severity: 'low',
                pickerId: 'p-6',
                pickerName: 'Liam Parker',
                detail: '7.5 bins/hr vs row average 3.1/hr (2.4× — below threshold). Could be a skilful picker or favorable tree position. Monitoring.',
                timestamp: new Date(now.getTime() - 180 * 60000).toISOString(),
                evidence: {
                    pickerRate: 7.5,
                    rowAverage: 3.1,
                    multiplier: 2.4,
                    rowId: 'Row 3',
                    blockName: 'Block A',
                    status: 'monitoring',
                },
                rule: 'peer_comparison',
            },
        ];
    },

    /**
     * Explains to the manager WHY a burst of scans is NOT fraud.
     * Used to build trust in the system by showing what it dismissed.
     */
    getDismissedExamples: (): { scenario: string; reason: string; rule: string }[] => [
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
    ],
};
