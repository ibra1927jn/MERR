/**
 * SmartDismissals — Deep render + interaction tests
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SmartDismissals from './SmartDismissals';

const dismissed = [
    { scenario: 'Picker near tractor during break', reason: 'Break time detected by system', rule: 'break_proximity' },
    { scenario: 'Low bucket count first hour', reason: 'Normal ramp-up pattern', rule: 'ramp_up' },
    { scenario: 'GPS drift near shed', reason: 'Known GPS dead zone', rule: 'gps_exclusion' },
];

describe('SmartDismissals', () => {
    it('renders Smart Dismissals heading', () => {
        render(<SmartDismissals dismissed={dismissed} />);
        expect(screen.getByText('Smart Dismissals')).toBeTruthy();
    });

    it('shows count of dismissed scenarios', () => {
        render(<SmartDismissals dismissed={dismissed} />);
        expect(screen.getByText(/3 scenarios correctly ignored/)).toBeTruthy();
    });

    it('does not show details initially', () => {
        render(<SmartDismissals dismissed={dismissed} />);
        expect(screen.queryByText('Picker near tractor during break')).toBeNull();
    });

    it('shows details after clicking expand', () => {
        render(<SmartDismissals dismissed={dismissed} />);
        fireEvent.click(screen.getByText('Smart Dismissals'));
        expect(screen.getByText('Picker near tractor during break')).toBeTruthy();
        expect(screen.getByText('Normal ramp-up pattern')).toBeTruthy();
    });

    it('shows rule badges after expanding', () => {
        render(<SmartDismissals dismissed={dismissed} />);
        fireEvent.click(screen.getByText('Smart Dismissals'));
        expect(screen.getByText('Rule: break_proximity')).toBeTruthy();
        expect(screen.getByText('Rule: ramp_up')).toBeTruthy();
        expect(screen.getByText('Rule: gps_exclusion')).toBeTruthy();
    });

    it('hides details after second click', () => {
        render(<SmartDismissals dismissed={dismissed} />);
        fireEvent.click(screen.getByText('Smart Dismissals'));
        expect(screen.getByText('Picker near tractor during break')).toBeTruthy();
        fireEvent.click(screen.getByText('Smart Dismissals'));
        expect(screen.queryByText('Picker near tractor during break')).toBeNull();
    });
});
