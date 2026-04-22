/**
 * optimistic-lock.repository.test.ts
 *
 * The conditionalUpdate path is the concurrency guardrail for timesheet
 * approvals and role updates. A silent failure mode here (where a stale
 * updated_at silently matches nothing and we call it "success") is what
 * turns a stale-read into a lost-update. Tests cover the three paths:
 *   1. Normal update where row + updated_at match (happy)
 *   2. Conflict (row exists but updated_at stale) → error propagated
 *   3. Non-locked update throws on error (caller cannot confuse an
 *      error with a silently-missed update)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/services/supabase';
import { optimisticLockRepository } from './optimistic-lock.repository';

function mockChain(result: { data?: unknown; error?: unknown }) {
  const chain: Record<string, unknown> = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    single: vi.fn(() => chain),
    maybeSingle: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    then: (onF?: (v: unknown) => unknown, onR?: (r: unknown) => unknown) =>
      Promise.resolve(result).then(onF, onR),
  };
  return chain;
}

describe('optimisticLockRepository', () => {
  let fromSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    fromSpy = vi.spyOn(supabase, 'from').mockReturnValue(mockChain({ data: null, error: null }) as never);
  });

  describe('conditionalUpdate', () => {
    it('returns the updated row when id + updated_at match', async () => {
      const updatedRow = { id: '1', updated_at: '2026-04-22T00:00:00Z', status: 'approved' };
      fromSpy.mockReturnValue(mockChain({ data: updatedRow, error: null }) as never);

      const result = await optimisticLockRepository.conditionalUpdate(
        'daily_attendance',
        '1',
        '2026-04-21T23:59:00Z',
        { status: 'approved' },
      );

      expect(result.data).toEqual(updatedRow);
      expect(result.error).toBeNull();
      expect(fromSpy).toHaveBeenCalledWith('daily_attendance');
    });

    it('surfaces the conflict as error.code when updated_at is stale (PGRST116)', async () => {
      // Supabase behaviour: WHERE updated_at doesn't match → zero rows
      // from the conditional SELECT → .single() yields error code PGRST116
      const conflict = { message: 'No rows returned', code: 'PGRST116' };
      fromSpy.mockReturnValue(mockChain({ data: null, error: conflict }) as never);

      const result = await optimisticLockRepository.conditionalUpdate(
        'daily_attendance',
        '1',
        'STALE',
        { status: 'approved' },
      );

      expect(result.data).toBeNull();
      expect(result.error).toEqual(conflict);
      // Critical: caller MUST be able to distinguish "silent miss" from "success"
      // by inspecting error, not just data.
      expect((result.error as { code: string }).code).toBe('PGRST116');
    });
  });

  describe('getById', () => {
    it('returns the row on success', async () => {
      const row = { id: '42', name: 'Orchard A' };
      fromSpy.mockReturnValue(mockChain({ data: row, error: null }) as never);

      const result = await optimisticLockRepository.getById('orchards', '42');
      expect(result).toEqual(row);
    });

    it('returns null when no row found (no throw)', async () => {
      fromSpy.mockReturnValue(mockChain({ data: null, error: { code: 'PGRST116' } }) as never);
      const result = await optimisticLockRepository.getById('orchards', 'missing');
      expect(result).toBeNull();
    });
  });

  describe('update (non-locked)', () => {
    it('returns the updated row on success', async () => {
      const updated = { id: '1', status: 'active' };
      fromSpy.mockReturnValue(mockChain({ data: updated, error: null }) as never);

      const result = await optimisticLockRepository.update('users', '1', { status: 'active' });
      expect(result).toEqual(updated);
    });

    it('THROWS on Supabase error — caller cannot accidentally treat failure as no-op', async () => {
      fromSpy.mockReturnValue(
        mockChain({ data: null, error: { message: 'permission denied' } }) as never,
      );

      await expect(
        optimisticLockRepository.update('users', '1', { role: 'admin' }),
      ).rejects.toMatchObject({ message: 'permission denied' });
    });
  });
});
