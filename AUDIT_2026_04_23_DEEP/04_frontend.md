# HarvestPro NZ — Deep Frontend Audit (2026-04-23)

## Executive Summary

A React 19 + Vite + TypeScript + Tailwind + Supabase PWA with Capacitor Android support. The frontend demonstrates **strong architectural discipline** with lazy-loaded routes, code-split monitoring, dynamic imports for analytics, and comprehensive error handling. However, several high-severity gaps exist in state management cleanup during logout, focus management in modals, and incomplete accessibility coverage.

---

## 1. Bundle & Performance

### Current Status
- **Main bundle (index-BwB6s5vq.js)**: 470 KB (uncompressed)
- **Vendor Sentry (vendor-sentry-BGbusvO3.js)**: 436 KB — **lazy-loaded after first render** ✓
- **Vendor React (vendor-react-BMImyfHn.js)**: 96 KB ✓
- **Vendor State (vendor-state-IAjO2TFS.js)**: 109 KB (Zustand, Dexie, React Query) ✓
- **Vendor Supabase (vendor-supabase-rHgJDrTE.js)**: 167 KB ✓
- **Vendor Analytics (vendor-analytics-BIdvvprf.js)**: 171 KB — **lazy-loaded** ✓

### Findings

**✓ STRENGTHS:**
- Sentry (432 KB) dynamically imported via `initMonitoring()` deferred to `requestIdleCallback` → keeps LCP clean
- PostHog lazy-imported in `/src/config/analytics.ts` → avoids blocking initial render
- Web Vitals lazy-imported → zero impact on FCP
- Vite manualChunks correctly segments vendor libraries
- No full lodash imports detected; date-fns used correctly (4.1.0)
- QR scanner worker split into separate chunk (43 KB × 2 duplicates — **minor waste**)

**⚠ SEVERITY: MEDIUM**
- **Main bundle bloat (470 KB)**: Contains all page components (Manager, TeamLeader, Runner, PayrollView, AuditLogViewer, etc.) uncompressed. Consider aggressive tree-shaking or per-role chunking.
- **QR scanner duplicated**: `qr-scanner-worker.min-D85Z9gVD.js` and `qr-scanner-worker.min-PJMWJc5V.js` (both 43 KB) — both identical, one should be removed.
- **vendor-sentry still in final bundle**: Even lazy-loaded, 436 KB gzipped. Acceptable for error tracking, but monitor against other SaaS integrations.

### Recommendations
- Profile with `npm run build` + open `dist/stats.html` to identify dead code
- Consider route-level code-splitting for role-specific pages (Manager at 165 KB alone)
- Investigate QR scanner duplication in Vite config

---

## 2. Routing & Code Splitting

### Current Status
**✓ FULLY LAZY-LOADED (src/routes.tsx)**
```typescript
const Login = React.lazy(() => import('./pages/Login'));
const Manager = React.lazy(() => import('./pages/Manager'));
const TeamLeader = React.lazy(() => import('./pages/TeamLeader'));
// ... all 9 role pages lazy-loaded
```

**✓ Suspense + PageLoader fallback** on every route
**✓ ProtectedRoute enforces role-based access** with cross-tenant safety (redirects to correct role home)

**⚠ FINDING:**
- RootRedirect using useAuth in a stateless component — works, but calls useAuth 2× (once in root, once in ProtectedRoute). Negligible performance impact but slightly redundant.

---

## 3. State Management & Cache Invalidation

### React Query Usage
**✓ GOOD:**
- useQueryClient + invalidateQueries on mutations (e.g., useAttendance: checkIn/checkOut → invalidates `attendance.all` + `pickers.all`)
- queryKeys centralized in `/src/config/queryClient`
- Mutations properly use `onSuccess` callbacks for cache sync

### Logout Cache Clearing
**⚠ SEVERITY: HIGH — Potential state leak across sessions**

**Current behavior (AuthContext.tsx, line 269-279):**
```typescript
const signOut = async () => {
  // ... warnings, service teardown ...
  localStorage.clear();  // ← Basic localStorage cleared
  // ❌ NO invalidateQueries() call
  window.location.reload();
};
```

**CRITICAL GAP:**
1. React Query cache is **NOT cleared** before logout
2. useQueryClient in hooks still holds old user's data (roster, attendance, payroll) in memory
3. On re-login as different user/role, cached data could briefly leak before refetch completes
4. Especially risky on shared tablets (e.g., team leader phones)

**Remediation:**
```typescript
const signOut = async () => {
  // ... existing code ...
  // NEW: Clear React Query cache BEFORE logout
  const qc = getQueryClient();
  await qc.clear();  // Wipe all cached queries
  
  // Wipe local state stores (Zustand)
  // (verify all store.getState().clear() or reset() methods exist)
  
  localStorage.clear();
  window.location.reload();
};
```

**Status:** `fix/logout-clear-caches` branch mentioned in task description — **verify this fix is merged** before production.

---

## 4. Forms & Validation

### Schema Validation
**✓ Zod (v4.3.6) used** in `/src/schemas/zod.schemas.ts` and API schemas
**Status: GOOD** — Both client-side (form validation) and API-boundary (request/response validation) covered

### React Hook Form
**Finding:** Search shows **NO** react-hook-form imports in source
- Forms appear to be **vanilla React state** (useState) or zustand-based
- **Risk:** No built-in client-side form validation beyond Zod — slower UX on validation errors (requires full submission)
- **Recommendation:** Migrate critical forms (Login, Payroll, Leave Requests) to react-hook-form + Zod for instant feedback

---

## 5. Accessibility (A11y)

### Findings

**✓ STRENGTHS:**
1. **121 files** use aria-* or keyboard attributes
2. **ModalOverlay.tsx** implements focus trap:
   - `role="dialog"`, `aria-modal="true"`, `aria-label`
   - `tabIndex={-1}` for focus anchoring
   - Escape key to close (unless `isStatic`)
   - Body scroll locked on modal open ✓
3. **ErrorBoundary** has role="status" on fallback loader
4. **PageLoader** has `role="status"`, `aria-live="polite"`, `aria-label="Loading application"`
5. **Skip-to-content link** in index.html (sr-only, focusable) ✓
6. **prefers-reduced-motion** in index.css ✓

**⚠ GAPS: MEDIUM SEVERITY**
1. **Focus trap incomplete**: ModalOverlay focuses dialog but does NOT prevent tab-out to body elements
   - When modal open, user can Tab through modal close button → Tab again → lands on body content (wrong)
   - Needs `focus-trap` library or manual `onKeyDown Tab` handling to cycle focus within dialog only
2. **Colour contrast**: Tailwind config uses `lilac-light: #c084fc` on white — contrast ~2.5:1 (WCAG AA requires 4.5:1 for text)
3. **Keyboard navigation**: No explicit `tabIndex` ordering in complex components (Manager dashboard, PayrollView, etc.)
4. **Screen reader**: No descriptive labels on icon-only buttons (e.g., ScannerModal close button)

### Recommendations
- Install `focus-trap-react` and wrap modals to prevent Tab-escape
- Audit lilac/light colors in form labels for contrast
- Add `aria-label` to all Material Symbols icon buttons

---

## 6. Internationalization (i18n)

### Current Status
**✓ EXCELLENT:**
- Lightweight custom i18n provider (no heavy libraries like i18next)
- **7 languages supported:**
  - `en` (English)
  - `es` (Spanish) ← RSE workers
  - `mi` (Māori) ← NZ indigenous requirement
  - `sm` (Samoan)
  - `hi` (Hindi)
  - `to` (Tongan)
  - `tl` (Filipino/Tagalog)
- Feature-scoped translation files per language in `locales/`
- Browser language auto-detection + localStorage persistence
- Fallback chain: requested locale → EN → key itself

**Verification:**
- `/src/services/translations/en.ts` and `/src/services/translations/sm.ts` exist
- useTranslation hook provides `t()` function + locale switching
- All critical UI strings use `t('key')` (verified in routes.tsx, ErrorBoundary.tsx, etc.)

**⚠ Minor finding:**
- No data export showing completeness of translations per locale (e.g., % coverage for ES vs SM)
- Recommendation: Add translation coverage report to CI/CD

---

## 7. Error Boundaries & Telemetry

### Error Handling
**✓ STRONG:**
- `ErrorBoundary.tsx` class component with `getDerivedStateFromError` + `componentDidCatch`
- Sentry integration: `captureSentryError(error, { componentStack })` ✓
- Graceful fallback UI with reload + "clear cache" options
- User can email crash report directly from error page
- Sentry configured to scrub cookies and storage (SEC-2 FIX: `maskAllText: true` in replays)

**⚠ GAP: MEDIUM**
- **No error boundary on individual modal components** — ComponentErrorBoundary.tsx exists but unclear if wrapped around all modals
- Search shows modals (AddPickerModal, NewTransportRequestModal, etc.) but no ErrorBoundary import in most
- If a modal throws, entire page crashes instead of showing modal-level error

### PII Scrubbing
**✓ EXCELLENT:**
- Sentry beforeSend: deletes `event.request.cookies`, `event.contexts.storage`, excludes "Invalid login credentials"
- Replay masks all text + blocks media (preserves worker privacy under NZ Privacy Act 2020)
- Analytics: PostHog trackLogin/trackLogout but no PII in events (only role, orchard_id)

---

## 8. Mobile & Capacitor (Android)

### Configuration
**✓ capacitor.config.ts review:**
- `appId: 'com.harvestpro.nz'` ✓
- Native plugins: Camera, PushNotifications, Haptics, StatusBar, SplashScreen
- **allowMixedContent: false** (HTTP blocked) — Supabase is HTTPS-only ✓

**⚠ FINDINGS: MEDIUM SEVERITY**
1. **Permissions**: android/app/build.gradle doesn't declare AndroidManifest.xml permissions
   - Verify Camera, GPS, Contacts not over-requested
   - Capacitor should auto-inject required perms, but needs audit

2. **Deep linking**: No deep-link handler found in routes.tsx or Capacitor config
   - Risk: If app is launched via deep link (e.g., `harvestpro://runner/scan-qr`), routing might fail
   - Recommendation: Add `uri: https://harvestpro.vercel.app` to capacitor.config + implement deep-link middleware in routes

3. **PWA + APK coexistence**: app serves as both PWA (Vercel) and native APK
   - On Android, PWA will auto-update (Workbox), but APK requires store submission
   - Recommend: version-lock APK to major releases, PWA for patches

4. **IndexedDB persistence**: index.tsx has `navigator.storage.persist()` call ✓ to prevent iOS silent eviction

---

## 9. XSS Prevention

### Findings
**✓ EXCELLENT:**
- **No dangerouslySetInnerHTML detected** in codebase (grep returned 0 results)
- All user inputs sanitized by Zod schemas before database insert
- Error messages rendered as plain text (not HTML), e.g., ErrorBoundary: `{this.state.error?.toString()}`
- Markdown rendering: No markdown library detected (no XSS vector)
- CSP header set in index.html with strict `default-src 'self'`, allows only specific domains (Supabase, PostHog, Sentry)

**Minor observation:**
- Email link in ErrorBoundary: `mailto:...?subject=...&body=${encodeURIComponent(...)}` — properly escaped ✓

---

## 10. Test Coverage (UI/E2E)

### E2E Tests (Playwright)
**✓ 28 test files** covering:
- `smoke.spec.ts` — App loads, auth works, API connection, SW registers
- `runner-scanning.spec.ts` — QR code workflow
- `attendance-scan.spec.ts` — Check-in/out
- `manager-dashboard.spec.ts` — Dashboard rendering
- `payroll-accuracy.spec.ts` — Payroll run calculations
- `offline.spec.ts` — Service Worker + offline behavior
- `rls-cross-tenant.spec.ts` — Data isolation / RLS enforcement
- Many others...

**⚠ GAP: Missing critical flows**
1. **Logout cache invalidation**: No test verifies that React Query is cleared on signOut
2. **Multi-user shift (shared tablet)**: No test simulates user A logs out → user B logs in immediately (race condition risk)
3. **Modal focus trap**: No test checks that Tab key cycles focus within modal only
4. **Accessibility (a11y)**: No axe-core or WAVE integration in Playwright tests

### Unit Tests (Vitest)
**Coverage thresholds** in vite.config.ts:
- Statements: 70%
- Functions: 70%
- Branches: 60%
- Lines: 70%

**Status:** Likely met (no coverage report linked, but tests/ directory exists)

### Recommendations
1. Add signOut + re-login scenario to smoke tests
2. Add Playwright a11y check: `await injectAxe(page); await checkA11y(page);`
3. Test ModalOverlay focus trap with keyboard navigation

---

## Summary Punchlist by Severity

### 🔴 CRITICAL (Must fix before production)

| Issue | Location | Fix |
|-------|----------|-----|
| React Query cache not cleared on logout | AuthContext.tsx:269 | Call `queryClient.clear()` in signOut before window.location.reload() |
| No React Hook Form (forms use vanilla state) | Forms across app | Integrate RHF + Zod for instant validation feedback |

### 🟠 HIGH (Before next major release)

| Issue | Location | Fix |
|-------|----------|-----|
| Modal focus trap incomplete (Tab-escape) | ModalOverlay.tsx | Add focus-trap-react or manual onKeyDown trap |
| Main bundle 470 KB uncompressed | dist/assets/index-BwB6s5vq.js | Per-role code-splitting or aggressive tree-shaking |
| ComponentErrorBoundary not wrapped on modals | src/components/modals/* | Audit and wrap error-prone modals |
| No E2E test for logout cache invalidation | e2e/ | Add smoke test: logout → check QC cleared |

### 🟡 MEDIUM (Next sprint)

| Issue | Location | Fix |
|-------|----------|-----|
| QR scanner worker duplicated | dist/assets/ | Remove duplicate in Vite config |
| Colour contrast on lilac-light text | tailwind.config.js | Increase contrast to 4.5:1 for WCAG AA |
| No aria-label on icon buttons | components/ | Audit Material Symbols + add labels |
| Missing deep-link handler | routes.tsx, capacitor.config.ts | Implement deep-link middleware |
| No a11y automated tests in Playwright | e2e/ | Add @axe-core/playwright |

### 🟢 LOW (Nice to have)

| Issue | Location | Fix |
|-------|----------|-----|
| Translation coverage reporting | CI/CD | Generate locale coverage % report |
| RootRedirect calls useAuth 2× | routes.tsx | Minor refactor to avoid redundancy |

---

## Conclusion

The HarvestPro NZ frontend demonstrates **professional-grade architecture** with lazy-loaded analytics, code-split routes, comprehensive error handling, strong i18n, and mobile support. However, **logout state cleanup and modal focus management are critical gaps** that could leak user data on shared devices or degrade accessibility. The recommended fixes (React Query cache clear, focus-trap library, E2E testing) are straightforward and should take 3–5 days to implement.

**Overall Grade: B+ (Good foundation, finish loose ends before scaling.)**

