/**
 * Tests for config/sentry.ts — Sentry error tracking
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@sentry/react', () => ({
    init: vi.fn(),
    setUser: vi.fn(),
    setContext: vi.fn(),
    captureException: vi.fn(),
    addBreadcrumb: vi.fn(),
    browserTracingIntegration: vi.fn(() => ({})),
    replayIntegration: vi.fn(() => ({})),
}));

vi.mock('@/utils/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { initSentry, setSentryUser, clearSentryUser, setSentryContext, captureSentryError, addSentryBreadcrumb } from './sentry';
import * as Sentry from '@sentry/react';

describe('initSentry', () => {
    it('returns early in development mode', () => {
        initSentry();
        // In test/dev mode should early-return
    });
});

describe('setSentryUser', () => {
    it('sets user with id, email, and role', () => {
        setSentryUser({ id: 'u1', email: 'a@test.com', role: 'manager' });
        expect(Sentry.setUser).toHaveBeenCalledWith({
            id: 'u1', email: 'a@test.com', role: 'manager',
        });
    });
});

describe('clearSentryUser', () => {
    it('clears user context', () => {
        clearSentryUser();
        expect(Sentry.setUser).toHaveBeenCalledWith(null);
    });
});

describe('setSentryContext', () => {
    it('sets app context', () => {
        setSentryContext({ orchard_id: 'o1' });
        expect(Sentry.setContext).toHaveBeenCalledWith('app_context', { orchard_id: 'o1' });
    });
});

describe('captureSentryError', () => {
    it('captures error without context', () => {
        const err = new Error('test');
        captureSentryError(err);
        expect(Sentry.captureException).toHaveBeenCalledWith(err);
    });

    it('sets context and captures error', () => {
        const err = new Error('with context');
        captureSentryError(err, { page: 'dashboard' });
        expect(Sentry.setContext).toHaveBeenCalledWith('error_context', { page: 'dashboard' });
        expect(Sentry.captureException).toHaveBeenCalledWith(err);
    });
});

describe('addSentryBreadcrumb', () => {
    it('adds breadcrumb with message and data', () => {
        addSentryBreadcrumb('clicked button', { id: 'btn1' });
        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({
            message: 'clicked button',
            data: { id: 'btn1' },
            level: 'info',
        }));
    });
});
