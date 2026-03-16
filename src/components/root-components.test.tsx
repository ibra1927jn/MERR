/**
 * Tests for RegisterForm
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import RegisterForm from './auth/RegisterForm';

describe('RegisterForm', () => {
    const defaultProps = {
        fullName: '',
        setFullName: vi.fn(),
        email: '',
        setEmail: vi.fn(),
        password: '',
        setPassword: vi.fn(),
        isSubmitting: false,
        onSubmit: vi.fn(),
    };

    it('renders Full Name label', () => {
        render(<RegisterForm {...defaultProps} />);
        expect(screen.getByText('Full Name')).toBeTruthy();
    });

    it('renders Email label', () => {
        render(<RegisterForm {...defaultProps} />);
        expect(screen.getByText('Email')).toBeTruthy();
    });

    it('renders Password label', () => {
        render(<RegisterForm {...defaultProps} />);
        expect(screen.getByText('Password')).toBeTruthy();
    });

    it('renders name input with John Doe placeholder', () => {
        render(<RegisterForm {...defaultProps} />);
        expect(screen.getByPlaceholderText('John Doe')).toBeTruthy();
    });

    it('renders email input with placeholder', () => {
        render(<RegisterForm {...defaultProps} />);
        expect(screen.getByPlaceholderText('you@email.com')).toBeTruthy();
    });

    it('renders password input with placeholder', () => {
        render(<RegisterForm {...defaultProps} />);
        expect(screen.getByPlaceholderText('Min. 6 characters')).toBeTruthy();
    });

    it('renders submit button with Create Account text', () => {
        render(<RegisterForm {...defaultProps} />);
        const btn = screen.getByRole('button', { name: /Create Account/i });
        expect(btn).toBeTruthy();
    });

    it('calls setFullName on name input change', () => {
        const setFullName = vi.fn();
        render(<RegisterForm {...defaultProps} setFullName={setFullName} />);
        fireEvent.change(screen.getByPlaceholderText('John Doe'), { target: { value: 'Test' } });
        expect(setFullName).toHaveBeenCalledWith('Test');
    });

    it('calls onSubmit on form submit', () => {
        const onSubmit = vi.fn((e) => e.preventDefault());
        render(<RegisterForm {...defaultProps} onSubmit={onSubmit} />);
        const form = screen.getByPlaceholderText('John Doe').closest('form')!;
        fireEvent.submit(form);
        expect(onSubmit).toHaveBeenCalled();
    });
});
