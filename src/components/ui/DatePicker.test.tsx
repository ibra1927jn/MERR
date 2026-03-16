import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DatePicker from './DatePicker';
import React from 'react';

describe('DatePicker', () => {
    const defaultProps = {
        id: 'test-date',
        value: '2026-03-06',
        onChange: vi.fn(),
    };

    beforeEach(() => vi.clearAllMocks());

    it('renders with label', () => {
        render(<DatePicker {...defaultProps} label="Fecha de inicio" />);
        expect(screen.getByLabelText('Fecha de inicio')).toBeDefined();
    });

    it('renders required indicator', () => {
        render(<DatePicker {...defaultProps} label="Fecha" required />);
        expect(screen.getByText('*')).toBeDefined();
    });

    it('shows error message', () => {
        render(<DatePicker {...defaultProps} error="Fecha inválida" />);
        expect(screen.getByText('Fecha inválida')).toBeDefined();
    });

    it('shows helper text when no error', () => {
        render(<DatePicker {...defaultProps} helperText="Formato: DD/MM/YYYY" />);
        expect(screen.getByText('Formato: DD/MM/YYYY')).toBeDefined();
    });

    it('calls onChange with new value', () => {
        render(<DatePicker {...defaultProps} />);
        const input = screen.getByDisplayValue('2026-03-06');
        fireEvent.change(input, { target: { value: '2026-04-01' } });
        expect(defaultProps.onChange).toHaveBeenCalledWith('2026-04-01');
    });

    it('supports min and max dates', () => {
        render(<DatePicker {...defaultProps} min="2026-01-01" max="2026-12-31" />);
        const input = screen.getByDisplayValue('2026-03-06');
        expect(input.getAttribute('min')).toBe('2026-01-01');
        expect(input.getAttribute('max')).toBe('2026-12-31');
    });

    it('renders disabled state', () => {
        render(<DatePicker {...defaultProps} disabled />);
        const input = screen.getByDisplayValue('2026-03-06');
        expect(input).toHaveProperty('disabled', true);
    });
});
