/**
 * PickerDrawerBins — card de bins + earnings desglose.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import PickerDrawerBins from './PickerDrawerBins';
import { I18nProvider } from '@/i18n';

function renderWithI18n(ui: React.ReactElement) {
    return render(<I18nProvider>{ui}</I18nProvider>);
}

describe('PickerDrawerBins', () => {
    it('renderiza bins + earned', () => {
        const { getByText } = renderWithI18n(
            <PickerDrawerBins bins={50} earned={325} pieceRateEarnings={325} topUp={0} minWage={23.95} pieceRate={6.5} />,
        );
        expect(getByText('50')).toBeInTheDocument();
        expect(getByText('$325')).toBeInTheDocument();
    });

    it('no muestra top-up line cuando topUp === 0', () => {
        const { container } = renderWithI18n(
            <PickerDrawerBins bins={50} earned={325} pieceRateEarnings={325} topUp={0} minWage={23.95} pieceRate={6.5} />,
        );
        expect(container.textContent).not.toContain('+$');
    });

    it('muestra top-up cuando topUp > 0 con formato "+$X.XX"', () => {
        const { getByText } = renderWithI18n(
            <PickerDrawerBins bins={2} earned={191.6} pieceRateEarnings={13} topUp={178.6} minWage={23.95} pieceRate={6.5} />,
        );
        expect(getByText('+$178.60')).toBeInTheDocument();
    });

    it('muestra piece_rate earnings con toFixed(2)', () => {
        const { getAllByText } = renderWithI18n(
            <PickerDrawerBins bins={10} earned={65.5} pieceRateEarnings={65.5} topUp={0} minWage={23.95} pieceRate={6.55} />,
        );
        expect(getAllByText('$65.50').length).toBeGreaterThan(0);
    });

    it('Total row siempre visible con toFixed(2)', () => {
        const { getByText, getAllByText } = renderWithI18n(
            <PickerDrawerBins bins={50} earned={325.75} pieceRateEarnings={325.75} topUp={0} minWage={23.95} pieceRate={6.5} />,
        );
        expect(getByText('Total')).toBeInTheDocument();
        expect(getAllByText('$325.75').length).toBeGreaterThan(0);
    });

    it('earned round con toFixed(0) en KPI top card', () => {
        const { getByText } = renderWithI18n(
            <PickerDrawerBins bins={50} earned={325.75} pieceRateEarnings={325.75} topUp={0} minWage={23.95} pieceRate={6.5} />,
        );
        // KPI muestra $326 (toFixed(0)), Total muestra $325.75 (toFixed(2))
        expect(getByText('$326')).toBeInTheDocument();
    });

    it('0 bins + 0 earned no crashea', () => {
        const { getByText } = renderWithI18n(
            <PickerDrawerBins bins={0} earned={0} pieceRateEarnings={0} topUp={0} minWage={23.95} pieceRate={6.5} />,
        );
        expect(getByText('0')).toBeInTheDocument();
        expect(getByText('$0')).toBeInTheDocument();
    });
});
