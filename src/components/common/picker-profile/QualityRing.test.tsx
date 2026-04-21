/**
 * QualityRing — SVG circular progress con color por rango.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import QualityRing from './QualityRing';

describe('QualityRing', () => {
    it('renderiza el score en el centro', () => {
        const { getByText } = render(<QualityRing score={85} />);
        expect(getByText('85')).toBeInTheDocument();
    });

    it('score >= 70 → verde #10b981', () => {
        const { container } = render(<QualityRing score={85} />);
        const ring = container.querySelectorAll('circle')[1];
        expect(ring.getAttribute('stroke')).toBe('#10b981');
    });

    it('40 <= score < 70 → amarillo #f59e0b', () => {
        const { container } = render(<QualityRing score={50} />);
        const ring = container.querySelectorAll('circle')[1];
        expect(ring.getAttribute('stroke')).toBe('#f59e0b');
    });

    it('score < 40 → rojo #ef4444', () => {
        const { container } = render(<QualityRing score={20} />);
        const ring = container.querySelectorAll('circle')[1];
        expect(ring.getAttribute('stroke')).toBe('#ef4444');
    });

    it('score 100 → stroke-dashoffset = 0', () => {
        const { container } = render(<QualityRing score={100} />);
        const ring = container.querySelectorAll('circle')[1];
        expect(parseFloat(ring.getAttribute('stroke-dashoffset') || '1')).toBeCloseTo(0, 1);
    });

    it('score > 100 se clampea a 100', () => {
        const { container } = render(<QualityRing score={150} />);
        const ring = container.querySelectorAll('circle')[1];
        expect(parseFloat(ring.getAttribute('stroke-dashoffset') || '1')).toBeCloseTo(0, 1);
    });

    it('score 0 → stroke-dashoffset = circumference', () => {
        const { container } = render(<QualityRing score={0} />);
        const ring = container.querySelectorAll('circle')[1];
        const circumference = 2 * Math.PI * 16;
        expect(parseFloat(ring.getAttribute('stroke-dashoffset') || '0')).toBeCloseTo(circumference, 1);
    });
});
