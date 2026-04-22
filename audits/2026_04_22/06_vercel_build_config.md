# Audit — Vercel Deployment & Build Config

**Scope:** HarvestPro NZ — `/root/repos/harvestpro-nz`
**Date:** 2026-04-22
**Mode:** READ-ONLY

---

## Severity summary

| Severity   | Count |
|------------|-------|
| CRITICAL   | 0     |
| HIGH       | 3     |
| MEDIUM     | 5     |
| LOW        | 4     |
| INFO       | 4     |

---

## 1. `vercel.json` — Headers review

**File:** `/root/repos/harvestpro-nz/vercel.json` (1342 bytes, 38 lines)

### Present headers (applied to `/(.*)`):
- `Content-Security-Policy` — detailed allowlist (see §2)
- `X-Content-Type-Options: nosniff` — OK
- `X-Frame-Options: DENY` — OK
- `X-XSS-Protection: 1; mode=block` — legacy, ignored by modern browsers, harmless
- `Referrer-Policy: strict-origin-when-cross-origin` — OK
- `Permissions-Policy: camera=(self), microphone=(), geolocation=(self), payment=()` — reasonable; `microphone=()` hard-disabled (OK — no voice features)
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` — OK (**no `preload`**; consider adding after HSTS preload list submission — LOW)

### Missing / notable:
- **No `rewrites`** declared. This is an SPA (React Router) — direct navigation to deep URLs like `/harvest/123/edit` will 404 on Vercel unless Vercel auto-detects Vite output. **[HIGH]** — add `"rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]` or rely on Vercel's Vite preset (verify in Vercel project settings).
- No `redirects` (trailing-slash normalization). Vercel default is `cleanUrls: false`. Acceptable but inconsistent-URL risk. **[LOW]**
- No `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` / `Cross-Origin-Resource-Policy`. Not strictly required; would enable isolation for future `SharedArrayBuffer`/worker work. **[INFO]**
- No cache-control headers for `/assets/*` (hashed files) — Vercel's default is fine but explicit `immutable` would be better. **[LOW]**

---

## 2. CSP analysis

### `vercel.json` CSP (runtime, served by edge):
```
default-src 'self';
script-src 'self' 'unsafe-inline' https://*.supabase.co https://*.sentry.io https://*.posthog.com blob:;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: blob: https://*.supabase.co;
connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io https://*.posthog.com https://fonts.googleapis.com https://fonts.gstatic.com;
worker-src 'self' blob:;
frame-ancestors 'none';
base-uri 'self';
form-action 'self'
```

### `index.html` CSP (`<meta http-equiv>`):
```
default-src 'self';
script-src 'self' 'unsafe-inline' https://*.posthog.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com data:;
img-src 'self' data: blob: https:;
connect-src 'self' http://localhost:* ws://localhost:* http://127.0.0.1:* http://localhost:* ...
             https://*.supabase.co https://*.supabase.in wss://*.supabase.co
             https://*.sentry.io https://*.posthog.com https://*.ingest.sentry.io ...;
worker-src 'self' blob:;
manifest-src 'self';
```

### Findings:

- **[HIGH] Dual-CSP divergence.** Two CSPs are served simultaneously (HTTP header + meta). When both exist, the browser enforces the **intersection (most restrictive wins per directive)**. They disagree:
  - `script-src`: meta omits Supabase+Sentry that header allows → Supabase/Sentry script loads MAY be blocked depending on how chunks load.
  - `img-src`: header is `'self' data: blob: https://*.supabase.co` (strict), meta is `'self' data: blob: https:` (permissive). Header wins → any non-Supabase HTTPS image will be blocked (e.g., Gravatar, CDN avatars).
  - `connect-src`: meta adds `https://*.supabase.in`, `https://*.ingest.sentry.io` — header is missing `*.ingest.sentry.io` (this is the ACTUAL Sentry DSN ingest hostname; `*.sentry.io` does not cover it). **Sentry DSN calls will be CSP-blocked in production.** **[HIGH]**
  - `manifest-src` only in meta; header defaults to `default-src 'self'` → `/manifest.json` loads OK.
- **[HIGH] Leaked dev origins in production CSP.** `dist/index.html` (built output, 2026-04-22 06:28) still contains `http://localhost:* ws://localhost:* http://127.0.0.1:* ws://127.0.0.1:*` in `connect-src`. Not a confidentiality leak but indicates the dev CSP leaks into prod artifact — should be conditional on `import.meta.env.DEV`. **[MEDIUM]**
- **[MEDIUM] `'unsafe-inline'` on `script-src`.** Required right now by the inline splash-screen/observer `<script>` block in `index.html` and by the inline `<style>`. This defeats a major layer of XSS defense. Mitigation: move the splash JS to a hashed external file or add a `nonce`/`sha256-...` hash. Vite PWA `registerSW` also inlines.
- **[MEDIUM] `'unsafe-inline'` on `style-src`.** Needed by Tailwind JIT at runtime? No — Tailwind outputs static CSS. Usually needed by `@emotion` or inline `style=` attributes from libraries. Worth testing CSP without `'unsafe-inline'` via `'unsafe-hashes'` + specific hashes.
- **[MEDIUM] PostHog recorder.** If session-replay is enabled (`posthog-js` ^1.345), needs `https://*.i.posthog.com` or regional host (e.g., `https://eu.i.posthog.com`). Header lists `*.posthog.com` — wildcard covers both. OK.
- **[LOW]** `frame-ancestors 'none'` is good but redundant with `X-Frame-Options: DENY`. No issue.

---

## 3. Env vars — `VITE_*` prefix leak check

**`.env.example`** (safe template):
- `VITE_SUPABASE_URL` — CLIENT-EXPOSED, intended, OK
- `VITE_SUPABASE_ANON_KEY` — CLIENT-EXPOSED, intended (anon key is public by design w/ RLS), OK
- `VITE_GEMINI_API_KEY` — **[HIGH] POTENTIAL LEAK.** Gemini API keys have full quota+billing scope. Any `VITE_` var is bundled into `/assets/*.js` and readable by every browser. Anyone can extract it and burn Gemini quota against the user's Google Cloud bill. Even if unused in prod today, the wiring is in place (`src/services/config.service.ts:130`). **Recommendation:** route Gemini calls through a Supabase Edge Function or serverless proxy; strip `VITE_` prefix.
- `VITE_APP_VERSION`, `VITE_ENABLE_ANALYTICS`, `VITE_LOG_LEVEL` — non-secret, OK
- `VITE_VAPID_PUBLIC_KEY` — intended public (VAPID public), OK — comment correctly notes private goes to Supabase secrets
- `TEST_DEMO_PASSWORD` / `TEST_MANAGER_PASSWORD` / `TEST_ACID_PASSWORD` / `TEST_STRESS_PASSWORD` — no `VITE_` prefix → Vite will NOT bundle these into client. OK.

**`.env.production`:** 8 bytes only. Contains `DB` token only (not a secret — likely leftover / placeholder). Gitignored. OK.

**`.env.staging`:** 378 bytes. Variable names only (not values):
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_VERSION`, `VITE_ENABLE_ANALYTICS`, `VITE_LOG_LEVEL`
- No secret-shaped names. Gitignored. OK.

---

## 4. `vite.config.ts` — build-time injection

- No `define:` block. Nothing injected at build time beyond Vite's standard `import.meta.env.*`.
- `external: ['@capacitor-community/barcode-scanner']` — correct (native-only plugin excluded from web bundle).
- **[MEDIUM] `visualizer()` writes `dist/stats.html` (702 KB).** This is the rollup bundle analyzer output — it reveals full module tree, file sizes, and source-module paths. Shipped to Vercel prod as `dist/stats.html` (last build 2026-04-22 06:28, 718,677 bytes). **Public URL `/stats.html` exposes the entire dependency graph.** Not catastrophic (no source code, just module graph) but it's reconnaissance material. Either gate behind `if (mode === 'analyze')` or delete/block in `vercel.json`.
- Manual chunks are reasonable (react/supabase/state/sentry/analytics split).
- **No `build.sourcemap`** set (default `false`). Confirmed zero `.map` files in `dist/`. **GOOD.** Prod does not leak source structure via sourcemaps.

---

## 5. Vercel functions runtime

- **No `/api/*` routes** in the repo. No `api/` directory, no `src/pages/api/`, no Vercel serverless functions.
- `sw-push.js` POSTs to `/api/push-subscription` (line 90) — **this endpoint does not exist in the codebase**. Either it's handled by Supabase Edge Functions under a rewrite (none declared in `vercel.json`) or push-subscription persistence is broken. **[MEDIUM]** Verify via functional test; likely dead code from a removed server path.
- All backend is Supabase (DB + Edge Functions + Auth). Vercel only serves static assets. Good separation.

---

## 6. Build output & sourcemaps

- `dist/` total: **3.7 MB**
- Total JS: **2,471,482 bytes (~2.36 MB uncompressed)**
- Largest JS chunks:
  - `index-BwB6s5vq.js` — 481 KB (main entry)
  - `vendor-sentry-BGbusvO3.js` — 445 KB (Sentry is huge; already lazy per vite.config)
  - `vendor-analytics-BIdvvprf.js` — 175 KB (PostHog)
  - `vendor-supabase-rHgJDrTE.js` — 170 KB
  - `Manager-BQXPTxL_.js` — 168 KB (a single route chunk)
  - `vendor-state-IAjO2TFS.js` — 112 KB (zustand + dexie + react-query)
  - `vendor-react-BMImyfHn.js` — 98 KB
- `index-BdsLCqJ4.css` — 174 KB (Tailwind — may not be purged optimally)
- **No sourcemaps shipped.** OK.
- **[HIGH for perf] `index-BwB6s5vq.js` at 481 KB raw** will be ~140-160 KB gzipped, still heavy for mobile-first app. Combined with the Sentry 445 KB chunk (should load LAST, lazy). Flag for the **perf agent**. The `Manager-*.js` route chunk at 168 KB is notable — investigate what's inside.
- `stats.html` at 702 KB ships to prod (see §4).
- Dual QR-scanner workers (2 nearly identical files ~44 KB each) — duplicate code? `qr-scanner-worker.min-PJMWJc5V.js` + `qr-scanner-worker.min-D85Z9gVD.js`. **[LOW]**

---

## 7. Preview vs prod env isolation

- No `VERCEL_ENV` usage in `src/`. Code only reads `import.meta.env.MODE` (production/development/mock).
- Vercel injects `VERCEL_ENV=preview|production|development` at build — **not consumed**. All preview deploys use whichever `VITE_SUPABASE_URL` Vercel's Project Settings assign to the "Preview" environment.
- **[MEDIUM]** No in-code safeguard against a preview deploy accidentally pointing at prod Supabase. Recommendation: add a runtime assertion in `src/config/env.validation.ts` that checks `if (location.hostname.includes('vercel.app') && VITE_SUPABASE_URL === PROD_URL) throw`. This forces the Vercel dashboard to have staging creds wired to Preview scope — a common misconfig.
- `src/config/env.validation.ts:53` has `if (import.meta.env.MODE === 'production')` hardening — Vercel builds preview with MODE=production by default, so this triggers on previews too. Currently behaves identically prod vs preview. OK functionally, but see above.

---

## 8. Redirects

- No `redirects` in `vercel.json`.
- No trailing-slash handling. Vercel default keeps URLs as-is. **[LOW]**
- No legacy path handling. No history of rewrites — fresh deploy. **[INFO]**

---

## 9. PWA manifest

**`public/manifest.json`** and **`dist/manifest.webmanifest`** (generated by `vite-plugin-pwa`):
- `name`: "HarvestPro NZ" — OK
- `short_name`: "HarvestPro" — OK
- `start_url`: `/` — OK
- `scope`: `/` (webmanifest only; source manifest.json lacks it) — OK
- `display`: `standalone` — OK
- `theme_color: #16a34a`, `background_color: #1a1a2e` — OK
- Icons: 192x192, 512x512 PNG + SVG — all present in `dist/icons/`. OK.
- **[LOW] `orientation: portrait-primary`** in source manifest.json — may be too restrictive for managers using tablets in landscape. Vite-generated manifest.webmanifest omits this (good).
- **[LOW] Two manifests exist:** `/manifest.json` (hand-written, linked via `index.html`) and `/manifest.webmanifest` (Vite-PWA generated). `index.html` only references `manifest.json`. The `.webmanifest` is orphaned — delete source `public/manifest.json` OR update index.html to use the generated one for single source of truth.
- `crossorigin="use-credentials"` on manifest link — OK (app is same-origin).
- `shortcuts` defined for Team Leader + Manager — good UX.

---

## 10. Capacitor — mobile webview concerns

**`capacitor.config.ts`:**
- `appId: com.harvestpro.nz`, `webDir: dist` — OK
- `androidScheme: https` — OK (modern best practice)
- `android.allowMixedContent: false` — **good**, confirmed via SEC-1 comment
- **No `server.allowNavigation` declared** — Capacitor defaults deny external navigation, only localhost webview. If the app opens `https://*.supabase.co` via `window.open`, it will NOT be allowed by default. **[MEDIUM]** Verify OAuth / magic-link flows; add allowlist if needed (e.g., `allowNavigation: ['*.supabase.co']`).
- **No explicit `CapacitorHttp` plugin** — CORS issues if calls go native; probably fine since Supabase JS uses fetch from webview.
- **[MEDIUM] No CSP meta in built `dist/index.html` for Capacitor webview.** Capacitor webview IGNORES Vercel HTTP headers (files are loaded via `capacitor://` on iOS or `https://localhost/` on Android). So the ONLY CSP in effect in the mobile app is the `<meta>` CSP. That meta CSP DROPS `*.sentry.io` from `script-src` and has DEV origins cluttering `connect-src`. Sentry may be partially broken in mobile. **Recommendation:** write a single production CSP into the meta tag for mobile + use a post-build step to strip localhost origins from the meta CSP before packaging for Capacitor.
- **[LOW] `StatusBar.style: 'dark'`** — check visual against `#16a34a` green background. Usually `light` text (white icons) works better on a saturated green. UX minor.

---

## 11. `dist/` in git

- `.gitignore` line 9: `dist/` — ignored. Verified via `git check-ignore dist/` returns match.
- `git ls-files | grep '^dist/'` → 0 files tracked. **OK.**

---

## 12. Bundle size — perf flag

- Total uncompressed JS ~**2.4 MB**.
- Main entry `index-BwB6s5vq.js` = 481 KB → **exceeds 1MB uncompressed threshold across main+react+supabase+analytics on first load**.
- **FLAG for perf agent:** investigate whether Sentry + PostHog can be deferred until after LCP (they already seem split but check lazy-load wiring in `src/config/sentry.ts` + `src/config/analytics.ts`). Tailwind CSS 174 KB suggests purge isn't aggressive — verify `content:` paths in `tailwind.config.js`.

---

## Top 5 findings (ranked by actionability × risk)

1. **[HIGH] Sentry `ingest.sentry.io` missing from Vercel CSP `connect-src`.** Prod Sentry error reports likely being blocked by CSP (Vercel header wins when intersecting with meta). Fix: add `https://*.ingest.sentry.io` + `https://*.ingest.us.sentry.io` to `connect-src` in `vercel.json`.
2. **[HIGH] `VITE_GEMINI_API_KEY` in `.env.example` = client-bundled API key.** Gemini keys carry billing scope. Any value shipped via this var is extractable from prod JS. Move to server-side (Supabase Edge Function).
3. **[HIGH] Dual CSP (HTTP header vs `<meta>`) with divergent directives.** Browser enforces intersection — confusing, fragile. Consolidate into one source. Keep HTTP header, remove `<meta>`; or make meta match header exactly (parametrized by build mode to strip `localhost:*` in prod).
4. **[HIGH] No SPA rewrite in `vercel.json`.** Deep-link navigation (refresh on `/harvest/123`) risks 404 if Vercel preset detection fails. Add explicit `rewrites` entry.
5. **[MEDIUM] `dist/stats.html` (702 KB bundle analyzer) shipped to production.** Reveals full dep graph at `https://harvestpro-nz.vercel.app/stats.html`. Delete in build or exclude via `vercel.json` route.

---

## Additional items worth fixing (bonus)

- **[MEDIUM]** Localhost origins in prod built HTML CSP meta (`dist/index.html`).
- **[MEDIUM]** `/api/push-subscription` endpoint referenced by `sw-push.js` does not exist — dead code or missing Vercel function.
- **[MEDIUM]** Capacitor has no `server.allowNavigation` — verify OAuth/magic-link flows.
- **[MEDIUM]** No preview-vs-prod env safety assertion — rely 100% on Vercel dashboard discipline.
- **[LOW]** Duplicate QR-scanner worker chunks.
- **[LOW]** Two competing PWA manifests (source `.json` vs generated `.webmanifest`).
- **[LOW]** HSTS lacks `preload`.
- **[LOW]** No explicit `Cache-Control: immutable` on `/assets/*`.
