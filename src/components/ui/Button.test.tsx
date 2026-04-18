/**
 * Button — rugged UI button component.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
    it('renderiza children', () => {
        const { getByText } = render(<Button>Click</Button>);
        expect(getByText('Click')).toBeInTheDocument();
    });

    it.each([
        ['primary', 'bg-primary'],
        ['success', 'bg-success'],
        ['danger', 'bg-danger'],
        ['info', 'bg-info'],
        ['ghost', 'bg-transparent'],
    ] as const)('variant=%s aplica bg class', (variant, cls) => {
        const { container } = render(<Button variant={variant}>X</Button>);
        expect(container.querySelector('button')?.className).toContain(cls);
    });

    it.each([
        ['md', 'min-h-[48px]'],
        ['lg', 'min-h-[56px]'],
    ] as const)('size=%s aplica min-h', (size, cls) => {
        const { container } = render(<Button size={size}>X</Button>);
        expect(container.querySelector('button')?.className).toContain(cls);
    });

    it('fullWidth=true aplica w-full', () => {
        const { container } = render(<Button fullWidth>X</Button>);
        expect(container.querySelector('button')?.className).toContain('w-full');
    });

    it('loading=true disable + muestra spinner', () => {
        const { container, queryByText } = render(<Button loading>Saving</Button>);
        expect(container.querySelector('button')).toBeDisabled();
        expect(queryByText('Saving')).toBeInTheDocument(); // children aún visible
        expect(container.querySelector('.animate-spin')).not.toBeNull();
    });

    it('disabled=true → disabled', () => {
        const { container } = render(<Button disabled>X</Button>);
        expect(container.querySelector('button')).toBeDisabled();
    });

    it('onClick dispara cuando no disabled/loading', () => {
        const onClick = vi.fn();
        const { getByText } = render(<Button onClick={onClick}>Go</Button>);
        fireEvent.click(getByText('Go'));
        expect(onClick).toHaveBeenCalled();
    });

    it('onClick NO dispara cuando disabled', () => {
        const onClick = vi.fn();
        const { getByText } = render(<Button disabled onClick={onClick}>X</Button>);
        fireEvent.click(getByText('X'));
        expect(onClick).not.toHaveBeenCalled();
    });

    it('icon presente cuando pasado (y no loading)', () => {
        const { container } = render(
            <Button icon={<span data-testid="custom-icon">I</span>}>X</Button>,
        );
        expect(container.querySelector('[data-testid="custom-icon"]')).not.toBeNull();
    });

    it('className custom se mergea', () => {
        const { container } = render(<Button className="my-custom-class">X</Button>);
        expect(container.querySelector('button')?.className).toContain('my-custom-class');
    });

    it('spread props (e.g. type="submit") se pasan al button', () => {
        const { container } = render(<Button type="submit">X</Button>);
        expect(container.querySelector('button')?.getAttribute('type')).toBe('submit');
    });
});
