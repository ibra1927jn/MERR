/**
 * PickupSlaCard — métricas SLA logístico en mm:ss.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import PickupSlaCard from './PickupSlaCard';
import { I18nProvider } from '@/i18n';

function renderWithI18n(ui: React.ReactElement) {
    return render(<I18nProvider>{ui}</I18nProvider>);
}

describe('PickupSlaCard', () => {
    it('muestra "no data" cuando avgPickupSec === 0', () => {
        const { container } = renderWithI18n(<PickupSlaCard avgPickupSec={0} avgCycleSec={0} />);
        // Debe renderizarse algo pero sin las métricas 00:00
        expect(container.querySelector('.text-3xl')).toBeNull();
    });

    it('renderiza avgPickup en formato mm:ss', () => {
        const { getByText } = renderWithI18n(
            <PickupSlaCard avgPickupSec={125} avgCycleSec={300} />,
        );
        expect(getByText('02:05')).toBeInTheDocument();
    });

    it('renderiza avgCycle en formato mm:ss', () => {
        const { getByText } = renderWithI18n(
            <PickupSlaCard avgPickupSec={10} avgCycleSec={3725} />,
        );
        expect(getByText('62:05')).toBeInTheDocument();
    });

    it('padStart a 2 dígitos', () => {
        const { getByText } = renderWithI18n(
            <PickupSlaCard avgPickupSec={5} avgCycleSec={9} />,
        );
        expect(getByText('00:05')).toBeInTheDocument();
        expect(getByText('00:09')).toBeInTheDocument();
    });

    it('trunca fracciones (floor) en mm y ss', () => {
        const { getByText } = renderWithI18n(
            <PickupSlaCard avgPickupSec={125.99} avgCycleSec={300} />,
        );
        expect(getByText('02:05')).toBeInTheDocument();
    });
});
