/**
 * Calculations Service Tests
 * Unit tests for all calculation functions
 */
import { describe, it, expect } from 'vitest';
import { calculationsService } from './calculations.service';

describe('calculationsService', () => {
    describe('calculatePickerStatus', () => {
        it('should return orange when hoursWorked is 0', () => {
            expect(calculationsService.calculatePickerStatus(10, 0)).toBe('orange');
        });

        it('should return green when earnings are 10% above minimum wage', () => {
            // At $6.50/bucket and $23.50 min wage, need ~3.62 buckets/hour for minimum
            // 10% above = ~$25.85/hr
            // 4 buckets * $6.50 = $26.00 (Green)
            expect(calculationsService.calculatePickerStatus(4, 1)).toBe('green');
        });

        it('should return orange when at minimum wage', () => {
            // 3.7 buckets * $6.50 = $24.05
            // Min wage $23.50 < $24.05 < $25.85 (110%)
            expect(calculationsService.calculatePickerStatus(3.7, 1)).toBe('orange');
        });

        it('should return red when below minimum wage', () => {
            // 2 buckets * $6.50 = $13.00 < $23.50
            expect(calculationsService.calculatePickerStatus(2, 1)).toBe('red');
        });
    });

    // ... (omitting unchanged sections for brevity if possible, but replace_file_content needs contiguous block or separate calls. I will do one large block for safety or separate checks. Given the structure, I'll update the specific blocks).

    describe('isBinFull', () => {
        it('should return true when bucket count is 72 or more', () => {
            expect(calculationsService.isBinFull(72)).toBe(true);
            expect(calculationsService.isBinFull(80)).toBe(true);
        });

        it('should return false when bucket count is less than 72', () => {
            expect(calculationsService.isBinFull(71)).toBe(false);
            expect(calculationsService.isBinFull(0)).toBe(false);
        });
    });

    describe('getBinFillPercentage', () => {
        it('should return correct percentage', () => {
            // 36 buckets / 72 max = 50%
            expect(calculationsService.getBinFillPercentage(36)).toBe(50);
        });

        // ...
    });

    // ...

    describe('bucketsNeededForMinimum', () => {
        it('should calculate remaining buckets needed', () => {
            // 8 hours total at $23.50/hr = $188 needed / $6.50 = ~29 buckets
            const needed = calculationsService.bucketsNeededForMinimum(10, 4, 4);
            expect(needed).toBeGreaterThan(0);
        });

        // ...
    });

    // ...

    describe('calculateDailyPayroll', () => {
        // ...
        it('should add minimum wage top-up when needed', () => {
            const crew = [{ buckets: 10, hours: 8 }];
            const result = calculationsService.calculateDailyPayroll(crew);
            // Piece: 10 * 6.50 = $65
            // Min wage: 8 * 23.50 = $188
            // Top-up: $188 - $65 = $123
            expect(result.totalPiece).toBe(65);
            expect(result.totalMinimum).toBe(123);
            expect(result.finalTotal).toBe(188);
        });
        // ...
    });

    describe('isUnderMinimum', () => {
        it('should return false when hoursWorked is 0', () => {
            expect(calculationsService.isUnderMinimum(0, 0)).toBe(false);
        });

        it('should return true when below minimum buckets per hour', () => {
            expect(calculationsService.isUnderMinimum(2, 1)).toBe(true);
        });

        it('should return false when at or above minimum', () => {
            expect(calculationsService.isUnderMinimum(4, 1)).toBe(false);
        });
    });

    describe('getBucketsPerHour', () => {
        it('should return 0 when hours is 0', () => {
            expect(calculationsService.getBucketsPerHour(10, 0)).toBe(0);
        });

        it('should calculate buckets per hour correctly', () => {
            expect(calculationsService.getBucketsPerHour(10, 2)).toBe(5);
        });

        it('should round to one decimal place', () => {
            expect(calculationsService.getBucketsPerHour(10, 3)).toBe(3.3);
        });
    });

    describe('isBinFull', () => {
        it('should return true when bucket count is 72 or more', () => {
            expect(calculationsService.isBinFull(72)).toBe(true);
            expect(calculationsService.isBinFull(80)).toBe(true);
        });

        it('should return false when bucket count is less than 72', () => {
            expect(calculationsService.isBinFull(71)).toBe(false);
            expect(calculationsService.isBinFull(0)).toBe(false);
        });
    });

    describe('getBinFillPercentage', () => {
        it('should return correct percentage', () => {
            // 36 buckets / 72 max = 50%
            expect(calculationsService.getBinFillPercentage(36)).toBe(50);
        });

        it('should cap at 100%', () => {
            expect(calculationsService.getBinFillPercentage(100)).toBe(100);
        });

        it('should return 0 for empty bin', () => {
            expect(calculationsService.getBinFillPercentage(0)).toBe(0);
        });
    });

    describe('calculateEarnings', () => {
        it('should calculate earnings correctly', () => {
            // At $6.50 per bucket
            expect(calculationsService.calculateEarnings(10)).toBe(65);
        });

        it('should return 0 for no buckets', () => {
            expect(calculationsService.calculateEarnings(0)).toBe(0);
        });
    });

    describe('calculateHourlyEarnings', () => {
        it('should return 0 when hours is 0', () => {
            expect(calculationsService.calculateHourlyEarnings(10, 0)).toBe(0);
        });

        it('should calculate hourly earnings correctly', () => {
            expect(calculationsService.calculateHourlyEarnings(10, 2)).toBe(32.5);
        });
    });

    describe('bucketsNeededForMinimum', () => {
        it('should calculate remaining buckets needed', () => {
            // 8 hours total at $23.50/hr = $188 needed / $6.50 = ~29 buckets
            const needed = calculationsService.bucketsNeededForMinimum(10, 4, 4);
            expect(needed).toBeGreaterThan(0);
        });

        it('should return 0 if already above minimum', () => {
            expect(calculationsService.bucketsNeededForMinimum(50, 1, 0)).toBe(0);
        });
    });

    describe('calculateTeamVelocity', () => {
        it('should return 0 when hoursElapsed is 0', () => {
            expect(calculationsService.calculateTeamVelocity([{ buckets: 10 }], 0)).toBe(0);
        });

        it('should return 0 when crew is empty', () => {
            expect(calculationsService.calculateTeamVelocity([], 5)).toBe(0);
        });

        it('should calculate team velocity correctly', () => {
            const crew = [{ buckets: 20 }, { buckets: 30 }, { buckets: 10 }];
            expect(calculationsService.calculateTeamVelocity(crew, 2)).toBe(30);
        });
    });

    describe('calculateETA', () => {
        it('should return null when velocity is 0', () => {
            expect(calculationsService.calculateETA(10, 40, 0)).toBeNull();
        });

        it('should return 0 when already at target', () => {
            expect(calculationsService.calculateETA(40, 40, 10)).toBe(0);
        });

        it('should calculate ETA correctly', () => {
            const eta = calculationsService.calculateETA(10, 40, 100);
            expect(eta).toBeGreaterThan(0);
        });
    });

    describe('formatSunExposure', () => {
        it('should format time correctly', () => {
            expect(calculationsService.formatSunExposure(75)).toBe('01:15:00');
            expect(calculationsService.formatSunExposure(0)).toBe('00:00:00');
            expect(calculationsService.formatSunExposure(120)).toBe('02:00:00');
        });
    });

    describe('needsHydrationAlert', () => {
        it('should return true after 90 minutes without break', () => {
            expect(calculationsService.needsHydrationAlert(null, 90)).toBe(true);
            expect(calculationsService.needsHydrationAlert(null, 100)).toBe(true);
        });

        it('should return false before 90 minutes', () => {
            expect(calculationsService.needsHydrationAlert(null, 89)).toBe(false);
        });
    });

    describe('calculateBlockProgress', () => {
        it('should return 0 for empty rows', () => {
            expect(calculationsService.calculateBlockProgress([])).toBe(0);
        });

        it('should calculate average progress', () => {
            const rows = [
                { completion_percentage: 100 },
                { completion_percentage: 50 },
                { completion_percentage: 0 },
            ];
            expect(calculationsService.calculateBlockProgress(rows)).toBe(50);
        });
    });

    describe('getInventoryStatus', () => {
        it('should return ok for 20+ empty bins', () => {
            expect(calculationsService.getInventoryStatus(20)).toBe('ok');
            expect(calculationsService.getInventoryStatus(30)).toBe('ok');
        });

        it('should return low for 10-19 empty bins', () => {
            expect(calculationsService.getInventoryStatus(10)).toBe('low');
            expect(calculationsService.getInventoryStatus(15)).toBe('low');
        });

        it('should return critical for less than 10 empty bins', () => {
            expect(calculationsService.getInventoryStatus(9)).toBe('critical');
            expect(calculationsService.getInventoryStatus(0)).toBe('critical');
        });
    });

    describe('calculateDailyPayroll', () => {
        it('should calculate payroll correctly for piece-rate above minimum', () => {
            const crew = [{ buckets: 50, hours: 8 }];
            const result = calculationsService.calculateDailyPayroll(crew);
            expect(result.totalPiece).toBe(325); // 50 * 6.50
            expect(result.totalMinimum).toBe(0); // Above minimum
            expect(result.finalTotal).toBe(325);
        });

        it('should add minimum wage top-up when needed', () => {
            const crew = [{ buckets: 10, hours: 8 }];
            const result = calculationsService.calculateDailyPayroll(crew);
            // Piece: 10 * 6.50 = $65
            // Min wage: 8 * 23.50 = $188
            // Top-up: $188 - $65 = $123
            expect(result.totalPiece).toBe(65);
            expect(result.totalMinimum).toBe(123);
            expect(result.finalTotal).toBe(188);
        });

        it('should handle empty crew', () => {
            const result = calculationsService.calculateDailyPayroll([]);
            expect(result.totalPiece).toBe(0);
            expect(result.totalMinimum).toBe(0);
            expect(result.finalTotal).toBe(0);
        });
    });
});
