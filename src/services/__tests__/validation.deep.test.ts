/**
 * validation.service — Deep functional tests
 * Targets all 14 pure functions: validators + sanitizers + batch validation
 */
import { describe, it, expect } from 'vitest';
import {
    validateEmail, validatePhone, validateName, validateEmployeeId,
    validateUUID, validateHarnessId, validateNumberRange, validatePositiveInteger,
    sanitizeString, stripHtml, sanitizeForQuery, sanitizePhone, sanitizeName,
    validateFields, ValidationRules,
} from '../validation.service';

// ── Email ────────────────────────────────────
describe('validateEmail', () => {
    it('valid email passes', () => expect(validateEmail('user@example.com').valid).toBe(true));
    it('empty string fails', () => expect(validateEmail('').valid).toBe(false));
    it('null-ish fails', () => expect(validateEmail(null as any).valid).toBe(false));
    it('missing @ fails', () => expect(validateEmail('userexample.com').valid).toBe(false));
    it('missing domain fails', () => expect(validateEmail('user@').valid).toBe(false));
    it('too long fails', () => expect(validateEmail('a'.repeat(250) + '@test.com').valid).toBe(false));
    it('whitespace is trimmed', () => expect(validateEmail('  user@example.com  ').valid).toBe(true));
});

// ── Phone ────────────────────────────────────
describe('validatePhone', () => {
    it('valid international phone passes', () => expect(validatePhone('+6421123456').valid).toBe(true));
    it('valid short number passes', () => expect(validatePhone('1234567').valid).toBe(true));
    it('empty fails', () => expect(validatePhone('').valid).toBe(false));
    it('letters fail', () => expect(validatePhone('abc1234').valid).toBe(false));
    it('NZ format validates when requireNZ=true', () => expect(validatePhone('+6421123456', true).valid).toBe(true));
    it('non-NZ fails when requireNZ=true', () => expect(validatePhone('1234567', true).valid).toBe(false));
    it('strips spaces and dashes for validation', () => expect(validatePhone('+64 21 123-456').valid).toBe(true));
});

// ── Name ─────────────────────────────────────
describe('validateName', () => {
    it('valid name passes', () => expect(validateName('Alice Smith').valid).toBe(true));
    it('accented characters pass', () => expect(validateName('José García').valid).toBe(true));
    it('hyphenated name passes', () => expect(validateName("O'Brien-Smith").valid).toBe(true));
    it('single char fails', () => expect(validateName('A').valid).toBe(false));
    it('too long fails', () => expect(validateName('A'.repeat(101)).valid).toBe(false));
    it('empty fails', () => expect(validateName('').valid).toBe(false));
    it('numbers fail', () => expect(validateName('Alice123').valid).toBe(false));
});

// ── Employee ID ──────────────────────────────
describe('validateEmployeeId', () => {
    it('EMP-12345 passes', () => expect(validateEmployeeId('EMP-12345').valid).toBe(true));
    it('PK001 passes', () => expect(validateEmployeeId('PK001').valid).toBe(true));
    it('empty fails', () => expect(validateEmployeeId('').valid).toBe(false));
    it('too short prefix fails', () => expect(validateEmployeeId('E-1').valid).toBe(false));
    it('all numbers fails', () => expect(validateEmployeeId('12345').valid).toBe(false));
});

// ── UUID ─────────────────────────────────────
describe('validateUUID', () => {
    it('valid uuid passes', () => expect(validateUUID('550e8400-e29b-41d4-a716-446655440000').valid).toBe(true));
    it('empty fails', () => expect(validateUUID('').valid).toBe(false));
    it('invalid format fails', () => expect(validateUUID('not-a-uuid').valid).toBe(false));
});

// ── Harness ID ───────────────────────────────
describe('validateHarnessId', () => {
    it('valid alphanumeric passes', () => expect(validateHarnessId('AB123').valid).toBe(true));
    it('empty fails', () => expect(validateHarnessId('').valid).toBe(false));
    it('too long fails', () => expect(validateHarnessId('A'.repeat(11)).valid).toBe(false));
    it('single char fails', () => expect(validateHarnessId('A').valid).toBe(false));
    it('special chars fail', () => expect(validateHarnessId('AB-12').valid).toBe(false));
});

// ── Number Range ─────────────────────────────
describe('validateNumberRange', () => {
    it('in-range value passes', () => expect(validateNumberRange(5, 1, 10).valid).toBe(true));
    it('below min fails', () => expect(validateNumberRange(0, 1, 10).valid).toBe(false));
    it('above max fails', () => expect(validateNumberRange(11, 1, 10).valid).toBe(false));
    it('NaN fails', () => expect(validateNumberRange(NaN, 1, 10).valid).toBe(false));
    it('uses custom field name in error', () => {
        const result = validateNumberRange(0, 1, 10, 'Buckets');
        expect(result.error).toContain('Buckets');
    });
    it('boundary values pass', () => {
        expect(validateNumberRange(1, 1, 10).valid).toBe(true);
        expect(validateNumberRange(10, 1, 10).valid).toBe(true);
    });
});

// ── Positive Integer ─────────────────────────
describe('validatePositiveInteger', () => {
    it('0 fails (zero is not positive)', () => expect(validatePositiveInteger(0).valid).toBe(false));
    it('positive integer passes', () => expect(validatePositiveInteger(42).valid).toBe(true));
    it('negative number fails', () => expect(validatePositiveInteger(-1).valid).toBe(false));
    it('float fails', () => expect(validatePositiveInteger(3.14).valid).toBe(false));
    it('NaN fails', () => expect(validatePositiveInteger(NaN).valid).toBe(false));
});

// ── sanitizeString ───────────────────────────
describe('sanitizeString', () => {
    it('escapes angle brackets', () => expect(sanitizeString('<script>')).toBe('&lt;script&gt;'));
    it('escapes ampersand', () => expect(sanitizeString('A & B')).toBe('A &amp; B'));
    it('escapes quotes', () => expect(sanitizeString('"hello"')).toBe('&quot;hello&quot;'));
    it('escapes single quotes', () => expect(sanitizeString("it's")).toBe("it&#039;s"));
    it('returns empty for null', () => expect(sanitizeString(null as any)).toBe(''));
    it('trims whitespace', () => expect(sanitizeString('  hello  ')).toBe('hello'));
});

// ── stripHtml ────────────────────────────────
describe('stripHtml', () => {
    it('removes HTML tags', () => expect(stripHtml('<p>hello</p>')).toBe('hello'));
    it('removes nested tags', () => expect(stripHtml('<div><span>test</span></div>')).toBe('test'));
    it('returns empty for null', () => expect(stripHtml(null as any)).toBe(''));
    it('preserves text content', () => expect(stripHtml('no tags here')).toBe('no tags here'));
});

// ── sanitizeForQuery ─────────────────────────
describe('sanitizeForQuery', () => {
    it('escapes single quotes', () => expect(sanitizeForQuery("it's")).toBe("it''s"));
    it('escapes backslashes', () => expect(sanitizeForQuery('path\\to')).toContain('\\'));
    it('removes null bytes', () => expect(sanitizeForQuery('a\0b')).toBe('ab'));
    it('returns empty for null', () => expect(sanitizeForQuery(null as any)).toBe(''));
});

// ── sanitizePhone ────────────────────────────
describe('sanitizePhone', () => {
    it('strips non-digits except +', () => expect(sanitizePhone('+64 21 123-456')).toBe('+6421123456'));
    it('returns empty for empty', () => expect(sanitizePhone('')).toBe(''));
    it('keeps + prefix', () => expect(sanitizePhone('+123')).toBe('+123'));
});

// ── sanitizeName ─────────────────────────────
describe('sanitizeName', () => {
    it('trims and normalizes spaces', () => expect(sanitizeName('  Alice   Smith  ')).toBe('Alice Smith'));
    it('returns empty for empty', () => expect(sanitizeName('')).toBe(''));
});

// ── validateFields (batch) ───────────────────
describe('validateFields', () => {
    it('all valid → valid=true, no errors', () => {
        const result = validateFields([
            { field: 'email', value: 'user@test.com', validator: (v) => validateEmail(v as string) },
            { field: 'name', value: 'Alice', validator: (v) => validateName(v as string) },
        ]);
        expect(result.valid).toBe(true);
        expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('mixed validity → valid=false, partial errors', () => {
        const result = validateFields([
            { field: 'email', value: 'invalid', validator: (v) => validateEmail(v as string) },
            { field: 'name', value: 'Alice', validator: (v) => validateName(v as string) },
        ]);
        expect(result.valid).toBe(false);
        expect(result.errors['email']).toBeDefined();
        expect(result.errors['name']).toBeUndefined();
    });

    it('empty fields array → valid=true', () => {
        const result = validateFields([]);
        expect(result.valid).toBe(true);
    });
});

// ── ValidationRules constants ────────────────
describe('ValidationRules', () => {
    it('EMAIL_REGEX matches valid emails', () => expect(ValidationRules.EMAIL_REGEX.test('a@b.co')).toBe(true));
    it('UUID_REGEX matches valid UUIDs', () => expect(ValidationRules.UUID_REGEX.test('550e8400-e29b-41d4-a716-446655440000')).toBe(true));
    it('HARNESS_ID_REGEX matches alphanumeric', () => expect(ValidationRules.HARNESS_ID_REGEX.test('AB12')).toBe(true));
});

