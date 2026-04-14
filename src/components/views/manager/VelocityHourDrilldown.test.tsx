/**
 * Tests para VelocityHourDrilldown
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { I18nProvider } from '@/i18n';
import VelocityHourDrilldown from './VelocityHourDrilldown';
import type { DrilldownData } from '@/services/harvestMetrics/drilldown';

const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <I18nProvider>{children}</I18nProvider>
);

const mockData: DrilldownData = {
    hourLabel: '08:00–09:00',
    slotStartMs: 1_000_000,
    slotEndMs: 1_003_600,
    totalBins: 12,
    pickers: [
        { pickerId: 'p1', pickerName: 'Alice', bins: 7, prevHourBins: 5, trendVsPrevHour: 2 },
        { pickerId: 'p2', pickerName: 'Bob', bins: 5, prevHourBins: 6, trendVsPrevHour: -1 },
    ],
};

beforeEach(() => cleanup());

describe('VelocityHourDrilldown', () => {
    it('no renderiza nada cuando isOpen=false', () => {
        const { container } = render(
            <VelocityHourDrilldown isOpen={false} data={mockData} onClose={vi.fn()} />,
            { wrapper: Wrapper }
        );
        expect(container.firstChild).toBeNull();
    });

    it('muestra el panel con hourLabel cuando isOpen=true', () => {
        render(
            <VelocityHourDrilldown isOpen={true} data={mockData} onClose={vi.fn()} />,
            { wrapper: Wrapper }
        );
        expect(screen.getByText('08:00–09:00')).toBeTruthy();
        expect(screen.getByRole('dialog')).toBeTruthy();
    });

    it('muestra filas de pickers con nombres y bins', () => {
        render(
            <VelocityHourDrilldown isOpen={true} data={mockData} onClose={vi.fn()} />,
            { wrapper: Wrapper }
        );
        expect(screen.getByText('Alice')).toBeTruthy();
        expect(screen.getByText('Bob')).toBeTruthy();
        expect(screen.getByText('7')).toBeTruthy();
        expect(screen.getByText('5')).toBeTruthy();
    });

    it('muestra el total en el footer', () => {
        render(
            <VelocityHourDrilldown isOpen={true} data={mockData} onClose={vi.fn()} />,
            { wrapper: Wrapper }
        );
        expect(screen.getByText('12')).toBeTruthy();
    });

    it('llama onClose al hacer click en el backdrop', () => {
        const onClose = vi.fn();
        render(
            <VelocityHourDrilldown isOpen={true} data={mockData} onClose={onClose} />,
            { wrapper: Wrapper }
        );
        fireEvent.click(screen.getByTestId('drilldown-backdrop'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('NO llama onClose al hacer click dentro del panel', () => {
        const onClose = vi.fn();
        render(
            <VelocityHourDrilldown isOpen={true} data={mockData} onClose={onClose} />,
            { wrapper: Wrapper }
        );
        fireEvent.click(screen.getByTestId('drilldown-panel'));
        expect(onClose).not.toHaveBeenCalled();
    });

    it('llama onClose al presionar ESC', () => {
        const onClose = vi.fn();
        render(
            <VelocityHourDrilldown isOpen={true} data={mockData} onClose={onClose} />,
            { wrapper: Wrapper }
        );
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('muestra estado vacío cuando no hay pickers', () => {
        const emptyData: DrilldownData = { ...mockData, pickers: [], totalBins: 0 };
        render(
            <VelocityHourDrilldown isOpen={true} data={emptyData} onClose={vi.fn()} />,
            { wrapper: Wrapper }
        );
        expect(screen.getByText('No scans this hour')).toBeTruthy();
    });

    it('muestra estado vacío cuando data es null', () => {
        render(
            <VelocityHourDrilldown isOpen={true} data={null} onClose={vi.fn()} />,
            { wrapper: Wrapper }
        );
        expect(screen.getByText('No scans this hour')).toBeTruthy();
    });

    it('no escucha ESC cuando está cerrado', () => {
        const onClose = vi.fn();
        const { rerender } = render(
            <VelocityHourDrilldown isOpen={true} data={mockData} onClose={onClose} />,
            { wrapper: Wrapper }
        );
        rerender(
            <Wrapper>
                <VelocityHourDrilldown isOpen={false} data={mockData} onClose={onClose} />
            </Wrapper>
        );
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onClose).not.toHaveBeenCalled();
    });
});
