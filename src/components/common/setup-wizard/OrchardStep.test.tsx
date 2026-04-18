/**
 * OrchardStep — setup wizard step 1.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import OrchardStep from './OrchardStep';
import { INITIAL_DATA } from './wizard.types';

describe('OrchardStep', () => {
    it('renderiza 4 inputs (code/name/location/total_rows)', () => {
        const { container } = render(
            <OrchardStep data={INITIAL_DATA} onUpdate={() => {}} />,
        );
        const inputs = container.querySelectorAll('input');
        expect(inputs).toHaveLength(4);
    });

    it('code input upperCases el valor', () => {
        const onUpdate = vi.fn();
        const { container } = render(
            <OrchardStep data={INITIAL_DATA} onUpdate={onUpdate} />,
        );
        const codeInput = container.querySelectorAll('input')[0];
        fireEvent.change(codeInput, { target: { value: 'jp-01' } });
        expect(onUpdate).toHaveBeenCalledWith('code', 'JP-01');
    });

    it('name input pasa el valor tal cual', () => {
        const onUpdate = vi.fn();
        const { container } = render(<OrchardStep data={INITIAL_DATA} onUpdate={onUpdate} />);
        const nameInput = container.querySelectorAll('input')[1];
        fireEvent.change(nameInput, { target: { value: 'My Farm' } });
        expect(onUpdate).toHaveBeenCalledWith('name', 'My Farm');
    });

    it('total_rows parseInt + default 1 cuando NaN', () => {
        const onUpdate = vi.fn();
        const { container } = render(<OrchardStep data={INITIAL_DATA} onUpdate={onUpdate} />);
        const rows = container.querySelectorAll('input')[3];
        fireEvent.change(rows, { target: { value: 'abc' } });
        expect(onUpdate).toHaveBeenCalledWith('total_rows', 1);
    });

    it('total_rows parsea número válido', () => {
        const onUpdate = vi.fn();
        const { container } = render(<OrchardStep data={INITIAL_DATA} onUpdate={onUpdate} />);
        const rows = container.querySelectorAll('input')[3];
        fireEvent.change(rows, { target: { value: '42' } });
        expect(onUpdate).toHaveBeenCalledWith('total_rows', 42);
    });

    it('renderiza valores desde data', () => {
        const data = {
            ...INITIAL_DATA,
            orchard: { code: 'ABC', name: 'Test', location: 'NZ', total_rows: 15 },
        };
        const { container } = render(<OrchardStep data={data} onUpdate={() => {}} />);
        const inputs = container.querySelectorAll('input');
        expect((inputs[0] as HTMLInputElement).value).toBe('ABC');
        expect((inputs[1] as HTMLInputElement).value).toBe('Test');
        expect((inputs[2] as HTMLInputElement).value).toBe('NZ');
        expect((inputs[3] as HTMLInputElement).value).toBe('15');
    });
});
