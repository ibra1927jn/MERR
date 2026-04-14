/**
 * Tests for VelocityChart (manager views)
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@/i18n';

// Mock analyticsService
const mockGroupByHour = vi.fn().mockReturnValue([
    { hour: '06:00', count: 10 },
    { hour: '07:00', count: 25 },
    { hour: '08:00', count: 40 },
    { hour: '09:00', count: 35 },
    { hour: '10:00', count: 50 },
    { hour: '11:00', count: 45 },
    { hour: '12:00', count: 30 },
    { hour: '13:00', count: 20 },
]);

vi.mock('@/services/analytics.service', () => ({
    analyticsService: {
        groupByHour: (...args: any[]) => mockGroupByHour(...args),
    },
}));

import VelocityChart from './VelocityChart';

const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <I18nProvider>{children}</I18nProvider>
);

describe('VelocityChart', () => {
    it('renders header with title', () => {
        render(<VelocityChart bucketRecords={[]} />, { wrapper: Wrapper });
        expect(screen.getByText('Velocity (Hourly)')).toBeTruthy();
    });

    it('shows total buckets count', () => {
        render(<VelocityChart bucketRecords={[]} />, { wrapper: Wrapper });
        // 10+25+40+35+50+45+30+20 = 255
        expect(screen.getByText('255')).toBeTruthy();
    });

    it('shows legend when data exists', () => {
        render(<VelocityChart bucketRecords={[]} />, { wrapper: Wrapper });
        expect(screen.getByText('Current hour')).toBeTruthy();
        expect(screen.getByText('Above target')).toBeTruthy();
    });

    it('shows Last 8 hours subtitle', () => {
        render(<VelocityChart bucketRecords={[]} />, { wrapper: Wrapper });
        expect(screen.getByText('Last 8 hours')).toBeTruthy();
    });

    it('shows zero data state when groupByHour returns all zeros', () => {
        mockGroupByHour.mockReturnValueOnce(Array(8).fill({ hour: '06:00', count: 0 }));
        render(<VelocityChart bucketRecords={[]} />, { wrapper: Wrapper });
        expect(screen.getByText('Awaiting First Scan')).toBeTruthy();
    });
});
