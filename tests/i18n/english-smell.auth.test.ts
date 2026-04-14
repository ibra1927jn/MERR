import { describe, it, expect } from 'vitest';
import en from '@/i18n/locales/en';
import es from '@/i18n/locales/es';

const AUTH_KEYS = [
    'auth.welcome',
    'auth.sign_in',
    'auth.sign_in_desc',
    'auth.email',
    'auth.password',
    'auth.forgot_password',
    'auth.twoFactor.title',
    'auth.twoFactor.verify',
    'auth.twoFactor.cancel',
];

describe('Auth i18n — all keys present', () => {
    AUTH_KEYS.forEach(key => {
        it(`EN has key: ${key}`, () => { expect(en[key]).toBeDefined(); });
    });
    AUTH_KEYS.forEach(key => {
        it(`ES has key: ${key}`, () => { expect(es[key]).toBeDefined(); });
    });
});
