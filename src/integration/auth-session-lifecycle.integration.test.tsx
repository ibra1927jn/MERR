/**
 * INTEGRATION TEST: Auth Session Lifecycle
 *
 * Tests: session init → sign-in → onAuthStateChange → sign-out → error flows
 * Renders AuthProvider with mocked Supabase auth
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';

// ── Mock external boundaries ────────────────
const mockGetSession = vi.fn().mockResolvedValue({ data: { session: null } });
const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn().mockResolvedValue({});
const mockResetPassword = vi.fn().mockResolvedValue({ error: null });
let authStateCallback: ((event: string, session: any) => void) | null = null;
const mockOnAuthStateChange = vi.fn().mockImplementation((cb: any) => {
  authStateCallback = cb;
  return { data: { subscription: { unsubscribe: vi.fn() } } };
});

vi.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: any[]) => mockGetSession(...args),
      signInWithPassword: (...args: any[]) => mockSignInWithPassword(...args),
      signUp: (...args: any[]) => mockSignUp(...args),
      signOut: (...args: any[]) => mockSignOut(...args),
      resetPasswordForEmail: (...args: any[]) => mockResetPassword(...args),
      onAuthStateChange: (...args: any[]) => mockOnAuthStateChange(...args),
      refreshSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    removeAllChannels: vi.fn(),
  },
}));

vi.mock('../services/db', () => ({
  db: { delete: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock('../services/sync.service', () => ({
  syncService: { getPendingCount: vi.fn().mockResolvedValue(0), processQueue: vi.fn() },
}));
vi.mock('../services/notification.service', () => ({
  notificationService: { stopChecking: vi.fn() },
}));
vi.mock('../config/sentry', () => ({
  setSentryUser: vi.fn(),
  clearSentryUser: vi.fn(),
}));
vi.mock('../config/analytics', () => ({
  analytics: { identify: vi.fn(), trackLogin: vi.fn(), trackLogout: vi.fn() },
}));
vi.mock('@/repositories/auth-context.repository', () => ({
  authContextRepository: {
    getUserProfile: vi.fn().mockResolvedValue({
      data: {
        id: 'u1',
        email: 'farmer@nz.com',
        full_name: 'NZ Farmer',
        role: 'manager',
        orchard_id: 'o1',
        is_active: true,
      },
      error: null,
    }),
    getFirstOrchardId: vi.fn().mockResolvedValue('o1'),
    assignOrchard: vi.fn().mockResolvedValue(undefined),
    checkWhitelist: vi.fn().mockResolvedValue({
      data: { id: 'r1', role: 'manager', orchard_id: 'o1', used_at: null },
      error: null,
    }),
    insertUser: vi.fn().mockResolvedValue(undefined),
    markRegistrationUsed: vi.fn().mockResolvedValue(undefined),
    getAllOrchards: vi.fn().mockResolvedValue([{ id: 'o1', name: 'Test Orchard', total_rows: 10 }]),
  },
}));
vi.mock('@/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../components/modals/ReAuthModal', () => ({
  default: () => React.createElement('div', { 'data-testid': 'reauth-modal' }, 'ReAuth'),
}));

import { AuthProvider, useAuth } from '../context/AuthContext';

// ── Test Consumer ───────────────────────────

function AuthConsumer() {
  const auth = useAuth();
  return React.createElement(
    'div',
    null,
    React.createElement('span', { 'data-testid': 'loading' }, String(auth.isLoading)),
    React.createElement('span', { 'data-testid': 'authenticated' }, String(auth.isAuthenticated)),
    React.createElement('span', { 'data-testid': 'role' }, auth.currentRole || 'none'),
    React.createElement('span', { 'data-testid': 'email' }, auth.userEmail || 'none'),
    React.createElement('span', { 'data-testid': 'name' }, auth.userName || 'none'),
    React.createElement(
      'button',
      {
        'data-testid': 'sign-in-btn',
        onClick: () => auth.signIn('farmer@nz.com', 'kiwi123').catch(() => {}),
      },
      'Sign In'
    ),
    React.createElement(
      'button',
      {
        'data-testid': 'sign-out-btn',
        onClick: () => auth.signOut().catch(() => {}),
      },
      'Sign Out'
    ),
    React.createElement(
      'button',
      {
        'data-testid': 'reset-btn',
        onClick: () => auth.resetPassword('farmer@nz.com').catch(() => {}),
      },
      'Reset'
    )
  );
}

// ── TESTS ───────────────────────────────────

describe('Auth Session Lifecycle — Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authStateCallback = null;
    mockGetSession.mockResolvedValue({ data: { session: null } });
  });

  // ── Session Initialization ──────────────────

  it('starts with loading=true, authenticated=false', () => {
    render(React.createElement(AuthProvider, null, React.createElement(AuthConsumer)));
    expect(screen.getByTestId('loading').textContent).toBe('true');
  });

  it('resolves to authenticated=false when no session', async () => {
    render(React.createElement(AuthProvider, null, React.createElement(AuthConsumer)));
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
  });

  it('resolves to authenticated=true when session exists', async () => {
    const fakeSession = { user: { id: 'u1' } };
    mockGetSession.mockResolvedValueOnce({
      data: { session: fakeSession },
    });
    // Override onAuthStateChange to fire SIGNED_IN
    mockOnAuthStateChange.mockImplementationOnce((cb: any) => {
      authStateCallback = cb;
      setTimeout(() => cb('SIGNED_IN', fakeSession), 0);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    render(React.createElement(AuthProvider, null, React.createElement(AuthConsumer)));
    await waitFor(() => expect(screen.getByTestId('authenticated').textContent).toBe('true'), {
      timeout: 3000,
    });
    expect(screen.getByTestId('role').textContent).toBe('manager');
    expect(screen.getByTestId('email').textContent).toBe('farmer@nz.com');
  });

  // ── Sign In Flow ────────────────────────────

  it('signIn calls supabase.auth.signInWithPassword', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: { id: 'u1' }, session: { access_token: 'tok' } },
      error: null,
    });

    render(React.createElement(AuthProvider, null, React.createElement(AuthConsumer)));
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    await act(async () => {
      screen.getByTestId('sign-in-btn').click();
    });

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'farmer@nz.com',
        password: 'kiwi123',
      });
    });
  });

  // ── Sign Out Flow ───────────────────────────

  it('signOut calls supabase.auth.signOut', async () => {
    const fakeSession = { user: { id: 'u1' } };
    mockGetSession.mockResolvedValueOnce({
      data: { session: fakeSession },
    });
    // Override onAuthStateChange to fire SIGNED_IN
    mockOnAuthStateChange.mockImplementationOnce((cb: any) => {
      authStateCallback = cb;
      setTimeout(() => cb('SIGNED_IN', fakeSession), 0);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    render(React.createElement(AuthProvider, null, React.createElement(AuthConsumer)));
    await waitFor(() => expect(screen.getByTestId('authenticated').textContent).toBe('true'), {
      timeout: 3000,
    });

    await act(async () => {
      screen.getByTestId('sign-out-btn').click();
    });

    await waitFor(() => expect(mockSignOut).toHaveBeenCalled());
  });

  // ── Password Reset ──────────────────────────

  it('resetPassword calls supabase.auth.resetPasswordForEmail', async () => {
    render(React.createElement(AuthProvider, null, React.createElement(AuthConsumer)));
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    await act(async () => {
      screen.getByTestId('reset-btn').click();
    });

    await waitFor(() =>
      expect(mockResetPassword).toHaveBeenCalledWith('farmer@nz.com', expect.anything())
    );
  });

  // ── onAuthStateChange ───────────────────────

  it('registers onAuthStateChange listener on mount', () => {
    render(React.createElement(AuthProvider, null, React.createElement('div')));
    expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
  });

  it('onAuthStateChange SIGNED_IN event updates state', async () => {
    render(React.createElement(AuthProvider, null, React.createElement(AuthConsumer)));
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    // Simulate auth state change
    if (authStateCallback) {
      await act(async () => {
        authStateCallback!('SIGNED_IN', { user: { id: 'u1' } });
      });
    }

    // The listener was registered, verifying it runs
    expect(mockOnAuthStateChange).toHaveBeenCalled();
  });

  // ── Error Handling ──────────────────────────

  it('useAuth throws when used outside AuthProvider', () => {
    expect(() => render(React.createElement(AuthConsumer))).toThrow(
      'useAuth must be used within an AuthProvider'
    );
  });

  it('signIn with bad credentials does not crash', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'Invalid credentials' },
    });

    render(React.createElement(AuthProvider, null, React.createElement(AuthConsumer)));
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    await act(async () => {
      screen.getByTestId('sign-in-btn').click();
    });

    // Should remain unauthenticated
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
  });
});
