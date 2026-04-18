/**
 * Toast — auto-dismiss 3s + 4 tipos visuales.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import Toast from './Toast';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('Toast', () => {
    it('renderiza el message', () => {
        const { getByText } = render(<Toast message="Saved!" onClose={() => {}} />);
        expect(getByText('Saved!')).toBeInTheDocument();
    });

    it('type success aplica bg-green-600 y icon check_circle', () => {
        const { container } = render(<Toast message="ok" type="success" onClose={() => {}} />);
        expect(container.querySelector('.bg-green-600')).not.toBeNull();
        expect(container.textContent).toContain('check_circle');
    });

    it('type error aplica bg-red-600 y icon error', () => {
        const { container } = render(<Toast message="ko" type="error" onClose={() => {}} />);
        expect(container.querySelector('.bg-red-600')).not.toBeNull();
    });

    it('type warning aplica bg-orange-500 y icon warning', () => {
        const { container } = render(<Toast message="!" type="warning" onClose={() => {}} />);
        expect(container.querySelector('.bg-orange-500')).not.toBeNull();
    });

    it('type default info aplica bg-blue-600', () => {
        const { container } = render(<Toast message="info" onClose={() => {}} />);
        expect(container.querySelector('.bg-blue-600')).not.toBeNull();
    });

    it('auto-dismiss a 3s llama onClose', () => {
        const onClose = vi.fn();
        render(<Toast message="x" onClose={onClose} />);
        vi.advanceTimersByTime(3000);
        expect(onClose).toHaveBeenCalled();
    });

    it('no llama onClose antes de 3s', () => {
        const onClose = vi.fn();
        render(<Toast message="x" onClose={onClose} />);
        vi.advanceTimersByTime(2000);
        expect(onClose).not.toHaveBeenCalled();
    });

    it('botón close dispara onClose inmediatamente', () => {
        const onClose = vi.fn();
        const { container } = render(<Toast message="x" onClose={onClose} />);
        const closeBtn = container.querySelector('button')!;
        fireEvent.click(closeBtn);
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
