/**
 * StatusBadge — semantic status pill.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import StatusBadge from './StatusBadge';

describe('StatusBadge', () => {
    it('renderiza label', () => {
        const { getByText } = render(<StatusBadge status="active" label="Active" />);
        expect(getByText('Active')).toBeInTheDocument();
    });

    it.each([
        ['active', 'emerald'],
        ['success', 'emerald'],
        ['inactive', 'slate'],
        ['neutral', 'slate'],
        ['warning', 'amber'],
        ['danger', 'red'],
        ['info', 'blue'],
    ] as const)('status=%s aplica color %s', (status, color) => {
        const { container } = render(<StatusBadge status={status} label="x" />);
        const span = container.firstChild as HTMLElement;
        expect(span.className).toContain(color);
    });

    it('sin icon renderiza dot color', () => {
        const { container } = render(<StatusBadge status="warning" label="W" />);
        const dot = container.querySelector('.w-1\\.5.h-1\\.5');
        expect(dot).not.toBeNull();
        expect((dot as HTMLElement).className).toContain('bg-amber-500');
    });

    it('con icon no renderiza dot', () => {
        const { container, getByText } = render(
            <StatusBadge status="info" label="Info" icon="info" />,
        );
        expect(getByText('info')).toBeInTheDocument();
        expect(container.querySelector('.w-1\\.5.h-1\\.5')).toBeNull();
    });

    it('size sm aplica text-xs px-2 py-0.5', () => {
        const { container } = render(<StatusBadge status="active" label="x" size="sm" />);
        const span = container.firstChild as HTMLElement;
        expect(span.className).toContain('px-2');
        expect(span.className).toContain('py-0.5');
    });

    it('size md (default) aplica px-2.5 py-1', () => {
        const { container } = render(<StatusBadge status="active" label="x" />);
        const span = container.firstChild as HTMLElement;
        expect(span.className).toContain('px-2.5');
    });

    it('className prop se merges con defaults', () => {
        const { container } = render(
            <StatusBadge status="active" label="x" className="custom-class-xyz" />,
        );
        const span = container.firstChild as HTMLElement;
        expect(span.className).toContain('custom-class-xyz');
        // Y siguen estando las defaults
        expect(span.className).toContain('rounded-full');
    });
});
