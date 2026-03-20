/**
 * Deep tests for export-pdf-template.service.ts
 * Covers: escHtml and generatePDFContent
 */
import { describe, it, expect } from 'vitest';
import { escHtml, generatePDFContent } from '../export-pdf-template.service';

describe('escHtml', () => {
    it('escapes ampersand', () => {
        expect(escHtml('A & B')).toBe('A &amp; B');
    });

    it('escapes angle brackets', () => {
        expect(escHtml('<script>')).toBe('&lt;script&gt;');
    });

    it('escapes quotes', () => {
        expect(escHtml('say "hello"')).toBe('say &quot;hello&quot;');
    });

    it('returns safe string unchanged', () => {
        expect(escHtml('Hello World')).toBe('Hello World');
    });
});

describe('generatePDFContent', () => {
    const mockData: any = {
        date: '2026-03-10',
        crew: [
            { employeeId: 'P01', name: 'Alice', buckets: 20, hours: 8, pieceEarnings: 130, minimumTopUp: 55, totalEarnings: 185, status: 'active' },
        ],
        summary: { totalBuckets: 20, totalHours: 8, totalPieceEarnings: 130, totalMinimumTopUp: 55, grandTotal: 185, averageBucketsPerHour: 2.5 },
    };

    it('generates valid HTML document', () => {
        const html = generatePDFContent(mockData);
        expect(html).toContain('<!DOCTYPE html>');
        expect(html).toContain('HarvestPro NZ');
    });

    it('includes crew member data', () => {
        const html = generatePDFContent(mockData);
        expect(html).toContain('P01');
        expect(html).toContain('Alice');
    });

    it('uses custom rates when provided', () => {
        const html = generatePDFContent(mockData, { pieceRate: 7.0, minWage: 25.0 });
        expect(html).toContain('$7');
        expect(html).toContain('$25');
    });

    it('escapes HTML in employee names', () => {
        const xssData = { ...mockData, crew: [{ ...mockData.crew[0], name: '<script>alert("xss")</script>' }] };
        const html = generatePDFContent(xssData);
        expect(html).not.toContain('<script>alert');
        expect(html).toContain('&lt;script&gt;');
    });
});

