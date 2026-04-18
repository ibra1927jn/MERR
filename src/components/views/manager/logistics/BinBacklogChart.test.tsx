/**
 * BinBacklogChart — SVG bar chart backlog por hora.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import BinBacklogChart from './BinBacklogChart';
import { I18nProvider } from '@/i18n';

function renderWithI18n(ui: React.ReactElement) {
    return render(<I18nProvider>{ui}</I18nProvider>);
}

describe('BinBacklogChart', () => {
    it('empty state cuando series=[]', () => {
        const { container, getByText } = renderWithI18n(<BinBacklogChart series={[]} />);
        expect(container.querySelector('svg')).toBeNull();
        expect(getByText('inventory_2')).toBeInTheDocument();
    });

    it('renderiza SVG con N rects cuando hay data', () => {
        const series = [
            { hour: 7, pending: 3 },
            { hour: 8, pending: 5 },
            { hour: 9, pending: 2 },
        ];
        const { container } = renderWithI18n(<BinBacklogChart series={series} />);
        expect(container.querySelector('svg')).not.toBeNull();
        expect(container.querySelectorAll('rect')).toHaveLength(3);
    });

    it('SVG tiene role="img" para accesibilidad', () => {
        const { container } = renderWithI18n(<BinBacklogChart series={[{ hour: 7, pending: 1 }]} />);
        expect(container.querySelector('svg[role="img"]')).not.toBeNull();
    });

    it('bar con pending > 0 tiene height > 0', () => {
        const { container } = renderWithI18n(
            <BinBacklogChart series={[{ hour: 7, pending: 10 }]} />,
        );
        const rect = container.querySelector('rect');
        const h = parseFloat(rect?.getAttribute('height') || '0');
        expect(h).toBeGreaterThan(0);
    });

    it('bar con pending = 0 tiene height = 0', () => {
        const { container } = renderWithI18n(
            <BinBacklogChart series={[{ hour: 7, pending: 0 }]} />,
        );
        const rect = container.querySelector('rect');
        expect(rect?.getAttribute('height')).toBe('0');
    });

    it('rect fill color indigo-500 (#6366f1)', () => {
        const { container } = renderWithI18n(
            <BinBacklogChart series={[{ hour: 7, pending: 5 }]} />,
        );
        const rect = container.querySelector('rect');
        expect(rect?.getAttribute('fill')).toBe('#6366f1');
    });

    it('max pending se muestra en el eje Y', () => {
        const { container } = renderWithI18n(
            <BinBacklogChart
                series={[
                    { hour: 7, pending: 3 },
                    { hour: 8, pending: 15 },
                ]}
            />,
        );
        expect(container.textContent).toContain('15');
    });

    it('X-axis tiene N labels (1 por hour)', () => {
        const series = [
            { hour: 7, pending: 1 },
            { hour: 8, pending: 1 },
            { hour: 9, pending: 1 },
            { hour: 10, pending: 1 },
        ];
        const { container } = renderWithI18n(<BinBacklogChart series={series} />);
        const labels = container.querySelectorAll('.flex-1.text-center.text-\\[9px\\]');
        expect(labels).toHaveLength(4);
    });
});
