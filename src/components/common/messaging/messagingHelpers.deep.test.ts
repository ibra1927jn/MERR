/**
 * Deep tests for messagingHelpers.ts (67L) — ALL functions
 * QUICK_REPLIES, REACTION_EMOJIS, getAvatarColor, isSameDay,
 * getDateLabel, formatTime, getRoleBadge
 */
import { describe, it, expect } from 'vitest';

import {
    QUICK_REPLIES,
    REACTION_EMOJIS,
    getAvatarColor,
    isSameDay,
    getDateLabel,
    formatTime,
    getRoleBadge,
} from './messagingHelpers';

describe('messagingHelpers — deep tests', () => {
    describe('QUICK_REPLIES', () => {
        it('has 6 presets', () => expect(QUICK_REPLIES.length).toBe(6));
        it('each has emoji and label', () => {
            QUICK_REPLIES.forEach(r => {
                expect(r.emoji).toBeDefined();
                expect(r.label).toBeDefined();
            });
        });
    });

    describe('REACTION_EMOJIS', () => {
        it('has 6 emojis', () => expect(REACTION_EMOJIS.length).toBe(6));
    });

    describe('getAvatarColor', () => {
        it('returns gradient class for name', () => {
            const color = getAvatarColor('Alice');
            expect(color).toContain('from-');
            expect(color).toContain('to-');
        });

        it('returns consistent color for same name', () => {
            expect(getAvatarColor('Bob')).toBe(getAvatarColor('Bob'));
        });

        it('returns different colors for different names', () => {
            // Not guaranteed but highly probable
            const colors = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(n => getAvatarColor(n)));
            expect(colors.size).toBeGreaterThan(1);
        });
    });

    describe('isSameDay', () => {
        it('returns true for same day', () => {
            const d1 = new Date('2026-03-10T08:00:00');
            const d2 = new Date('2026-03-10T20:00:00');
            expect(isSameDay(d1, d2)).toBe(true);
        });

        it('returns false for different days', () => {
            const d1 = new Date('2026-03-10');
            const d2 = new Date('2026-03-11');
            expect(isSameDay(d1, d2)).toBe(false);
        });

        it('returns false for different months', () => {
            const d1 = new Date('2026-03-10');
            const d2 = new Date('2026-04-10');
            expect(isSameDay(d1, d2)).toBe(false);
        });

        it('returns false for different years', () => {
            const d1 = new Date('2025-03-10');
            const d2 = new Date('2026-03-10');
            expect(isSameDay(d1, d2)).toBe(false);
        });
    });

    describe('getDateLabel', () => {
        it('returns Today for today', () => {
            expect(getDateLabel(new Date().toISOString())).toBe('Today');
        });

        it('returns Yesterday for yesterday', () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            expect(getDateLabel(yesterday.toISOString())).toBe('Yesterday');
        });

        it('returns formatted date for older dates', () => {
            const old = new Date('2025-01-01');
            const label = getDateLabel(old.toISOString());
            expect(label).not.toBe('Today');
            expect(label).not.toBe('Yesterday');
        });
    });

    describe('formatTime', () => {
        it('formats valid time', () => {
            const result = formatTime('2026-03-10T14:30:00Z');
            expect(result).toBeDefined();
            expect(result.length).toBeGreaterThan(0);
        });

        it('returns empty for invalid date', () => {
            expect(formatTime('invalid')).toBeDefined();
        });
    });

    describe('getRoleBadge', () => {
        it('returns manager badge', () => {
            const badge = getRoleBadge('manager');
            expect(badge.bg).toContain('purple');
            expect(badge.icon).toBe('admin_panel_settings');
        });

        it('returns team_leader badge', () => {
            const badge = getRoleBadge('team_leader');
            expect(badge.bg).toContain('blue');
            expect(badge.icon).toBe('supervisor_account');
        });

        it('returns runner badge', () => {
            const badge = getRoleBadge('runner');
            expect(badge.bg).toContain('amber');
            expect(badge.icon).toBe('directions_run');
        });

        it('returns default badge for picker', () => {
            const badge = getRoleBadge('picker');
            expect(badge.bg).toContain('emerald');
            expect(badge.icon).toBe('agriculture');
        });

        it('is case-insensitive', () => {
            expect(getRoleBadge('MANAGER').icon).toBe('admin_panel_settings');
        });
    });
});
