/**
 * Tests for types/result.ts — ServiceError, Ok, Err, tryCatch
 */
import { describe, it, expect } from 'vitest';
import { ServiceError, Ok, Err, tryCatch } from './result';

describe('ServiceError', () => {
    it('stores code, message, and cause', () => {
        const cause = new Error('root');
        const err = new ServiceError('TEST_CODE', 'test message', cause);
        expect(err.code).toBe('TEST_CODE');
        expect(err.message).toBe('test message');
        expect(err.cause).toBe(cause);
    });

    it('toString formats correctly', () => {
        const err = new ServiceError('NETWORK', 'timeout');
        expect(err.toString()).toBe('[NETWORK] timeout');
    });

    it('cause is optional', () => {
        const err = new ServiceError('ERR', 'msg');
        expect(err.cause).toBeUndefined();
    });
});

describe('Ok', () => {
    it('returns ok: true with data', () => {
        const result = Ok({ id: 1 });
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.data).toEqual({ id: 1 });
    });

    it('works with primitive types', () => {
        const result = Ok(42);
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.data).toBe(42);
    });
});

describe('Err', () => {
    it('returns ok: false with ServiceError', () => {
        const result = Err('NOT_FOUND', 'Picker not found');
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error.code).toBe('NOT_FOUND');
            expect(result.error.message).toBe('Picker not found');
        }
    });

    it('includes cause when provided', () => {
        const cause = new Error('db');
        const result = Err('DB_ERROR', 'query failed', cause);
        if (!result.ok) expect(result.error.cause).toBe(cause);
    });
});

describe('tryCatch', () => {
    it('returns Ok on success', async () => {
        const result = await tryCatch('TEST', async () => 'hello');
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.data).toBe('hello');
    });

    it('returns Err on thrown Error', async () => {
        const result = await tryCatch('FAIL', async () => {
            throw new Error('oops');
        });
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error.code).toBe('FAIL');
            expect(result.error.message).toBe('oops');
        }
    });

    it('handles non-Error throws', async () => {
        const result = await tryCatch('FAIL', async () => {
            throw 'string error';
        });
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error.message).toBe('Unknown error');
        }
    });
});
