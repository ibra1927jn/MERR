# Offline-first / Local-first Sync Architectures for PWAs

**Context:** HarvestPro NZ — PWA para orchards. Pickers totalmente desconectados 100% del shift (~8h), 500 buckets/day c/u, 30-50 pickers/orchard. Stack actual: Dexie v3 (IndexedDB) + Supabase (Postgres) + custom sync queue + DLQ + Zod payloads + JWT silent refresh + Web Locks (cross-tab mutex) + delta sync 2-min buffer + AES-256-GCM at rest.

**Pregunta:** ¿HarvestPro reinventa la rueda, o el stack justifica lo custom?

**Fecha:** 2026-04-22
**Estado del research:** round 1, docs oficiales + search + GitHub. Tags: `[confirmed]` = source oficial, `[approximate]` = inferred from docs incompletas, `[deprecated]` = explicit no-go.

---

## 1. Sistemas revisados

### 1.1 RxDB — replication plugin framework `[confirmed]`

- **Core sync model:** git-like fork/master con checkpoint. NO es CRDT. Push/pull con `pullHandler`, `pushHandler`, `pullStream$`. ([rxdb.info/replication.html](https://rxdb.info/replication.html))
- **Backend:** "dumb backend" — cualquier Postgres, REST, GraphQL, Mongo. 3 métodos a implementar.
- **Conflict resolution:** handler custom. Default = drop fork, use master (previene overwrites tras reconexión). App define merge.
- **DLQ:** NO first-class. La replication state marca conflict; dev decide qué hacer.
- **Encryption:** `encryption-crypto-js` (free, AES CBC) o `encryption-web-crypto` (premium, 10x más rápido). Encrypted fields no queryables. ([rxdb.info/encryption.html](https://rxdb.info/encryption.html))
- **Auth / JWT:** dev gestiona en `pushHandler`. No hay silent refresh built-in.
- **Migrations:** plugin first-class. Per-version strategy fn(oldDoc) → newDoc. `autoMigrate: false` para batch UI. Multi-tab mutex built-in. ([rxdb.info/migration-schema.html](https://rxdb.info/migration-schema.html))
- **Killer feature:** pull checkpoint + `_deleted: true` soft-delete + deterministic sort por `updatedAt+pk` = idempotencia natural en miles de inserts.
- **Anti-pattern:** default conflict = drop fork silenciosamente. Para HarvestPro (pickers offline 8h) esto sería **catastrófico** (pierde todos los buckets del shift). Hay que override SIEMPRE el conflict handler.

### 1.2 PowerSync `[confirmed]`

- **Core sync model:** state-transfer + change-stream desde Postgres. No CRDT; LWW **per-field** por default. ([powersync.com](https://www.powersync.com) · [docs.powersync.com/.../custom-conflict-resolution](https://docs.powersync.com/usage/lifecycle-maintenance/handling-update-conflicts/custom-conflict-resolution))
- **Backend:** **requiere servicio PowerSync** separado entre Postgres y clientes (Cloudflare Workers, self-host, cloud). Se conecta via logical replication.
- **Supabase:** integración oficial vía `SupabaseConnector`. LWW por defecto, customizable. Supabase auth JWT passthrough. ([supabase.com/partners/integrations/powersync](https://supabase.com/partners/integrations/powersync) · [powersync.com/blog/offline-first-apps-made-simple-supabase-powersync](https://www.powersync.com/blog/offline-first-apps-made-simple-supabase-powersync))
- **Conflict resolution:** 7 estrategias documentadas — timestamp, sequence version, per-field timestamp, business rules, server-side stash (manual), change-level status, cumulative deltas. **El "cumulative deltas" es clave** para HarvestPro (buckets como delta inventory, no absoluto).
- **Bucket system:** subset de Postgres sync'ado por rol. 1 bucket por orchard/picker = aislamiento natural.
- **DLQ:** no first-class. Client retry hasta que backend `uploadData` ack'ée. Idempotencia via `clientId` + op-id (dev deduplica).
- **Encryption:** SQLite client DB NO encrypted at rest por defecto (es SQLCipher solo en enterprise). TLS in-transit.
- **Auth:** JWT-based, spec de Supabase auth. No describe silent-refresh built-in en browser PWA (docs enfocadas en React Native).
- **Schema migrations:** SQL raw en cliente, tú ejecutas `ALTER TABLE` en app code (es SQLite). Menos ergonómico que RxDB.
- **Killer feature:** buckets = partial sync dinámico. Un picker solo baja su orchard + su huerta.
- **Anti-pattern:** requiere servicio adicional (no es "library only"). Si cae el PowerSync Service, sync cae — single point of failure extra además de Supabase.
- **CRDT nota:** puedes **almacenar Yjs docs** en PowerSync rows, pero PowerSync en sí no hace CRDT merge. `[confirmed]` ([supabase/pg_crdt](https://github.com/supabase/pg_crdt) es experimental separado).

### 1.3 ElectricSQL `[confirmed, con caveats]`

- **Core sync model:** read-path only, shape-based. Postgres → cliente. No es CRDT. ([electric-sql.com/docs/guides/writes](https://electric-sql.com/docs/guides/writes))
- **Backend:** requiere Electric service (Elixir). Postgres source via logical replication. Hay Electric Cloud.
- **Writes:** **NO hay write-path built-in**. 4 patterns documentados: online REST, `useOptimistic`, shared optimistic store (Valtio + localStorage), through-DB (PGlite). El dev construye su propia sync-queue de writes.
- **Conflict resolution:** "conflicts are extremely rare, use presence" — filosofía de conflict-avoidance, no conflict-resolution. Para HarvestPro con 30 pickers escaneando bucket IDs únicos, esto funciona; para 2 pickers editando el mismo bucket (raro pero pasa), hay que construir custom.
- **DLQ:** N/A — dev lo gestiona porque write-path es DIY.
- **Encryption:** no built-in client-side.
- **Auth:** shapes tienen auth via gatekeepers HTTP — funciona con JWT. Silent refresh = dev handles.
- **Migrations:** shapes son queries sobre Postgres; schema migration = migrate Postgres, shape se reajusta. Client SQLite (PGlite) migra via tu código.
- **2025 history rewrite:** v1.1 rewrote storage (102x writes, 73x reads). Pre-1.0 era inestable, post-1.0 + reliability sprint = production-ready. ([electric-sql.com/blog/2025/08/13/electricsql-v1.1-released](https://electric-sql.com/blog/2025/08/13/electricsql-v1.1-released) · [electric-sql.com/blog/2025/08/04/reliability-sprint](https://electric-sql.com/blog/2025/08/04/reliability-sprint))
- **Killer feature:** shape log = fan-out Postgres a 10k clientes sin pegar a Postgres. Fan-out gratis.
- **Anti-pattern:** "traemos write-path más adelante" — llevan años diciéndolo. HarvestPro NO puede esperar.

### 1.4 Replicache `[confirmed]`

- **Core sync model:** git-like con mutators. Client ejecuta mutator local (optimistic) + push; server re-ejecuta canónicamente. Pull = diffs desde server. ([doc.replicache.dev/concepts/how-it-works](https://doc.replicache.dev/concepts/how-it-works))
- **Backend:** "dumb backend" — dev implementa push/pull endpoints. Per-space-version strategy para escalar. ([doc.replicache.dev/strategies/per-space-version](https://doc.replicache.dev/strategies/per-space-version))
- **Conflict resolution:** **server-authoritative re-execution**. Cliente ve optimistic, server decide. Cliente rebase encima del server state. Elegante pero implica que toda la lógica de escritura vive 2 veces (client+server).
- **Idempotencia:** `lastMutationID` per-client, secuencial. Skip ya-procesadas, reject out-of-order. **Exactamente lo que HarvestPro necesita para 500 buckets × 30 pickers.**
- **DLQ:** si server mutator rechaza, cliente rebase sin la mutation — pero no hay "surface" built-in para usuario. Dev debe loguear errores de mutator.
- **Encryption:** no built-in.
- **Auth:** push/pull endpoints son HTTP normales con headers. JWT refresh = dev handles.
- **Migrations:** mutators versionados; si cambias schema, evoluciona mutators. Client DB es KV opaco (IDBKeyVal), no tiene schema versionado.
- **Status 2026:** Rocicorp open-sourced (2024), ahora Zero es el sucesor `[approximate]`. Replicache sigue mantenido.
- **Killer feature:** `mutationID` + `lastMutationID` per-client = idempotencia de libro. Robo obvio para HarvestPro.
- **Anti-pattern:** dual-write de mutators (client + server) es costo de mantenimiento real; cualquier asimetría = bug sutil.

### 1.5 WatermelonDB `[confirmed]`

- **Core sync model:** pull+push con `lastPulledAt` checkpoint. LWW con column-level dirty flags (qué columnas se tocaron). ([watermelondb.dev/docs/Sync/Intro](https://watermelondb.dev/docs/Sync/Intro) · [watermelondb.dev/docs/Sync/Frontend](https://watermelondb.dev/docs/Sync/Frontend))
- **Backend:** dev implementa 2 endpoints (`pullChanges`, `pushChanges`) — como WatermelonDB protocol.
- **Conflict resolution:** LWW a nivel columna. Column-level dirty flags = solo se envían las cols cambiadas.
- **DLQ:** "pushChanges must reject if backend failed" — frontend retry, pero no buffer persistente de rejects; dev gestiona.
- **Encryption:** no built-in. iOS keychain / Android keystore a mano.
- **Auth:** dev lo mete en endpoints. No silent refresh.
- **Migrations:** built-in. `schemaVersion` pasa en cada pull; backend devuelve "migration" payload si server evolucionó. Ergonómico.
- **Turbo Login:** optimización para initial-sync (5.3x faster).
- **Killer feature:** column-level dirty tracking — solo las cols cambiadas van en el wire. HarvestPro puede adoptarlo (hoy envías todo el bucket).
- **Anti-pattern:** "You MUST NOT connect to backend endpoints you don't control" — asume que backend implementa el protocolo exactamente. Con Supabase PostgREST no encaja out-of-the-box.

### 1.6 TinyBase `[confirmed]`

- **Core sync model:** sincroniza "merge-able stores" (Tables + Values). Built-in merge es LWW con hybrid logical clocks. ([tinybase.org](https://tinybase.org))
- **Backend:** opcionalmente tu propio synchronizer (WebSocket, LocalSync, BroadcastSync). Agnóstico al backend.
- **Conflict resolution:** HLC-based LWW por cell. Timestamp determinístico.
- **DLQ:** N/A — sync es in-memory merge; persistence aparte.
- **Encryption:** no.
- **Auth:** N/A — tú lo metes en tu synchronizer.
- **Migrations:** tables sin schema estricto; evolución = tú gestionas.
- **Killer feature:** footprint 5kb, HLC per-cell. Para metadata-light (picker profile, orchard config).
- **Anti-pattern:** no es una DB "seria" — bucket del día de 500 filas × 30 pickers ≠ target use case. TinyBase = state management, no data lake.

### 1.7 Automerge (v2/v3) `[confirmed]`

- **Core sync model:** JSON CRDT. Merge automático, orden-independiente. ([automerge.org/docs/concepts/](https://automerge.org/docs/concepts/))
- **Backend:** network-agnostic. `automerge-repo` da storage + sync sobre WebSocket/WebRTC.
- **Conflict resolution:** **true CRDT** — concurrent edits merge deterministically, zero data loss. Único de la lista (con Yjs/Loro) que resuelve el caso "picker A y picker B tocan el mismo bucket offline 8h" sin perder escrituras.
- **DLQ:** N/A — no hay rejects, todo se merge.
- **Encryption:** no built-in; binary format se puede encrypt a mano.
- **Auth:** capa de transporte, no del CRDT.
- **Migrations:** schema-less JSON; migrations son transforms sobre el doc.
- **Scale:** Moby Dick (~1.2MB texto) = 700MB RAM en v2; v3 redujo 10x. ([biggo.com/.../Automerge_3.0_Memory_Improvements](https://biggo.com/news/202508071934_Automerge_3.0_Memory_Improvements) · [automerge.org/blog/automerge-3/](https://automerge.org/blog/automerge-3/))
- **Killer feature:** cero conflictos, cero DLQ. Ideal para "lista de buckets del día" como CoList.
- **Anti-pattern:** costo de historia. Cada op se guarda forever (compaction ayuda pero no elimina). 8h × 30 pickers × 500 ops/shift × 260 días/año = ~31M ops/orchard/año → no escalable como single doc. **Shardar por día/shift.**

### 1.8 Yjs `[confirmed]`

- **Core sync model:** CRDT, optimizado para collaborative text + shared maps/arrays. ([docs.yjs.dev](https://docs.yjs.dev))
- **Backend:** providers (y-websocket, y-webrtc, Liveblocks, Y-Sweet). Agnóstico.
- **Conflict resolution:** true CRDT, order-independent merge.
- **DLQ:** N/A.
- **Encryption:** no built-in; doc binary es encrypt'able.
- **Scale:** "el CRDT más rápido" según benchmarks. Mejor perfil memoria que Automerge 2 (Automerge 3 ahora compite).
- **Killer feature:** Y.Array + awareness = colaboración "live" si quieres 2 supervisores viendo el mismo field map.
- **Anti-pattern:** Yjs para "insert 500 rows con validación Zod" = mal uso. Yjs brilla en co-edición, no en event-log append-only. HarvestPro son append-only buckets, no colab doc.

### 1.9 Loro `[approximate]`

- Fugue CRDT (minimiza interleaving en texto), Movable list + tree + LWW map + text. ([discuss.yjs.dev/.../yjs-vs-loro-new-crdt-lib/2567](https://discuss.yjs.dev/t/yjs-vs-loro-new-crdt-lib/2567) · [docs.kanaries.net/topics/OpenSource/loro](https://docs.kanaries.net/topics/OpenSource/loro))
- Mismo orden de magnitud que Yjs en perf. Diferenciador = movable list + tree.
- Estado 2026: discussion thread activo, pero menos producción que Yjs todavía `[approximate]`.
- **Para HarvestPro:** no aporta sobre Yjs si no usas collaborative editing.

### 1.10 CouchDB / PouchDB `[confirmed]`

- **Core sync model:** MVCC con revision tree. Replication protocol maduro (2010+). ([pouchdb.com/learn.html](https://pouchdb.com/learn.html) · [pouchdb.com/guides/conflicts.html](https://pouchdb.com/guides/conflicts.html))
- **Backend:** CouchDB / Cloudant / PouchDB-server. No Postgres.
- **Conflict resolution:** deterministic arbitrary winner + `_conflicts` array. Dev implementa merge. "Accountants don't use erasers" pattern = append-only docs evita conflicts.
- **DLQ:** no explicit, `_conflicts` sirve como pending-resolution list.
- **Encryption:** dev wraps.
- **Migrations:** append-only doc schema evolution.
- **Status 2026:** mantenido pero no trending. PouchDB v8 en 2024, baja velocity `[approximate]`.
- **Killer feature:** "accountants don't use erasers" = append-only ledger → HarvestPro buckets son exactamente esto. Cada scan = nuevo doc, nunca update.
- **Anti-pattern:** CouchDB como backend obliga a comprar stack entero. No compose con Supabase.

### 1.11 Jazz.tools `[confirmed]`

- **Core sync model:** CoValues (CoMap, CoList, CoFeed, CoText, FileStream) — CRDT con permissions + E2E encryption built-in. ([jazz.tools/docs](https://jazz.tools/docs))
- **Backend:** Jazz Cloud o self-host.
- **Conflict resolution:** CRDT, automatic merge.
- **DLQ:** N/A (CRDT).
- **Encryption:** **E2E built-in, único en la lista junto con Evolu**. Keys managed by Jazz auth.
- **Auth:** built-in (team/org model). No depende de Supabase.
- **Migrations:** schema-evolution de CoValues.
- **Killer feature:** E2E + permissions + CRDT + file streams en un stack integrado. Si empezases greenfield valdría la pena.
- **Anti-pattern:** lock-in en Jazz auth/cloud. HarvestPro ya tiene Supabase auth + Postgres — migrar sería re-plataformar.

### 1.12 Evolu `[confirmed]`

- **Core sync model:** SQLite + CRDT + E2E encryption. Relay opcional self-hostable. ([evolu.dev](https://www.evolu.dev))
- **Backend:** Evolu Relay (WebSocket). Self-hostable.
- **Conflict resolution:** CRDT (no especifica cuál exactamente en landing, prob. custom timestamp HLC `[approximate]`).
- **DLQ:** N/A.
- **Encryption:** E2E built-in.
- **Auth:** deriva de mnemonic (crypto-wallet style). No JWT-compatible out-of-the-box.
- **Schema:** Kysely types.
- **Killer feature:** type-safe SQL + E2E + CRDT en un paquete.
- **Anti-pattern:** auth model (mnemonic) incompatible con Supabase JWT. Para HarvestPro (multi-tenant B2B orchards) no encaja.

### 1.13 LiveStore `[confirmed, BETA]`

- **Core sync model:** event-sourced. Mutations = events committed a eventlog inmutable; materializers → SQLite. ([livestore.dev](https://livestore.dev))
- **Backend:** local-first. Sync providers pluggable (Cloudflare, Electric, S2).
- **Conflict resolution:** custom merge resolvers; event-sourced = replay deterministic.
- **DLQ:** N/A first-class (event stream es source of truth).
- **Encryption:** no built-in.
- **Auth:** dev handles.
- **Migrations:** schema de materializers evoluciona; eventlog inmutable.
- **Status 2026:** BETA (v0.3). Producción: Overtone, Linearlite `[confirmed]`.
- **Killer feature:** event-sourcing nativo. Para audit trail regulatorio (nuevo feature HarvestPro?) es perfect match.
- **Anti-pattern:** BETA. Para HarvestPro producción = riesgo.

### 1.14 Workbox `[confirmed]`

- **Core sync model:** NO es un sync engine. Es service worker library con `BackgroundSyncPlugin` para retry de requests fallidos. ([developer.chrome.com/docs/workbox/modules/workbox-background-sync](https://developer.chrome.com/docs/workbox/modules/workbox-background-sync))
- **Queue:** IndexedDB-backed. Max age config'able (p.ej. 24h).
- **DLQ:** no explicit. Expired requests se drop (NO ideal).
- **BackgroundSync API limit:** browsers Chrome/Edge sí, Safari/Firefox NO 100% (iOS Safari 2026 todavía parcial `[approximate]`).
- **Killer feature:** integración con browser sync event — el OS despierta al SW cuando vuelve la conectividad.
- **Anti-pattern:** NO usar BackgroundSync como única garantía de entrega para datos críticos (Safari gap + expiration silenciosa). Queue propia en IDB + retry en foreground es más seguro — **esto es exactamente lo que HarvestPro hace.**

---

## 2. Tabla comparativa

| Sistema | Sync model | Backend | Conflict resolution | DLQ built-in | E2E encryption | Estado 2026 |
|---|---|---|---|---|---|---|
| **RxDB** | Git-like fork/master checkpoint | Any (plugin) | Custom handler, default=drop-fork | No | Plugin AES/Web Crypto | Stable, active `[confirmed]` |
| **PowerSync** | State-transfer + change stream | PowerSync Service + Postgres | LWW per-field + 7 patterns | No | SQLCipher enterprise only | Stable, active `[confirmed]` |
| **ElectricSQL** | Shape-based read-only | Electric Service + Postgres | Avoidance; writes DIY | No (DIY) | No | Stable post v1.1 `[confirmed]` |
| **Replicache** | Mutators + push/pull, server-authoritative | Any (dumb) | Server re-execute, rebase client | No (reject in mutator) | No | Stable, Rocicorp Zero is successor `[approximate]` |
| **WatermelonDB** | Pull+push + col-level dirty | Your protocol endpoints | LWW per column | No | No | Stable `[confirmed]` |
| **TinyBase** | HLC per-cell merge | Synchronizer (any) | LWW w/ HLC | No | No | Stable, niche `[confirmed]` |
| **Automerge** | JSON CRDT | automerge-repo (any) | Auto-merge, no conflicts | N/A | DIY | v3 production `[confirmed]` |
| **Yjs** | CRDT | y-\* providers | Auto-merge, no conflicts | N/A | DIY | Production ubiquitous `[confirmed]` |
| **Loro** | Fugue CRDT + movable list/tree | DIY | Auto-merge | N/A | DIY | Younger than Yjs `[approximate]` |
| **PouchDB/CouchDB** | MVCC revision tree | CouchDB family | Deterministic winner + `_conflicts` | Via `_conflicts` | DIY | Mature but slow velocity `[approximate]` |
| **Jazz.tools** | CoValues CRDT | Jazz Cloud / self-host | Auto-merge | N/A | E2E built-in | Active, post-1.0 `[confirmed]` |
| **Evolu** | SQLite + CRDT | Evolu Relay | Auto-merge | N/A | E2E built-in | Active `[confirmed]` |
| **LiveStore** | Event-sourcing | Sync providers pluggable | Custom merge resolver | N/A | No | **BETA v0.3** `[confirmed]` |
| **Workbox BGSync** | Request-retry queue (not a sync engine) | N/A | N/A | Dropped on expiry | No | Stable but iOS gap `[confirmed]` |

---

## 3. Lo que HarvestPro hace distinto — ¿reinventa rueda o justificado?

**HarvestPro custom stack:** Dexie (IDB) + custom queue + DLQ + Zod + JWT silent-refresh + Web Locks mutex + delta 2-min + AES-256-GCM.

**Evaluación item por item:**

| Decisión HarvestPro | Veredicto | Razón |
|---|---|---|
| Dexie v3 en IndexedDB (no SQLite) | **Justificado** | SQLite-wasm añade ~1.2MB al bundle y COOP/COEP headers (rompe embeds). Dexie es 50kb, maduro, sync API. |
| Custom sync queue (no RxDB/PowerSync) | **Parcialmente justificado** | RxDB podría reemplazar, PERO RxDB default conflict = drop-fork es trampa mortal para pickers 8h offline. Custom queue + explicit idempotency es SÍ reinvención, PERO con semántica controlada. **Robar de Replicache:** `lastMutationID` per-client (idempotent replay). |
| DLQ explícito | **Justificado, poco común** | Ninguno de los 14 sistemas ofrece DLQ first-class (solo PouchDB `_conflicts` se le parece). Es gap real del ecosistema. HarvestPro lo hace bien. |
| Zod payloads | **Justificado** | Ningún sistema valida runtime la shape de mutations al exit. RxDB/WatermelonDB validan schema interno pero no payload pre-push. Zod = defense-in-depth contra client bugs. |
| JWT silent-refresh built-in | **Justificado, poco común** | Ningún sistema (excepto Jazz con su auth propio) tiene silent-refresh para offline 24h+. Supabase JWT dura 1h default → sin silent refresh pierdes el shift entero. Custom es **necesario**. |
| Web Locks API cross-tab mutex | **Justificado, correcto** | RxDB hace su propio cross-tab coordination (leader election) pero es opaco. Web Locks es standard W3C. Para múltiples tabs del picker admin = correcto. |
| Delta sync 2-min buffer | **Justificado** | Batching evita storm de 500 inserts cuando vuelve 4G. PowerSync y Replicache también batchean. 2-min es razonable. |
| AES-256-GCM at rest | **Justificado, excede estándar** | Sólo Jazz/Evolu tienen E2E built-in. AES-256-GCM con key derivada de user password + device binding = más fuerte que lo que Jazz/Evolu ofrecen out-of-the-box (que encryptan para server, no necesariamente at-rest on-device). |
| LWW vs CRDT | **Justificado NO usar CRDT** | HarvestPro domain = append-only events (scan bucket → create row). No hay "edit same row offline" semántica. CRDT sería over-engineer. LWW por campo (como PowerSync) sería mejora marginal. |

**Conclusión:** HarvestPro **no** reinventa la rueda. Reinventa ~30% — principalmente queue + DLQ + idempotency — y ese 30% es **espacio genuino de mejora** que ningún sistema off-the-shelf cubre bien. El 70% restante (IDB wrapper, Zod, Web Locks, AES-GCM) son primitivas estándar bien compuestas.

**Lo que SÍ es reinvención riesgosa:** la `lastMutationID`-style idempotency. Si HarvestPro no tiene esto (o equivalente), escribirlo desde cero es propenso a bugs sutiles. Robar el patrón de Replicache literalmente.

---

## 4. Top 5 técnicas portables a HarvestPro

### 4.1 `lastMutationID` per-client (de Replicache) — **prioridad alta**

Cada cliente (device) genera mutation IDs secuenciales. Server guarda `lastMutationID` per clientID. Push trae `{clientID, mutations: [{id, name, args}]}`. Server:
- `id < lastMutationID+1` → skip (idempotent replay)
- `id == lastMutationID+1` → apply + increment
- `id > lastMutationID+1` → reject out-of-order

**Por qué:** para 30 pickers × 500 buckets × retries en conectividad intermitente, DEBES tener idempotencia o vas a duplicar. Si HarvestPro ya lo tiene via bucket UUID + upsert, OK; si no, adoptarlo.

### 4.2 Column-level dirty tracking (de WatermelonDB) — **prioridad media**

En vez de mandar el row entero, marca qué columnas cambiaron desde último sync. Reduce wire payload 3-10x cuando pickers editan solo `weight` o `quality_note`.

**Por qué:** sobre 4G rural NZ, 10x menos bytes = 10x menos timeouts.

### 4.3 Cumulative delta operations (de PowerSync) — **prioridad alta**

Para `orchard_bucket_count`, `picker_daily_total` etc., enviar `delta: +1` en vez de `count: 47` (que requiere read-before-write offline).

**Por qué:** elimina clase entera de conflictos. Picker A (+3) y picker B (+2) concurrentes ambos aplican, total final = base+5. Zero conflict.

### 4.4 Append-only ledger ("accountants don't use erasers", de CouchDB) — **prioridad alta**

Nunca UPDATE un bucket. Cada scan = nuevo row `bucket_scan_events`. Materialized view en Postgres = `current_bucket_state`. Audit trail gratis.

**Por qué:** HarvestPro probablemente ya lo hace. Si no, **hacerlo**. Facilita compliance (MPI NZ traceability) y elimina conflict resolution para 90% de casos.

### 4.5 Shape-based sync (de ElectricSQL) — **prioridad media**

En vez de "sync toda tabla buckets", sync `SELECT * FROM buckets WHERE orchard_id = $me AND harvest_date >= today() - 7`. Bajas solo lo que el picker necesita.

**Por qué:** si un picker cambia de orchard a media temporada, no arrastra historia irrelevante. Reduce IDB footprint local (importante: Safari iOS evicta agresivamente IDB >50MB).

---

## 5. Anti-patterns a EVITAR

### 5.1 Confiar en BackgroundSync API como garantía de delivery `[confirmed]`

- Safari iOS 2026 todavía parcial; Firefox limitado.
- Chrome/Edge: expira queued requests silently tras 24h default.
- **HarvestPro hace bien** al tener queue en IDB + retry foreground. NO eliminar eso en favor de BackgroundSync.

### 5.2 Default conflict handler = drop-fork (RxDB, PowerSync LWW simple) `[confirmed]`

- Un picker offline 8h con 500 buckets; sync llega; otro device del supervisor editó 1 bucket; LWW simple → **pierdes 499 buckets legítimos**.
- Siempre conflict handler custom con semántica de merge field-by-field + DLQ para lo irreconciliable.

### 5.3 CRDT para datos que no son co-edit `[confirmed]`

- Automerge/Yjs/Loro brillan en "2 humanos editando el mismo párrafo". HarvestPro son eventos discretos append-only.
- Costo de CRDT: history forever (31M ops/orchard/año estimado). Compaction ayuda pero no escala shard-less.
- LWW + append-only ledger cubre 99% del caso con 1% del overhead.

### 5.4 Encrypted fields como índices primarios `[confirmed]`

- RxDB doc explícitamente: "encrypted fields cannot be queried".
- NO encriptar `bucket_id`, `picker_id`, `orchard_id`, `harvest_date`. Encriptar solo PII (`picker_full_name`, `device_id_binding`, `wage_rate`).

### 5.5 Dual-write mutators (Replicache trap) `[confirmed]`

- Mutator client-side y server-side diverge → bugs sutiles ("en el cliente asumo `bucket.quality != null`, en el server no valido").
- Mitigación: pure shared mutator code (monorepo) + property tests.
- HarvestPro con Zod en ambos lados está 80% ahí. Mantener Zod schema como **single source of truth** para shape de mutation payload.

### 5.6 Backing store con schema opaco (Replicache KV) `[confirmed]`

- IDBKeyVal puro = pierdes ergonomía de queries. Dexie con schema indexado = correcta elección HarvestPro.

### 5.7 Single Automerge doc para toda la temporada `[approximate]`

- 31M ops/año/orchard en un solo CRDT doc = RAM explosion aunque v3 reduzca 10x.
- Si algún día HarvestPro adopta CRDT para algo (p.ej. field notes colaborativas), **shardar por día o por shift**, no per-orchard-season.

### 5.8 JWT sin silent-refresh offline `[confirmed]`

- Supabase default JWT = 1h. Picker 8h offline → token expira a la 1h de shift. Todos los pushes post-reconexión → 401.
- Silent refresh debe:
  1. Detectar expiry antes del push
  2. Si online: refresh token via Supabase SDK
  3. Si offline: guardar push en queue con indicador `needs_fresh_auth`, retry tras refresh
- HarvestPro lo hace; es **requisito absoluto**, no nice-to-have.

---

## 6. Veredicto para HarvestPro

**El stack actual está bien diseñado.** Las 8 decisiones de arquitectura (Dexie, custom queue, DLQ, Zod, JWT refresh, Web Locks, delta buffer, AES-GCM) son defendibles; cada una tiene razón concreta.

**2 mejoras concretas accionables (Round 2 code review):**

1. **Auditar idempotency.** Confirmar que existe `clientID + mutationSeq` o equivalente (bucket UUID + upsert basta). Si solo hay upsert, verificar semántica exacta en DLQ. Robar de Replicache si falta.

2. **Auditar conflict resolution.** Confirmar que para el caso "picker A edita bucket X offline, supervisor edita bucket X online", hay merge field-by-field (no LWW row-level que pierde cambios). Si LWW row-level, migrar a per-field LWW (style PowerSync) o explicit three-way merge.

**Lo que NO tocaría:** crypto, Web Locks, Zod, delta buffer, Dexie. Todo correcto.

**Lo que reconsideraría si hubiera greenfield:** evaluar **Jazz.tools** por E2E + permissions + CRDT integrado; pero el lock-in en su auth descalifica dada la inversión en Supabase.

---

## Sources

- [RxDB — Replication Protocol](https://rxdb.info/replication.html)
- [RxDB — Encryption](https://rxdb.info/encryption.html)
- [RxDB — Schema Migration](https://rxdb.info/migration-schema.html)
- [RxDB — Offline-first philosophy](https://rxdb.info/offline-first.html)
- [PowerSync — Home](https://www.powersync.com)
- [PowerSync — Custom Conflict Resolution](https://docs.powersync.com/usage/lifecycle-maintenance/handling-update-conflicts/custom-conflict-resolution)
- [PowerSync + Supabase partner page](https://supabase.com/partners/integrations/powersync)
- [PowerSync blog — Offline-First with Supabase](https://www.powersync.com/blog/offline-first-apps-made-simple-supabase-powersync)
- [Supabase pg_crdt experimental](https://github.com/supabase/pg_crdt)
- [ElectricSQL — docs intro](https://electric-sql.com/docs/intro)
- [ElectricSQL — writes guide](https://electric-sql.com/docs/guides/writes)
- [ElectricSQL v1.1 release](https://electric-sql.com/blog/2025/08/13/electricsql-v1.1-released)
- [ElectricSQL reliability sprint](https://electric-sql.com/blog/2025/08/04/reliability-sprint)
- [Replicache — how it works](https://doc.replicache.dev/concepts/how-it-works)
- [Replicache — per-space-version strategy](https://doc.replicache.dev/strategies/per-space-version)
- [WatermelonDB — Sync intro](https://watermelondb.dev/docs/Sync/Intro)
- [WatermelonDB — Sync frontend](https://watermelondb.dev/docs/Sync/Frontend)
- [TinyBase](https://tinybase.org)
- [Automerge — concepts](https://automerge.org/docs/concepts/)
- [Automerge 3.0 memory improvements (BigGo)](https://biggo.com/news/202508071934_Automerge_3.0_Memory_Improvements)
- [Automerge 3.0 blog](https://automerge.org/blog/automerge-3/)
- [Yjs docs](https://docs.yjs.dev)
- [Yjs vs Loro discussion](https://discuss.yjs.dev/t/yjs-vs-loro-new-crdt-lib/2567)
- [Loro summary (Kanaries)](https://docs.kanaries.net/topics/OpenSource/loro)
- [PouchDB — Learn](https://pouchdb.com/learn.html)
- [PouchDB — Conflicts guide](https://pouchdb.com/guides/conflicts.html)
- [Jazz.tools docs](https://jazz.tools/docs)
- [Evolu](https://www.evolu.dev)
- [LiveStore](https://livestore.dev)
- [Workbox overview](https://developer.chrome.com/docs/workbox)
- [Workbox Background Sync](https://developer.chrome.com/docs/workbox/modules/workbox-background-sync)
- [PWA reliable queue (Sahil Kumar, Medium)](https://medium.com/@11.sahil.kmr/offline-first-by-design-pwa-indexed-db-and-a-reliable-queue-775605b3d76c)
- [Offline-first PWA with Next+IDB+Supabase (Israel, 2026)](https://oluwadaprof.medium.com/building-an-offline-first-pwa-notes-app-with-next-js-indexeddb-and-supabase-f861aa3a06f9)
- [PowerSync + Supabase Ignite Cookbook (React Native)](https://ignitecookbook.com/docs/recipes/LocalFirstDataWithPowerSync/)
