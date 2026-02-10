/**
 * useCalculations Hook
 * Self-contained picker calculation utilities (no external service dependency)
 */
import { useMemo } from 'react';
import { MINIMUM_WAGE, PIECE_RATE } from '../types';

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
    hourlyEarnings: number;
    bucketsNeeded: number;
}

export const useCalculations = (options: CalculationOptions): PickerCalculations => {
    const { buckets, hours, hoursRemaining = 0 } = options;

    return useMemo(() => {
        // Status based on hourly earnings vs minimum wage
        const hourlyEarnings = hours > 0 ? (buckets * PIECE_RATE) / hours : 0;
        let status: 'green' | 'orange' | 'red' = 'orange';
        if (hours > 0) {
            if (hourlyEarnings >= MINIMUM_WAGE * 1.1) status = 'green';
            else if (hourlyEarnings < MINIMUM_WAGE) status = 'red';
        }

        // Under minimum check
        const isUnderMinimum = hours > 0 && (buckets / hours) < (MINIMUM_WAGE / PIECE_RATE);

        // Buckets per hour
        const bucketsPerHour = hours > 0 ? Math.round((buckets / hours) * 10) / 10 : 0;

        // Earnings
        const earnings = buckets * PIECE_RATE;

        // Buckets needed for minimum
        const totalHours = hours + hoursRemaining;
        const totalNeeded = Math.ceil((MINIMUM_WAGE * totalHours) / PIECE_RATE);
        const bucketsNeeded = Math.max(0, totalNeeded - buckets);

        return { status, isUnderMinimum, bucketsPerHour, earnings, hourlyEarnings, bucketsNeeded };
    }, [buckets, hours, hoursRemaining]);
};

export default useCalculations;
