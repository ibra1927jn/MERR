/**
 * InsightsView — Deep render + tab switching tests
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@/i18n';

vi.mock('@/stores/useHarvestStore', () => ({
    useHarvestStore: (selector: any) => {
        const state = {
            orchard: { name: 'Test Orchard' },
            crew: [
                { role: 'picker' }, { role: 'picker' }, { role: 'runner' },
            ],
        };
        return selector(state);
    },
}));

vi.mock('@/components/ui/ComponentErrorBoundary', () => ({
    default: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/PageHeader', () => ({
    default: ({ title, subtitle, children }: any) => (
        <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
            {children}
        </div>
    ),
}));

import InsightsView from './InsightsView';

const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <I18nProvider>{children}</I18nProvider>
);

describe('InsightsView', () => {
    it('renders Insights & Analytics heading', () => {
        render(<InsightsView />, { wrapper: Wrapper });
        expect(screen.getByText('Insights & Analytics')).toBeTruthy();
    });

    it('renders Analytics tab button', () => {
        render(<InsightsView />, { wrapper: Wrapper });
        expect(screen.getByText('Analytics')).toBeTruthy();
    });

    it('renders Weekly Report tab button', () => {
        render(<InsightsView />, { wrapper: Wrapper });
        expect(screen.getByText('Weekly Report')).toBeTruthy();
    });

    it('renders Fraud Shield tab button', () => {
        render(<InsightsView />, { wrapper: Wrapper });
        expect(screen.getByText('Fraud Shield')).toBeTruthy();
    });

    it('includes orchard name in subtitle', () => {
        render(<InsightsView />, { wrapper: Wrapper });
        expect(screen.getByText(/Test Orchard/)).toBeTruthy();
    });

    it('switches active tab on click', () => {
        render(<InsightsView />, { wrapper: Wrapper });
        // Click Weekly Report — should change active tab styling
        fireEvent.click(screen.getByText('Weekly Report'));
        // The button should now have the active class
        const weeklyBtn = screen.getByText('Weekly Report').closest('button');
        expect(weeklyBtn?.className).toContain('bg-primary');
    });
});
