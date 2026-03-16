/**
 * Deep tests for csvParser.ts — exercises ALL branches
 * validateRow, detectDuplicates, parseCSV, generateCSVTemplate, COLUMN_ALIASES
 */
import { describe, it, expect, vi } from 'vitest';

// Mock papaparse to control CSV parsing behavior
vi.mock('papaparse', () => ({
    default: {
        parse: vi.fn((file: unknown, options: { complete: (r: unknown) => void; error: (e: Error) => void; transformHeader?: (h: string) => string }) => {
            // Simulate different parsing scenarios based on file content
            const mockFile = file as { _mockData?: Record<string, string>[]; _mockError?: boolean };
            if (mockFile?._mockError) {
                options.error(new Error('Parse failed'));
                return;
            }
            const data = mockFile?._mockData || [];
            // Apply transformHeader if provided
            if (options.transformHeader) {
                data.forEach(row => {
                    const transformed: Record<string, string> = {};
                    for (const [key, val] of Object.entries(row)) {
                        transformed[options.transformHeader!(key)] = val;
                    }
                    Object.keys(row).forEach(k => delete row[k]);
                    Object.assign(row, transformed);
                });
            }
            options.complete({ data, errors: [], meta: {} });
        }),
    },
}));

import { parseCSV, generateCSVTemplate } from './csvParser';

describe('csvParser — deep branch tests', () => {
    // ========== generateCSVTemplate ==========
    describe('generateCSVTemplate', () => {
        it('returns CSV string with header and example rows', () => {
            const template = generateCSVTemplate();
            expect(template).toContain('Name,Email,Phone,PickerID');
            expect(template).toContain('John Smith');
            expect(template).toContain('Ana García');
            expect(template).toContain('P-001');
            expect(template).toContain('P-002');
        });

        it('starts with header line', () => {
            const lines = generateCSVTemplate().split('\n');
            expect(lines[0]).toBe('Name,Email,Phone,PickerID');
        });
    });

    // ========== parseCSV — valid rows ==========
    describe('parseCSV — valid rows', () => {
        it('parses valid rows correctly', async () => {
            const file = {
                _mockData: [
                    { name: 'Alice Smith', email: 'alice@test.com', phone: '+64211234567', picker_id: 'P-001' },
                    { name: 'Bob Jones', email: '', phone: '', picker_id: 'P-002' },
                ]
            } as unknown as File;

            const result = await parseCSV(file);
            expect(result.valid.length).toBe(2);
            expect(result.errors.length).toBe(0);
            expect(result.totalRows).toBe(2);
        });
    });

    // ========== parseCSV — validation errors ==========
    describe('parseCSV — validation errors', () => {
        it('rejects rows with empty name', async () => {
            const file = {
                _mockData: [
                    { name: '', email: '', phone: '', picker_id: '' },
                ]
            } as unknown as File;

            const result = await parseCSV(file);
            expect(result.errors.length).toBeGreaterThanOrEqual(1);
            expect(result.errors[0].field).toBe('name');
            expect(result.errors[0].message).toContain('required');
        });

        it('rejects rows with 1-char name', async () => {
            const file = {
                _mockData: [
                    { name: 'A', email: '', phone: '', picker_id: '' },
                ]
            } as unknown as File;

            const result = await parseCSV(file);
            expect(result.errors.length).toBeGreaterThanOrEqual(1);
            expect(result.errors[0].message).toContain('at least 2');
        });

        it('rejects invalid email format', async () => {
            const file = {
                _mockData: [
                    { name: 'Alice', email: 'not-an-email', phone: '', picker_id: '' },
                ]
            } as unknown as File;

            const result = await parseCSV(file);
            expect(result.errors.some(e => e.field === 'email')).toBe(true);
        });

        it('rejects phone with too few digits', async () => {
            const file = {
                _mockData: [
                    { name: 'Alice', email: '', phone: '123', picker_id: '' },
                ]
            } as unknown as File;

            const result = await parseCSV(file);
            expect(result.errors.some(e => e.field === 'phone')).toBe(true);
        });

        it('rejects phone with too many digits', async () => {
            const file = {
                _mockData: [
                    { name: 'Alice', email: '', phone: '1234567890123456', picker_id: '' },
                ]
            } as unknown as File;

            const result = await parseCSV(file);
            expect(result.errors.some(e => e.field === 'phone')).toBe(true);
        });

        it('accepts valid email', async () => {
            const file = {
                _mockData: [
                    { name: 'Alice', email: 'alice@test.com', phone: '', picker_id: '' },
                ]
            } as unknown as File;

            const result = await parseCSV(file);
            expect(result.errors.filter(e => e.field === 'email').length).toBe(0);
        });

        it('accepts valid NZ phone format', async () => {
            const file = {
                _mockData: [
                    { name: 'Alice', email: '', phone: '+64 21 123 4567', picker_id: '' },
                ]
            } as unknown as File;

            const result = await parseCSV(file);
            expect(result.errors.filter(e => e.field === 'phone').length).toBe(0);
        });
    });

    // ========== parseCSV — duplicate detection ==========
    describe('parseCSV — duplicate detection', () => {
        it('detects duplicates against existing pickers', async () => {
            const file = {
                _mockData: [
                    { name: 'Alice', email: '', phone: '', picker_id: 'P-001' },
                ]
            } as unknown as File;

            const existing = [{ picker_id: 'P-001', name: 'Existing Alice' }];
            const result = await parseCSV(file, existing);
            expect(result.duplicates.length).toBe(1);
            expect(result.duplicates[0].existingName).toBe('Existing Alice');
        });

        it('detects intra-CSV duplicates', async () => {
            const file = {
                _mockData: [
                    { name: 'Alice', email: '', phone: '', picker_id: 'P-001' },
                    { name: 'Bob', email: '', phone: '', picker_id: 'P-001' },
                ]
            } as unknown as File;

            const result = await parseCSV(file);
            expect(result.duplicates.length).toBe(1);
            expect(result.duplicates[0].existingName).toContain('duplicate of CSV row');
        });

        it('handles case-insensitive picker_id matching', async () => {
            const file = {
                _mockData: [
                    { name: 'Alice', email: '', phone: '', picker_id: 'p-001' },
                ]
            } as unknown as File;

            const existing = [{ picker_id: 'P-001', name: 'Existing' }];
            const result = await parseCSV(file, existing);
            expect(result.duplicates.length).toBe(1);
        });

        it('removes duplicates from valid list', async () => {
            const file = {
                _mockData: [
                    { name: 'Alice', email: '', phone: '', picker_id: 'P-001' },
                    { name: 'Bob', email: '', phone: '', picker_id: 'P-002' },
                ]
            } as unknown as File;

            const existing = [{ picker_id: 'P-001', name: 'Existing' }];
            const result = await parseCSV(file, existing);
            expect(result.valid.length).toBe(1);
            expect(result.valid[0].name).toBe('Bob');
        });
    });

    // ========== parseCSV — error handling ==========
    describe('parseCSV — error handling', () => {
        it('rejects on parse error', async () => {
            const file = { _mockError: true } as unknown as File;
            await expect(parseCSV(file)).rejects.toThrow('CSV parse error');
        });
    });

    // ========== parseCSV — empty/edge cases ==========
    describe('parseCSV — edge cases', () => {
        it('handles empty CSV', async () => {
            const file = { _mockData: [] } as unknown as File;
            const result = await parseCSV(file);
            expect(result.valid.length).toBe(0);
            expect(result.totalRows).toBe(0);
        });

        it('handles rows with no picker_id (no duplicate check)', async () => {
            const file = {
                _mockData: [
                    { name: 'Alice', email: '', phone: '', picker_id: '' },
                    { name: 'Bob', email: '', phone: '', picker_id: '' },
                ]
            } as unknown as File;

            const result = await parseCSV(file);
            expect(result.duplicates.length).toBe(0);
        });
    });
});
