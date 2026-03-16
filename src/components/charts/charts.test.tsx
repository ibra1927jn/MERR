/**
 * Tests for TrendLineChart — pure SVG chart component
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import TrendLineChart from './TrendLineChart';

describe('TrendLineChart', () => {
    const sampleData = [
        { label: 'Mon', value: 10 },
        { label: 'Tue', value: 15 },
        { label: 'Wed', value: 12 },
        { label: 'Thu', value: 20 },
        { label: 'Fri', value: 18 },
    ];

    it('renders an SVG element', () => {
        const { container } = render(<TrendLineChart data={sampleData} />);
        expect(container.querySelector('svg')).toBeTruthy();
    });

    it('renders data point circles', () => {
        const { container } = render(<TrendLineChart data={sampleData} />);
        // Each data point should have a circle
        const circles = container.querySelectorAll('circle');
        expect(circles.length).toBeGreaterThanOrEqual(sampleData.length);
    });

    it('renders x-axis labels', () => {
        render(<TrendLineChart data={sampleData} />);
        expect(screen.getByText('Mon')).toBeTruthy();
        expect(screen.getByText('Fri')).toBeTruthy();
    });

    it('renders target line when provided', () => {
        const { container } = render(<TrendLineChart data={sampleData} targetLine={14} targetLabel="Min Wage" />);
        // Target line label is rendered inside SVG <text>, use container query
        const allTexts = container.querySelectorAll('text');
        const hasTarget = Array.from(allTexts).some(t => t.textContent?.includes('Min Wage'));
        expect(hasTarget).toBe(true);
    });

    it('does NOT render target label when not provided', () => {
        render(<TrendLineChart data={sampleData} />);
        expect(screen.queryByText('Target')).toBeNull();
    });

    it('renders fallback with empty data (no crash)', () => {
        render(<TrendLineChart data={[]} />);
        // Component renders fallback div with "No trend data available" text
        expect(screen.getByText('No trend data available')).toBeTruthy();
    });

    it('renders with single data point (no crash)', () => {
        const { container } = render(<TrendLineChart data={[{ label: 'Only', value: 5 }]} />);
        expect(container.querySelector('svg')).toBeTruthy();
    });

    it('calls onPointClick when clicking a data point', () => {
        const onPointClick = vi.fn();
        const { container } = render(
            <TrendLineChart data={sampleData} onPointClick={onPointClick} />,
        );
        const circles = container.querySelectorAll('circle');
        if (circles.length > 0) {
            fireEvent.click(circles[0]);
            expect(onPointClick).toHaveBeenCalled();
        }
    });

    it('renders value tooltip on hover', () => {
        const { container } = render(<TrendLineChart data={sampleData} />);
        const circles = container.querySelectorAll('circle');
        if (circles.length > 0) {
            fireEvent.mouseEnter(circles[0]);
            // After hover, tooltip text should appear
            expect(screen.getByText('10')).toBeTruthy();
        }
    });
});
