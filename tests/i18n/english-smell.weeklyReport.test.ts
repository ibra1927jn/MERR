import { describe, it, expect } from 'vitest';
import en from '@/i18n/locales/en';
import es from '@/i18n/locales/es';

const WEEKLY_KEYS = [
    'insights.weekly.title',
    'insights.weekly.export',
    'insights.weekly.team_rankings',
    'insights.weekly.top10',
    'insights.weekly.total_bins',
    'insights.weekly.total_hours',
    'insights.weekly.total_labour',
    'insights.weekly.avg_bins_hr',
    'insights.weekly.cost_per_bin',
    'insights.weekly.velocity_title',
    'insights.weekly.velocity_subtitle',
    'insights.weekly.workforce_title',
    'insights.weekly.workforce_subtitle',
    'insights.weekly.daily_target',
];

describe('WeeklyReport i18n — all keys present', () => {
    WEEKLY_KEYS.forEach(key => {
        it(`EN has key: ${key}`, () => { expect(en[key]).toBeDefined(); });
    });
    WEEKLY_KEYS.forEach(key => {
        it(`ES has key: ${key}`, () => { expect(es[key]).toBeDefined(); });
    });
});
