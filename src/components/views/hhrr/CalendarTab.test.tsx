/**
 * CalendarTab — Deep render tests
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CalendarTab from './CalendarTab';

describe('CalendarTab', () => {
    it('renders Preview Only banner', () => {
        render(<CalendarTab />);
        expect(screen.getByText(/Preview Only/)).toBeTruthy();
    });

    it('renders Today\'s Schedule heading', () => {
        render(<CalendarTab />);
        expect(screen.getByText("Today's Schedule")).toBeTruthy();
    });

    it('renders schedule items', () => {
        render(<CalendarTab />);
        expect(screen.getByText('07:00')).toBeTruthy();
        expect(screen.getByText('Shift Start — All Teams')).toBeTruthy();
        expect(screen.getByText('10:00')).toBeTruthy();
        expect(screen.getByText('New Employee Induction')).toBeTruthy();
        expect(screen.getByText('12:00')).toBeTruthy();
        expect(screen.getByText('15:00')).toBeTruthy();
        expect(screen.getByText('17:00')).toBeTruthy();
    });

    it('renders Upcoming Leave heading', () => {
        render(<CalendarTab />);
        expect(screen.getByText('Upcoming Leave')).toBeTruthy();
    });

    it('renders leave entries', () => {
        render(<CalendarTab />);
        expect(screen.getByText('Aroha W.')).toBeTruthy();
        expect(screen.getByText('Mateo S.')).toBeTruthy();
    });

    it('renders leave types', () => {
        render(<CalendarTab />);
        expect(screen.getByText(/Annual Leave/)).toBeTruthy();
        expect(screen.getByText(/Sick Leave/)).toBeTruthy();
    });

    it('renders leave status badges', () => {
        render(<CalendarTab />);
        expect(screen.getByText('approved')).toBeTruthy();
        expect(screen.getByText('pending')).toBeTruthy();
    });
});
