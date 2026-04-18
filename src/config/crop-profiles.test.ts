/**
 * Tests for crop-profiles.ts — multi-crop configuration registry.
 */
import { describe, it, expect } from 'vitest';
import {
  CROP_PROFILES,
  getCropProfile,
  getAllCropProfiles,
  type CropType,
} from '@/config/crop-profiles';

describe('CROP_PROFILES — registry', () => {
  it('defines all 5 supported crop types', () => {
    const expected: CropType[] = ['cherry', 'apple', 'kiwifruit', 'grape', 'generic'];
    expected.forEach(type => {
      expect(CROP_PROFILES[type]).toBeDefined();
      expect(CROP_PROFILES[type].type).toBe(type);
    });
  });

  it('every profile has required fields populated', () => {
    Object.values(CROP_PROFILES).forEach(p => {
      expect(p.name).toBeTruthy();
      expect(p.icon).toBeTruthy();
      expect(p.harvestUnit).toBeTruthy();
      expect(p.harvestUnitPlural).toBeTruthy();
      expect(p.containerName).toBeTruthy();
      expect(p.containerPlural).toBeTruthy();
      expect(p.region).toBeTruthy();
    });
  });

  it('every profile has at least 3 quality grades including reject', () => {
    Object.values(CROP_PROFILES).forEach(p => {
      expect(p.qualityGrades.length).toBeGreaterThanOrEqual(3);
      expect(p.qualityGrades.some(g => g.id === 'reject')).toBe(true);
    });
  });

  it('quality-grade ids are unique within each profile', () => {
    Object.values(CROP_PROFILES).forEach(p => {
      const ids = p.qualityGrades.map(g => g.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  it('every grade has color in #rrggbb format', () => {
    Object.values(CROP_PROFILES).forEach(p => {
      p.qualityGrades.forEach(g => {
        expect(g.color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });
  });

  it('seasonMonths uses 1-indexed months (1..12)', () => {
    Object.values(CROP_PROFILES).forEach(p => {
      expect(p.seasonMonths.length).toBeGreaterThan(0);
      p.seasonMonths.forEach(m => {
        expect(m).toBeGreaterThanOrEqual(1);
        expect(m).toBeLessThanOrEqual(12);
      });
    });
  });

  it('defaultPieceRate and unitsPerContainer are positive', () => {
    Object.values(CROP_PROFILES).forEach(p => {
      expect(p.defaultPieceRate).toBeGreaterThan(0);
      expect(p.unitsPerContainer).toBeGreaterThan(0);
    });
  });

  it('generic crop covers all 12 months', () => {
    expect(CROP_PROFILES.generic.seasonMonths).toHaveLength(12);
  });

  it('cherry season is NZ summer (Nov–Feb)', () => {
    expect(CROP_PROFILES.cherry.seasonMonths).toEqual([11, 12, 1, 2]);
  });
});

describe('getCropProfile', () => {
  it('returns the matching profile for a known crop type', () => {
    expect(getCropProfile('apple').type).toBe('apple');
    expect(getCropProfile('kiwifruit').harvestUnit).toBe('tray');
    expect(getCropProfile('grape').containerName).toBe('gondola');
  });

  it('falls back to cherry for null input', () => {
    expect(getCropProfile(null).type).toBe('cherry');
  });

  it('falls back to cherry for undefined input', () => {
    expect(getCropProfile(undefined).type).toBe('cherry');
  });

  it('falls back to cherry for empty string', () => {
    expect(getCropProfile('').type).toBe('cherry');
  });

  it('falls back to cherry for an unknown crop string', () => {
    expect(getCropProfile('banana').type).toBe('cherry');
    expect(getCropProfile('unknown').type).toBe('cherry');
  });

  it('returns the same reference as the registry entry', () => {
    expect(getCropProfile('apple')).toBe(CROP_PROFILES.apple);
  });
});

describe('getAllCropProfiles', () => {
  it('returns an array of all profiles', () => {
    const all = getAllCropProfiles();
    expect(all).toHaveLength(5);
  });

  it('contains every registry entry', () => {
    const all = getAllCropProfiles();
    const types = all.map(p => p.type).sort();
    expect(types).toEqual(['apple', 'cherry', 'generic', 'grape', 'kiwifruit']);
  });
});
