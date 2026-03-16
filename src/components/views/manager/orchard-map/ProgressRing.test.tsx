/**
 * ProgressRing — SVG circular progress indicator tests
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProgressRing from './ProgressRing';

describe('ProgressRing', () => {
    it('renders 0% for zero progress', () => {
        render(<ProgressRing progress={0} />);
        expect(screen.getByText('0%')).toBeTruthy();
    });

    it('renders 50% for half progress', () => {
        render(<ProgressRing progress={0.5} />);
        expect(screen.getByText('50%')).toBeTruthy();
    });

    it('renders 100% for full progress', () => {
        render(<ProgressRing progress={1} />);
        expect(screen.getByText('100%')).toBeTruthy();
    });

    it('renders with custom size', () => {
        const { container } = render(<ProgressRing progress={0.75} size={64} />);
        const svg = container.querySelector('svg');
        expect(svg?.getAttribute('width')).toBe('64');
    });

    it('rounds percentage correctly', () => {
        render(<ProgressRing progress={0.333} />);
        expect(screen.getByText('33%')).toBeTruthy();
    });
});
