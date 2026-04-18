/**
 * RatesStep — setup wizard step 3.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import RatesStep from './RatesStep';
import { INITIAL_DATA, VARIETIES } from './wizard.types';

describe('RatesStep', () => {
    it('renderiza select variety + inputs piece_rate + start_time', () => {
        const { container } = render(<RatesStep data={INITIAL_DATA} onUpdate={() => {}} />);
        expect(container.querySelector('select')).not.toBeNull();
        const timeInput = container.querySelector('input[type="time"]');
        const numInput = container.querySelector('input[type="number"]');
        expect(timeInput).not.toBeNull();
        expect(numInput).not.toBeNull();
    });

    it('variety select tiene todas las opciones de VARIETIES', () => {
        const { container } = render(<RatesStep data={INITIAL_DATA} onUpdate={() => {}} />);
        const options = container.querySelectorAll('option');
        expect(options).toHaveLength(VARIETIES.length);
    });

    it('cambio de variety dispara onUpdate', () => {
        const onUpdate = vi.fn();
        const { container } = render(<RatesStep data={INITIAL_DATA} onUpdate={onUpdate} />);
        const select = container.querySelector('select')!;
        fireEvent.change(select, { target: { value: 'Kordia' } });
        expect(onUpdate).toHaveBeenCalledWith('variety', 'Kordia');
    });

    it('piece_rate parseFloat con fallback 0 cuando NaN', () => {
        const onUpdate = vi.fn();
        const { container } = render(<RatesStep data={INITIAL_DATA} onUpdate={onUpdate} />);
        const numInput = container.querySelector('input[type="number"]') as HTMLInputElement;
        fireEvent.change(numInput, { target: { value: 'abc' } });
        expect(onUpdate).toHaveBeenCalledWith('piece_rate', 0);
    });

    it('piece_rate acepta float', () => {
        const onUpdate = vi.fn();
        const { container } = render(<RatesStep data={INITIAL_DATA} onUpdate={onUpdate} />);
        const numInput = container.querySelector('input[type="number"]') as HTMLInputElement;
        fireEvent.change(numInput, { target: { value: '2.25' } });
        expect(onUpdate).toHaveBeenCalledWith('piece_rate', 2.25);
    });

    it('start_time pasa el valor tal cual', () => {
        const onUpdate = vi.fn();
        const { container } = render(<RatesStep data={INITIAL_DATA} onUpdate={onUpdate} />);
        const timeInput = container.querySelector('input[type="time"]') as HTMLInputElement;
        fireEvent.change(timeInput, { target: { value: '07:30' } });
        expect(onUpdate).toHaveBeenCalledWith('start_time', '07:30');
    });

    it('valores de data se muestran', () => {
        const data = {
            ...INITIAL_DATA,
            rates: { variety: 'Kordia', piece_rate: 2.5, start_time: '06:00' },
        };
        const { container } = render(<RatesStep data={data} onUpdate={() => {}} />);
        expect((container.querySelector('select') as HTMLSelectElement).value).toBe('Kordia');
        expect((container.querySelector('input[type="number"]') as HTMLInputElement).value).toBe('2.5');
        expect((container.querySelector('input[type="time"]') as HTMLInputElement).value).toBe('06:00');
    });
});
