/**
 * Data Export Service — Unit Tests
 *
 * Tests for NZ Privacy Act 2020 IPP 6 data export functionality.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────

const mockSingle = vi.fn();
const mockInsert = vi.fn();
const mockLimit = vi.fn().mockReturnValue({ data: [], error: null });
const mockOrder = vi.fn(() => ({ limit: mockLimit }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockEq = vi.fn(() => ({
  single: mockSingle,
  order: mockOrder,
  limit: mockLimit,
}));

vi.mock('@/services/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'audit_logs') {
        return { insert: mockInsert };
      }
      return {
        select: mockSelect,
        eq: mockEq,
      };
    }),
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { dataExportService } from '../data-export.service';
import { supabase } from '@/services/supabase';

// ── Helpers ──────────────────────────────────────────

const MOCK_USER = {
  id: 'user-1',
  email: 'test@example.com',
  role: 'picker',
  name: 'Test User',
  created_at: '2025-01-01T00:00:00Z',
  privacy_consent_at: '2025-01-02T00:00:00Z',
};

const MOCK_ATTENDANCE = [
  { id: 'att-1', check_in_time: '2025-03-01T08:00:00Z', check_out_time: '2025-03-01T16:00:00Z', orchard_id: 'orchard-1' },
];

const MOCK_SCANS = [
  { id: 'scan-1', scanned_at: '2025-03-01T10:00:00Z', quality_grade: 'A', orchard_id: 'orchard-1' },
];

const MOCK_CONSENTS = [
  { consent_type: 'privacy_policy', policy_version: '1.0', consented_at: '2025-01-02T00:00:00Z' },
];

function setupSupabaseMock(overrides: {
  user?: { data: unknown; error: unknown };
  attendance?: { data: unknown; error: unknown };
  scans?: { data: unknown; error: unknown };
  consents?: { data: unknown; error: unknown };
  messages?: { count: number | null };
} = {}) {
  const user = overrides.user ?? { data: MOCK_USER, error: null };
  const attendance = overrides.attendance ?? { data: MOCK_ATTENDANCE, error: null };
  const scans = overrides.scans ?? { data: MOCK_SCANS, error: null };
  const consents = overrides.consents ?? { data: MOCK_CONSENTS, error: null };
  const messages = overrides.messages ?? { count: 5 };

  let callCount = 0;

  (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
    if (table === 'audit_logs') {
      return { insert: mockInsert.mockResolvedValue({ error: null }) };
    }

    const chainable = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn(),
      lte: vi.fn().mockReturnThis(),
    };

    if (table === 'users') {
      chainable.single.mockResolvedValue(user);
      chainable.eq.mockReturnValue({ single: chainable.single, order: chainable.order, limit: chainable.limit });
      chainable.select.mockReturnValue({ eq: chainable.eq });
    } else if (table === 'daily_attendance') {
      chainable.limit.mockResolvedValue(attendance);
      chainable.order.mockReturnValue({ limit: chainable.limit });
      chainable.eq.mockReturnValue({ order: chainable.order, single: chainable.single, limit: chainable.limit });
      chainable.select.mockReturnValue({ eq: chainable.eq });
    } else if (table === 'bucket_scans') {
      chainable.limit.mockResolvedValue(scans);
      chainable.order.mockReturnValue({ limit: chainable.limit });
      chainable.eq.mockReturnValue({ order: chainable.order, single: chainable.single, limit: chainable.limit });
      chainable.select.mockReturnValue({ eq: chainable.eq });
    } else if (table === 'privacy_consent_log') {
      chainable.order.mockResolvedValue(consents);
      chainable.eq.mockReturnValue({ order: chainable.order, single: chainable.single, limit: chainable.limit });
      chainable.select.mockReturnValue({ eq: chainable.eq });
    } else if (table === 'messages') {
      chainable.eq.mockResolvedValue(messages);
      chainable.select.mockReturnValue({ eq: chainable.eq });
    }

    return chainable;
  });
}

// ── Tests ──────────────────────────────────────────

describe('dataExportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('exportUserData', () => {
    it('exports user data with all records populated', async () => {
      setupSupabaseMock();

      const result = await dataExportService.exportUserData('user-1');

      expect(result.user.id).toBe('user-1');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.name).toBe('Test User');
      expect(result.attendance).toHaveLength(1);
      expect(result.attendance[0].check_in).toBe('2025-03-01T08:00:00Z');
      expect(result.bucketScans).toHaveLength(1);
      expect(result.bucketScans[0].quality_grade).toBe('A');
      expect(result.consentHistory).toHaveLength(1);
      expect(result.consentHistory[0].consent_type).toBe('privacy_policy');
      expect(result.messageCount).toBe(5);
      expect(result.exportedAt).toBeDefined();
    });

    it('handles missing attendance gracefully (null data)', async () => {
      setupSupabaseMock({
        attendance: { data: null, error: { message: 'Not found' } },
      });

      const result = await dataExportService.exportUserData('user-1');

      expect(result.attendance).toEqual([]);
      expect(result.user.id).toBe('user-1');
    });

    it('handles missing scans gracefully', async () => {
      setupSupabaseMock({
        scans: { data: null, error: { message: 'Scan error' } },
      });

      const result = await dataExportService.exportUserData('user-1');

      expect(result.bucketScans).toEqual([]);
      expect(result.user.id).toBe('user-1');
    });

    it('handles user fetch error (throws)', async () => {
      setupSupabaseMock({
        user: { data: null, error: { message: 'User not found' } },
      });

      await expect(dataExportService.exportUserData('user-1'))
        .rejects.toThrow('Failed to fetch user data: User not found');
    });

    it('includes correct audit log on export', async () => {
      setupSupabaseMock();

      await dataExportService.exportUserData('user-1');

      expect(supabase.from).toHaveBeenCalledWith('audit_logs');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'data_export',
          severity: 'info',
          action: 'User requested personal data export (IPP 6)',
          user_id: 'user-1',
          details: expect.objectContaining({
            records_exported: expect.objectContaining({
              attendance: 1,
              scans: 1,
              consents: 1,
            }),
          }),
        })
      );
    });

    it('messageCount defaults to 0 when null', async () => {
      setupSupabaseMock({
        messages: { count: null },
      });

      const result = await dataExportService.exportUserData('user-1');

      expect(result.messageCount).toBe(0);
    });
  });

  describe('downloadAsJSON', () => {
    it('creates and clicks a download link', async () => {
      setupSupabaseMock();

      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      };
      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as unknown as HTMLElement);
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);
      const createObjectURLSpy = vi.fn().mockReturnValue('blob:test-url');
      const revokeObjectURLSpy = vi.fn();
      globalThis.URL.createObjectURL = createObjectURLSpy;
      globalThis.URL.revokeObjectURL = revokeObjectURLSpy;

      await dataExportService.downloadAsJSON('user-1');

      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(mockLink.href).toBe('blob:test-url');
      expect(mockLink.download).toMatch(/^harvestpro-data-export-\d{4}-\d{2}-\d{2}\.json$/);
      expect(mockLink.click).toHaveBeenCalled();
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:test-url');

      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });
  });
});
