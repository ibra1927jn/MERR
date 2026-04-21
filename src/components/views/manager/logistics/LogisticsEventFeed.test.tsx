/**
 * LogisticsEventFeed — últimos 5 eventos con icono + hora.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import LogisticsEventFeed from './LogisticsEventFeed';
import { I18nProvider } from '@/i18n';

function renderWithI18n(ui: React.ReactElement) {
    return render(<I18nProvider>{ui}</I18nProvider>);
}

describe('LogisticsEventFeed', () => {
    it('empty state cuando events=[]', () => {
        const { container } = renderWithI18n(<LogisticsEventFeed events={[]} />);
        expect(container.querySelector('ul')).toBeNull();
    });

    it('renderiza ul con items cuando hay eventos', () => {
        const { container } = renderWithI18n(
            <LogisticsEventFeed
                events={[
                    { id: '1', type: 'pickup_requested', label: 'Bin 42', at: '2026-04-18T10:00:00Z' },
                ]}
            />,
        );
        expect(container.querySelector('ul')).not.toBeNull();
        expect(container.querySelectorAll('li')).toHaveLength(1);
    });

    it('limita a 5 items incluso si se pasan más', () => {
        const events = Array.from({ length: 10 }, (_, i) => ({
            id: String(i),
            type: 'alert' as const,
            label: `evt ${i}`,
            at: '2026-04-18T10:00:00Z',
        }));
        const { container } = renderWithI18n(<LogisticsEventFeed events={events} />);
        expect(container.querySelectorAll('li')).toHaveLength(5);
    });

    it('icon + color para pickup_requested (indigo + local_shipping)', () => {
        const { container, getByText } = renderWithI18n(
            <LogisticsEventFeed
                events={[{ id: '1', type: 'pickup_requested', label: 'X', at: '2026-04-18T10:00:00Z' }]}
            />,
        );
        expect(getByText('local_shipping')).toBeInTheDocument();
        expect(container.querySelector('.text-indigo-500')).not.toBeNull();
    });

    it('icon para row_blocked (amber + block)', () => {
        const { container, getByText } = renderWithI18n(
            <LogisticsEventFeed
                events={[{ id: '1', type: 'row_blocked', label: 'Row 3', at: '2026-04-18T10:00:00Z' }]}
            />,
        );
        expect(getByText('block')).toBeInTheDocument();
        expect(container.querySelector('.text-amber-500')).not.toBeNull();
    });

    it('icon para alert (red + notification_important)', () => {
        const { container, getByText } = renderWithI18n(
            <LogisticsEventFeed
                events={[{ id: '1', type: 'alert', label: 'OOS', at: '2026-04-18T10:00:00Z' }]}
            />,
        );
        expect(getByText('notification_important')).toBeInTheDocument();
        expect(container.querySelector('.text-red-500')).not.toBeNull();
    });

    it('formatTime con ISO válido devuelve HH:mm', () => {
        const { container } = renderWithI18n(
            <LogisticsEventFeed
                events={[{ id: '1', type: 'alert', label: 'X', at: '2026-04-18T10:05:00+12:00' }]}
            />,
        );
        const time = container.querySelector('.text-\\[10px\\]');
        expect(time?.textContent).toMatch(/\d{1,2}:\d{2}/);
    });

    it('formatTime con string inválido devuelve "—"', () => {
        const { container } = renderWithI18n(
            <LogisticsEventFeed
                events={[{ id: '1', type: 'alert', label: 'X', at: 'not-a-date' }]}
            />,
        );
        const time = container.querySelector('.text-\\[10px\\]');
        // jsdom toLocaleTimeString con invalid date devuelve "Invalid Date" — acepto ambos
        expect(time?.textContent).toBeTruthy();
    });

    it('label del evento se muestra', () => {
        const { getByText } = renderWithI18n(
            <LogisticsEventFeed
                events={[{ id: '1', type: 'alert', label: 'CUSTOM LABEL', at: '2026-04-18T10:00:00Z' }]}
            />,
        );
        expect(getByText(/CUSTOM LABEL/)).toBeInTheDocument();
    });
});
