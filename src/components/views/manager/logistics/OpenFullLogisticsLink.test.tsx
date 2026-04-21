/**
 * OpenFullLogisticsLink — navega a /logistics-dept.
 */
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import OpenFullLogisticsLink from './OpenFullLogisticsLink';
import { I18nProvider } from '@/i18n';

function renderWithRouter(ui: React.ReactElement) {
    return render(
        <I18nProvider>
            <MemoryRouter initialEntries={['/manager']}>
                <Routes>
                    <Route path="/manager" element={ui} />
                    <Route path="/logistics-dept" element={<div data-testid="dest">DEPT</div>} />
                </Routes>
            </MemoryRouter>
        </I18nProvider>,
    );
}

describe('OpenFullLogisticsLink', () => {
    it('renderiza button con icon open_in_new', () => {
        const { getByText } = renderWithRouter(<OpenFullLogisticsLink />);
        expect(getByText('open_in_new')).toBeInTheDocument();
    });

    it('click navega a /logistics-dept', () => {
        const { getByText, getByTestId } = renderWithRouter(<OpenFullLogisticsLink />);
        const btn = getByText('open_in_new').closest('button')!;
        fireEvent.click(btn);
        expect(getByTestId('dest')).toBeInTheDocument();
    });

    it('className prop se applica', () => {
        const { container } = renderWithRouter(<OpenFullLogisticsLink className="custom-xyz" />);
        const btn = container.querySelector('button')!;
        expect(btn.className).toContain('custom-xyz');
    });

    it('default className (sin custom) tiene base classes', () => {
        const { container } = renderWithRouter(<OpenFullLogisticsLink />);
        const btn = container.querySelector('button')!;
        expect(btn.className).toContain('text-indigo-600');
        expect(btn.className).toContain('underline-offset-2');
    });
});
