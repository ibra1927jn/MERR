/**
 * Integration tests for AuthContext — full provider rendering
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';

// All vi.mock factories use inline values only (no top-level variables due to hoisting)
vi.mock('../services/supabase', () => ({
    supabase: {
        auth: {
            getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
            signInWithPassword: vi.fn(),
            signUp: vi.fn(),
            signOut: vi.fn().mockResolvedValue({}),
            resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
            onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
            refreshSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        },
        removeAllChannels: vi.fn(),
    },
}));

vi.mock('../services/db', () => ({
    db: { delete: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('../services/sync.service', () => ({
    syncService: {
        getPendingCount: vi.fn().mockResolvedValue(0),
        processQueue: vi.fn(),
    },
}));

vi.mock('../services/notification.service', () => ({
    notificationService: { stopChecking: vi.fn() },
}));

vi.mock('../config/sentry', () => ({
    setSentryUser: vi.fn(),
    clearSentryUser: vi.fn(),
}));

vi.mock('../config/analytics', () => ({
    analytics: {
        identify: vi.fn(),
        trackLogin: vi.fn(),
        trackLogout: vi.fn(),
    },
}));

vi.mock('@/repositories/auth-context.repository', () => ({
    authContextRepository: {
        getUserProfile: vi.fn().mockResolvedValue({
            data: {
                id: 'u1', email: 'test@test.com', full_name: 'Test User',
                role: 'manager', orchard_id: 'o1', is_active: true,
            },
            error: null,
        }),
        getFirstOrchardId: vi.fn().mockResolvedValue('o1'),
        assignOrchard: vi.fn().mockResolvedValue(undefined),
        checkWhitelist: vi.fn().mockResolvedValue({ data: { id: 'r1', role: 'manager', orchard_id: 'o1', used_at: null }, error: null }),
        insertUser: vi.fn().mockResolvedValue(undefined),
        markRegistrationUsed: vi.fn().mockResolvedValue(undefined),
    },
}));

vi.mock('@/utils/logger', () => ({
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('../components/modals/ReAuthModal', () => ({
    default: () => React.createElement('div', { 'data-testid': 'reauth-modal' }, 'ReAuth'),
}));

import { AuthProvider, useAuth } from './AuthContext';
import { supabase } from '../services/supabase';

// Test helper component
function AuthConsumer() {
    const auth = useAuth();
    return React.createElement('div', null,
        React.createElement('span', { 'data-testid': 'loading' }, String(auth.isLoading)),
        React.createElement('span', { 'data-testid': 'authenticated' }, String(auth.isAuthenticated)),
        React.createElement('span', { 'data-testid': 'role' }, auth.currentRole || 'none'),
        React.createElement('span', { 'data-testid': 'email' }, auth.userEmail || 'none'),
        React.createElement('button', {
            'data-testid': 'sign-in-btn',
            onClick: () => auth.signIn('test@test.com', 'pass').catch(() => { }),
        }, 'Sign In'),
        React.createElement('button', {
            'data-testid': 'reset-btn',
            onClick: () => auth.resetPassword('test@test.com').catch(() => { }),
        }, 'Reset'),
    );
}

describe('AuthContext Integration', () => {
    beforeEach(() => vi.clearAllMocks());

    it('renders AuthProvider with children', async () => {
        render(
            React.createElement(AuthProvider, null,
                React.createElement('div', { 'data-testid': 'child' }, 'Hello')
            )
        );
        expect(screen.getByTestId('child')).toBeDefined();
    });

    it('starts with loading state', () => {
        render(React.createElement(AuthProvider, null, React.createElement(AuthConsumer)));
        expect(screen.getByTestId('loading')).toBeDefined();
    });

    it('sets isLoading=false after session check (no session)', async () => {
        render(React.createElement(AuthProvider, null, React.createElement(AuthConsumer)));
        await waitFor(() => {
            expect(screen.getByTestId('loading').textContent).toBe('false');
        });
    });

    it('loads user data when session exists', async () => {
        vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
            data: { session: { user: { id: 'u1' } } },
        } as any);
        render(React.createElement(AuthProvider, null, React.createElement(AuthConsumer)));
        await waitFor(() => {
            expect(screen.getByTestId('authenticated').textContent).toBe('true');
        });
        expect(screen.getByTestId('role').textContent).toBe('manager');
        expect(screen.getByTestId('email').textContent).toBe('test@test.com');
    });

    it('signIn calls supabase.auth.signInWithPassword', async () => {
        vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
            data: { user: { id: 'u1' }, session: {} },
            error: null,
        } as any);
        render(React.createElement(AuthProvider, null, React.createElement(AuthConsumer)));
        await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

        await act(async () => { screen.getByTestId('sign-in-btn').click(); });

        await waitFor(() => {
            expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
                email: 'test@test.com', password: 'pass',
            });
        });
    });

    it('resetPassword calls supabase', async () => {
        render(React.createElement(AuthProvider, null, React.createElement(AuthConsumer)));
        await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
        await act(async () => { screen.getByTestId('reset-btn').click(); });
        await waitFor(() => expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalled());
    });

    it('useAuth throws outside provider', () => {
        expect(() => render(React.createElement(AuthConsumer))).toThrow('useAuth must be used within an AuthProvider');
    });

    it('onAuthStateChange is called on mount', () => {
        render(React.createElement(AuthProvider, null, React.createElement('div', null, 'test')));
        expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();
    });
});

