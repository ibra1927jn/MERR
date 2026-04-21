/**
 * TabButton — pill-style tab switcher.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import TabButton from './TabButton';

describe('TabButton', () => {
    it('renderiza label', () => {
        const { getByText } = render(<TabButton active={false} label="Profile" onClick={() => {}} />);
        expect(getByText('Profile')).toBeInTheDocument();
    });

    it('active=true aplica gradient-primary + text-white', () => {
        const { container } = render(<TabButton active={true} label="x" onClick={() => {}} />);
        const btn = container.querySelector('button')!;
        expect(btn.className).toContain('gradient-primary');
        expect(btn.className).toContain('text-white');
    });

    it('active=false aplica text-text-muted + hover:bg-slate-100', () => {
        const { container } = render(<TabButton active={false} label="x" onClick={() => {}} />);
        const btn = container.querySelector('button')!;
        expect(btn.className).toContain('text-text-muted');
        expect(btn.className).toContain('hover:bg-slate-100');
    });

    it('click dispara onClick', () => {
        const onClick = vi.fn();
        const { getByText } = render(<TabButton active={false} label="Go" onClick={onClick} />);
        fireEvent.click(getByText('Go'));
        expect(onClick).toHaveBeenCalledTimes(1);
    });
});
