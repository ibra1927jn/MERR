/**
 * Nav Config Tests — All 6 extracted nav config files
 *
 * Validates structure, required fields, and unique IDs for all pages.
 */
import { describe, it, expect } from 'vitest';
import { HR_NAV_ITEMS } from '@/config/navigation/hhrr.nav';
import { LOG_NAV_ITEMS } from '@/config/navigation/logistics.nav';
import { ADMIN_NAV_ITEMS, ADMIN_SUMMARY_CARDS } from '@/config/navigation/admin.nav';
import { QC_NAV_TABS } from '@/config/navigation/qc.nav';
import { RUNNER_NAV_TABS } from '@/config/navigation/runner.nav';
import { TEAM_LEADER_NAV_TABS } from '@/config/navigation/team-leader.nav';

const allConfigs = [
    { name: 'HR_NAV_ITEMS', items: HR_NAV_ITEMS },
    { name: 'LOG_NAV_ITEMS', items: LOG_NAV_ITEMS },
    { name: 'ADMIN_NAV_ITEMS', items: ADMIN_NAV_ITEMS },
    { name: 'QC_NAV_TABS', items: QC_NAV_TABS },
    { name: 'RUNNER_NAV_TABS', items: RUNNER_NAV_TABS },
    { name: 'TEAM_LEADER_NAV_TABS', items: TEAM_LEADER_NAV_TABS },
];

describe('Navigation Configs', () => {
    allConfigs.forEach(({ name, items }) => {
        describe(name, () => {
            it('has at least 3 items', () => {
                expect(items.length).toBeGreaterThanOrEqual(3);
            });

            it('every item has id, label, and icon', () => {
                items.forEach(item => {
                    expect(item.id).toBeTruthy();
                    expect(item.label).toBeTruthy();
                    expect(item.icon).toBeTruthy();
                });
            });

            it('has unique IDs', () => {
                const ids = items.map(i => i.id);
                expect(new Set(ids).size).toBe(ids.length);
            });

            it('has unique labels', () => {
                const labels = items.map(i => i.label);
                expect(new Set(labels).size).toBe(labels.length);
            });
        });
    });

    describe('ADMIN_SUMMARY_CARDS', () => {
        it('has 4 summary cards', () => {
            expect(ADMIN_SUMMARY_CARDS.length).toBe(4);
        });

        it('each card has icon, color, label, and key', () => {
            ADMIN_SUMMARY_CARDS.forEach(card => {
                expect(card.icon).toBeTruthy();
                expect(card.color).toBeTruthy();
                expect(card.label).toBeTruthy();
                expect(card.key).toBeTruthy();
            });
        });

        it('has unique keys', () => {
            const keys = ADMIN_SUMMARY_CARDS.map(c => c.key);
            expect(new Set(keys).size).toBe(keys.length);
        });
    });
});

