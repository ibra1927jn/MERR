import { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AppProvider } from './context';
import { router } from './routes';
import { MFAGuard } from './components/MFAGuard';
import { I18nProvider } from './i18n';
import './index.css';

// AUDIT P-1: Monitoring libraries are lazy-loaded AFTER first render to avoid
// blocking LCP with the 432KB vendor-monitoring bundle.
// Both Sentry and PostHog are loaded via dynamic import() in their modules.
function initMonitoring() {
  // Import and call within dynamic import — ensures no static reference
  Promise.all([
    import('./config/sentry').then(m => m.initSentry()),
    import('./config/analytics').then(m => m.initPostHog()),
    import('./config/webVitals').then(m => m.initWebVitals()),
  ]).catch(err => console.warn('[HarvestPro] Monitoring init failed:', err));
}

// 🔧 V16: Request persistent storage to prevent silent IndexedDB eviction on mobile
// Without this, iOS Safari and some Android browsers can silently delete Dexie data
// when storage pressure is high, causing total offline data loss.
if (navigator.storage?.persist) {
  navigator.storage.persist().then(granted => {
    if (!granted) {
      // Marcar en sessionStorage para mostrar banner post-login al usuario
      sessionStorage.setItem('harvest_storage_risk', '1');
      // Capturar en Sentry cuando el monitoring se inicialice (no bloquear)
      import('./config/sentry').then(m => {
        m.addSentryBreadcrumb('storage_persist_denied', { platform: navigator.userAgent });
      }).catch(() => {});
      // Trackear en analytics para saber cuántos dispositivos están en riesgo
      import('./config/analytics').then(m => {
        m.analytics?.trackFeature('storage_persist_denied');
      }).catch(() => {});
    }
  });
}

const container = document.getElementById('root');
if (container) {
  // Lazy import for PWA banner (code-split, not needed for initial render)
  const PwaInstallBanner = lazy(() => import('./components/common/PwaInstallBanner'));
  const SyncStatusMonitor = lazy(() => import('./components/common/SyncStatusMonitor'));

  const root = createRoot(container);
  root.render(
    <I18nProvider>
      <AppProvider>
        <MFAGuard>
          <Suspense fallback={null}>
            <SyncStatusMonitor />
          </Suspense>
          <RouterProvider router={router} />
          <Suspense fallback={null}>
            <PwaInstallBanner />
          </Suspense>
        </MFAGuard>
      </AppProvider>
    </I18nProvider>
  );

  // Defer monitoring init until browser is idle — keeps LCP clean
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => initMonitoring(), { timeout: 3000 });
  } else {
    setTimeout(initMonitoring, 1000);
  }
}
