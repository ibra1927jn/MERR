/**
 * DashboardEmptyState — Deep render tests
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../../SimulationBanner', () => ({
    SimulationBanner: () => <div data-testid="simulation-banner">Sim</div>,
}));

vi.mock('../../common/TrustBadges', () => ({
    TrustBadges: () => <div data-testid="trust-badges">Trust</div>,
}));

import DashboardEmptyState from './DashboardEmptyState';

describe('DashboardEmptyState', () => {
    const setActiveTab = vi.fn();

    it('renders No Harvest Data Yet heading', () => {
        render(<DashboardEmptyState setActiveTab={setActiveTab} />);
        expect(screen.getByText('No Harvest Data Yet')).toBeTruthy();
    });

    it('renders description text', () => {
        render(<DashboardEmptyState setActiveTab={setActiveTab} />);
        expect(screen.getByText(/Add your crew and start scanning/)).toBeTruthy();
    });

    it('renders SimulationBanner', () => {
        render(<DashboardEmptyState setActiveTab={setActiveTab} />);
        expect(screen.getByTestId('simulation-banner')).toBeTruthy();
    });

    it('renders TrustBadges', () => {
        render(<DashboardEmptyState setActiveTab={setActiveTab} />);
        expect(screen.getByTestId('trust-badges')).toBeTruthy();
    });

    it('renders Add Pickers button', () => {
        render(<DashboardEmptyState setActiveTab={setActiveTab} />);
        expect(screen.getByText('Add Pickers')).toBeTruthy();
    });

    it('renders View Map button', () => {
        render(<DashboardEmptyState setActiveTab={setActiveTab} />);
        expect(screen.getByText('View Map')).toBeTruthy();
    });

    it('navigates to teams tab when Add Pickers clicked', () => {
        render(<DashboardEmptyState setActiveTab={setActiveTab} />);
        fireEvent.click(screen.getByText('Add Pickers'));
        expect(setActiveTab).toHaveBeenCalledWith('teams');
    });

    it('navigates to map tab when View Map clicked', () => {
        render(<DashboardEmptyState setActiveTab={setActiveTab} />);
        fireEvent.click(screen.getByText('View Map'));
        expect(setActiveTab).toHaveBeenCalledWith('map');
    });
});
