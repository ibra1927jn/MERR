import { logger } from '@/utils/logger';

/**
 * AUDIT P-1: Lazy Sentry — @sentry/react loaded dynamically after first render.
 * Removes the 432KB vendor-monitoring chunk from the critical JS path.
 *
 * Trade-off: errors that occur during initial page load (before Sentry loads)
 * won't be captured. Acceptable for a PWA where data integrity > load-time errors.
 */

type SentryType = typeof import('@sentry/react');
let Sentry: SentryType | null = null;
let sentryLoading: Promise<void> | null = null;

async function getSentry(): Promise<SentryType | null> {
  if (Sentry) return Sentry;
  if (!sentryLoading) {
    sentryLoading = import('@sentry/react')
      .then(mod => {
        Sentry = mod;
      })
      .catch(err => {
        logger.warn('⚠️ @sentry/react failed to load:', err);
      });
  }
  await sentryLoading;
  return Sentry;
}

export async function initSentry(): Promise<void> {
  if (import.meta.env.MODE === 'development') {
    logger.info('🔍 Sentry disabled in development mode');
    return;
  }

  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    logger.warn('⚠️ VITE_SENTRY_DSN not configured. Sentry will not track errors.');
    return;
  }

  const S = await getSentry();
  if (!S) return;

  S.init({
    dsn,
    environment: import.meta.env.MODE,
    release: `harvestpro-nz@${import.meta.env.VITE_APP_VERSION || '9.3.0'}`,
    integrations: [
      S.browserTracingIntegration(),
      S.replayIntegration({
        // SEC-2 FIX: maskAllText + blockAllMedia protect worker PII (NZ Privacy Act 2020)
        // Worker names, wages, picker IDs and orchard data will NOT appear in replays.
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event) {
      if (event.request) delete event.request.cookies;
      if (event.exception?.values?.[0]?.value?.includes('Invalid login credentials')) return null;
      if (event.contexts?.storage) delete event.contexts.storage;
      return event;
    },
    ignoreErrors: [
      'top.GLOBALS',
      'chrome-extension://',
      'moz-extension://',
      'NetworkError',
      'Failed to fetch',
      'Load failed',
      'Invalid login credentials',
      'User not found',
    ],
  });
  logger.info('✅ Sentry initialized (lazy):', import.meta.env.MODE);
}

export async function setSentryUser(user: { id: string; email?: string; role?: string }) {
  const S = await getSentry();
  S?.setUser({ id: user.id, email: user.email, role: user.role });
}

export async function clearSentryUser() {
  const S = await getSentry();
  S?.setUser(null);
}

export async function setSentryContext(context: Record<string, unknown>) {
  const S = await getSentry();
  S?.setContext('app_context', context);
}

export async function captureSentryError(error: Error, context?: Record<string, unknown>) {
  const S = await getSentry();
  if (context) S?.setContext('error_context', context);
  S?.captureException(error);
}

export async function addSentryBreadcrumb(message: string, data?: Record<string, unknown>) {
  const S = await getSentry();
  S?.addBreadcrumb({
    message,
    data,
    level: 'info',
    timestamp: Date.now() / 1000,
  });
}
