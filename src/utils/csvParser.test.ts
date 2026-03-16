/**
 * csvParser — Unit Tests
 * Tests validateRow, detectDuplicates, parseCSV, generateCSVTemplate
 */
import { describe, it, expect, vi } from 'vitest';
import { parseCSV, generateCSVTemplate, type CSVPickerRow, type ParseResult } from './csvParser';

// Helper to create a File from CSV text
function csvFile(content: string): File {
    return new File([content], 'test.csv', { type: 'text/csv' });
}

describe('csvParser', () => {
    describe('generateCSVTemplate', () => {
        it('returns CSV string with header', () => {
            const tpl = generateCSVTemplate();
            expect(tpl).toContain('Name');
            expect(tpl).toContain('Email');
            expect(tpl).toContain('Phone');
            expect(tpl).toContain('PickerID');
        });

        it('includes sample data rows', () => {
            const tpl = generateCSVTemplate();
            expect(tpl).toContain('John Smith');
            expect(tpl).toContain('P-001');
        });
    });

    describe('parseCSV', () => {
        it('parses valid CSV with standard headers', async () => {
            const csv = 'Name,Email,Phone,PickerID\nAlice,alice@test.com,+64211234567,P-001\nBob,bob@test.com,,P-002\n';
            const result = await parseCSV(csvFile(csv));
            expect(result.totalRows).toBe(2);
            expect(result.valid.length).toBe(2);
            expect(result.errors.length).toBe(0);
        });

        it('handles column aliases (nombre, correo, celular)', async () => {
            const csv = 'Nombre,Correo,Celular\nCarlos,carlos@test.com,+64211234567\n';
            const result = await parseCSV(csvFile(csv));
            expect(result.valid.length).toBe(1);
            expect(result.valid[0].name).toBe('Carlos');
        });

        it('returns validation error for empty name', async () => {
            const csv = 'Name,Email\n,test@test.com\n';
            const result = await parseCSV(csvFile(csv));
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0].field).toBe('name');
        });

        it('returns validation error for short name', async () => {
            const csv = 'Name,Email\nA,test@test.com\n';
            const result = await parseCSV(csvFile(csv));
            expect(result.errors.some(e => e.message.includes('at least 2'))).toBe(true);
        });

        it('validates email format', async () => {
            const csv = 'Name,Email\nAlice,not-an-email\n';
            const result = await parseCSV(csvFile(csv));
            expect(result.errors.some(e => e.field === 'email')).toBe(true);
        });

        it('validates phone format', async () => {
            const csv = 'Name,Phone\nAlice,123\n';
            const result = await parseCSV(csvFile(csv));
            expect(result.errors.some(e => e.field === 'phone')).toBe(true);
        });

        it('detects duplicates against existing pickers', async () => {
            const csv = 'Name,PickerID\nAlice,P-001\nBob,P-002\n';
            const existing = [{ picker_id: 'P-001', name: 'Existing Alice' }];
            const result = await parseCSV(csvFile(csv), existing);
            expect(result.duplicates.length).toBe(1);
            expect(result.duplicates[0].picker_id).toBe('P-001');
        });

        it('detects intra-file duplicates', async () => {
            const csv = 'Name,PickerID\nAlice,P-001\nDuplicate,P-001\n';
            const result = await parseCSV(csvFile(csv));
            expect(result.duplicates.length).toBe(1);
        });

        it('skips empty lines', async () => {
            const csv = 'Name,Email\nAlice,alice@test.com\n\n\nBob,bob@test.com\n';
            const result = await parseCSV(csvFile(csv));
            expect(result.totalRows).toBe(2);
        });
    });
});
