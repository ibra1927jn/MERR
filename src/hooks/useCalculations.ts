/**
 * useCalculations Hook
 * React hook wrapper for calculationsService
 */
import { useMemo } from 'react';
import { calculationsService } from '../services/calculations.service';

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
        return {
            status: calculationsService.calculatePickerStatus(buckets, hours),
            isUnderMinimum: calculationsService.isUnderMinimum(buckets, hours),
            bucketsPerHour: calculationsService.getBucketsPerHour(buckets, hours),
            earnings: calculationsService.calculateEarnings(buckets),
            hourlyEarnings: calculationsService.calculateHourlyEarnings(buckets, hours),
            bucketsNeeded: calculationsService.bucketsNeededForMinimum(buckets, hours, hoursRemaining),
        };
    }, [buckets, hours, hoursRemaining]);
};

export default useCalculations;
