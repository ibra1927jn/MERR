/**
 * SettingsFormComponents — SettingsSection, FormField, ReadonlyField, ToggleRow tests
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsSection, FormField, ReadonlyField, ToggleRow } from './SettingsFormComponents';

describe('SettingsSection', () => {
    it('renders title', () => {
        render(
            <SettingsSection icon="settings" iconBg="bg-indigo-100" iconColor="text-indigo-600" title="Wage Settings" accentColor="border-indigo-500" stagger={1}>
                <div>Content</div>
            </SettingsSection>
        );
        expect(screen.getByText('Wage Settings')).toBeTruthy();
    });

    it('renders subtitle', () => {
        render(
            <SettingsSection icon="settings" iconBg="bg-indigo-100" iconColor="text-indigo-600" title="Rates" subtitle="NZ Minimum Wage" accentColor="border-indigo-500" stagger={1}>
                <div>Content</div>
            </SettingsSection>
        );
        expect(screen.getByText('NZ Minimum Wage')).toBeTruthy();
    });

    it('renders children', () => {
        render(
            <SettingsSection icon="settings" iconBg="bg-indigo-100" iconColor="text-indigo-600" title="Test" accentColor="border-indigo-500" stagger={1}>
                <div data-testid="child">Child Content</div>
            </SettingsSection>
        );
        expect(screen.getByTestId('child')).toBeTruthy();
    });
});

describe('FormField', () => {
    it('renders label', () => {
        render(<FormField label="Minimum Wage" value={23.5} onChange={vi.fn()} type="number" />);
        expect(screen.getByText('Minimum Wage')).toBeTruthy();
    });

    it('renders prefix', () => {
        render(<FormField label="Rate" value={23.5} onChange={vi.fn()} prefix="$" type="number" />);
        expect(screen.getByText('$')).toBeTruthy();
    });

    it('renders suffix', () => {
        render(<FormField label="Rate" value={23.5} onChange={vi.fn()} suffix="/hr" type="number" />);
        expect(screen.getByText('/hr')).toBeTruthy();
    });

    it('calls onChange for number input', () => {
        const onChange = vi.fn();
        render(<FormField label="Rate" value={23.5} onChange={onChange} type="number" />);
        // type="number" inputs render as type="text" with inputMode="decimal" to force '.' decimal separator
        const input = screen.getByRole('textbox', { name: 'Rate' });
        fireEvent.change(input, { target: { value: '25' } });
        expect(onChange).toHaveBeenCalledWith(25);
    });

    it('renders select with options', () => {
        render(<FormField label="Variety" value="Gala" onChange={vi.fn()} type="select" options={['Gala', 'Fuji', 'Jazz']} />);
        expect(screen.getByText('Gala')).toBeTruthy();
        expect(screen.getByText('Fuji')).toBeTruthy();
        expect(screen.getByText('Jazz')).toBeTruthy();
    });
});

describe('ReadonlyField', () => {
    it('renders label and value', () => {
        render(<ReadonlyField label="Orchard" value="Hawke's Bay" />);
        expect(screen.getByText('Orchard')).toBeTruthy();
        expect(screen.getByText("Hawke's Bay")).toBeTruthy();
    });

    it('renders icon', () => {
        render(<ReadonlyField label="Location" value="NZ" icon="location_on" />);
        expect(screen.getByText('location_on')).toBeTruthy();
    });
});

describe('ToggleRow', () => {
    it('renders label', () => {
        render(<ToggleRow label="Auto-sync" checked={true} onChange={vi.fn()} />);
        expect(screen.getByText('Auto-sync')).toBeTruthy();
    });

    it('renders description', () => {
        render(<ToggleRow label="Auto-sync" description="Sync every 30s" checked={true} onChange={vi.fn()} />);
        expect(screen.getByText('Sync every 30s')).toBeTruthy();
    });

    it('calls onChange when toggled', () => {
        const onChange = vi.fn();
        render(<ToggleRow label="Auto-sync" checked={false} onChange={onChange} />);
        fireEvent.click(screen.getByRole('switch'));
        expect(onChange).toHaveBeenCalledWith(true);
    });

    it('does not call onChange when locked', () => {
        const onChange = vi.fn();
        render(<ToggleRow label="Premium Feature" checked={false} onChange={onChange} locked={true} />);
        fireEvent.click(screen.getByRole('switch'));
        expect(onChange).not.toHaveBeenCalled();
    });

    it('shows lock icon when locked', () => {
        render(<ToggleRow label="Premium" checked={false} onChange={vi.fn()} locked={true} />);
        expect(screen.getByText('lock')).toBeTruthy();
    });
});
