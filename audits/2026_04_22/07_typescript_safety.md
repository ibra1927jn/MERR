# 07 — TypeScript Type Safety Audit

Date: 2026-04-22
Repo: `/root/repos/harvestpro-nz`
Mode: READ-ONLY
Scope: tsconfig, `src/types/*`, `src/schemas/*`, type-safety escape hatches across `src/`.

---

## Severity Summary

| Severity  | Count |
|-----------|-------|
| Critical  | 0     |
| High      | 1     |
| Medium    | 5     |
| Low       | 4     |
| Info      | 3     |
| **Total** | **13** |

Headline: **production code is remarkably clean on `any`** — `grep -E "(:\s*any\b|\bas\s+any\b|\bany\[\])"` under `src/` excluding tests returns **zero** hits. All 262 `any` hits (99 `: any` + 163 `as any`) live in `*.test.*` / `__tests__/` / `.spec.*` files. The `ts-expect-error` is similarly clean: only one occurrence (in `src/utils/uuid.test.ts:30`) and it has an explanatory comment.

The bigger risks are (a) `tsconfig.json` missing two high-leverage strictness flags, (b) ~38 places where Supabase's `{ data, error }` has `error` silently dropped, (c) 110 `Record<string, unknown>` + 86 `as unknown as` casts used as a pressure valve where real schemas should live.

---

## 1. `tsconfig.json` — strictness

File: `/root/repos/harvestpro-nz/tsconfig.json`

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "target": "ES2022",
    "useDefineForClassFields": false,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "isolatedModules": true,
    "moduleDetection": "force",
    "allowJs": false,           // QA-5: project is 100% TS
    "jsx": "react-jsx",
    "paths": { "@/*": ["./src/*"] },
    "allowImportingTsExtensions": true,
    "noEmit": true
    // ← NO noUncheckedIndexedAccess
    // ← NO exactOptionalPropertyTypes
    // ← NO noImplicitOverride
    // ← NO noPropertyAccessFromIndexSignature
  },
  "include": ["src"],
  "exclude": ["tests", "playwright.config.ts", "**/*.spec.ts", "**/*.test.ts", "**/*.test.tsx", "**/*.stories.ts", "**/*.stories.tsx"]
}
```

**Good**:
- `strict: true` → enables all seven classic strict flags (`noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `noImplicitThis`, `alwaysStrict`).
- `forceConsistentCasingInFileNames: true`.
- `isolatedModules: true` + `moduleDetection: "force"` — prevents ambient-module footguns.
- `allowJs: false` — all source is TypeScript.
- Single extends-less file; no inheritance to chase.

**Missing (matters)**:
- **`noUncheckedIndexedAccess`** — with 110 `Record<string, unknown>` uses in prod and 74 Supabase tables, `obj[key]` currently returns `T` instead of `T | undefined`. This is the single biggest remaining source of runtime undefined-dereferences. **[M1]**
- **`exactOptionalPropertyTypes`** — currently `x?: string` accepts `{ x: undefined }` implicitly. Combined with Supabase's `string | null`-heavy schema, this masks the difference between "missing" and "explicitly null". **[M2]**
- `noImplicitOverride`, `noPropertyAccessFromIndexSignature`, `noFallthroughCasesInSwitch` — nice-to-have. **[L1]**

**Finding L2**: `exclude` list **excludes `tests/`**, `**/*.test.ts`, `**/*.test.tsx`, `**/*.spec.ts`. That means the `any`-heavy test files **are not type-checked at all** by `tsc`. `vitest` transforms them via `esbuild` (no type-check). So the 262 `any` hits in tests are truly unchecked. Acceptable pragmatically (tests intentionally mock stuff with `as any`), but worth a `tsconfig.test.json` + `typecheck:tests` script to catch API-surface drift in test fixtures.

---

## 2. `database.types.ts` — drift + regeneration survival

File: `/root/repos/harvestpro-nz/src/types/database.types.ts` (2533 lines, 74 tables).

### 2a. Manual appendix intact
Per `ERRORES.md` history (commits `2e737b8` "restore SupabasePicker and SupabasePerformanceStat type aliases lost in regeneration" and `9195b64` "restore manual type guards lost during database.types.ts regeneration"), re-running Supabase type generation historically clobbered hand-written aliases + guards.

Current state (verified lines 2477–2532):
```ts
// ─── Type aliases y runtime type guards (escritos a mano — NO borrar al regenerar) ──────────

export type SupabasePicker = Database['public']['Tables']['pickers']['Row'];
export type SupabasePerformanceStat = Database['public']['Views']['pickers_performance_today']['Row'] & {
    picker_id?: string | null;
};

export function isSupabasePicker(v): v is ... { ... }
export function isSupabaseUser(v): v is ... { ... }
export function isSupabaseChatMessage(v): v is ... { ... }
export function isSupabaseAttendanceRecord(v): v is ... { ... }
export function isSupabasePickerArray(v): v is ... { ... }
export function isSupabaseUserArray(v): v is ... { ... }
export function isSupabaseChatMessageArray(v): v is ... { ... }
```

**Status**: INTACT. The header comment `(escritos a mano — NO borrar al regenerar)` is present and serves as a sentinel. Good.

**Risk [M3]**: The comment is load-bearing tribal knowledge. Recommend either:
- Move the manual appendix to a separate file (`src/types/database.manual.ts`) and re-export from `database.types.ts`. This way regen only touches the auto-generated portion.
- Or add a pre-commit hook that `grep`s for `SupabasePicker` / `isSupabasePicker` in `database.types.ts` and fails if missing.

### 2b. Spot-check vs migrations
Checked `pickers` and `harvest_settings` Row types against migrations under `supabase/migrations/`:

| Table              | DB migration state                                                                | `database.types.ts`                                  | Drift? |
|--------------------|-----------------------------------------------------------------------------------|------------------------------------------------------|--------|
| `harvest_settings` | Has `min_wage_rate`, `piece_rate`, `variety`, `shift_start_time`, `shift_end_time`, `mfa_device_trust_ttl_hours`, `target_tons`, `min_buckets_per_hour` (all nullable per `20260411_harvest_settings_updated_at.sql` + `20260414_fix_settings_and_row_assignments.sql`) | Exact match lines 942–991 | No |
| `pickers`          | Has `archived_at`, `role`, `status`, `team_leader_id`, `current_row`, `version` (all nullable) | Exact match | No |
| `daily_attendance` | `verified_by` added in `20260415000002`, `season_id` is non-null NOT NULL post-backfill | Reflected in types | No |

**Finding [L3]**: `ip_address: unknown` on `audit_logs` + `login_attempts` (it's a Postgres `inet`). That's the Supabase codegen default for unsupported PG types — fine but requires a guard at usage sites. Not currently breaking; mark as known.

### 2c. App types vs DB reality
Per `ERRORES.md` 2026-04-14 line 11, `HarvestSettings` in `app.types.ts` previously had `variety`, `shift_start_time`, `shift_end_time`, `mfa_device_trust_ttl_hours` fields that did **not** exist in DB → 42703 on save. Migration added the columns. Verified: current `app.types.ts:84-96` + DB schema both have all four. **No longer drifting**.

**Finding [H1] — remaining app↔DB drift**: `Picker` in `app.types.ts:42-62` uses non-nullable fields like `picker_id: string`, `name: string`, `current_row: number`, `safety_verified: boolean`, `status: 'active' | 'break' | ...`. DB `pickers.Row` has all of these **nullable** (`string | null`, `number | null`, `boolean | null`, `string | null`). Result: any code path that reads directly from Supabase (many do, via `SupabasePicker` alias) and assigns to the `Picker` app-type loses null-safety. `PickerSchema` in `zod.schemas.ts` masks this by defaulting nulls — but only when the zod schema is actually applied. Scan of repos shows `.select('*').returns<SupabasePicker[]>()` patterns that skip zod. **Fix**: regenerate `Picker` app-type as `type Picker = NonNullable<Required<SupabasePicker>>` with explicit narrowing at the boundary via `PickerSchema.parse`.

**Finding [M4] — Role enum drift**: `Role` enum in `app.types.ts:1-10` includes `MANAGER, TEAM_LEADER, RUNNER, QC_INSPECTOR, PAYROLL_ADMIN, ADMIN, HR_ADMIN, LOGISTICS`. Codebase uses string literals `'picker'` and `'bucket_runner'` that are **not in the enum** — see:
- `src/services/harvestMetrics/roster.ts:17` — `p.role === 'picker'`
- `src/services/harvestMetrics/roster.ts:32` — `p.role === 'bucket_runner'`
- `src/services/harvestMetrics/perPicker.ts:51` — `p.role === 'picker'`

Because `Picker.role` is typed `string` (not `Role`), TS doesn't catch this. Either (a) add `PICKER = 'picker'` + `BUCKET_RUNNER = 'bucket_runner'` to the `Role` enum and type `Picker.role: Role`, or (b) introduce a separate `PickerJobRole` union. Currently role filters that look fine to TS could silently produce empty arrays if the DB role string changes casing.

---

## 3. `any` abuse — count + hot spots

```
: any      99 hits (100% in test files)
as any    163 hits (100% in test files)
any[]      26 hits (100% in test files)
Production any: 0
```

Excluded patterns: `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `__tests__/`. Test files use `as any` to mock partial Supabase clients (`vi.fn() as any`) — acceptable but a brittle pattern.

**No prod `any`**. This is a strong signal of the team's discipline. Flag as positive.

**Top test-file offenders** (for future cleanup, not this round):
- `src/services/__tests__/export-pdf-template.deep.test.ts`
- `src/hooks/useRunnerData.test.ts`
- `src/integration/sync-offline.integration.test.ts`

---

## 4. Type guards — quality

`src/types/database.types.ts:2487-2532` — **7 runtime guards**.

**Assessment**:
- `isSupabasePicker` checks `id: string && picker_id: string && created_at: string` → DB row requires all three non-null → **correct narrowing**.
- `isSupabaseUser` checks `id + role + created_at` → `role` is `string | null` in DB, guard rejects null → defensively stricter than schema, OK.
- `isSupabaseChatMessage` checks `id + conversation_id + sender_id + content + created_at` → all 5 required → **solid**.
- `isSupabaseAttendanceRecord` checks `id + picker_id + orchard_id + created_at`.

**Weakness [L4]**: Guards check existence only; they do not validate UUID shape, enum values, or ISO-8601 timestamps. A malformed DB row with `id: "not-a-uuid"` passes. If `safeParseArray` + `PickerSchema` is used, this is covered downstream. If a caller uses only `isSupabasePicker`, a corrupt row slips through. This is the classic "existence != validity" type-guard weakness the prompt warned about (`isUser(x)` with one-field check). Here it's three-to-five fields, not one — better but still not exhaustive.

**Recommendation**: Guards should delegate to Zod internally, e.g.
```ts
export function isSupabasePicker(v: unknown): v is SupabasePicker {
    return PickerSchema.safeParse(v).success;
}
```

**Finding [M5]**: Array guards `isSupabasePickerArray` use `.every(isSupabasePicker)` → O(n) per call, applied at boundary → acceptable. No issue.

---

## 5. Zod ↔ TypeScript alignment

Zod schemas: `src/schemas/zod.schemas.ts` (134 lines) + `src/schemas/api.schemas.ts` (224 lines).

**`z.infer` usage count**: **5** hits across **2** files (`src/schemas/zod.schemas.ts`, `src/config/env.validation.ts`). All four main zod schemas (`QRPayloadSchema`, `PickerSchema`, `AttendanceRecordSchema`, `HarvestSettingsSchema`) correctly expose `z.infer<>` types (`QRPayload`, `ValidatedPicker`, `ValidatedAttendance`, `ValidatedSettings`).

**Finding [M6] — parallel hand-rolled types**: The app-domain types (`Picker`, `AttendanceRecord`, `HarvestSettings` in `app.types.ts`) are **hand-rolled and do not re-use** `z.infer<typeof PickerSchema>`. There are thus two slightly divergent shapes:

| Field                | `Picker` (app)           | `ValidatedPicker` (zod)  | `SupabasePicker` (DB)   |
|----------------------|--------------------------|--------------------------|-------------------------|
| `picker_id`          | `string` (required)      | `string` (default `''`)  | `string` (required)     |
| `status`             | union literal (required) | enum (default `inactive`)| `string \| null`        |
| `safety_verified`    | `boolean` (required)     | `boolean` (default `false`) | `boolean \| null`    |
| `current_row`        | `number` (required)      | `number` (default `0`)   | `number \| null`        |
| `role`               | `string?`                | `string?`                | `string \| null`        |
| `total_buckets_today`| `number` (required)      | **absent**               | `number \| null`        |
| `hours`              | `number` (required)      | **absent**               | **not in table**        |
| `qcStatus`           | `number[]` (required)    | **absent**               | **not in table**        |

`hours` and `qcStatus` on `Picker` don't exist in DB or zod — they are UI-derived. Okay if documented, but `app.types.ts` doesn't flag them as computed. **Fix**: split into `Picker` (DB-mirror) and `PickerView` (computed additions), or add JSDoc tags.

The drift between `ValidatedPicker` and `Picker` is small but real. Pattern-wise, `api.schemas.ts:85` does the right thing:
```ts
export { PickerSchema } from '@/schemas/zod.schemas';  // single source
export { PickerSchema as ApiPickerSchema } from '@/schemas/zod.schemas';
```

Good — there's no longer a duplicate schema (LAW-2 fix noted in comments). But the app.types `Picker` should consume `ValidatedPicker & { hours: number; qcStatus: number[] }` rather than restating the shape.

---

## 6. `as unknown as T` double-casts

Total: **86** (all files). **After excluding tests/mocks**: **10** in production code. Mocks contribute 5 additional (in `src/mocks/data/index.ts`).

### Production double-casts (line-by-line)

| # | File                                               | Line | Cast                                                                                                     | Assessment   |
|---|----------------------------------------------------|------|----------------------------------------------------------------------------------------------------------|--------------|
| 1 | `src/hooks/usePwaInstall.ts`                       | 45   | `(window.navigator as unknown as { standalone?: boolean }).standalone`                                    | OK — iOS Safari vendor flag not in lib.dom.d.ts |
| 2 | `src/components/modals/ScannerModal.tsx`           | 41   | `(window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext`                  | OK — vendor prefix |
| 3 | `src/services/feedback.service.ts`                 | 9    | `(window as unknown as { webkitAudioContext: ... }).webkitAudioContext`                                   | OK — vendor prefix, duplicates #2 (consolidate in a `src/utils/audioContext.ts`) |
| 4 | `src/services/mpi-export.service.ts`               | 98   | `(b as unknown as Record<string, Record<string, string>>).pickers?.full_name`                            | **Smell** — nested pickers join result; should be typed via Supabase `.select(...).returns<T>()` |
| 5 | `src/hooks/useCropProfile.ts`                      | 35   | `(settings as unknown as Record<string, unknown> \| null)?.crop_type as ...`                              | **Smell** — double narrowing; `settings` is already typed, just add `crop_type` to the zod schema |
| 6 | `src/config/env.validation.ts`                     | 61   | `return result.success ? result.data : (raw as unknown as ValidatedEnv);`                                 | **Bug-smell** — on failure, returns raw unvalidated env cast as valid. Intentional fallback? Needs comment. |
| 7 | `src/repositories/baseRepository.ts`               | 157  | `.update({ is_active: false } as unknown as Partial<T>)`                                                  | Generic soft-delete — OK but restricts `T` should include `is_active` |
| 8 | `src/services/conflict.service.ts`                 | 152  | `} as unknown as SyncPayload);`                                                                           | **Smell** — SyncPayload is a union; cast bypasses discriminant check |
| 9 | `src/services/offline.service.ts`                  | 42   | `decryptRecord('bucket_queue', b as unknown as Record<string, unknown>) as unknown as Promise<QueuedBucket>` | **Triple-cast, review** — the decrypt helper should be generic |
| 10 | `src/services/sync.service.ts`                    | 27   | *(comment only)* "Replaces unsafe `as unknown as` double-casts that silenced corrupt payloads"           | Historical marker; refactor already happened — good |

**Finding [M7]**: Items 4–6, 8–9 are 5 cases where the double-cast hides work that should be done by zod or by Supabase's `.returns<T>()`. Concrete TODOs: replace #4 with a typed join result, fix #6 with explicit throw on env validation failure, add discriminant field to `SyncPayload` for #8.

**Finding [L5]**: Items 2 + 3 are the same `webkitAudioContext` cast in two files — DRY violation.

---

## 7. `@ts-ignore` / `@ts-expect-error`

Total: **1** occurrence. All `src/` files (inc. tests) scanned.

```
src/utils/uuid.test.ts:30:        // @ts-expect-error — testing the fallback path
```

- Uses `@ts-expect-error` (stricter, fails build if no error).
- Has explanatory comment.
- In a test file testing a fallback for missing `crypto.randomUUID`.

**Assessment**: **Best-in-class**. No silent suppressions, no `@ts-nocheck` files anywhere (`grep "@ts-nocheck" → 0`). Excellent discipline — rare to see in a repo this size (990 TS/TSX files).

---

## 8. Supabase `{ data, error }` handling

Pattern counts (prod only, excludes tests/__tests__):

| Pattern                                | Count  | Risk                               |
|----------------------------------------|--------|------------------------------------|
| `const { data, error } = await ...`    | 89     | Safe (both destructured)           |
| `const { data } = await ...`           | **38** | **Error silently dropped**         |
| `.error!` non-null assertions          | 0      | None                               |

**Finding [H1 — promoted to top-5]**: 38 call sites destructure `data` only, ignoring `error`. Worst-cluster is `src/repositories/`:

- `src/repositories/auth-context.repository.ts:76,92`
- `src/repositories/optimistic-lock.repository.ts:22`
- `src/repositories/picker-crud.repository.ts:57`
- `src/repositories/logistics.repository.ts:11,28,42,52`
- `src/repositories/auth.repository.ts:27`
- `src/repositories/user.repository.ts:20,27`
- `src/repositories/store-sync.repository.ts:9,15,42,48`
- `src/repositories/row.repository.ts` (multiple)

Dropping `error` means:
- RLS denials become `data: null` → caller interprets as "not found" instead of "forbidden".
- Network failures appear as empty result set.
- Optimistic-lock conflicts (per `optimistic-lock.repository.ts:22`) are silently swallowed — **exactly the class of bug `ERRORES.md` line 10 describes** ("El upsert fallaba silencioso sin throw").

TypeScript won't catch this because Supabase's return type is `{ data: T | null, error: PostgrestError | null }` — destructuring just `data` is syntactically valid. **Recommend** an ESLint custom rule (or `tryCatch` wrapper already in `result.ts`) to force the pair. Alternatively, a wrapper like:
```ts
async function pgFetch<T>(q: PostgrestBuilder<T>): Promise<Result<T>> {
  const { data, error } = await q;
  if (error) return Err('PG_ERROR', error.message, error);
  return Ok(data!);
}
```
`baseRepository.ts` or `src/types/result.ts` should export this and repositories should use it exclusively.

---

## 9. Union narrowing — sync queue + roles

### 9a. `SyncPayload` discriminator

`src/services/sync-processors/types.ts:89`:
```ts
export type SyncPayload = ScanPayload | MessagePayload | AttendancePayload | ContractPayload
                        | TransportPayload | TimesheetPayload | PickerPayload | QCInspectionPayload;
```

**Finding [M8]**: This is an **undiscriminated union**. The payload types share overlapping fields (`picker_id`, `orchard_id`, `timestamp`) but no kind/type tag inside the payload itself. The `type` discriminant lives on the outer `PendingItem.type`, not inside `payload`. As a result:

- `sync.service.ts:194`: `await processAttendance(item.payload as AttendancePayload, ...)` — raw `as` cast, **no Zod validation** (unlike all the other cases which use `XxxPayloadSchema.parse`). **Inconsistency**.
- `sync.service.ts:227,231`: use `Schema.parse(item.payload) as PickerPayload` — redundant cast after parse (parse already returns the typed shape).

Fixes:
1. Add a `kind: 'SCAN' | 'MESSAGE' | ...` discriminant to each payload type.
2. Apply `AttendancePayloadSchema.parse` at line 194 for parity.
3. Drop redundant `as PickerPayload` at 227, 231.

### 9b. `PickerPayload` index signature leak
Line 76: `[key: string]: unknown` on `PickerPayload`. This disables excess-property checks → any typo of a field name is silently accepted as an arbitrary extra key. **Finding [L6]**: remove the index signature; if extra sync metadata is needed, use a nested `meta: Record<string, unknown>` field.

### 9c. `Role` enum
Already covered in Finding [M4] above.

---

## 10. Miscellaneous

- **`Record<string, unknown>`** count (prod, non-test): **110**. Bulk is in services that shuttle data between Dexie (IndexedDB) and Supabase. With `noUncheckedIndexedAccess` off, these are `unknown` on values but `T` on indexed access → defeats the point. Turning on that flag would instantly reveal a few hundred `obj[k]` sites that should use `obj[k] ?? default`. **Info [I1]**.

- **`result.ts`** — clean discriminated-union `Result<T>` with `Ok`/`Err` + `tryCatch`. Used broadly in services. **Good** pattern, under-leveraged in repositories (see Finding [H1]). **Info [I2]**.

- **`src/types/index.ts` barrel** — good; intentionally excludes `database.types.ts` from the barrel to let consumers tree-shake. **Info [I3]**.

- **Test coverage of types**: `database.types.test.ts` (101), `types-main.test.ts` (41), `result.test.ts` (85) — 227 lines of type-shape tests. Rare and healthy.

---

## Top 5 Findings

1. **[H1] Supabase `error` silently dropped in 38 repository call sites** — `const { data } = await supabase...` pattern across `src/repositories/*.repository.ts`. This is the exact failure mode that caused the 2026-04-14 row_assignments silent-fail bug. Wrap in a `Result`-returning helper; block the pattern with an ESLint rule.

2. **[M1/M2] `tsconfig.json` missing `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`** — with 110 `Record<string, unknown>` and Supabase's pervasive `T | null`, these two flags would surface dozens of lurking undefined/null hazards in one compile.

3. **[H1/M4] App types drift from DB nullability + Role enum** — `Picker` in `app.types.ts` uses non-nullable fields where DB has `| null`; `Role` enum missing `'picker'` and `'bucket_runner'` used in production filters. Switch `Picker.role: Role`, regenerate app types from `SupabasePicker`.

4. **[M6] Hand-rolled app types parallel zod schemas** — `Picker` app-type doesn't use `z.infer<typeof PickerSchema>`; `HarvestSettings` similar. Drift today is small but inevitable over time. Only 5 `z.infer` hits in the whole codebase indicates zod is under-leveraged as type-source.

5. **[M8] `SyncPayload` undiscriminated union + inconsistent Zod validation in `sync.service.ts:194`** — `AttendancePayload` is `as`-cast without schema parse while siblings use `.parse()`. Corrupt attendance payloads reach `processAttendance` unchecked. Add `kind` discriminant + `AttendancePayloadSchema.parse` call.

---

## Estimated `any` count

- **Production (`src/` minus test/spec/__tests__)**: **0** hits matching `/(:\s*any\b|\bas\s+any\b|\bany\[\])/`.
- **Test files**: **262** hits (99 `: any` + 163 `as any`, negligible overlap with `any[]`'s 26 — likely subsumed).
- **`@ts-ignore` / `@ts-expect-error`**: **1** (test-only, with comment).
- **`@ts-nocheck`**: **0**.
- **`as unknown as T` double-casts**: **86** total, **10** in production code, of which ~5 are legitimate browser vendor APIs and ~5 are mild code-smells to refactor.

Overall: production-grade type discipline. The remaining gaps are architectural (tsconfig strictness, Supabase error pair, zod adoption) rather than sloppy typing.
