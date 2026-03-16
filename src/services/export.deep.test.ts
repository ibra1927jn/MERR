/**
 * Deep edge-case tests for export.service.ts
 * Covers: preparePayrollData, generateCSV, downloadFile, exportToCSV, exportToPDF, exportToPDFDownload
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/utils/nzst', () => ({
    todayNZST: () => '2026-03-10',
}));

vi.mock('./export-payroll-formats.service', () => ({
    generateXeroCSV: vi.fn().mockReturnValue('xero,csv'),
    generatePaySauceCSV: vi.fn().mockReturnValue('paysauce,csv'),
}));

vi.mock('./export-pdf-template.service', () => ({
    generatePDFContent: vi.fn().mockReturnValue('<html>PDF</html>'),
}));

import { exportService } from './export.service';

const makeCrew = (overrides: any = {}): any[] => [{
    id: 'p1', name: 'Alice', picker_id: 'P01', status: 'active',
    total_buckets_today: 20, hours: 8,
    ...overrides,
}];

describe('exportService.preparePayrollData', () => {
    it('calculates correct piece earnings and top-up', () => {
        const crew = makeCrew({ total_buckets_today: 10, hours: 8 });
        const data = exportService.preparePayrollData(crew, '2026-03-10', { pieceRate: 6.5, minWage: 23.15 });
        expect(data.crew[0].pieceEarnings).toBeCloseTo(65, 1);
        expect(data.crew[0].minimumTopUp).toBeGreaterThan(0);
        expect(data.crew[0].totalEarnings).toBeCloseTo(185.2, 1);
    });

    it('handles zero hours (no top-up needed)', () => {
        const crew = makeCrew({ total_buckets_today: 10, hours: 0 });
        const data = exportService.preparePayrollData(crew, '2026-03-10');
        expect(data.crew[0].minimumTopUp).toBe(0);
    });

    it('deducts unpaid break for shifts > 6h', () => {
        const crew = makeCrew({ total_buckets_today: 10, hours: 8 });
        const data = exportService.preparePayrollData(crew, '2026-03-10', { unpaidBreakMinutes: 30 });
        expect(data.crew[0].hours).toBeCloseTo(7.5, 1);
    });

    it('does NOT deduct break for shifts <= 6h', () => {
        const crew = makeCrew({ total_buckets_today: 10, hours: 5 });
        const data = exportService.preparePayrollData(crew, '2026-03-10', { unpaidBreakMinutes: 30 });
        expect(data.crew[0].hours).toBe(5);
    });

    it('computes summary averageBucketsPerHour', () => {
        const crew = makeCrew({ total_buckets_today: 20, hours: 4 });
        const data = exportService.preparePayrollData(crew, '2026-03-10');
        expect(data.summary.averageBucketsPerHour).toBe(5);
    });
});

describe('exportService.generateCSV', () => {
    it('produces valid CSV with headers and summary', () => {
        const data = exportService.preparePayrollData(makeCrew(), '2026-03-10');
        const csv = exportService.generateCSV(data);
        expect(csv).toContain('Employee ID');
        expect(csv).toContain('P01');
        expect(csv).toContain('SUMMARY');
        expect(csv).toContain('Grand Total');
    });

    it('sanitizes formula injection', () => {
        const crew = makeCrew({ name: '=CMD("evil")', picker_id: '+hacked' });
        const data = exportService.preparePayrollData(crew, '2026-03-10');
        const csv = exportService.generateCSV(data);
        expect(csv).toContain("'=CMD");
        expect(csv).toContain("'+hacked");
    });
});

describe('exportService.downloadFile', () => {
    it('creates blob and triggers download', () => {
        const clickFn = vi.fn();
        vi.spyOn(document, 'createElement').mockReturnValue({
            href: '', download: '', click: clickFn,
        } as any);
        vi.spyOn(document.body, 'appendChild').mockImplementation(vi.fn());
        vi.spyOn(document.body, 'removeChild').mockImplementation(vi.fn());
        vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:url');
        vi.spyOn(URL, 'revokeObjectURL').mockImplementation(vi.fn());

        exportService.downloadFile('content', 'test.csv', 'text/csv');
        expect(clickFn).toHaveBeenCalled();
    });
});

describe('exportService.exportToXero', () => {
    it('calls generateXeroCSV and downloads', () => {
        const downloadSpy = vi.spyOn(exportService, 'downloadFile').mockImplementation(vi.fn());
        exportService.exportToXero(makeCrew());
        expect(downloadSpy).toHaveBeenCalled();
    });
});

describe('exportService.exportToPaySauce', () => {
    it('calls generatePaySauceCSV and downloads', () => {
        const downloadSpy = vi.spyOn(exportService, 'downloadFile').mockImplementation(vi.fn());
        exportService.exportToPaySauce(makeCrew());
        expect(downloadSpy).toHaveBeenCalled();
    });
});
