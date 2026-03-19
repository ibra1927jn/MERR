/**
 * Crop Profiles — Configuration for multi-crop support
 *
 * Defines crop-specific terminology, quality grades, season windows,
 * and default rates for each supported crop type.
 *
 * The active crop profile is determined by the orchard's `crop_type` setting.
 * All UI components should reference these profiles instead of hardcoding
 * crop-specific terms like "bucket" or "cherry bin".
 *
 * @module config/crop-profiles
 */

/** Supported crop types */
export type CropType = 'cherry' | 'apple' | 'kiwifruit' | 'grape' | 'generic';

/** Quality grades available for the crop */
export interface QualityGrade {
  id: string;
  label: string;
  color: string;
  description: string;
}

/** Full crop profile configuration */
export interface CropProfile {
  /** Crop identifier */
  type: CropType;
  /** Display name */
  name: string;
  /** Icon (Material Symbols name) */
  icon: string;
  /** What pickers harvest into (e.g., "bucket", "bin", "tray") */
  harvestUnit: string;
  /** Plural form of harvest unit */
  harvestUnitPlural: string;
  /** What bins/containers are called */
  containerName: string;
  /** Plural form of container */
  containerPlural: string;
  /** Quality grading system */
  qualityGrades: QualityGrade[];
  /** Typical season months (1-indexed) */
  seasonMonths: number[];
  /** Default piece rate (NZD per unit) */
  defaultPieceRate: number;
  /** Typical units per container conversion factor */
  unitsPerContainer: number;
  /** Country origin */
  region: string;
}

// =============================================
// CROP PROFILES
// =============================================

export const CROP_PROFILES: Record<CropType, CropProfile> = {
  cherry: {
    type: 'cherry',
    name: 'Cherries',
    icon: 'nutrition',
    harvestUnit: 'bucket',
    harvestUnitPlural: 'buckets',
    containerName: 'bin',
    containerPlural: 'bins',
    qualityGrades: [
      {
        id: 'A',
        label: 'Grade A (Export)',
        color: '#16a34a',
        description: 'Premium export quality',
      },
      { id: 'B', label: 'Grade B (Domestic)', color: '#2563eb', description: 'NZ domestic market' },
      {
        id: 'C',
        label: 'Grade C (Processing)',
        color: '#d97706',
        description: 'Juice/jam processing',
      },
      { id: 'reject', label: 'Reject', color: '#dc2626', description: 'Below minimum standard' },
    ],
    seasonMonths: [11, 12, 1, 2], // Nov – Feb (NZ summer)
    defaultPieceRate: 3.5,
    unitsPerContainer: 15,
    region: 'New Zealand',
  },
  apple: {
    type: 'apple',
    name: 'Apples',
    icon: 'spa',
    harvestUnit: 'bag',
    harvestUnitPlural: 'bags',
    containerName: 'bin',
    containerPlural: 'bins',
    qualityGrades: [
      {
        id: 'fancy',
        label: 'Fancy (Export)',
        color: '#16a34a',
        description: 'Premium export grade',
      },
      {
        id: 'choice',
        label: 'Choice (Domestic)',
        color: '#2563eb',
        description: 'Standard domestic',
      },
      { id: 'juice', label: 'Juice Grade', color: '#d97706', description: 'Processing/juice' },
      { id: 'reject', label: 'Reject', color: '#dc2626', description: 'Below standard' },
    ],
    seasonMonths: [2, 3, 4, 5], // Feb – May
    defaultPieceRate: 2.8,
    unitsPerContainer: 20,
    region: 'New Zealand',
  },
  kiwifruit: {
    type: 'kiwifruit',
    name: 'Kiwifruit',
    icon: 'eco',
    harvestUnit: 'tray',
    harvestUnitPlural: 'trays',
    containerName: 'bin',
    containerPlural: 'bins',
    qualityGrades: [
      {
        id: 'class1',
        label: 'Class 1 (Export)',
        color: '#16a34a',
        description: 'Zespri export standard',
      },
      {
        id: 'class2',
        label: 'Class 2 (Domestic)',
        color: '#2563eb',
        description: 'Domestic market',
      },
      { id: 'reject', label: 'Reject', color: '#dc2626', description: 'Below standard' },
    ],
    seasonMonths: [3, 4, 5, 6], // Mar – Jun
    defaultPieceRate: 1.2,
    unitsPerContainer: 30,
    region: 'New Zealand',
  },
  grape: {
    type: 'grape',
    name: 'Wine Grapes',
    icon: 'local_bar',
    harvestUnit: 'bucket',
    harvestUnitPlural: 'buckets',
    containerName: 'gondola',
    containerPlural: 'gondolas',
    qualityGrades: [
      { id: 'premium', label: 'Premium', color: '#16a34a', description: 'Reserve wine quality' },
      {
        id: 'standard',
        label: 'Standard',
        color: '#2563eb',
        description: 'Standard wine production',
      },
      { id: 'reject', label: 'Reject', color: '#dc2626', description: 'Damaged/infected' },
    ],
    seasonMonths: [2, 3, 4], // Feb – Apr (vintage)
    defaultPieceRate: 4.0,
    unitsPerContainer: 12,
    region: 'New Zealand',
  },
  generic: {
    type: 'generic',
    name: 'General Crop',
    icon: 'agriculture',
    harvestUnit: 'unit',
    harvestUnitPlural: 'units',
    containerName: 'container',
    containerPlural: 'containers',
    qualityGrades: [
      { id: 'A', label: 'Grade A', color: '#16a34a', description: 'Top quality' },
      { id: 'B', label: 'Grade B', color: '#2563eb', description: 'Standard quality' },
      { id: 'C', label: 'Grade C', color: '#d97706', description: 'Below standard' },
      { id: 'reject', label: 'Reject', color: '#dc2626', description: 'Not acceptable' },
    ],
    seasonMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    defaultPieceRate: 2.0,
    unitsPerContainer: 20,
    region: 'New Zealand',
  },
};

/**
 * Get the crop profile for a given crop type.
 * Falls back to 'cherry' if the type is unknown (backwards compatibility).
 */
export function getCropProfile(cropType?: CropType | string | null): CropProfile {
  if (cropType && cropType in CROP_PROFILES) {
    return CROP_PROFILES[cropType as CropType];
  }
  return CROP_PROFILES.cherry; // Default for existing installations
}

/**
 * Get all available crop profiles for settings UI.
 */
export function getAllCropProfiles(): CropProfile[] {
  return Object.values(CROP_PROFILES);
}
