/**
 * GoalProgress — Deep render tests
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import GoalProgress from './GoalProgress';

describe('GoalProgress', () => {
    const defaultProps = {
        progress: 65,
        currentTons: 4.2,
        targetTons: 6.5,
        eta: '14:30',
        etaStatus: 'on_track' as const,
        totalBuckets: 302,
        hoursElapsed: 4,
    };

    it('renders Daily Target label', () => {
        render(<GoalProgress {...defaultProps} />);
        expect(screen.getByText('Daily Target')).toBeTruthy();
    });

    it('renders progress percentage', () => {
        render(<GoalProgress {...defaultProps} />);
        expect(screen.getByText(/65%/)).toBeTruthy();
    });

    it('renders Complete label', () => {
        render(<GoalProgress {...defaultProps} />);
        expect(screen.getByText('Complete')).toBeTruthy();
    });

    it('renders tons progress', () => {
        render(<GoalProgress {...defaultProps} />);
        expect(screen.getByText('4.2 / 6.5 t')).toBeTruthy();
    });

    it('renders ETA', () => {
        render(<GoalProgress {...defaultProps} />);
        expect(screen.getByText('ETA: 14:30')).toBeTruthy();
    });

    it('shows smart projection when hours > 0.5', () => {
        render(<GoalProgress {...defaultProps} />);
        expect(screen.getByText(/Projected end-of-day/)).toBeTruthy();
    });

    it('shows projected buckets count', () => {
        render(<GoalProgress {...defaultProps} />);
        // 302 / 4 * 8 = 604
        expect(screen.getByText(/604 buckets/)).toBeTruthy();
    });

    it('does not show projection when hoursElapsed < 0.5', () => {
        render(<GoalProgress {...defaultProps} hoursElapsed={0.3} />);
        expect(screen.queryByText(/Projected end-of-day/)).toBeNull();
    });

    it('shows ahead status with green indicator', () => {
        render(<GoalProgress {...defaultProps} etaStatus="ahead" />);
        expect(screen.getByText('rocket_launch')).toBeTruthy();
    });

    it('shows behind status with warning', () => {
        render(<GoalProgress {...defaultProps} etaStatus="behind" />);
        expect(screen.getByText('warning')).toBeTruthy();
    });
});
