import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LoginForm from '../../auth/LoginForm';
import React from 'react';

describe('LoginForm', () => {
    const defaultProps = {
        email: '',
        setEmail: vi.fn(),
        password: '',
        setPassword: vi.fn(),
        isSubmitting: false,
        onSubmit: vi.fn((e: React.FormEvent) => e.preventDefault()),
        onSwitchToRegister: vi.fn(),
    };

    it('renders email and password inputs', () => {
        render(<LoginForm {...defaultProps} />);

        expect(screen.getByPlaceholderText('your@email.com')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    });

    it('renders Sign In button', () => {
        render(<LoginForm {...defaultProps} />);
        expect(screen.getByText('Sign In')).toBeInTheDocument();
    });

    it('shows Signing in... when isSubmitting is true', () => {
        render(<LoginForm {...defaultProps} isSubmitting={true} />);
        expect(screen.getByText('Signing in...')).toBeInTheDocument();
    });

    it('disables submit button when isSubmitting', () => {
        render(<LoginForm {...defaultProps} isSubmitting={true} />);
        const btn = screen.getByRole('button', { name: /signing in/i });
        expect(btn).toBeDisabled();
    });

    it('calls setEmail when email input changes', () => {
        const setEmail = vi.fn();
        render(<LoginForm {...defaultProps} setEmail={setEmail} />);

        fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
            target: { value: 'test@example.com' },
        });
        expect(setEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('calls setPassword when password input changes', () => {
        const setPassword = vi.fn();
        render(<LoginForm {...defaultProps} setPassword={setPassword} />);

        fireEvent.change(screen.getByPlaceholderText('••••••••'), {
            target: { value: 'secret123' },
        });
        expect(setPassword).toHaveBeenCalledWith('secret123');
    });

    it('calls onSubmit when form is submitted', () => {
        const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
        render(<LoginForm {...defaultProps} onSubmit={onSubmit} />);

        fireEvent.submit(screen.getByRole('button', { name: 'Sign In' }).closest('form')!);
        expect(onSubmit).toHaveBeenCalled();
    });

    it('calls onSwitchToRegister when Create one is clicked', () => {
        const onSwitch = vi.fn();
        render(<LoginForm {...defaultProps} onSwitchToRegister={onSwitch} />);

        fireEvent.click(screen.getByText('Create one'));
        expect(onSwitch).toHaveBeenCalled();
    });

    it('has required attributes on email and password', () => {
        render(<LoginForm {...defaultProps} />);

        expect(screen.getByPlaceholderText('your@email.com')).toBeRequired();
        expect(screen.getByPlaceholderText('••••••••')).toBeRequired();
    });
});
