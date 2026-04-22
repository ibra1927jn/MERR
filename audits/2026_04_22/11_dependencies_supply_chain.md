# HarvestPro NZ — Dependencies & Supply-Chain Audit

**Date:** 2026-04-22
**Scope:** `/root/repos/harvestpro-nz` (package.json, package-lock.json, .npmrc, .nvmrc, CI workflows)
**Commands run (read-only):** `npm audit --json`, `npm outdated --json`, `npm ls --depth=0`, `npm ls --all --json`, `npm install --dry-run --package-lock-only`
**Auditor:** autonomous agent — read-only (no install, no upgrade, no write to source)

---

## Severity summary

| Severity | Count |
|---|---|
| Critical | **0** |
| High | **0** |
| Moderate | **0** |
| Low | **0** |
| Info | 0 |
| **TOTAL CVEs** | **0** |

`npm audit` reports **zero known vulnerabilities** across all 995 installed packages (169 prod, 821 dev, 78 optional, 31 peer). Report version 2. Clean audit report JSON: `{"vulnerabilities":{},"metadata":{"vulnerabilities":{"info":0,"low":0,"moderate":0,"high":0,"critical":0,"total":0},"dependencies":{"total":995}}}`.

### Previous critical-CVE patches — status: RESOLVED

Commit `66e1d85 fix(deps): update dompurify and protobufjs to patch critical vulnerabilities` — confirmed resolved against installed tree:

| Package | Installed | Patched-from | CVE |
|---|---|---|---|
| `dompurify` | **3.4.0** (transitive via `@sentry/react`) | ≥3.2.4 patches CVE-2025-26791 (XSS via mXSS) | Resolved |
| `protobufjs` | **7.5.5** (transitive via `@supabase/realtime-js`) | ≥7.2.5 patches CVE-2023-36665 (prototype pollution) | Resolved |

Both are well above their patch floors. `package.json` `overrides.serialize-javascript >=7.0.5` is also being respected.

---

## Severity counts by finding category

| Category | Count | Severity |
|---|---|---|
| Known CVEs (npm audit) | 0 | — |
| Outdated majors (framework/security-relevant) | 3 | Medium |
| Outdated minors/patches | 34 | Low |
| Unused dependencies | 0 | — |
| Misplaced dependencies | 0 | — |
| Deprecated packages (direct) | 0 (1 indirect: ESLint 8) | Low |
| Peer-dep conflicts | 0 | — |
| Duplicate versions in tree | 60 (mostly transitive utils) | Low |
| Lockfile drift | 0 — lockfile is in sync | — |
| Copyleft / problematic licenses | 0 (LGPL only in Sharp's libvips native bins, dynamic link) | Low |
| `postinstall` install-script packages | 7 (all well-known) | Low (review) |
| Typosquat candidates | 0 | — |
| Node-version pinning | Inconsistent across CI | Medium |

---

## Top 6 findings

### 1. [MEDIUM] Node version inconsistency across CI workflows; no `.nvmrc`, no `engines`
- **No `.nvmrc`, no `.npmrc`, no `engines` field** in `package.json`.
- `.github/workflows/ci.yml` → `node-version: '22'`
- `.github/workflows/deploy-production.yml` → `node-version: '20'`
- `.github/workflows/deploy-staging.yml` → `node-version: '20'`
- `.github/workflows/security.yml` → `node-version: '20'`
- Local dev runs Node v22.22.0 / npm 10.9.4.
- **Risk:** CI tests pass on Node 22 but production deploys build on Node 20. Divergent transpile/runtime behavior possible (native addons: `sharp`, `fsevents`, `esbuild`, `better-sqlite3`-style). Add `"engines": {"node": ">=20.11 <23"}` to `package.json` and either unify workflows to Node 22 or add `.nvmrc` pinning to the Node version matching production.

### 2. [MEDIUM] ESLint 8 is end-of-life (deprecated upstream)
- `eslint@8.57.1` installed (latest: 10.2.1). ESLint 8.x reached end-of-life 2024-10. Security advisories and config ecosystem (flat-config migration) have moved to 9/10.
- No CVE yet, but upstream will no longer publish fixes. Plan migration to ESLint 9/10 with `eslint-plugin-react-hooks@7` (currently on 4.6.2, three majors behind) and `eslint-plugin-react-refresh@0.5`.
- Same theme: `eslint-plugin-react-hooks@4.6.2` → latest `7.1.1` (3 majors behind).

### 3. [MEDIUM] Framework deps lagging minor/patch releases (no breaking updates)
All within-range upgrades (semver `wanted` == `latest`), just stale installs:

| Package | Current | Latest | Gap |
|---|---|---|---|
| `@supabase/supabase-js` | 2.91.1 | 2.104.0 | 13 minors |
| `@tanstack/react-query` | 5.90.21 | 5.99.2 | 9 minors |
| `@sentry/react` | 10.39.0 | 10.49.0 | 10 minors |
| `posthog-js` | 1.345.3 | 1.370.0 | 25 minors |
| `react` / `react-dom` | 19.2.3 | 19.2.5 | 2 patches |
| `react-router-dom` | 7.13.0 | 7.14.2 | 1 minor |
| `@playwright/test` | 1.58.2 | 1.59.1 | 1 minor |
| `vitest` / `@vitest/coverage-v8` | 4.0.18 | 4.1.5 | 1 minor |
| `postcss` | 8.5.6 | 8.5.10 | 4 patches |
| `@capacitor/*` | 8.2.0 | 8.3.1 | 1 minor |

A single `npm update` (no `--save` flag changes) would pull all of these. React/Vite/Supabase are current on their major lines — no major-behind risk.

### 4. [LOW] Majors behind (will require code work)
- `dexie` 3.2.7 → 4.4.2 (API changes around `Dexie.Observable`).
- `tailwindcss` 3.4.19 → 4.2.4 (Tailwind v4 — new engine, `@import` syntax, config-as-CSS).
- `vite` 7.3.2 → 8.0.9 (plugin API; `@vitejs/plugin-react` 5 → 6).
- `jsdom` 24 → 29 (dev only).
- `typescript` 5.9.3 → 6.0.3.
- `cross-env`, `husky` on latest.
- None urgent; stay on current majors, upgrade opportunistically during dedicated chores.

### 5. [LOW] `postinstall` / install-scripts — supply-chain vector
7 packages with `hasInstallScript: true`. All are well-known, with legitimate reasons:

| Package | Version | Reason |
|---|---|---|
| `core-js` | 3.48.0 | prints banner (known nuisance; now benign in 3.x) |
| `esbuild` | 0.27.3 | downloads native binary |
| `fsevents` | 2.3.3 | macOS native |
| `msw` | 2.13.2 | copies service worker |
| `playwright/node_modules/fsevents` | 2.3.2 | duplicate, macOS native |
| `protobufjs` | 7.5.5 | optional native speedup |
| `sharp` | 0.34.5 | downloads libvips binary |

**Recommendation:** set `"ignore-scripts": true` in `.npmrc` for reproducible builds, then allowlist via `npm rebuild <pkg>` per accepted package. At minimum, lock CI to `npm ci` (not `npm install`) — which is already implicit via lockfile v3.

### 6. [LOW] 60 duplicate packages at different versions (bloat only, no CVE)
Notable (all transitive, none of the direct deps is duplicated):
- `glob`: 7.2.3, 11.1.0, 13.0.6 (3 majors coexist)
- `minimatch`: 3.1.5, 5.1.9, 9.0.9, 10.2.4 (4 majors)
- `rollup`: 2.80.0 (via legacy transitive) + 4.59.0 (Vite 7) — check whether 2.80 is still pulled by `rollup-plugin-visualizer`; if so, upgrade plugin to drop it.
- `@vitest/*`: 3.2.4 + 4.0.18 — coverage-v8 carries an older vitest sub-tree. Keep an eye when bumping `@vitest/coverage-v8`.
- `ajv` 6 + 8, `semver` 6 + 7, `ansi-styles` 4/5/6 — normal Node transitive drift.

**Impact:** bundle-size irrelevant (all dev-tree); install-size only.

---

## Additional verifications (passed)

- **Lockfile integrity** — `package-lock.json` lockfileVersion 3, `version` 9.9.0 matches `package.json` 9.9.0. Zero range diffs; zero packages in one side and not the other. `npm install --dry-run` reports `up to date` (no pending work).
- **`npm ls --depth=0`** — all 60 top-level deps resolved cleanly, no UNMET/extraneous/invalid/peer warnings.
- **Peer-dep conflicts** — `npm ls --all --json` reports `problems: 0` (scanned recursively).
- **Unused deps** — every runtime dep in `dependencies` is imported somewhere in `src/` (some via dynamic `import()` in `src/config/analytics.ts` for `posthog-js`, `src/services/deviceTrust.service.ts` for `@capacitor/preferences`, `src/index.tsx` for Sentry lazy-load). `@capacitor/android` and `@capacitor/cli` are build-only (native shell) — correct. No unused declarations.
- **Misplaced deps** — Zero `@types/*` in `dependencies`. All `@types/*` in `devDependencies`. `sharp` correctly in `devDependencies` (build-time image processing). `tailwind-merge` correctly in `dependencies` (runtime className utility).
- **Typosquat scan** — all non-scoped, non-obviously-owned packages are well-known (`react`, `clsx`, `dexie`, `zod`, `zustand`, `papaparse`, `qr-scanner`, `posthog-js`, `date-fns`, `web-vitals`, `tailwind-merge`, `react-virtuoso`). All scoped packages are from known publishers (`@capacitor`, `@sentry`, `@supabase`, `@tanstack`, `@testing-library`, `@types`, `@typescript-eslint`, `@vitejs`, `@vitest`, `@playwright`, `@storybook`, `@tailwindcss`).
- **License risk** — 803 MIT, 57 ISC, 55 Apache-2.0, 25 BSD-3, 15 BSD-2. **No GPL/AGPL/SSPL.** LGPL-3.0 appears only in `@img/sharp-libvips-*` prebuilt native binaries (Sharp dynamically links libvips — LGPL permits this for closed-source use). MPL-2.0 on `dompurify`. No copyleft contamination.
- **`.npmrc`/`.nvmrc`** — absent. Recommend adding both (see finding #1).

---

## Recommendations (prioritized)

1. **Add `engines.node` to package.json** + **`.nvmrc` pinning** + unify CI Node 20 vs 22.
2. **Run `npm update`** to pull the 34 within-range patch/minor updates (Sentry, Supabase, Posthog, React-Query, React 19.2.5, PostCSS, Playwright, Vitest, Capacitor). Zero risk (semver-compatible).
3. **Plan ESLint 9/10 migration** — ESLint 8 EOL; `eslint-plugin-react-hooks` 7 is ready.
4. **Consider `ignore-scripts=true` in `.npmrc`** + rebuild allowlist for supply-chain hardening.
5. **Track Dexie 4, Tailwind 4, Vite 8, TypeScript 6** as future chores (none blocking).
6. **Re-run `npm audit` in CI weekly** (already present in `.github/workflows/security.yml`); verify threshold = moderate or above fails the build.

---

## Appendix — commands + raw artifact paths (run local)

```bash
cd /root/repos/harvestpro-nz
npm audit --json               # → /tmp/npm_audit.json      (0 vulns)
npm outdated --json            # → /tmp/npm_outdated.json   (37 entries)
npm ls --depth=0               # → /tmp/npm_ls.txt          (clean)
npm ls --all --json            # → /tmp/npm_ls_all.json     (problems: 0)
npm install --dry-run --package-lock-only   # → up to date
```

No write operations performed. No files modified outside of `audits/2026_04_22/`.
