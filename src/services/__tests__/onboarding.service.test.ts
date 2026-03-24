/**
 * onboarding.service.test.ts
 * Covers: validateOrgStep(), validateAdminStep(), validateTermsStep(),
 *         provisionOrchard(), loginAfterSignup()
 * Strategy: sync validators are pure; async methods use Supabase mock.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { onboardingService } from '../onboarding.service';

// ── Supabase mock ──────────────────────────────────────────────────
vi.mock('@/services/supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
    auth: {
      signInWithPassword: vi.fn(),
    },
  },
}));

import { supabase } from '@/services/supabase';
const mockInvoke = vi.mocked(supabase.functions.invoke);
const mockSignIn = vi.mocked(supabase.auth.signInWithPassword);

// ── Tests ──────────────────────────────────────────────────────────
describe('onboardingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── validateOrgStep ────────────────────────────────────────────
  describe('validateOrgStep()', () => {
    it('returns null for valid orchard name and rows', () => {
      expect(
        onboardingService.validateOrgStep({ orchardName: 'Sunrise Block A', totalRows: 50 })
      ).toBeNull();
    });

    it('rejects empty orchard name', () => {
      const err = onboardingService.validateOrgStep({ orchardName: '', totalRows: 50 });
      expect(err).toContain('required');
    });

    it('rejects orchard name of 1 character', () => {
      const err = onboardingService.validateOrgStep({ orchardName: 'A', totalRows: 50 });
      expect(err).toContain('at least 2 characters');
    });

    it('rejects orchard name > 100 characters', () => {
      const err = onboardingService.validateOrgStep({
        orchardName: 'A'.repeat(101),
        totalRows: 50,
      });
      expect(err).toContain('under 100 characters');
    });

    it('rejects 0 rows', () => {
      const err = onboardingService.validateOrgStep({ orchardName: 'Test Orchard', totalRows: 0 });
      expect(err).toContain('between 1 and 500');
    });

    it('rejects 501 rows', () => {
      const err = onboardingService.validateOrgStep({
        orchardName: 'Test Orchard',
        totalRows: 501,
      });
      expect(err).toContain('between 1 and 500');
    });

    it('accepts boundary value of 1 row', () => {
      expect(onboardingService.validateOrgStep({ orchardName: 'Test', totalRows: 1 })).toBeNull();
    });

    it('accepts boundary value of 500 rows', () => {
      expect(onboardingService.validateOrgStep({ orchardName: 'Test', totalRows: 500 })).toBeNull();
    });
  });

  // ── validateAdminStep ──────────────────────────────────────────
  describe('validateAdminStep()', () => {
    const valid = {
      adminName: 'James Cook',
      adminEmail: 'james@orchard.co.nz',
      adminPassword: 'Secure123',
    };

    it('returns null for valid admin data', () => {
      expect(onboardingService.validateAdminStep(valid)).toBeNull();
    });

    it('rejects empty admin name', () => {
      const err = onboardingService.validateAdminStep({ ...valid, adminName: '' });
      expect(err).toContain('name is required');
    });

    it('rejects email without @', () => {
      const err = onboardingService.validateAdminStep({ ...valid, adminEmail: 'notanemail' });
      expect(err).toContain('Valid email');
    });

    it('rejects email without dot', () => {
      const err = onboardingService.validateAdminStep({ ...valid, adminEmail: 'user@domain' });
      expect(err).toContain('Valid email');
    });

    it('rejects password < 8 characters', () => {
      const err = onboardingService.validateAdminStep({ ...valid, adminPassword: 'Abc12' });
      expect(err).toContain('at least 8 characters');
    });

    it('rejects password without uppercase', () => {
      const err = onboardingService.validateAdminStep({ ...valid, adminPassword: 'secure123' });
      expect(err).toContain('uppercase');
    });

    it('rejects password without number', () => {
      const err = onboardingService.validateAdminStep({ ...valid, adminPassword: 'SecurePass' });
      expect(err).toContain('one number');
    });
  });

  // ── validateTermsStep ──────────────────────────────────────────
  describe('validateTermsStep()', () => {
    it('returns null when both accepted', () => {
      expect(
        onboardingService.validateTermsStep({ acceptedTerms: true, acceptedPrivacy: true })
      ).toBeNull();
    });

    it('rejects when terms not accepted', () => {
      const err = onboardingService.validateTermsStep({
        acceptedTerms: false,
        acceptedPrivacy: true,
      });
      expect(err).toContain('Terms of Service');
    });

    it('rejects when privacy not accepted', () => {
      const err = onboardingService.validateTermsStep({
        acceptedTerms: true,
        acceptedPrivacy: false,
      });
      expect(err).toContain('Privacy Policy');
    });
  });

  // ── provisionOrchard ────────────────────────────────────────────
  describe('provisionOrchard()', () => {
    const data = {
      orchardName: 'Sunrise Block A',
      orchardAddress: '42 Valley Rd',
      totalRows: 50,
      adminName: 'James Cook',
      adminEmail: 'james@orchard.co.nz',
      adminPassword: 'Secure123',
      acceptedTerms: true,
      acceptedPrivacy: true,
    };

    it('returns success result from Edge Function', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: { success: true, orchardId: 'orch-123', userId: 'user-456' },
        error: null,
      });

      const result = await onboardingService.provisionOrchard(data);
      expect(result.success).toBe(true);
      expect(result.orchardId).toBe('orch-123');
    });

    it('returns error when Edge Function fails', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: null,
        error: { message: 'Email already registered' } as Error,
      });

      const result = await onboardingService.provisionOrchard(data);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Email already registered');
    });

    it('returns fallback error when Edge Function returns null data', async () => {
      mockInvoke.mockResolvedValueOnce({ data: null, error: null });
      const result = await onboardingService.provisionOrchard(data);
      expect(result.success).toBe(false);
      expect(result.error).toContain('No response');
    });

    it('trims and lowercases email before sending', async () => {
      mockInvoke.mockResolvedValueOnce({ data: { success: true }, error: null });
      await onboardingService.provisionOrchard({ ...data, adminEmail: '  JAMES@ORCHARD.CO.NZ  ' });
      expect(mockInvoke).toHaveBeenCalledWith(
        'provision-orchard',
        expect.objectContaining({
          body: expect.objectContaining({ admin_email: 'james@orchard.co.nz' }),
        })
      );
    });
  });

  // ── loginAfterSignup ────────────────────────────────────────────
  describe('loginAfterSignup()', () => {
    it('returns success with session when login succeeds', async () => {
      const fakeSession = { access_token: 'tok-123', user: { id: 'u-1' } };
      mockSignIn.mockResolvedValueOnce({
        data: { session: fakeSession, user: { id: 'u-1' } } as unknown as Awaited<
          ReturnType<typeof supabase.auth.signInWithPassword>
        >['data'],
        error: null,
      });

      const result = await onboardingService.loginAfterSignup('james@orchard.co.nz', 'Secure123');
      expect(result.success).toBe(true);
      expect(result.session).toBe(fakeSession);
    });

    it('returns error when login fails', async () => {
      mockSignIn.mockResolvedValueOnce({
        data: { session: null, user: null },
        error: {
          message: 'Invalid login credentials',
          name: 'AuthError',
          status: 400,
        } as unknown as Error,
      });

      const result = await onboardingService.loginAfterSignup('james@orchard.co.nz', 'wrongpass');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid login credentials');
    });
  });
});
