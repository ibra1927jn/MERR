/**
 * Lightweight logger utility for HarvestPro NZ
 * 
 * - Production: silenced (could route to Sentry in future)
 * - Development: passes through to console
 * 
 * Usage:
 *   import { logger } from '@/utils/logger';
 *   logger.info('Fetched data', { count: 42 });
 *   logger.warn('Slow query');
 *   logger.error('Failed to sync', error);
 */

const isProd = typeof import.meta !== 'undefined' && import.meta.env?.PROD;

/* eslint-disable no-console */
export const logger = {
    info: (...args: unknown[]) => {
        if (!isProd) console.log('[HarvestPro]', ...args);
    },
    warn: (...args: unknown[]) => {
        if (!isProd) console.warn('[HarvestPro]', ...args);
    },
    error: (...args: unknown[]) => {
        // Always log errors (Sentry integration point)
        console.error('[HarvestPro]', ...args);
    },
    debug: (...args: unknown[]) => {
        if (!isProd) console.debug('[HarvestPro]', ...args);
    },
};
/* eslint-enable no-console */
