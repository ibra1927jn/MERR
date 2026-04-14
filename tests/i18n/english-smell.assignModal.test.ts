import { describe, it, expect } from 'vitest';
import en from '@/i18n/locales/en';
import es from '@/i18n/locales/es';

const ASSIGN_MODAL_KEYS = [
    'assignModal.title',
    'assignModal.subtitle',
    'assignModal.team_leader',
    'assignModal.bucket_runner',
    'assignModal.side',
    'assignModal.select_leader',
    'assignModal.select_runner',
    'assignModal.confirm',
    'assignModal.people_on_row_one',
    'assignModal.people_on_row_other',
];

describe('AssignModal i18n — all keys present', () => {
    ASSIGN_MODAL_KEYS.forEach(key => {
        it(`EN has key: ${key}`, () => { expect(en[key]).toBeDefined(); });
    });
    ASSIGN_MODAL_KEYS.forEach(key => {
        it(`ES has key: ${key}`, () => { expect(es[key]).toBeDefined(); });
    });
});
