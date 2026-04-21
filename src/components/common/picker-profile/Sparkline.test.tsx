/**
 * Sparkline — mini SVG chart.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Sparkline from './Sparkline';

describe('Sparkline', () => {
    it('no renderiza nada con < 2 puntos', () => {
        const { container } = render(<Sparkline data={[]} color="#00f" />);
        expect(container.firstChild).toBeNull();
    });

    it('no renderiza nada con 1 punto', () => {
        const { container } = render(<Sparkline data={[42]} color="#00f" />);
        expect(container.firstChild).toBeNull();
    });

    it('renderiza SVG con 2 polylines con >= 2 puntos', () => {
        const { container } = render(<Sparkline data={[1, 2, 3]} color="#ff0000" />);
        const svg = container.querySelector('svg');
        expect(svg).not.toBeNull();
        const polylines = container.querySelectorAll('polyline');
        expect(polylines).toHaveLength(2); // stroke + fill
    });

    it('aplica color a stroke de la polyline principal', () => {
        const { container } = render(<Sparkline data={[1, 2]} color="#abc123" />);
        const strokePolyline = container.querySelector('polyline[stroke]');
        expect(strokePolyline?.getAttribute('stroke')).toBe('#abc123');
    });

    it('respeta height custom (default 40)', () => {
        const { container } = render(<Sparkline data={[1, 2]} color="#00f" height={100} />);
        expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 200 100');
    });

    it('default height 40 cuando no se pasa', () => {
        const { container } = render(<Sparkline data={[1, 2]} color="#00f" />);
        expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 200 40');
    });
});
