/**
 * useCropProfile — Hook to access the active crop profile
 *
 * Reads the crop_type from the harvest store settings and returns
 * the corresponding CropProfile configuration.
 *
 * @module hooks/useCropProfile
 * @example
 * ```tsx
 * const { profile } = useCropProfile();
 * return <span>{profile.harvestUnitPlural} counted today</span>;
 * ```
 */
import { useMemo } from 'react';
import { getCropProfile, type CropProfile, type CropType } from '@/config/crop-profiles';
import { useHarvestStore } from '@/stores/useHarvestStore';

interface UseCropProfileResult {
  /** Active crop profile configuration */
  profile: CropProfile;
  /** Crop type identifier */
  cropType: CropType;
  /** Convenience: singular harvest unit name */
  unit: string;
  /** Convenience: plural harvest unit name */
  units: string;
  /** Convenience: singular container name */
  container: string;
  /** Convenience: plural container name */
  containers: string;
}

export function useCropProfile(): UseCropProfileResult {
  const settings = useHarvestStore(state => state.settings);
  const cropType = (settings as unknown as Record<string, unknown> | null)?.crop_type as
    | CropType
    | undefined;

  return useMemo(() => {
    const profile = getCropProfile(cropType);
    return {
      profile,
      cropType: profile.type,
      unit: profile.harvestUnit,
      units: profile.harvestUnitPlural,
      container: profile.containerName,
      containers: profile.containerPlural,
    };
  }, [cropType]);
}
