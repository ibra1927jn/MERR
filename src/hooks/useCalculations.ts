/**
 * useCalculations Hook
 * Self-contained picker calculation utilities (no external service dependency)
 *
 * 🔧 Sprint B: Now reads min_wage_rate and piece_rate from settings (configurable).
 *    Falls back to hardcoded constants when settings unavailable (offline safety).
 */
import { useMemo } from 'react';
import { MINIMUM_WAGE, PIECE_RATE } from '../types';
import { useHarvestStore } from '@/stores/useHarvestStore';

interface CalculationOptions {
    buckets: number;
    hours: number;
    hoursRemaining?: number;
}

interface PickerCalculations {
    status: 'green' | 'orange' | 'red';
    isUnderMinimum: boolean;
    bucketsPerHour: number;
    earnings: number;
    /** Total earnings including minimum wage top-up */
    totalEarnings: number;
    /** Dollar top-up required to meet minimum wage */
    topUp: number;
    hourlyEarnings: number;
    bucketsNeeded: number;
}

export const useCalculations = (options: CalculationOptions): PickerCalculations => {
    const { buckets, hours, hoursRemaining = 0 } = options;

    // 🔧 Sprint B: Read from configurable settings (falls back to constants)
    const settings = useHarvestStore((s) => s.settings);
    const minWage = settings?.min_wage_rate ?? MINIMUM_WAGE;
    const pieceRate = settings?.piece_rate ?? PIECE_RATE;

    return useMemo(() => {
        // Piece rate earnings
        const earnings = buckets * pieceRate;

        // Calculate total earnings including minimum wage guarantee
        const minimumGuarantee = hours * minWage;
        const topUp = Math.max(0, minimumGuarantee - earnings);
        const totalEarnings = earnings + topUp;

        // Status based on hourly earnings vs minimum wage
        const hourlyEarnings = hours > 0 ? earnings / hours : 0;
        let status: 'green' | 'orange' | 'red' = 'orange';
        if (hours > 0) {
            if (hourlyEarnings >= minWage * 1.1) status = 'green';
            else if (hourlyEarnings < minWage) status = 'red';
        }

        // Under minimum check
        const isUnderMinimum = hours > 0 && (buckets / hours) < (minWage / pieceRate);

        // Buckets per hour
        const bucketsPerHour = hours > 0 ? Math.round((buckets / hours) * 10) / 10 : 0;

        // Buckets needed for minimum
        const totalHours = hours + hoursRemaining;
        const totalNeeded = Math.ceil((minWage * totalHours) / pieceRate);
        const bucketsNeeded = Math.max(0, totalNeeded - buckets);

        return { status, isUnderMinimum, bucketsPerHour, earnings, totalEarnings, topUp, hourlyEarnings, bucketsNeeded };
    }, [buckets, hours, hoursRemaining, minWage, pieceRate]);
};

export default useCalculations;
