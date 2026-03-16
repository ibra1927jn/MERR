/**
 * Web Vitals — Performance monitoring integration
 *
 * Reports Core Web Vitals (LCP, FID, CLS, FCP, TTFB, INP) to PostHog
 * for real-user performance monitoring (RUM) in production.
 *
 * @see https://web.dev/vitals/
 * @module config/webVitals
 */
import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';
import posthog from 'posthog-js';

/** Send a web-vital metric to PostHog as a custom event */
function sendToPostHog(metric: Metric) {
  // Only report in production to avoid noisy dev data
  if (import.meta.env.DEV) return;

  posthog.capture('web_vital', {
    name: metric.name, // e.g. "LCP", "CLS"
    value: metric.value, // numeric value
    rating: metric.rating, // "good" | "needs-improvement" | "poor"
    delta: metric.delta, // change since last report
    id: metric.id, // unique per metric instance
    navigationType: metric.navigationType,
  });
}

/**
 * Initialize web vitals monitoring.
 * Call this once in your app entry point (main.tsx).
 *
 * Reports:
 * - LCP (Largest Contentful Paint) → loading performance
 * - CLS (Cumulative Layout Shift) → visual stability
 * - INP (Interaction to Next Paint) → input responsiveness
 * - FCP (First Contentful Paint) → perceived load speed
 * - TTFB (Time to First Byte) → server response time
 */
export function initWebVitals() {
  onLCP(sendToPostHog);
  onCLS(sendToPostHog);
  onINP(sendToPostHog);
  onFCP(sendToPostHog);
  onTTFB(sendToPostHog);
}
