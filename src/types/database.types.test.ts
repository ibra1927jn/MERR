/**
 * Tests for database.types.ts type guard functions + array guards
 */
import { describe, it, expect } from 'vitest';
import {
    isSupabasePicker, isSupabaseUser, isSupabaseChatMessage,
    isSupabaseAttendanceRecord, isSupabasePickerArray, isSupabaseUserArray,
    isSupabaseChatMessageArray,
} from './database.types';

describe('isSupabasePicker', () => {
    it('returns true for valid picker', () => {
        expect(isSupabasePicker({ id: 'p1', name: 'Alice', picker_id: 'P01', created_at: '2026-01-01' })).toBe(true);
    });
    it('returns false for null', () => {
        expect(isSupabasePicker(null)).toBe(false);
    });
    it('returns false for missing picker_id', () => {
        expect(isSupabasePicker({ id: 'p1', name: 'Alice', created_at: '2026-01-01' })).toBe(false);
    });
    it('returns false for missing created_at', () => {
        expect(isSupabasePicker({ id: 'p1', name: 'Alice', picker_id: 'P01' })).toBe(false);
    });
    it('returns false for non-object', () => {
        expect(isSupabasePicker('string')).toBe(false);
        expect(isSupabasePicker(42)).toBe(false);
    });
});

describe('isSupabaseUser', () => {
    it('returns true for valid user', () => {
        expect(isSupabaseUser({ id: 'u1', role: 'manager', created_at: '2026-01-01' })).toBe(true);
    });
    it('returns false for missing role', () => {
        expect(isSupabaseUser({ id: 'u1', created_at: '2026-01-01' })).toBe(false);
    });
    it('returns false for undefined', () => {
        expect(isSupabaseUser(undefined)).toBe(false);
    });
});

describe('isSupabaseChatMessage', () => {
    it('returns true for valid message', () => {
        expect(isSupabaseChatMessage({
            id: 'm1', conversation_id: 'c1', sender_id: 's1', content: 'hello', created_at: '2026-01-01',
        })).toBe(true);
    });
    it('returns false for missing content', () => {
        expect(isSupabaseChatMessage({ id: 'm1', conversation_id: 'c1', sender_id: 's1', created_at: '2026-01-01' })).toBe(false);
    });
    it('returns false for null', () => {
        expect(isSupabaseChatMessage(null)).toBe(false);
    });
});

describe('isSupabaseAttendanceRecord', () => {
    it('returns true for valid record', () => {
        expect(isSupabaseAttendanceRecord({ id: 'a1', picker_id: 'p1', orchard_id: 'o1', created_at: '2026-01-01' })).toBe(true);
    });
    it('returns false for missing orchard_id', () => {
        expect(isSupabaseAttendanceRecord({ id: 'a1', picker_id: 'p1', created_at: '2026-01-01' })).toBe(false);
    });
    it('returns false for non-object', () => {
        expect(isSupabaseAttendanceRecord(123)).toBe(false);
    });
});

describe('isSupabasePickerArray', () => {
    it('returns true for valid array', () => {
        expect(isSupabasePickerArray([{ id: 'p1', name: 'A', picker_id: 'P1', created_at: '2026' }])).toBe(true);
    });
    it('returns true for empty array', () => {
        expect(isSupabasePickerArray([])).toBe(true);
    });
    it('returns false for non-array', () => {
        expect(isSupabasePickerArray('nope')).toBe(false);
    });
    it('returns false if any item invalid', () => {
        expect(isSupabasePickerArray([{ id: 'p1' }])).toBe(false);
    });
});

describe('isSupabaseUserArray', () => {
    it('returns true for valid user array', () => {
        expect(isSupabaseUserArray([{ id: 'u1', role: 'manager', created_at: '2026' }])).toBe(true);
    });
    it('returns false for mixed array', () => {
        expect(isSupabaseUserArray([{ id: 'u1' }])).toBe(false);
    });
});

describe('isSupabaseChatMessageArray', () => {
    it('returns true for valid message array', () => {
        expect(isSupabaseChatMessageArray([
            { id: 'm1', conversation_id: 'c1', sender_id: 's1', content: 'hi', created_at: '2026' },
        ])).toBe(true);
    });
    it('returns false for invalid array', () => {
        expect(isSupabaseChatMessageArray([{}])).toBe(false);
    });
});
