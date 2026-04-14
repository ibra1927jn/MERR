import React from 'react';
import { render, screen } from '@testing-library/react';
import { cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import CardSkeleton from './CardSkeleton';

beforeEach(() => {
    cleanup();
});

describe('CardSkeleton', () => {
    it('renders with role="status" and aria-busy=true', () => {
        render(<CardSkeleton />);
        const el = screen.getByRole('status');
        expect(el).toBeInTheDocument();
        expect(el).toHaveAttribute('aria-busy', 'true');
    });

    it('has accessible label "Loading"', () => {
        render(<CardSkeleton />);
        expect(screen.getByLabelText('Loading')).toBeInTheDocument();
    });

    it('renders default 2 content lines', () => {
        const { container } = render(<CardSkeleton />);
        // 1 título + 2 líneas de contenido = 3 divs con animate-pulse
        const bars = container.querySelectorAll('.animate-pulse');
        expect(bars).toHaveLength(3);
    });

    it('renders custom lines count', () => {
        const { container } = render(<CardSkeleton lines={4} />);
        // 1 título + 4 líneas = 5 divs
        const bars = container.querySelectorAll('.animate-pulse');
        expect(bars).toHaveLength(5);
    });

    it('applies extra className to the container', () => {
        render(<CardSkeleton className="h-40 my-custom" />);
        const el = screen.getByRole('status');
        expect(el).toHaveClass('h-40');
        expect(el).toHaveClass('my-custom');
    });

    it('last content line is narrower (w-3/5) than previous lines (w-full)', () => {
        const { container } = render(<CardSkeleton lines={2} />);
        const bars = Array.from(container.querySelectorAll('.animate-pulse'));
        // bars[0] = título (w-2/5), bars[1] = línea 0 (w-full), bars[2] = línea 1 last (w-3/5)
        expect(bars[2]).toHaveClass('w-3/5');
        expect(bars[1]).toHaveClass('w-full');
    });
});
