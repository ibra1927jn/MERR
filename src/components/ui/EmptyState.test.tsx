/**
 * EmptyState — reusable placeholder para listas/tablas vacías.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import EmptyState from './EmptyState';

describe('EmptyState', () => {
    it('renderiza icon + title', () => {
        const { getByText } = render(<EmptyState icon="search" title="Sin resultados" />);
        expect(getByText('search')).toBeInTheDocument();
        expect(getByText('Sin resultados')).toBeInTheDocument();
    });

    it('renderiza subtitle cuando presente', () => {
        const { getByText } = render(
            <EmptyState icon="x" title="Vacío" subtitle="Añade algo para empezar" />,
        );
        expect(getByText('Añade algo para empezar')).toBeInTheDocument();
    });

    it('no renderiza subtitle cuando undefined', () => {
        const { container } = render(<EmptyState icon="x" title="V" />);
        // No hay p.text-text-muted con subtitle
        expect(container.querySelector('p.text-text-muted')).toBeNull();
    });

    it('botón action dispara onClick', () => {
        const onClick = vi.fn();
        const { getByText } = render(
            <EmptyState
                icon="x"
                title="V"
                action={{ label: 'Añadir', onClick, icon: 'add' }}
            />,
        );
        fireEvent.click(getByText('Añadir'));
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('action icon renderizado cuando presente', () => {
        const { getByText } = render(
            <EmptyState
                icon="x"
                title="V"
                action={{ label: 'Add', onClick: () => {}, icon: 'add_circle' }}
            />,
        );
        expect(getByText('add_circle')).toBeInTheDocument();
    });

    it('action sin icon funciona', () => {
        const { getByText } = render(
            <EmptyState icon="x" title="V" action={{ label: 'Just a button', onClick: () => {} }} />,
        );
        expect(getByText('Just a button')).toBeInTheDocument();
    });

    it('no renderiza button cuando action ausente', () => {
        const { container } = render(<EmptyState icon="x" title="V" />);
        expect(container.querySelector('button')).toBeNull();
    });

    it('compact=true aplica py-8 px-4 en vez de py-16 px-6', () => {
        const { container } = render(<EmptyState compact icon="x" title="V" />);
        expect(container.firstChild).toHaveClass('py-8');
        expect(container.firstChild).toHaveClass('px-4');
    });

    it('compact=false (default) aplica py-16 px-6', () => {
        const { container } = render(<EmptyState icon="x" title="V" />);
        expect(container.firstChild).toHaveClass('py-16');
    });

    it('iconColor custom override se aplica al icon', () => {
        const { getByText } = render(
            <EmptyState icon="x" title="V" iconColor="text-rose-500" />,
        );
        expect(getByText('x').className).toContain('text-rose-500');
    });
});
