import * as Sentry from "@sentry/react";
import { logger } from '@/utils/logger';

/**
 * Initialize Sentry for error tracking and performance monitoring
 * 
 * Features:
 * - Error tracking with source maps
 * - Performance monitoring (10% sample rate)
 * - Session replay on errors
 * - User context tracking
 * - Custom breadcrumbs
 */
export function initSentry() {
    // Only initialize in staging and production
    if (import.meta.env.MODE === 'development') {
        logger.info('🔍 Sentry disabled in development mode');
        return;
    }

    const dsn = import.meta.env.VITE_SENTRY_DSN;

    if (!dsn) {

        logger.warn('⚠️ VITE_SENTRY_DSN not configured. Sentry will not track errors.');
        return;
    }

    Sentry.init({
        dsn,
        environment: import.meta.env.MODE,
        release: `harvestpro-nz@${import.meta.env.VITE_APP_VERSION || '9.3.0'}`,

        integrations: [
            Sentry.browserTracingIntegration(),
            Sentry.replayIntegration({
                maskAllText: false,
                blockAllMedia: false,
            }),
        ],

        // Performance Monitoring — 10% of transactions in production
        tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,

        // Session Replay — capture replays only on errors
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 1.0,

        // Before send hook - filter sensitive data
        beforeSend(event, _hint) {
            // Remove cookies
            if (event.request) {
                delete event.request.cookies;
            }

            // Filter out auth errors (they're expected)
            if (event.exception?.values?.[0]?.value?.includes('Invalid login credentials')) {
                return null;  // Don't send to Sentry
            }

            // Filter localStorage data
            if (event.contexts?.storage) {
                delete event.contexts.storage;
            }

            return event;
        },

        // Ignore expected errors
        ignoreErrors: [
            // Browser extensions
            'top.GLOBALS',
            'chrome-extension://',
            'moz-extension://',

            // Network errors (handled gracefully in app)
            'NetworkError',
            'Failed to fetch',
            'Load failed',

            // Expected auth errors
            'Invalid login credentials',
            'User not found',
        ],
    });
    logger.info('✅ Sentry initialized:', import.meta.env.MODE);
}

/**
 * Set user context for error tracking
 */
export function setSentryUser(user: { id: string; email?: string; role?: string }) {
    Sentry.setUser({
        id: user.id,
        email: user.email,
        role: user.role,
    });
}

/**
 * Clear user context (on logout)
 */
export function clearSentryUser() {
    Sentry.setUser(null);
}

/**
 * Add custom context to errors
 */
export function setSentryContext(context: Record<string, unknown>) {
    Sentry.setContext('app_context', context);
}

/**
 * Manually capture an error
 */
export function captureSentryError(error: Error, context?: Record<string, unknown>) {
    if (context) {
        Sentry.setContext('error_context', context);
    }
    Sentry.captureException(error);
}

/**
 * Add breadcrumb for debugging
 */
export function addSentryBreadcrumb(message: string, data?: Record<string, unknown>) {
    Sentry.addBreadcrumb({
        message,
        data,
        level: 'info',
        timestamp: Date.now() / 1000,
    });
}