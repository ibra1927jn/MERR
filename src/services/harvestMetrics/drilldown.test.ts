/**
 * harvestMetrics/drilldown.test.ts
 *
 * Verifica el cómputo por-hora del gráfico de velocidad:
 *   - Filtrado por ventana [slotStart, slotEnd)
 *   - Cálculo de trendVsPrevHour contra la hora anterior
 *   - Resolución de nombres por id UUID y por picker_id corto
 *   - Orden descendente por bins
 */
import { describe, it, expect } from 'vitest';
import { drilldownForHour } from './drilldown';
import type { BucketRecord, Picker } from '@/types';

function makeRecord(overrides: Partial<BucketRecord>): BucketRecord {
    return {
        id: 'rec-x',
        timestamp: '2026-04-18T07:05:00Z',
        picker_id: 'p-uuid-1',
        bin_id: 'bin-x',
        ...overrides,
    };
}

function makePicker(overrides: Partial<Picker>): Picker {
    return {
        id: 'p-uuid-1',
        picker_id: 'P001',
        name: 'Rawiri Ngata',
        avatar: 'RN',
        current_row: 0,
        total_buckets_today: 0,
        hours: 0,
        status: 'active',
        ...overrides,
    };
}

describe('drilldownForHour', () => {
    const slotStart = Date.parse('2026-04-18T07:00:00Z');
    const slotEnd = Date.parse('2026-04-18T08:00:00Z');

    it('returns empty pickers list when no records fall in the slot', () => {
        const result = drilldownForHour([], [], slotStart, slotEnd, '07:00–08:00');
        expect(result.hourLabel).toBe('07:00–08:00');
        expect(result.slotStartMs).toBe(slotStart);
        expect(result.slotEndMs).toBe(slotEnd);
        expect(result.totalBins).toBe(0);
        expect(result.pickers).toEqual([]);
    });

    it('counts only records inside [slotStart, slotEnd)', () => {
        const records = [
            makeRecord({ id: 'r1', picker_id: 'p-uuid-1', scanned_at: '2026-04-18T07:30:00Z' }),
            makeRecord({ id: 'r2', picker_id: 'p-uuid-1', scanned_at: '2026-04-18T06:59:00Z' }),
            makeRecord({ id: 'r3', picker_id: 'p-uuid-1', scanned_at: '2026-04-18T08:00:00Z' }),
        ];
        const crew = [makePicker({})];
        const result = drilldownForHour(records, crew, slotStart, slotEnd, '07:00–08:00');
        // r2 está fuera (antes), r3 exactamente en slotEnd (exclusivo)
        expect(result.totalBins).toBe(1);
        expect(result.pickers).toHaveLength(1);
        expect(result.pickers[0].bins).toBe(1);
    });

    it('falls back to created_at when scanned_at is missing', () => {
        const records = [
            makeRecord({ id: 'r1', picker_id: 'p-uuid-1', scanned_at: undefined, created_at: '2026-04-18T07:15:00Z' }),
        ];
        const result = drilldownForHour(records, [makePicker({})], slotStart, slotEnd, '07:00');
        expect(result.totalBins).toBe(1);
    });

    it('skips records with invalid timestamps', () => {
        const records = [
            makeRecord({ id: 'r1', picker_id: 'p-uuid-1', scanned_at: 'not-a-date', created_at: 'also-bad' }),
        ];
        const result = drilldownForHour(records, [makePicker({})], slotStart, slotEnd, '07:00');
        expect(result.totalBins).toBe(0);
    });

    it('counts records without picker_id in totalBins but excludes them from per-picker rows', () => {
        const records = [
            makeRecord({ id: 'r1', picker_id: '', scanned_at: '2026-04-18T07:30:00Z' }),
            makeRecord({ id: 'r2', picker_id: 'p-uuid-1', scanned_at: '2026-04-18T07:40:00Z' }),
        ];
        const result = drilldownForHour(records, [makePicker({})], slotStart, slotEnd, '07:00');
        expect(result.totalBins).toBe(2);
        expect(result.pickers).toHaveLength(1);
        expect(result.pickers[0].bins).toBe(1);
    });

    it('computes trendVsPrevHour: prev-hour bins subtracted from current-hour bins', () => {
        const records = [
            // 2 en hora anterior (06:00–07:00)
            makeRecord({ id: 'r0', picker_id: 'p-uuid-1', scanned_at: '2026-04-18T06:10:00Z' }),
            makeRecord({ id: 'r1', picker_id: 'p-uuid-1', scanned_at: '2026-04-18T06:50:00Z' }),
            // 5 en hora actual
            makeRecord({ id: 'r2', picker_id: 'p-uuid-1', scanned_at: '2026-04-18T07:05:00Z' }),
            makeRecord({ id: 'r3', picker_id: 'p-uuid-1', scanned_at: '2026-04-18T07:20:00Z' }),
            makeRecord({ id: 'r4', picker_id: 'p-uuid-1', scanned_at: '2026-04-18T07:30:00Z' }),
            makeRecord({ id: 'r5', picker_id: 'p-uuid-1', scanned_at: '2026-04-18T07:45:00Z' }),
            makeRecord({ id: 'r6', picker_id: 'p-uuid-1', scanned_at: '2026-04-18T07:55:00Z' }),
        ];
        const crew = [makePicker({})];
        const result = drilldownForHour(records, crew, slotStart, slotEnd, '07:00');
        expect(result.pickers[0].bins).toBe(5);
        expect(result.pickers[0].prevHourBins).toBe(2);
        expect(result.pickers[0].trendVsPrevHour).toBe(3);
    });

    it('treats missing prev-hour activity as 0 (positive trend)', () => {
        const records = [
            makeRecord({ id: 'r1', picker_id: 'p-uuid-1', scanned_at: '2026-04-18T07:05:00Z' }),
        ];
        const crew = [makePicker({})];
        const result = drilldownForHour(records, crew, slotStart, slotEnd, '07:00');
        expect(result.pickers[0].prevHourBins).toBe(0);
        expect(result.pickers[0].trendVsPrevHour).toBe(1);
    });

    it('resolves picker name by UUID id', () => {
        const records = [makeRecord({ picker_id: 'p-uuid-1', scanned_at: '2026-04-18T07:30:00Z' })];
        const crew = [makePicker({ id: 'p-uuid-1', picker_id: 'P001', name: 'Rawiri' })];
        const result = drilldownForHour(records, crew, slotStart, slotEnd, '07:00');
        expect(result.pickers[0].pickerName).toBe('Rawiri');
    });

    it('resolves picker name by short picker_id fallback', () => {
        const records = [makeRecord({ picker_id: 'P001', scanned_at: '2026-04-18T07:30:00Z' })];
        const crew = [makePicker({ id: 'p-uuid-1', picker_id: 'P001', name: 'Rawiri' })];
        const result = drilldownForHour(records, crew, slotStart, slotEnd, '07:00');
        expect(result.pickers[0].pickerName).toBe('Rawiri');
    });

    it('uses the raw picker_id as display name when unknown to crew', () => {
        const records = [makeRecord({ picker_id: 'ghost-id', scanned_at: '2026-04-18T07:30:00Z' })];
        const result = drilldownForHour(records, [], slotStart, slotEnd, '07:00');
        expect(result.pickers[0].pickerName).toBe('ghost-id');
    });

    it('sorts pickers by bins descending', () => {
        const records = [
            makeRecord({ id: 'a1', picker_id: 'p-low', scanned_at: '2026-04-18T07:10:00Z' }),
            makeRecord({ id: 'b1', picker_id: 'p-hi', scanned_at: '2026-04-18T07:15:00Z' }),
            makeRecord({ id: 'b2', picker_id: 'p-hi', scanned_at: '2026-04-18T07:20:00Z' }),
            makeRecord({ id: 'b3', picker_id: 'p-hi', scanned_at: '2026-04-18T07:25:00Z' }),
            makeRecord({ id: 'c1', picker_id: 'p-mid', scanned_at: '2026-04-18T07:30:00Z' }),
            makeRecord({ id: 'c2', picker_id: 'p-mid', scanned_at: '2026-04-18T07:35:00Z' }),
        ];
        const crew = [
            makePicker({ id: 'p-low', name: 'Low' }),
            makePicker({ id: 'p-mid', name: 'Mid' }),
            makePicker({ id: 'p-hi', name: 'Hi' }),
        ];
        const result = drilldownForHour(records, crew, slotStart, slotEnd, '07:00');
        expect(result.pickers.map(p => p.pickerName)).toEqual(['Hi', 'Mid', 'Low']);
        expect(result.pickers.map(p => p.bins)).toEqual([3, 2, 1]);
    });
});
