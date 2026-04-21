/**
 * PickerDrawerHours — card de horas + bucket rate.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import PickerDrawerHours from './PickerDrawerHours';
import { I18nProvider } from '@/i18n';

function renderWithI18n(ui: React.ReactElement) {
    return render(<I18nProvider>{ui}</I18nProvider>);
}

describe('PickerDrawerHours', () => {
    it('renderiza hoursWorked con 1 decimal', () => {
        const { getByText } = renderWithI18n(<PickerDrawerHours hoursWorked={7.456} binsPerHour={5} />);
        expect(getByText('7.5h')).toBeInTheDocument();
    });

    it('renderiza binsPerHour con 1 decimal', () => {
        const { getByText } = renderWithI18n(<PickerDrawerHours hoursWorked={8} binsPerHour={4.2} />);
        expect(getByText('4.2')).toBeInTheDocument();
    });

    it('binsPerHour null → "—"', () => {
        const { getByText } = renderWithI18n(<PickerDrawerHours hoursWorked={8} binsPerHour={null} />);
        expect(getByText('—')).toBeInTheDocument();
    });

    it('0 horas → "0.0h"', () => {
        const { getByText } = renderWithI18n(<PickerDrawerHours hoursWorked={0} binsPerHour={0} />);
        expect(getByText('0.0h')).toBeInTheDocument();
    });
});
