/**
 * nz-tax-rates — registry versionado + selección por fecha.
 */
import { describe, it, expect } from 'vitest';
import {
    NZ_TAX_YEARS,
    getTaxYearConfig,
    getCurrentTaxYear,
} from './nz-tax-rates';

describe('NZ_TAX_YEARS registry', () => {
    it('contiene al menos 3 años fiscales', () => {
        expect(NZ_TAX_YEARS.length).toBeGreaterThanOrEqual(3);
    });
    it('ordenados descendentemente (el más reciente primero)', () => {
        for (let i = 0; i < NZ_TAX_YEARS.length - 1; i++) {
            expect(NZ_TAX_YEARS[i].effectiveFrom > NZ_TAX_YEARS[i + 1].effectiveFrom).toBe(true);
        }
    });
    it('cada config tiene taxYear, effectiveFrom, effectiveTo', () => {
        NZ_TAX_YEARS.forEach(c => {
            expect(c.taxYear).toMatch(/^\d{4}-\d{4}$/);
            expect(c.effectiveFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            expect(c.effectiveTo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });
    });
    it('payeBracketsWeekly derivado = payeBrackets/52 (skip Infinity)', () => {
        const tyr = NZ_TAX_YEARS[0];
        tyr.payeBracketsWeekly.forEach((b, i) => {
            if (!Number.isFinite(tyr.payeBrackets[i].upTo)) return;
            const expected = tyr.payeBrackets[i].upTo / 52;
            expect(Math.abs(b.upTo - expected)).toBeLessThan(0.01);
        });
    });
    it('minimumWageHourly >= 23 (legal NZ 2025+)', () => {
        NZ_TAX_YEARS.forEach(c => {
            expect(c.minimumWageHourly).toBeGreaterThanOrEqual(23);
        });
    });
    it('accEarnerLevyRate = accEarnerLevyPer100/100', () => {
        NZ_TAX_YEARS.forEach(c => {
            expect(Math.abs(c.accEarnerLevyRate - c.accEarnerLevyPer100 / 100)).toBeLessThan(1e-6);
        });
    });
    it('kiwisaverEmployerMin es 0.03 o superior', () => {
        NZ_TAX_YEARS.forEach(c => {
            expect(c.kiwisaverEmployerMin).toBeGreaterThanOrEqual(0.03);
        });
    });
    it('casualHolidayPayRate 0.08 (NZ 8%)', () => {
        NZ_TAX_YEARS.forEach(c => {
            expect(c.casualHolidayPayRate).toBe(0.08);
        });
    });
    it('annualLeaveWeeks = 4 (Holidays Act)', () => {
        NZ_TAX_YEARS.forEach(c => {
            expect(c.annualLeaveWeeks).toBe(4);
        });
    });
});

describe('getTaxYearConfig', () => {
    it('fecha dentro del año 2025-2026 → esa config', () => {
        const cfg = getTaxYearConfig(new Date('2025-06-01'));
        expect(cfg.taxYear).toBe('2025-2026');
    });
    it('fecha antes del primer año conocido → fallback más reciente', () => {
        const cfg = getTaxYearConfig(new Date('2020-01-01'));
        expect(cfg).toBe(NZ_TAX_YEARS[0]);
    });
    it('fecha futura → fallback más reciente', () => {
        const cfg = getTaxYearConfig(new Date('2099-12-31'));
        expect(cfg).toBe(NZ_TAX_YEARS[0]);
    });
    it('sin argumento usa fecha actual', () => {
        const cfg = getTaxYearConfig();
        expect(cfg.taxYear).toBeDefined();
    });
    it('boundary inclusive (effectiveFrom)', () => {
        const y2025 = NZ_TAX_YEARS.find(c => c.taxYear === '2025-2026')!;
        const cfg = getTaxYearConfig(new Date(y2025.effectiveFrom));
        expect(cfg.taxYear).toBe('2025-2026');
    });
    it('boundary inclusive (effectiveTo)', () => {
        const y2025 = NZ_TAX_YEARS.find(c => c.taxYear === '2025-2026')!;
        const cfg = getTaxYearConfig(new Date(y2025.effectiveTo));
        expect(cfg.taxYear).toBe('2025-2026');
    });
});

describe('getCurrentTaxYear', () => {
    it('retorna un NZTaxYearConfig válido', () => {
        const cfg = getCurrentTaxYear();
        expect(cfg.taxYear).toBeDefined();
        expect(cfg.minimumWageHourly).toBeGreaterThan(0);
    });
    it('cacheado: dos llamadas consecutivas === mismo objeto', () => {
        const a = getCurrentTaxYear();
        const b = getCurrentTaxYear();
        expect(a).toBe(b);
    });
});
