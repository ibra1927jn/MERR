/**
 * SummaryCard Component Tests
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SummaryCard from './SummaryCard';

describe('SummaryCard', () => {
    it('renders icon, label, and value', () => {
        render(<SummaryCard icon="group" iconColor="text-emerald-500" label="Workers" value={42} />);
        expect(screen.getByText('Workers')).toBeTruthy();
        expect(screen.getByText('42')).toBeTruthy();
        expect(screen.getByText('group')).toBeTruthy();
    });

    it('renders string values', () => {
        render(<SummaryCard icon="payments" iconColor="text-blue-500" label="Total" value="$1.2k" />);
        expect(screen.getByText('$1.2k')).toBeTruthy();
    });

    it('applies highlight styling when highlight is true', () => {
        const { container } = render(
            <SummaryCard icon="check" iconColor="text-green-500" label="Status" value="OK" highlight highlightColor="emerald" />
        );
        const card = container.firstElementChild;
        expect(card?.className).toContain('emerald');
    });

    it('renders progress bar when progress is provided', () => {
        const { container } = render(
            <SummaryCard icon="inventory" iconColor="text-red-500" label="Full Bins" value={10} progress={75} progressColor="bg-red-400" />
        );
        // The progress bar has inline style with width
        const progressBars = container.querySelectorAll('[style*="width"]');
        expect(progressBars.length).toBeGreaterThan(0);
    });

    it('does not render progress bar when progress is not provided', () => {
        const { container } = render(
            <SummaryCard icon="group" iconColor="text-blue-500" label="Test" value={5} />
        );
        // Should not have the progress bar height element
        const progressElements = container.querySelectorAll('[style*="width"]');
        expect(progressElements.length).toBe(0);
    });

    it('renders zero value correctly', () => {
        render(<SummaryCard icon="warning" iconColor="text-amber-500" label="Alerts" value={0} />);
        expect(screen.getByText('0')).toBeTruthy();
    });
});
