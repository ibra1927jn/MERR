/**
 * Tests for config/crop-profiles.ts — Multi-crop profile configuration
 */
import { describe, it, expect } from 'vitest';
import {
  CROP_PROFILES,
  getCropProfile,
  getAllCropProfiles,
} from './crop-profiles';
import type { CropProfile } from './crop-profiles';

const expectedCropTypes = ['cherry', 'apple', 'kiwifruit', 'grape', 'generic'];

describe('CROP_PROFILES', () => {
  it('has 5 crop types', () => {
    expect(Object.keys(CROP_PROFILES)).toHaveLength(5);
  });

  it('includes all expected crop types', () => {
    for (const type of expectedCropTypes) {
      expect(CROP_PROFILES).toHaveProperty(type);
    }
  });

  it('each profile has required fields', () => {
    const requiredFields: (keyof CropProfile)[] = [
      'type',
      'name',
      'harvestUnit',
      'qualityGrades',
      'seasonMonths',
      'defaultPieceRate',
    ];

    for (const [key, profile] of Object.entries(CROP_PROFILES)) {
      for (const field of requiredFields) {
        expect(profile, `${key} missing "${field}"`).toHaveProperty(field);
      }
    }
  });

  it('all profiles have region "New Zealand"', () => {
    for (const [key, profile] of Object.entries(CROP_PROFILES)) {
      expect(profile.region, `${key} region`).toBe('New Zealand');
    }
  });

  it('all profiles have positive defaultPieceRate', () => {
    for (const [key, profile] of Object.entries(CROP_PROFILES)) {
      expect(profile.defaultPieceRate, `${key} defaultPieceRate`).toBeGreaterThan(0);
    }
  });
});

describe('Cherry profile', () => {
  const cherry = CROP_PROFILES.cherry;

  it('has harvestUnit "bucket"', () => {
    expect(cherry.harvestUnit).toBe('bucket');
  });

  it('has seasonMonths [11, 12, 1, 2]', () => {
    expect(cherry.seasonMonths).toEqual([11, 12, 1, 2]);
  });

  it('has 4 quality grades', () => {
    expect(cherry.qualityGrades).toHaveLength(4);
  });

  it('has name "Cherries"', () => {
    expect(cherry.name).toBe('Cherries');
  });
});

describe('getCropProfile', () => {
  it('returns cherry profile for "cherry"', () => {
    const profile = getCropProfile('cherry');
    expect(profile.type).toBe('cherry');
  });

  it('returns apple profile for "apple"', () => {
    const profile = getCropProfile('apple');
    expect(profile.type).toBe('apple');
  });

  it('defaults to cherry for null', () => {
    const profile = getCropProfile(null);
    expect(profile.type).toBe('cherry');
  });

  it('defaults to cherry for undefined', () => {
    const profile = getCropProfile(undefined);
    expect(profile.type).toBe('cherry');
  });

  it('defaults to cherry for unknown crop type', () => {
    const profile = getCropProfile('unknown');
    expect(profile.type).toBe('cherry');
  });

  it('defaults to cherry when called with no arguments', () => {
    const profile = getCropProfile();
    expect(profile.type).toBe('cherry');
  });
});

describe('getAllCropProfiles', () => {
  it('returns 5 profiles', () => {
    const profiles = getAllCropProfiles();
    expect(profiles).toHaveLength(5);
  });

  it('returns array of CropProfile objects', () => {
    const profiles = getAllCropProfiles();
    for (const profile of profiles) {
      expect(profile).toHaveProperty('type');
      expect(profile).toHaveProperty('name');
      expect(profile).toHaveProperty('defaultPieceRate');
    }
  });

  it('includes all crop types', () => {
    const profiles = getAllCropProfiles();
    const types = profiles.map((p) => p.type);
    for (const expected of expectedCropTypes) {
      expect(types).toContain(expected);
    }
  });
});
