/**
 * Tests for types.ts — enums, constants, and interfaces
 */
import { describe, it, expect } from 'vitest';
import { Role, MINIMUM_WAGE, PIECE_RATE, MAX_BUCKETS_PER_BIN, DEFAULT_START_TIME } from '../types';

describe('Role enum', () => {
    it('has all expected roles', () => {
        expect(Role.MANAGER).toBe('manager');
        expect(Role.TEAM_LEADER).toBe('team_leader');
        expect(Role.RUNNER).toBe('runner');
        expect(Role.QC_INSPECTOR).toBe('qc_inspector');
        expect(Role.PAYROLL_ADMIN).toBe('payroll_admin');
        expect(Role.ADMIN).toBe('admin');
        expect(Role.HR_ADMIN).toBe('hr_admin');
        expect(Role.LOGISTICS).toBe('logistics');
    });

    it('has 8 roles total', () => {
        const values = Object.values(Role);
        expect(values.length).toBe(8);
    });
});

describe('Constants', () => {
    it('MINIMUM_WAGE is NZ minimum wage', () => {
        expect(MINIMUM_WAGE).toBe(23.95);
    });

    it('PIECE_RATE is per-bucket rate', () => {
        expect(PIECE_RATE).toBe(6.50);
    });

    it('MAX_BUCKETS_PER_BIN is 72', () => {
        expect(MAX_BUCKETS_PER_BIN).toBe(72);
    });

    it('DEFAULT_START_TIME is 07:00', () => {
        expect(DEFAULT_START_TIME).toBe('07:00');
    });
});
