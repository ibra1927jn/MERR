/**
 * Tests for config/navigation — All role-based navigation configs
 */
import { describe, it, expect } from 'vitest';

// Manager nav
import { MOBILE_TABS as MANAGER_MOBILE, DESKTOP_NAV as MANAGER_DESKTOP } from './manager.nav';
// Team Leader nav
import { TEAM_LEADER_NAV_TABS } from './team-leader.nav';
// Runner nav
import { RUNNER_NAV_TABS } from './runner.nav';
// QC nav
import { QC_NAV_TABS } from './qc.nav';
// HHRR nav
import { HR_NAV_ITEMS } from './hhrr.nav';
// Logistics nav
import { LOG_NAV_ITEMS } from './logistics.nav';
// Admin nav
import { ADMIN_NAV_ITEMS } from './admin.nav';

/** Helper: check no duplicate IDs in a nav array */
function assertNoDuplicateIds(items: { id: string }[], label: string) {
  const ids = items.map((i) => i.id);
  const uniqueIds = new Set(ids);
  expect(uniqueIds.size, `${label} has duplicate IDs: ${ids}`).toBe(ids.length);
}

/** Helper: check each item has id, label, icon */
function assertNavShape(items: { id: string; label: string; icon: string }[], label: string) {
  for (const item of items) {
    expect(item.id, `${label} item missing id`).toBeTruthy();
    expect(item.label, `${label} item missing label`).toBeTruthy();
    expect(item.icon, `${label} item missing icon`).toBeTruthy();
  }
}

// ── Manager ──────────────────────────────────────────

describe('Manager navigation', () => {
  it('MOBILE_TABS has 5 items', () => {
    expect(MANAGER_MOBILE).toHaveLength(5);
  });

  it('DESKTOP_NAV has 7 items', () => {
    expect(MANAGER_DESKTOP).toHaveLength(7);
  });

  it('each mobile tab has id, label, icon', () => {
    assertNavShape(MANAGER_MOBILE, 'Manager MOBILE_TABS');
  });

  it('each desktop nav has id, label, icon', () => {
    assertNavShape(MANAGER_DESKTOP, 'Manager DESKTOP_NAV');
  });

  it('no duplicate IDs in mobile tabs', () => {
    assertNoDuplicateIds(MANAGER_MOBILE, 'Manager MOBILE_TABS');
  });

  it('no duplicate IDs in desktop nav', () => {
    assertNoDuplicateIds(MANAGER_DESKTOP, 'Manager DESKTOP_NAV');
  });
});

// ── Team Leader ──────────────────────────────────────

describe('Team Leader navigation', () => {
  it('TEAM_LEADER_NAV_TABS has 5 items', () => {
    expect(TEAM_LEADER_NAV_TABS).toHaveLength(5);
  });

  it('each item has id, label, icon', () => {
    assertNavShape(TEAM_LEADER_NAV_TABS, 'TeamLeader');
  });

  it('no duplicate IDs', () => {
    assertNoDuplicateIds(TEAM_LEADER_NAV_TABS, 'TeamLeader');
  });
});

// ── Runner ───────────────────────────────────────────

describe('Runner navigation', () => {
  it('RUNNER_NAV_TABS has 5 items', () => {
    expect(RUNNER_NAV_TABS).toHaveLength(5);
  });

  it('each item has id, label, icon', () => {
    assertNavShape(RUNNER_NAV_TABS, 'Runner');
  });

  it('no duplicate IDs', () => {
    assertNoDuplicateIds(RUNNER_NAV_TABS, 'Runner');
  });
});

// ── QC ───────────────────────────────────────────────

describe('QC navigation', () => {
  it('QC_NAV_TABS has 4 items', () => {
    expect(QC_NAV_TABS).toHaveLength(4);
  });

  it('each item has id, label, icon', () => {
    assertNavShape(QC_NAV_TABS, 'QC');
  });

  it('no duplicate IDs', () => {
    assertNoDuplicateIds(QC_NAV_TABS, 'QC');
  });
});

// ── HHRR ─────────────────────────────────────────────

describe('HHRR navigation', () => {
  it('HR_NAV_ITEMS has 6 items', () => {
    expect(HR_NAV_ITEMS).toHaveLength(6);
  });

  it('each item has id, label, icon', () => {
    assertNavShape(HR_NAV_ITEMS, 'HHRR');
  });

  it('no duplicate IDs', () => {
    assertNoDuplicateIds(HR_NAV_ITEMS, 'HHRR');
  });
});

// ── Logistics ────────────────────────────────────────

describe('Logistics navigation', () => {
  it('LOG_NAV_ITEMS has 5 items', () => {
    expect(LOG_NAV_ITEMS).toHaveLength(5);
  });

  it('each item has id, label, icon', () => {
    assertNavShape(LOG_NAV_ITEMS, 'Logistics');
  });

  it('no duplicate IDs', () => {
    assertNoDuplicateIds(LOG_NAV_ITEMS, 'Logistics');
  });
});

// ── Admin ────────────────────────────────────────────

describe('Admin navigation', () => {
  it('ADMIN_NAV_ITEMS has 4 items', () => {
    expect(ADMIN_NAV_ITEMS).toHaveLength(4);
  });

  it('each item has id, label, icon', () => {
    assertNavShape(ADMIN_NAV_ITEMS, 'Admin');
  });

  it('no duplicate IDs', () => {
    assertNoDuplicateIds(ADMIN_NAV_ITEMS, 'Admin');
  });
});
