/**
 * anomaly.constants — tests estructurales de las 5 anomaly types + styles.
 */
import { describe, it, expect } from 'vitest';
import {
    ANOMALY_CONFIG,
    SEVERITY_STYLES,
    FILTER_LABELS,
    RULE_BADGE,
} from './anomaly.constants';

describe('ANOMALY_CONFIG', () => {
    it('cubre las 5 anomaly types', () => {
        const keys = Object.keys(ANOMALY_CONFIG);
        expect(keys).toEqual(
            expect.arrayContaining([
                'impossible_velocity',
                'post_collection_spike',
                'peer_outlier',
                'off_hours',
                'duplicate_proximity',
            ]),
        );
        expect(keys).toHaveLength(5);
    });

    it('cada entry expone icon/color/bg/label no vacíos', () => {
        for (const entry of Object.values(ANOMALY_CONFIG)) {
            expect(entry.icon).toBeTruthy();
            expect(entry.color).toMatch(/^text-/);
            expect(entry.bg).toMatch(/^bg-/);
            expect(entry.label).toBeTruthy();
        }
    });
});

describe('SEVERITY_STYLES', () => {
    it('cubre high/medium/low', () => {
        expect(Object.keys(SEVERITY_STYLES).sort()).toEqual(['high', 'low', 'medium']);
    });

    it('cada valor mezcla bg + text + border', () => {
        for (const style of Object.values(SEVERITY_STYLES)) {
            expect(style).toMatch(/bg-/);
            expect(style).toMatch(/text-/);
            expect(style).toMatch(/border-/);
        }
    });
});

describe('FILTER_LABELS', () => {
    it('incluye "all" + las 5 types', () => {
        const keys = Object.keys(FILTER_LABELS);
        expect(keys).toContain('all');
        for (const t of Object.keys(ANOMALY_CONFIG)) {
            expect(keys).toContain(t);
        }
    });

    it('labels no vacíos', () => {
        for (const v of Object.values(FILTER_LABELS)) {
            expect(v.length).toBeGreaterThan(0);
        }
    });
});

describe('RULE_BADGE', () => {
    it('incluye las 4 rules del schema + grace_period_exempt', () => {
        const keys = Object.keys(RULE_BADGE);
        expect(keys).toEqual(
            expect.arrayContaining([
                'elapsed_velocity',
                'peer_comparison',
                'off_hours',
                'duplicate',
                'grace_period_exempt',
            ]),
        );
    });

    it('cada badge tiene label + color', () => {
        for (const b of Object.values(RULE_BADGE)) {
            expect(b.label.length).toBeGreaterThan(0);
            expect(b.color).toMatch(/text-/);
        }
    });
});
