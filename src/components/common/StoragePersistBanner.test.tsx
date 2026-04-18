/**
 * StoragePersistBanner — warning banner cuando sessionStorage flag set.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { StoragePersistBanner } from './StoragePersistBanner';
import { I18nProvider } from '@/i18n';

function renderWithI18n(ui: React.ReactElement) {
    return render(<I18nProvider>{ui}</I18nProvider>);
}

beforeEach(() => {
    sessionStorage.clear();
});

afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
});

describe('StoragePersistBanner', () => {
    it('NO se muestra cuando risk flag ausente', () => {
        const { container } = renderWithI18n(<StoragePersistBanner />);
        expect(container.querySelector('[role="alert"]')).toBeNull();
    });

    it('NO se muestra cuando risk=1 pero dismissed=1', () => {
        sessionStorage.setItem('harvest_storage_risk', '1');
        sessionStorage.setItem('harvest_storage_risk_dismissed', '1');
        const { container } = renderWithI18n(<StoragePersistBanner />);
        expect(container.querySelector('[role="alert"]')).toBeNull();
    });

    it('se muestra cuando risk=1 y no dismissed', () => {
        sessionStorage.setItem('harvest_storage_risk', '1');
        const { container } = renderWithI18n(<StoragePersistBanner />);
        expect(container.querySelector('[role="alert"]')).not.toBeNull();
    });

    it('warning icon + text visible', () => {
        sessionStorage.setItem('harvest_storage_risk', '1');
        const { container } = renderWithI18n(<StoragePersistBanner />);
        expect(container.textContent).toContain('⚠️');
    });

    it('click X dismisses + set sessionStorage flag', () => {
        sessionStorage.setItem('harvest_storage_risk', '1');
        const { container, getByText } = renderWithI18n(<StoragePersistBanner />);
        expect(container.querySelector('[role="alert"]')).not.toBeNull();

        fireEvent.click(getByText('✕'));

        expect(container.querySelector('[role="alert"]')).toBeNull();
        expect(sessionStorage.getItem('harvest_storage_risk_dismissed')).toBe('1');
    });

    it('button tiene aria-label accessible', () => {
        sessionStorage.setItem('harvest_storage_risk', '1');
        const { container } = renderWithI18n(<StoragePersistBanner />);
        const btn = container.querySelector('button[aria-label]');
        expect(btn).not.toBeNull();
    });
});
