/**
 * LogisticsHealthBanner — semáforo verde/amber/rojo para logística.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import LogisticsHealthBanner from './LogisticsHealthBanner';
import { I18nProvider } from '@/i18n';

function renderWithI18n(ui: React.ReactElement) {
    return render(<I18nProvider>{ui}</I18nProvider>);
}

describe('LogisticsHealthBanner', () => {
    it.each(['green', 'amber', 'red'] as const)('status=%s tiene role=status y aria-live', (health) => {
        const { container } = renderWithI18n(<LogisticsHealthBanner health={health} />);
        const banner = container.querySelector('[role="status"]');
        expect(banner).not.toBeNull();
        expect(banner?.getAttribute('aria-live')).toBe('polite');
    });

    it('health=green aplica border-emerald-500 + bg-emerald-50', () => {
        const { container } = renderWithI18n(<LogisticsHealthBanner health="green" />);
        const banner = container.firstChild as HTMLElement;
        expect(banner.className).toContain('border-emerald-500');
        expect(banner.className).toContain('bg-emerald-50');
    });

    it('health=amber aplica amber classes', () => {
        const { container } = renderWithI18n(<LogisticsHealthBanner health="amber" />);
        expect((container.firstChild as HTMLElement).className).toContain('amber');
    });

    it('health=red aplica red classes', () => {
        const { container } = renderWithI18n(<LogisticsHealthBanner health="red" />);
        expect((container.firstChild as HTMLElement).className).toContain('red');
    });

    it('siempre renderiza semáforo dot', () => {
        const { container } = renderWithI18n(<LogisticsHealthBanner health="green" />);
        const dot = container.querySelector('.w-5.h-5.rounded-full');
        expect(dot).not.toBeNull();
    });

    it('renderiza pill con status text', () => {
        const { container } = renderWithI18n(<LogisticsHealthBanner health="amber" />);
        const pill = container.querySelector('.rounded-full.text-xs');
        expect(pill).not.toBeNull();
    });
});
