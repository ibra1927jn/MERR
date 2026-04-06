/**
 * useManagerActions — pure logic tests
 *
 * Tests the derived data calculations and handler logic
 * extracted from the Manager page component.
 */
import { describe, it, expect } from 'vitest';

// ── Types mirroring the hook's data shapes ──────────────
interface CrewMember {
  id: string;
  name: string;
  role: string;
}

interface InventoryItem {
  id: string;
  status: 'full' | 'empty' | 'in_use';
}

interface BucketRecord {
  id: string;
  scanned_at: string | null;
}

// ── Pure logic extracted from the hook ──────────────────

const getActiveRunners = (crew: CrewMember[]) =>
  crew.filter(p => p.role === 'runner');

const getTeamLeaders = (crew: CrewMember[]) =>
  crew.filter(p => p.role === 'team_leader');

const getFullBins = (inventory: InventoryItem[]) =>
  inventory.filter(b => b.status === 'full').length;

const getEmptyBins = (inventory: InventoryItem[]) =>
  inventory.filter(b => b.status === 'empty').length;

const getFilteredBucketRecords = (bucketRecords: BucketRecord[] | undefined) => {
  if (!bucketRecords) return [];
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  return bucketRecords.filter(
    r => new Date(r.scanned_at || '').getTime() >= startOfDay.getTime()
  );
};

// ── Tests ───────────────────────────────────────────────

describe('useManagerActions — derived data', () => {
  const crew: CrewMember[] = [
    { id: '1', name: 'Alice', role: 'runner' },
    { id: '2', name: 'Bob', role: 'team_leader' },
    { id: '3', name: 'Charlie', role: 'runner' },
    { id: '4', name: 'Diana', role: 'picker' },
    { id: '5', name: 'Eve', role: 'team_leader' },
  ];

  it('filters active runners correctly', () => {
    const runners = getActiveRunners(crew);
    expect(runners).toHaveLength(2);
    expect(runners.map(r => r.name)).toEqual(['Alice', 'Charlie']);
  });

  it('filters team leaders correctly', () => {
    const leaders = getTeamLeaders(crew);
    expect(leaders).toHaveLength(2);
    expect(leaders.map(l => l.name)).toEqual(['Bob', 'Eve']);
  });

  it('returns empty arrays for empty crew', () => {
    expect(getActiveRunners([])).toHaveLength(0);
    expect(getTeamLeaders([])).toHaveLength(0);
  });
});

describe('useManagerActions — inventory bins', () => {
  const inventory: InventoryItem[] = [
    { id: 'b1', status: 'full' },
    { id: 'b2', status: 'empty' },
    { id: 'b3', status: 'full' },
    { id: 'b4', status: 'in_use' },
    { id: 'b5', status: 'empty' },
    { id: 'b6', status: 'empty' },
  ];

  it('counts full bins', () => {
    expect(getFullBins(inventory)).toBe(2);
  });

  it('counts empty bins', () => {
    expect(getEmptyBins(inventory)).toBe(3);
  });

  it('returns 0 for empty inventory', () => {
    expect(getFullBins([])).toBe(0);
    expect(getEmptyBins([])).toBe(0);
  });
});

describe('useManagerActions — filtered bucket records', () => {
  it('returns empty array when bucketRecords is undefined', () => {
    expect(getFilteredBucketRecords(undefined)).toEqual([]);
  });

  it('returns empty array when bucketRecords is empty', () => {
    expect(getFilteredBucketRecords([])).toEqual([]);
  });

  it('filters out records from previous days', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(12, 0, 0, 0);

    const records: BucketRecord[] = [
      { id: 'r1', scanned_at: yesterday.toISOString() },
    ];
    expect(getFilteredBucketRecords(records)).toHaveLength(0);
  });

  it('includes records from today', () => {
    const today = new Date();
    today.setHours(10, 30, 0, 0);

    const records: BucketRecord[] = [
      { id: 'r1', scanned_at: today.toISOString() },
    ];
    expect(getFilteredBucketRecords(records)).toHaveLength(1);
  });

  it('filters out records with null scanned_at', () => {
    const records: BucketRecord[] = [
      { id: 'r1', scanned_at: null },
    ];
    expect(getFilteredBucketRecords(records)).toHaveLength(0);
  });

  it('mixes today and old records correctly', () => {
    const today = new Date();
    today.setHours(8, 0, 0, 0);
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);

    const records: BucketRecord[] = [
      { id: 'r1', scanned_at: today.toISOString() },
      { id: 'r2', scanned_at: lastWeek.toISOString() },
      { id: 'r3', scanned_at: null },
    ];
    const filtered = getFilteredBucketRecords(records);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('r1');
  });
});
