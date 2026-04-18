/**
 * PageHeader — shared header para manager views.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import PageHeader from './PageHeader';

describe('PageHeader', () => {
    it('renderiza title + icon', () => {
        const { getByText } = render(<PageHeader icon="dashboard" title="Mi Dashboard" />);
        expect(getByText('dashboard')).toBeInTheDocument();
        expect(getByText('Mi Dashboard')).toBeInTheDocument();
    });

    it('subtitle cuando presente', () => {
        const { getByText } = render(
            <PageHeader icon="x" title="T" subtitle="Descripción" />,
        );
        expect(getByText('Descripción')).toBeInTheDocument();
    });

    it('sin subtitle NO renderiza <p>', () => {
        const { container } = render(<PageHeader icon="x" title="T" />);
        expect(container.querySelector('p')).toBeNull();
    });

    it('renderiza badges array', () => {
        const { getByText } = render(
            <PageHeader
                icon="x"
                title="T"
                badges={[
                    { label: 'Active', color: 'emerald' },
                    { label: '3 alerts', color: 'rose' },
                ]}
            />,
        );
        expect(getByText('Active')).toBeInTheDocument();
        expect(getByText('3 alerts')).toBeInTheDocument();
    });

    it('badges vacío NO renderiza contenedor', () => {
        const { container } = render(<PageHeader icon="x" title="T" badges={[]} />);
        expect(container.querySelectorAll('[class*="rounded-full"]').length).toBe(0);
    });

    it('badges con icon renderizan el icon', () => {
        const { getByText } = render(
            <PageHeader
                icon="x"
                title="T"
                badges={[{ label: 'Warning', icon: 'warning', color: 'amber' }]}
            />,
        );
        expect(getByText('warning')).toBeInTheDocument();
    });

    it('color amber aplica clase text-amber-700', () => {
        const { container } = render(
            <PageHeader icon="x" title="T" badges={[{ label: 'W', color: 'amber' }]} />,
        );
        const badge = container.querySelector('[class*="text-amber-700"]');
        expect(badge).not.toBeNull();
    });

    it('color default indigo cuando no se especifica', () => {
        const { container } = render(
            <PageHeader icon="x" title="T" badges={[{ label: 'B' }]} />,
        );
        expect(container.querySelector('[class*="text-indigo-700"]')).not.toBeNull();
    });

    it('action renderizado a la derecha', () => {
        const { getByText } = render(
            <PageHeader icon="x" title="T" action={<button>Accion</button>} />,
        );
        expect(getByText('Accion')).toBeInTheDocument();
    });

    it('children renderizados con action', () => {
        const { getByText } = render(
            <PageHeader icon="x" title="T" action={<button>A</button>}>
                <span>Extra</span>
            </PageHeader>,
        );
        expect(getByText('Extra')).toBeInTheDocument();
        expect(getByText('A')).toBeInTheDocument();
    });

    it('sin action ni children NO renderiza container right', () => {
        const { container } = render(<PageHeader icon="x" title="T" />);
        const rightSections = container.querySelectorAll('.flex.items-center.gap-3');
        // solo el right-section; no habrá
        expect(rightSections.length).toBe(0);
    });
});
