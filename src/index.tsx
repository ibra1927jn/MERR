import React from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AppProvider } from './context';
import { router } from './routes';
import { MFAGuard } from './components/MFAGuard';
import { I18nProvider } from './i18n';
import './index.css';

// En modo mock arrancamos MSW antes de renderizar nada
// Ejecutar: npm run dev:mock
async function startMocks(): Promise<void> {
  if (import.meta.env.MODE !== 'mock') return;

  // 1. Limpiar sesiones reales de Supabase y estado persistido de Zustand.
  //    Sin esto: el SDK auto-restaura la sesión real, y lastSyncAt persiste
  //    causando delta sync que devuelve 0 pickers en lugar de carga completa.
  Object.keys(localStorage)
    .filter(key => key.startsWith('sb-') || key.startsWith('harvest-pro-'))
    .forEach(key => localStorage.removeItem(key));

  // 2. Desregistrar service workers previos para que MSW tome control limpio.
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map(r => r.unregister()));
  }

  // 3. Iniciar MSW
  const { worker } = await import('./mocks/browser');
  await worker.start({
    onUnhandledRequest: 'bypass',
  });

  // 4. Primera instalación — el SW registró pero aún no controla la página.
  //    Recargar para que intercepte desde el inicio.
  if (navigator.serviceWorker.controller === null) {
    window.location.reload();
  }
}

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

startMocks().then(() => {
  renderApp();
});

function renderApp() {
const container = document.getElementById('root');
if (container) {
  // Lazy import for PWA banner (code-split, not needed for initial render)
  const PwaInstallBanner = React.lazy(() => import('./components/common/PwaInstallBanner'));
  const SyncStatusMonitor = React.lazy(() => import('./components/common/SyncStatusMonitor'));

  const root = createRoot(container);
  root.render(
    <I18nProvider>
      <AppProvider>
        <MFAGuard>
          <React.Suspense fallback={null}>
            <SyncStatusMonitor />
          </React.Suspense>
          <RouterProvider router={router} />
          <React.Suspense fallback={null}>
            <PwaInstallBanner />
          </React.Suspense>
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
}
