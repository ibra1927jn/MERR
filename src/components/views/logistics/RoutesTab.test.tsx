/**
 * RoutesTab — Deep render tests
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RoutesTab from './RoutesTab';

describe('RoutesTab', () => {
    it('renders Route Planning heading', () => {
        render(<RoutesTab />);
        expect(screen.getByText('Route Planning')).toBeTruthy();
    });

    it('shows Coming Soon banner', () => {
        render(<RoutesTab />);
        expect(screen.getByText(/Coming Soon/)).toBeTruthy();
    });

    it('shows Plan New Route button (disabled)', () => {
        render(<RoutesTab />);
        const btn = screen.getByText('Plan New Route');
        expect(btn).toBeTruthy();
        expect((btn as HTMLButtonElement).disabled).toBe(true);
    });

    it('renders Common Routes section', () => {
        render(<RoutesTab />);
        expect(screen.getByText('Common Routes')).toBeTruthy();
    });

    it('shows all 3 common routes', () => {
        render(<RoutesTab />);
        expect(screen.getByText(/A1-A4 → Warehouse/)).toBeTruthy();
        expect(screen.getByText(/B1-B3 → Warehouse/)).toBeTruthy();
        expect(screen.getByText(/C1 → Warehouse/)).toBeTruthy();
    });

    it('shows route distances', () => {
        render(<RoutesTab />);
        expect(screen.getByText(/1.2km/)).toBeTruthy();
        expect(screen.getByText(/0.8km/)).toBeTruthy();
        expect(screen.getByText(/1.5km/)).toBeTruthy();
    });

    it('shows route frequencies', () => {
        render(<RoutesTab />);
        expect(screen.getByText('12/day')).toBeTruthy();
        expect(screen.getByText('8/day')).toBeTruthy();
        expect(screen.getByText('4/day')).toBeTruthy();
    });

    it('shows route times', () => {
        render(<RoutesTab />);
        expect(screen.getByText(/8 min/)).toBeTruthy();
        expect(screen.getByText(/5 min/)).toBeTruthy();
        expect(screen.getByText(/10 min/)).toBeTruthy();
    });
});
