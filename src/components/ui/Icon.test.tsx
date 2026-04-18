/**
 * Icon — material symbols wrapper.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Icon from './Icon';

describe('Icon', () => {
    it('renderiza el nombre como texto', () => {
        const { getByText } = render(<Icon name="shield" />);
        expect(getByText('shield')).toBeInTheDocument();
    });

    it('aplica className extra', () => {
        const { container } = render(<Icon name="home" className="text-blue-600" />);
        const span = container.querySelector('span')!;
        expect(span.className).toContain('text-blue-600');
        expect(span.className).toContain('material-symbols-outlined');
    });

    it('aplica size como fontSize inline', () => {
        const { container } = render(<Icon name="home" size={24} />);
        const span = container.querySelector('span')!;
        expect(span.style.fontSize).toBe('24px');
    });

    it('sin size no aplica style inline', () => {
        const { container } = render(<Icon name="home" />);
        const span = container.querySelector('span')!;
        expect(span.getAttribute('style')).toBeNull();
    });

    it('className default "" no rompe', () => {
        const { container } = render(<Icon name="home" />);
        const span = container.querySelector('span')!;
        expect(span.className.startsWith('material-symbols-outlined')).toBe(true);
    });
});
