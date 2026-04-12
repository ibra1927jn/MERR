/**
 * SettingsView — Deep render + interaction tests
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockHandleChange = vi.fn();
const mockHandleSave = vi.fn();
const mockSetCompliance = vi.fn();
const mockHandleNotifToggle = vi.fn();
const mockHandleNotifType = vi.fn();
const mockHandleSendTest = vi.fn();

vi.mock('@/hooks/useSettings', () => ({
    useSettings: () => ({
        orchard: { id: 'o1', name: 'Green Valley Orchard', total_rows: 42 },
        currentUser: { id: 'u1', name: 'John Manager', role: 'manager' },
        initials: 'JM',
        formData: {
            piece_rate: 6.50,
            min_wage_rate: 23.95,
            min_buckets_per_hour: 4,
            target_tons: 12,
            variety: 'Apple',
        },
        handleChange: mockHandleChange,
        compliance: {
            nz_employment_standards: true,
            auto_wage_alerts: true,
            safety_verification: false,
            audit_trail: true,
        },
        setCompliance: mockSetCompliance,
        notifEnabled: true,
        handleNotifToggle: mockHandleNotifToggle,
        notifTypes: {
            visa_expiry: true,
            qc_reject: false,
            transport: true,
            attendance: false,
        },
        handleNotifType: mockHandleNotifType,
        notifTestSent: false,
        handleSendTest: mockHandleSendTest,
        hasChanges: true,
        isSaving: false,
        saveStatus: null,
        handleSave: mockHandleSave,
    }),
}));

vi.mock('@/i18n', () => ({
    useTranslation: () => ({
        locale: 'en',
        setLocale: vi.fn(),
        t: (key: string) => key,
    }),
    SUPPORTED_LOCALES: [
        { code: 'en', flag: '🇬🇧', nativeName: 'English' },
        { code: 'es', flag: '🇪🇸', nativeName: 'Español' },
    ],
}));

vi.mock('./DayClosureButton', () => ({
    DayClosureButton: () => <button data-testid="day-closure-btn">Close Day</button>,
}));

vi.mock('@/components/ui/PageHeader', () => ({
    default: ({ title, subtitle }: any) => (
        <div data-testid="page-header">
            <h1>{title}</h1>
            <p>{subtitle}</p>
        </div>
    ),
}));

vi.mock('./settings/SettingsFormComponents', () => ({
    SettingsSection: ({ title, children }: any) => (
        <section data-testid={`section-${title}`}>
            <h3>{title}</h3>
            {children}
        </section>
    ),
    FormField: ({ label, value, onChange, type }: any) => (
        <div data-testid={`field-${label}`}>
            <label>{label}</label>
            {type === 'select' ? (
                <select value={value} onChange={(e) => onChange(e.target.value)}>
                    <option>{value}</option>
                </select>
            ) : (
                <input value={value} onChange={(e) => onChange(e.target.value)} />
            )}
        </div>
    ),
    ReadonlyField: ({ label, value }: any) => (
        <div data-testid={`readonly-${label}`}>
            <label>{label}</label>
            <span>{value}</span>
        </div>
    ),
    ToggleRow: ({ label, description, checked, onChange, locked }: any) => (
        <div data-testid={`toggle-${label}`}>
            <span>{label}</span>
            {description && <span>{description}</span>}
            <input type="checkbox" checked={checked} onChange={(e) => !locked && onChange(e.target.checked)} />
        </div>
    ),
}));

import SettingsView from './SettingsView';

describe('SettingsView', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders Settings page header', () => {
        render(<SettingsView />);
        expect(screen.getByText('Settings')).toBeTruthy();
    });

    it('renders user profile card with initials', () => {
        render(<SettingsView />);
        expect(screen.getByText('JM')).toBeTruthy();
    });

    it('renders user name and role', () => {
        render(<SettingsView />);
        expect(screen.getByText('John Manager')).toBeTruthy();
        expect(screen.getByText(/manager/)).toBeTruthy();
    });

    it('renders orchard name', () => {
        render(<SettingsView />);
        // Orchard name appears in both subtitle and profile card
        expect(screen.getAllByText(/Green Valley Orchard/).length).toBeGreaterThanOrEqual(1);
    });

    it('renders profile stats (Rows, Rate, Target)', () => {
        render(<SettingsView />);
        // Stats cards show: Rows, Rate, Target
        expect(screen.getByText('Rows')).toBeTruthy();
        expect(screen.getByText('Rate')).toBeTruthy();
        expect(screen.getByText('Target')).toBeTruthy();
    });

    it('renders Harvest Configuration section', () => {
        render(<SettingsView />);
        expect(screen.getByText('Harvest Configuration')).toBeTruthy();
    });

    it('renders Orchard Details section', () => {
        render(<SettingsView />);
        expect(screen.getByText('Orchard Details')).toBeTruthy();
    });

    it('renders Compliance Settings section', () => {
        render(<SettingsView />);
        expect(screen.getByText('Compliance Settings')).toBeTruthy();
    });

    it('renders Notifications section', () => {
        render(<SettingsView />);
        expect(screen.getByText('Notifications')).toBeTruthy();
    });

    it('renders Danger Zone section', () => {
        render(<SettingsView />);
        expect(screen.getByText('Danger Zone')).toBeTruthy();
    });

    it('renders Save Changes button when changes exist', () => {
        render(<SettingsView />);
        expect(screen.getByText('Save Changes')).toBeTruthy();
    });

    it('calls handleSave when Save button clicked', () => {
        render(<SettingsView />);
        fireEvent.click(screen.getByText('Save Changes'));
        expect(mockHandleSave).toHaveBeenCalled();
    });

    it('renders DayClosureButton in Danger Zone', () => {
        render(<SettingsView />);
        expect(screen.getByTestId('day-closure-btn')).toBeTruthy();
    });

    it('renders Day Closure description', () => {
        render(<SettingsView />);
        expect(screen.getByText('Day Closure')).toBeTruthy();
        expect(screen.getByText(/Finalize payroll/)).toBeTruthy();
    });

    it('renders Reset button in Danger Zone', () => {
        render(<SettingsView />);
        expect(screen.getByText('Reset')).toBeTruthy();
    });

    it('renders language selector', () => {
        render(<SettingsView />);
        expect(screen.getByText('English')).toBeTruthy();
        expect(screen.getByText('Español')).toBeTruthy();
    });

    it('renders footer with version info', () => {
        render(<SettingsView />);
        expect(screen.getByText(/HarvestPro NZ/)).toBeTruthy();
        expect(screen.getByText(/v9.0.0/)).toBeTruthy();
    });

    it('renders Send Test Notification button when notifs enabled', () => {
        render(<SettingsView />);
        expect(screen.getByText('Send Test Notification')).toBeTruthy();
    });

    it('calls handleSendTest on test notification button click', () => {
        render(<SettingsView />);
        fireEvent.click(screen.getByText('Send Test Notification'));
        expect(mockHandleSendTest).toHaveBeenCalled();
    });
});
