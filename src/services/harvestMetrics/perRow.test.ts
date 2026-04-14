import { describe, it, expect } from 'vitest';
import { binsPerHourForRow } from './perRow';
import { BucketRecord } from '@/types';

/** Genera un BucketRecord mínimo válido para tests */
function makeScan(rowNum: number, minutesOffset: number): BucketRecord {
    const base = new Date('2026-01-01T08:00:00Z').getTime();
    return {
        id: `scan-${rowNum}-${minutesOffset}`,
        timestamp: new Date(base + minutesOffset * 60_000).toISOString(),
        picker_id: 'p1',
        bin_id: 'bin-1',
        scanned_at: new Date(base + minutesOffset * 60_000).toISOString(),
        row_number: rowNum,
    };
}

describe('binsPerHourForRow', () => {
    it('devuelve null con array vacío', () => {
        expect(binsPerHourForRow(1, [])).toBeNull();
    });

    it('devuelve null con 1 escaneo (< MIN_SCANS_FOR_RATE)', () => {
        expect(binsPerHourForRow(1, [makeScan(1, 0)])).toBeNull();
    });

    it('devuelve null con 2 escaneos (< MIN_SCANS_FOR_RATE)', () => {
        expect(binsPerHourForRow(1, [makeScan(1, 0), makeScan(1, 20)])).toBeNull();
    });

    it('devuelve null con 3 escaneos pero ventana < 15 min', () => {
        // 3 scans en 10 min — no supera MIN_MINUTES
        const records = [makeScan(1, 0), makeScan(1, 5), makeScan(1, 10)];
        expect(binsPerHourForRow(1, records)).toBeNull();
    });

    it('calcula correctamente 3 scans en 30 min → 6/hr', () => {
        // 3 scans en 30 min = 3 / 0.5h = 6
        const records = [makeScan(1, 0), makeScan(1, 15), makeScan(1, 30)];
        expect(binsPerHourForRow(1, records)).toBe(6);
    });

    it('calcula correctamente 6 scans en 1 hora → 6/hr', () => {
        const records = [
            makeScan(1, 0),
            makeScan(1, 12),
            makeScan(1, 24),
            makeScan(1, 36),
            makeScan(1, 48),
            makeScan(1, 60),
        ];
        expect(binsPerHourForRow(1, records)).toBe(6);
    });

    it('solo cuenta escaneos de la fila objetivo, ignora otras filas', () => {
        // Fila 1: 3 scans en 30 min → 6/hr
        // Fila 2: 10 scans (no deben contaminaar fila 1)
        const records = [
            makeScan(1, 0),
            makeScan(1, 15),
            makeScan(1, 30),
            ...Array.from({ length: 10 }, (_, i) => makeScan(2, i * 5)),
        ];
        expect(binsPerHourForRow(1, records)).toBe(6);
    });

    it('devuelve null cuando todos los timestamps son idénticos (elapsed = 0)', () => {
        // 3 scans todos al mismo instante → elapsed < MIN_MINUTES
        const records = [makeScan(1, 0), makeScan(1, 0), makeScan(1, 0)];
        expect(binsPerHourForRow(1, records)).toBeNull();
    });
});
