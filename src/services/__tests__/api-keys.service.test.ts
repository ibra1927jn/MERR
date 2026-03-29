/**
 * Tests for api-keys.service.ts
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('api-keys.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports apiKeysService object', async () => {
    const { apiKeysService } = await import('@/services/api-keys.service');
    expect(apiKeysService).toBeDefined();
    expect(typeof apiKeysService.createKey).toBe('function');
    expect(typeof apiKeysService.listKeys).toBe('function');
    expect(typeof apiKeysService.revokeKey).toBe('function');
    expect(typeof apiKeysService.getAvailableScopes).toBe('function');
  });

  it('getAvailableScopes returns 8 scopes', async () => {
    const { apiKeysService } = await import('@/services/api-keys.service');
    const scopes = apiKeysService.getAvailableScopes();
    expect(scopes.length).toBe(8);
    const scopeIds = scopes.map(s => s.scope);
    expect(scopeIds).toContain('harvest:read');
    expect(scopeIds).toContain('payroll:read');
    expect(scopeIds).toContain('attendance:read');
    expect(scopeIds).toContain('mpi:export');
  });

  it('each scope has scope and label properties', async () => {
    const { apiKeysService } = await import('@/services/api-keys.service');
    const scopes = apiKeysService.getAvailableScopes();
    scopes.forEach(s => {
      expect(s).toHaveProperty('scope');
      expect(s).toHaveProperty('label');
      expect(typeof s.scope).toBe('string');
      expect(typeof s.label).toBe('string');
    });
  });
});
