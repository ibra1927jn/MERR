/**
 * validation.service — Deep unit tests for all validators and sanitizers
 */
import { describe, it, expect } from 'vitest';
import {
    validationService,
    validateEmail,
    validatePhone,
    validateName,
    validateEmployeeId,
    validateUUID,
    validateHarnessId,
    validateNumberRange,
    validatePositiveInteger,
    sanitizeString,
    stripHtml,
    sanitizeForQuery,
    sanitizePhone,
    sanitizeName,
    validateFields,
    ValidationRules,
} from './validation.service';

// ===== EMAIL VALIDATION =====
describe('validateEmail', () => {
    it('accepts valid email', () => {
        expect(validateEmail('user@example.com').valid).toBe(true);
    });
    it('accepts email with dots', () => {
        expect(validateEmail('first.last@company.co.nz').valid).toBe(true);
    });
    it('rejects empty string', () => {
        expect(validateEmail('').valid).toBe(false);
    });
    it('rejects missing @', () => {
        expect(validateEmail('userexample.com').valid).toBe(false);
    });
    it('rejects missing domain', () => {
        expect(validateEmail('user@').valid).toBe(false);
    });
    it('rejects spaces', () => {
        expect(validateEmail('user @example.com').valid).toBe(false);
    });
});

// ===== PHONE VALIDATION =====
describe('validatePhone', () => {
    it('accepts valid NZ phone', () => {
        expect(validatePhone('+64211234567').valid).toBe(true);
    });
    it('accepts international phone', () => {
        expect(validatePhone('+14155551234').valid).toBe(true);
    });
    it('rejects too short', () => {
        expect(validatePhone('123').valid).toBe(false);
    });
    it('rejects letters', () => {
        expect(validatePhone('abc123').valid).toBe(false);
    });
    it('rejects empty', () => {
        expect(validatePhone('').valid).toBe(false);
    });
});

// ===== NAME VALIDATION =====
describe('validateName', () => {
    it('accepts simple name', () => {
        expect(validateName('John Smith').valid).toBe(true);
    });
    it('accepts hyphenated name', () => {
        expect(validateName("Mary-Jane O'Brien").valid).toBe(true);
    });
    it('rejects empty', () => {
        expect(validateName('').valid).toBe(false);
    });
    it('rejects numeric name', () => {
        expect(validateName('123').valid).toBe(false);
    });
});

// ===== EMPLOYEE ID VALIDATION =====
describe('validateEmployeeId', () => {
    it('accepts valid ID', () => {
        expect(validateEmployeeId('EMP-12345').valid).toBe(true);
    });
    it('accepts PK format', () => {
        expect(validateEmployeeId('PK-001').valid).toBe(true);
    });
    it('rejects empty', () => {
        expect(validateEmployeeId('').valid).toBe(false);
    });
});

// ===== UUID VALIDATION =====
describe('validateUUID', () => {
    it('accepts valid UUID', () => {
        expect(validateUUID('550e8400-e29b-41d4-a716-446655440000').valid).toBe(true);
    });
    it('rejects invalid UUID', () => {
        expect(validateUUID('not-a-uuid').valid).toBe(false);
    });
    it('rejects empty', () => {
        expect(validateUUID('').valid).toBe(false);
    });
});

// ===== HARNESS ID VALIDATION =====
describe('validateHarnessId', () => {
    it('accepts valid harness ID', () => {
        expect(validateHarnessId('AB123').valid).toBe(true);
    });
    it('rejects empty', () => {
        expect(validateHarnessId('').valid).toBe(false);
    });
    it('rejects too long', () => {
        expect(validateHarnessId('A'.repeat(20)).valid).toBe(false);
    });
});

// ===== NUMBER VALIDATION =====
describe('validateNumberRange', () => {
    it('accepts value in range', () => {
        expect(validateNumberRange(5, 1, 10).valid).toBe(true);
    });
    it('accepts boundary min', () => {
        expect(validateNumberRange(1, 1, 10).valid).toBe(true);
    });
    it('accepts boundary max', () => {
        expect(validateNumberRange(10, 1, 10).valid).toBe(true);
    });
    it('rejects below range', () => {
        expect(validateNumberRange(0, 1, 10).valid).toBe(false);
    });
    it('rejects above range', () => {
        expect(validateNumberRange(11, 1, 10).valid).toBe(false);
    });
    it('rejects NaN', () => {
        expect(validateNumberRange(NaN, 1, 10).valid).toBe(false);
    });
});

describe('validatePositiveInteger', () => {
    it('accepts positive integer', () => {
        expect(validatePositiveInteger(5).valid).toBe(true);
    });
    it('rejects negative', () => {
        expect(validatePositiveInteger(-1).valid).toBe(false);
    });
    it('rejects zero', () => {
        const result = validatePositiveInteger(0);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('positive integer');
    });
    it('rejects decimal', () => {
        expect(validatePositiveInteger(1.5).valid).toBe(false);
    });
});

// ===== SANITIZATION =====
describe('sanitizeString', () => {
    it('keeps normal text', () => {
        expect(sanitizeString('Hello World')).toBe('Hello World');
    });
    it('removes script tags', () => {
        const result = sanitizeString('<script>alert("xss")</script>');
        expect(result).not.toContain('<script>');
    });
    it('handles empty string', () => {
        expect(sanitizeString('')).toBe('');
    });
});

describe('stripHtml', () => {
    it('removes HTML tags', () => {
        expect(stripHtml('<p>Hello <b>World</b></p>')).toBe('Hello World');
    });
    it('handles no tags', () => {
        expect(stripHtml('plain text')).toBe('plain text');
    });
});

describe('sanitizeForQuery', () => {
    it('escapes single quotes for defense-in-depth', () => {
        const result = sanitizeForQuery("'; DROP TABLE users; --");
        expect(result).toContain("''");
        // Note: sanitizeForQuery escapes quotes, not strips SQL keywords.
        // Actual SQL injection prevention is done via parameterized queries.
    });
});

describe('sanitizePhone', () => {
    it('strips non-digits except +', () => {
        expect(sanitizePhone('+64 21 123 4567')).toBe('+64211234567');
    });
    it('handles plain digits', () => {
        expect(sanitizePhone('0211234567')).toBe('0211234567');
    });
});

describe('sanitizeName', () => {
    it('trims whitespace', () => {
        expect(sanitizeName('  John Smith  ')).toBe('John Smith');
    });
    it('normalizes internal spaces', () => {
        expect(sanitizeName('John   Smith')).toBe('John Smith');
    });
});

// ===== BATCH VALIDATION =====
describe('validateFields', () => {
    it('returns valid when all fields pass', () => {
        const result = validateFields([
            { field: 'email', value: 'test@example.com', validator: (v) => validateEmail(v as string) },
        ]);
        expect(result.valid).toBe(true);
        expect(Object.keys(result.errors).length).toBe(0);
    });

    it('returns errors for invalid fields', () => {
        const result = validateFields([
            { field: 'email', value: 'invalid', validator: (v) => validateEmail(v as string) },
        ]);
        expect(result.valid).toBe(false);
        expect(result.errors.email).toBeDefined();
    });
});

// ===== VALIDATION RULES =====
describe('ValidationRules', () => {
    it('has EMAIL_REGEX', () => {
        expect(ValidationRules.EMAIL_REGEX).toBeDefined();
    });
    it('has PHONE_REGEX', () => {
        expect(ValidationRules.PHONE_REGEX).toBeDefined();
    });
});

// ===== SERVICE EXPORT =====
describe('validationService', () => {
    it('exports all validators', () => {
        expect(validationService.validateEmail).toBeDefined();
        expect(validationService.validatePhone).toBeDefined();
        expect(validationService.validateName).toBeDefined();
        expect(validationService.sanitizeString).toBeDefined();
        expect(validationService.stripHtml).toBeDefined();
    });
});
