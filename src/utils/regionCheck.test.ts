import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectSupabaseRegion, checkDataSovereignty } from './regionCheck';

describe('regionCheck utilities', () => {
  describe('detectSupabaseRegion', () => {
    it('returns non-AP for known US-East project reference', () => {
      const result = detectSupabaseRegion(
        'https://mcbtyaebetzvzvnxydpy.supabase.co'
      );
      expect(result.isAsiaPacific).toBe(false);
      expect(result.isNZCompliant).toBe(false);
      expect(result.warning).toContain('us-east-1');
      expect(result.warning).toContain('ap-southeast-2');
    });

    it('returns AP-compliant for unknown project reference', () => {
      const result = detectSupabaseRegion(
        'https://abcdefghijklmnopqrst.supabase.co'
      );
      expect(result.isAsiaPacific).toBe(true);
      expect(result.isNZCompliant).toBe(true);
      expect(result.warning).toBeNull();
    });

    it('handles case-insensitive URL matching', () => {
      const result = detectSupabaseRegion(
        'https://MCBTYAEBETZVZVNXYDPY.supabase.co'
      );
      expect(result.isAsiaPacific).toBe(false);
      expect(result.isNZCompliant).toBe(false);
    });

    it('handles URL with path segments', () => {
      const result = detectSupabaseRegion(
        'https://mcbtyaebetzvzvnxydpy.supabase.co/rest/v1'
      );
      expect(result.isNZCompliant).toBe(false);
    });
  });

  describe('checkDataSovereignty', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      warnSpy.mockRestore();
    });

    it('does nothing when VITE_SUPABASE_URL is empty', () => {
      // import.meta.env.VITE_SUPABASE_URL es un placeholder vacio en tests
      checkDataSovereignty();
      // No deberia lanzar error
    });
  });
});
