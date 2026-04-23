# Mobile Scanning / Field-Ops / WMS — Comparable a HarvestPro NZ

**Fecha:** 2026-04-22
**Contexto:** HarvestPro NZ usa Capacitor 8 + cámara Android nativa para escanear QR de bucket y sticker de bin. Runner rol funciona 100% offline 8 horas. DB actual tiene 30.464 pares duplicados (picker_id, scanned_at) — hallazgo de auditoría. Este documento compara sistemas maduros para extraer patrones portables.

**Leyenda tags:**
- `[confirmed]` — verificado en docs oficiales
- `[approximate]` — inferido de múltiples fuentes
- `[deprecated]` — ya no mantenido / sucesor disponible

---

## 1. Panorama: commercial vs OSS vs in-house

HarvestPro es BYOD (phones de los pickers) con Capacitor — esto descarta inmediatamente el tier Zebra rugged y el tier Scandit enterprise por presupuesto. La comparativa honesta:

| Sistema | Tipo | Precio aprox anual | Offline real | BYOD? | Relevancia HarvestPro |
|---|---|---|---|---|---|
| **Scandit** | SDK comercial enterprise | $10k–$100k+/año (volume) | Sí, con check-in periódico | Sí | Media — demasiado caro pero patrones sí |
| **Zebra DataWedge** | Android service en HW rugged | Gratis (viene con dispositivo Zebra $800–$3k) | Sí, nativo Intent-based | No (Zebra only) | Baja — HarvestPro no tiene Zebra |
| **Dynamsoft** | SDK comercial | $1k–$20k/año (per-device/per-scan) | Sí, 3 días max sin reconectar | Sí | Media |
| **Scanbot SDK** | SDK comercial | $5k–$30k/año | Sí | Sí | Media |
| **ZXing (Java)** | OSS | $0 | Sí | Sí | `[deprecated]` — no maintained |
| **html5-qrcode** | OSS web | $0 | Sí (browser) | Sí | Baja — `[deprecated]`, problemas Samsung/Chrome |
| **@capacitor-mlkit/barcode-scanning** | OSS (Capawesome) | $0 | Sí (ML Kit on-device) | Sí | **ALTA — es lo que HarvestPro probablemente usa o debería usar** |
| **@capacitor/barcode-scanner** (Ionic) | OSS oficial Ionic | $0 | Sí | Sí | Alta (successor del `phonegap-plugin-barcodescanner` `[deprecated]`) |
| **Logiwa WMS** | SaaS WMS ecommerce | $2k–$10k/mes | Limitado (sync real-time) | Sí (Android/iOS) | Baja — cloud-first |
| **Fishbowl Go** | Desktop WMS + mobile app | $4k–$10k/año por seat | Sí (app mobile) | Sí | Media |
| **Odoo Inventory** | ERP OSS + enterprise | €0–€300/user/mes | `[confirmed]` sí | Sí | Alta — patrones lot/serial |
| **Sortly** | SaaS SMB inventory | $49–$299/mes | `[confirmed]` sí mobile | Sí | Media |
| **ShipHero** | WMS 3PL | $2k+/mes | Sí (app) | Sí + Bluetooth HID | Media |
| **FoodLogiQ (Trustwell)** | SaaS traceability | enterprise ($20k+/año) | No (cloud) | N/A | Baja para scan, Alta para traceability patterns |
| **Croptracker** | SaaS orchard piece-rate | ~$1k–$5k/año | `[confirmed]` sí | Sí | **MUY ALTA — mismo dominio** |
| **QuickPick / FairPick (2ndSight)** | SaaS orchard piece-rate + HW | ~$50/user/mes + scale HW | `[approximate]` sí | Sí | **MUY ALTA — mismo dominio, tiene double-scan lockout** |
| **Hectre / Tātou / innov8.ag** | SaaS orchard NZ/AU | ~$1k–$5k/año | `[approximate]` sí | Sí | **MUY ALTA — competidores directos NZ** |
| **AgriSmart** | SaaS horticulture NZ | `[approximate]` | `[approximate]` | Sí | Alta — NZ harvest ticketing |
| **NiceLabel** | Label design + print | $500–$2k/user | N/A (printing only) | N/A | Alta — imprimir stickers bin |

> **Nota cruda:** Scandit es ~$10k–$100k+/año. Para un operador de orchard NZ con N=20 pickers temporada, esto es inviable. La tecnología que realmente importa para HarvestPro es el tier gratuito (capacitor-mlkit, ML Kit on-device) combinado con patrones arquitectónicos del tier enterprise.

---

## 2. Fichas por sistema — 9 preguntas

### 2.1 Scandit `[confirmed]` — referencia del tier enterprise

1. **Scan tech:** QR, Code 128, Data Matrix, PDF417, DotCode, MaxiCode, GS1 DataBar — motor propietario con ML + CV. MatrixScan (multi-barcode en un frame).
2. **Offline:** Production licenses no requieren conectividad continua. Requiere check-in periódico para monitoring.
3. **Duplicate detection:** MatrixScan Count + ID tracking (cada código se persiste por frame, evita re-scan del mismo símbolo en la misma sesión).
4. **Audit trail:** Delegado al app host. Scandit solo entrega `(symbology, data, timestamp, location)`.
5. **Hardware:** BYOD-friendly — explícitamente diseñado para smartphone consumer. Casos de uso en Uniqlo, Sephora, DHL (todos BYOD).
6. **Printing:** No provee. Integra con BarTender/NiceLabel.
7. **Mobile framework:** Nativo iOS/Android + React Native + Flutter + **Capacitor** (soporte oficial).
8. **Killer pattern:** MatrixScan Count para evitar double-count — marca visualmente el código ya escaneado con overlay AR verde ✓.
9. **Anti-pattern:** Pricing opaco y volume-based hace budgeting imposible para operadores pequeños.

### 2.2 Zebra DataWedge `[confirmed]`

1. **Scan tech:** Todo — láser, imager 2D, RFID UHF, MSR, voice. Hardware-dependiente.
2. **Offline:** Intent-based (Android Intents, sin red). Patrón documentado: Couchbase Mobile como buffer + Sync Gateway al reconectar.
3. **Duplicate detection:** Delegado al app. DataWedge solo "hace broadcast" del scan via Intent.
4. **Audit trail:** No nativo. Se construye vía CouchbaseLite + resolution rules.
5. **Hardware:** **Solo Zebra** (TC21, TC52, MC3300, etc.). $800–$3k por dispositivo. No BYOD.
6. **Printing:** Zebra ZPL (printers Zebra nativos). Link-OS stack.
7. **Mobile framework:** Ninguno — DataWedge es un service Android que escucha y emite Intents.
8. **Killer pattern:** **Configuración por Profile + Intent action** — el scanner es un servicio desacoplado, cualquier Activity que declare `intent-filter` recibe el scan. HarvestPro no puede copiar esto pero sí puede imitar: event bus pub/sub interno en JS.
9. **Anti-pattern:** Lock-in hardware. Si Zebra discontinua un modelo, migras todo.

### 2.3 Dynamsoft Barcode Reader `[confirmed]`

1. **Scan tech:** Todos los 1D/2D mainstream. OCR adicional.
2. **Offline:** Per-Barcode-Scan license → offline **max 3 días**, luego bloquea hasta re-check-in. Per-Device license → offline ilimitado post-registro.
3. **Duplicate detection:** N/A en SDK — delegado al app.
4. **Audit trail:** N/A.
5. **Hardware:** BYOD.
6. **Printing:** No.
7. **Mobile framework:** Nativo + JS web + React Native. Capacitor vía wrapper community.
8. **Killer pattern:** Tunable scan profiles (speed vs accuracy tradeoff) por caso de uso.
9. **Anti-pattern:** El bloqueo a los 3 días offline es **peligroso para harvest** — un runner offline 8h está OK, pero una temporada de 2 semanas sin buen WiFi = scanners muertos.

### 2.4 ZXing / html5-qrcode `[deprecated]`

1. **Scan tech:** QR, Data Matrix, Code 128/39, EAN, UPC. No MaxiCode ni DotCode.
2. **Offline:** 100% local, zero network.
3. **Duplicate detection:** Ninguna.
4. **Audit trail:** Ninguna.
5. **Hardware:** Cualquiera.
6. **Printing:** No.
7. **Mobile framework:** ZXing-android (Java) + ZXing-js (port) + html5-qrcode (fork de ZXing-js).
8. **Killer pattern:** Open source, zero cost, embed en 5min. Es el baseline del mundo.
9. **Anti-pattern:** **`[deprecated]`** — ZXing-js sin mantenedor. html5-qrcode con bugs reportados en Samsung+Chrome (cámara black screen, permisos OK). No usar en producción 2026.

### 2.5 @capacitor-mlkit/barcode-scanning `[confirmed]` — probablemente lo que HarvestPro usa

1. **Scan tech:** QR, Code 128/39/93, EAN-8/13, UPC-A/E, Data Matrix, PDF417, Aztec, Codabar, ITF. No GS1 DataBar en ML Kit native.
2. **Offline:** **100% on-device** (ML Kit modelo local). No envía a Google.
3. **Duplicate detection:** No nativa. Delegada al app.
4. **Audit trail:** No.
5. **Hardware:** BYOD phone (Android + iOS).
6. **Printing:** No.
7. **Mobile framework:** Capacitor (mantenido por Capawesome — comunidad, no Ionic oficial).
8. **Killer pattern:** Puede correr en background/foreground modes distintos, y entrega el scan como event — permite debounce en el JS layer.
9. **Anti-pattern:** ML Kit **no soporta** algunos symbologies (MaxiCode, GS1 DataBar expandido). Si NZ quiere GS1 DataBar en el futuro (GS1-compliant stickers para export), falla.

### 2.6 @capacitor/barcode-scanner `[confirmed]`

1. **Scan tech:** Usa ZXing o ML Kit en Android, VisionKit en iOS, html5-qrcode en web. Híbrido.
2. **Offline:** Sí.
3. **Duplicate detection:** No.
4. **Audit trail:** No.
5. **Hardware:** BYOD.
6. **Printing:** No.
7. **Mobile framework:** Capacitor oficial Ionic (successor del `phonegap-plugin-barcodescanner` `[deprecated]`).
8. **Killer pattern:** "Oficial" = menos riesgo de abandono vs plugins community.
9. **Anti-pattern:** Docs inconsistentes — la promesa de "hibridos" (ZXing+MLKit+VisionKit) esconde que el comportamiento cambia por plataforma, debuggear duplicate es pesadilla.

### 2.7 Logiwa WMS `[confirmed]`

1. **Scan tech:** Cualquier 1D/2D desde Android/iOS + RF guns. Delegado al OS.
2. **Offline:** **Limitado** — real-time sync asumido. No es offline-first.
3. **Duplicate detection:** Nivel DB — PK constraints sobre receiving/picking tasks.
4. **Audit trail:** **Completo** — 95% de activities registradas con operator+timestamp+device.
5. **Hardware:** BYOD + RF guns. Recomiendan Android.
6. **Printing:** Integra con ZPL printers directo.
7. **Mobile framework:** App nativa Android/iOS.
8. **Killer pattern:** Auditoría completa por operator — cada movement tiene (who, what, where, when, via-device).
9. **Anti-pattern:** Asume conectividad estable. No sirve para orchard remoto NZ sin 4G.

### 2.8 Fishbowl Go `[confirmed]`

1. **Scan tech:** Camera + bluetooth HID scanners.
2. **Offline:** Sí (app mobile persiste local).
3. **Duplicate detection:** No documentada explícitamente.
4. **Audit trail:** Standard (QuickBooks-grade audit log).
5. **Hardware:** BYOD + ScanSKU integration.
6. **Printing:** Soporta Zebra + Brother printers.
7. **Mobile framework:** Native Android/iOS.
8. **Killer pattern:** Barato (~$4k/año) para SMB con QuickBooks.
9. **Anti-pattern:** No diseñado para outdoor/piece-rate. Enterprise warehouse.

### 2.9 Odoo Inventory `[confirmed]`

1. **Scan tech:** Camera + USB/BT scanners.
2. **Offline:** **`[confirmed]` sí** — Odoo Barcode app funciona sin WiFi.
3. **Duplicate detection:** Vía lot/serial unique constraints. Cada serial = único → segundo scan del mismo serial incrementa quantity en el mismo transfer, no crea duplicado.
4. **Audit trail:** Lot + Serial tracking granular. Cada move tiene `(date, user, source_location, dest_location, product, qty)`.
5. **Hardware:** BYOD.
6. **Printing:** ZPL + PDF labels nativo.
7. **Mobile framework:** OWL (Odoo Web Library) — PWA.
8. **Killer pattern:** **Modelo serial/lot = idempotency natural**. Scan del mismo serial dos veces no crea 2 rows, actualiza el mismo. HarvestPro debería tratar `bucket_id` como serial único.
9. **Anti-pattern:** Odoo es monolito pesado — no adoptable completo, solo el modelo.

### 2.10 Croptracker (orchard) `[confirmed]` — competidor directo

1. **Scan tech:** QR + barcode en harvest tags + employee badges.
2. **Offline:** Sí (app mobile orchard-aware).
3. **Duplicate detection:** **Unique IDs en tags** — imprimen rolls de tags pre-numerados, cada tag es único por construcción.
4. **Audit trail:** Combina badge scan + tag scan = `(worker, tag, timestamp, gps, tree_block)`. Traceability ready.
5. **Hardware:** BYOD + bluetooth scanners.
6. **Printing:** Pre-printed roll tags + on-demand labels.
7. **Mobile framework:** Cross-platform (React Native aprox).
8. **Killer pattern:** **Pre-print tags con IDs únicos**. El problema de HarvestPro (30k duplicates) no existiría si cada bucket tuviera un ID único pre-asignado desde el inicio.
9. **Anti-pattern:** Requiere pre-planning logístico — imprimir miles de tags antes de la temporada.

### 2.11 QuickPick / FairPick (2ndSight Bioscience) `[confirmed]` — killer dominio-específico

1. **Scan tech:** RFID + QR badges.
2. **Offline:** `[approximate]` sí (standalone terminals).
3. **Duplicate detection:** **LOCKOUT MINIMUM INTERVAL** — si el picker escanea < N segundos desde su último scan, el sistema **rechaza** el scan con error visible. Config: "si llenar bucket toma ≥60s, lockout = 60s".
4. **Audit trail:** Integrado con payroll (piece-rate → wage).
5. **Hardware:** Terminales standalone + mobile clock-in.
6. **Printing:** Sí (HW dedicado).
7. **Mobile framework:** Android app.
8. **Killer pattern:** **EL PATRÓN. Lockout por intervalo mínimo.** Exactamente lo que HarvestPro necesita para los 30k duplicates. Se asume un tiempo físico mínimo entre scans legítimos y cualquier cosa por debajo es fraude/error.
9. **Anti-pattern:** Hardware dedicado caro para operaciones pequeñas.

### 2.12 FoodLogiQ / Trustwell `[confirmed]` — patrón traceability

1. **Scan tech:** N/A — es plataforma SaaS, no scanner. Consume eventos upstream.
2. **Offline:** No (cloud).
3. **Duplicate detection:** N/A.
4. **Audit trail:** **Critical Tracking Events (CTE) + GS1 EPCIS**. Cada evento tiene (what, when, where, why).
5. **Hardware:** N/A.
6. **Printing:** No.
7. **Mobile framework:** Web + mobile responsive.
8. **Killer pattern:** **CTE modelo** — cada transición bucket→bin→coolstore→truck = 1 CTE. Conforme a FSMA 204 y aplicable a MPI NZ.
9. **Anti-pattern:** Enterprise pricing ($20k+/año). Adoptable solo como modelo de datos.

### 2.13 ServiceTitan / FieldAware `[confirmed]` — patrón offline field service

1. **Scan tech:** N/A (no es WMS).
2. **Offline:** **`[confirmed]` completo** — all features in offline mode. Sync on reconnect.
3. **Duplicate detection:** N/A.
4. **Audit trail:** Job + technician + GPS + timestamp.
5. **Hardware:** BYOD.
6. **Printing:** No (firmas digitales).
7. **Mobile framework:** Native.
8. **Killer pattern:** **UX-first offline** — user no sabe si está online u offline, la app no cambia. Nada de "modo offline" visible al picker.
9. **Anti-pattern:** Dominio muy distinto (service techs, no pickers).

### 2.14 NiceLabel `[confirmed]` — label printing layer

1. **Scan tech:** N/A.
2. **Offline:** Cloud + local drivers.
3. **Duplicate detection:** Serial counter en templates — puede autogenerar IDs únicos secuenciales.
4. **Audit trail:** Print log.
5. **Hardware:** Cualquier Zebra + Brother + Honeywell.
6. **Printing:** **Core** — ZPL/EPL/CPCL nativos. Cloud printing API.
7. **Mobile framework:** Web dashboard + print API.
8. **Killer pattern:** **Print-on-demand con counter server-side** — evita que 2 estaciones impriman el mismo ID. HarvestPro podría usar este patrón si migra a stickers pre-printed con server-side reservation.
9. **Anti-pattern:** Licensing por usuario es caro para ops de turnos.

---

## 3. Patrones anti-duplicate — cómo la industria evita los 30.464 duplicados

El hallazgo de auditoría HarvestPro: 30.464 pares (picker_id, scanned_at) duplicados. Causas probables:
- **(A)** Usuario pulsa 2× el botón "confirm scan" antes del feedback visual (UI no-debounced).
- **(B)** Plugin barcode emite 2 events por el mismo scan en Android (ML Kit bug ocasional).
- **(C)** Sync al reconectar reenvía POST que ya había llegado (HTTP retry sin idempotency key).
- **(D)** Picker fraude — escanea 2× el mismo bucket para contar doble.
- **(E)** 2 runners escanean el mismo bucket casi-simultáneo.

Patrones que usan sistemas maduros:

### Patrón 1 — Lockout por intervalo mínimo (QuickPick / FairPick)
```
IF last_scan_by_picker[picker_id].age < MIN_INTERVAL_SECONDS:
    REJECT with visible error "Too fast — wait X seconds"
    DO NOT write to DB
```
Para cherry pickers se asume ≥30s físicos entre buckets. Cualquier cosa por debajo es `(A)`, `(B)`, o `(D)`.

### Patrón 2 — Idempotency key client-generated (stripe-style REST)
```
Client genera UUIDv4 al hacer tap en "scan".
POST /api/bucket-records con header Idempotency-Key: <uuid>
Server:
  SELECT * FROM bucket_records WHERE idempotency_key = $1
  IF found: return cached response (200, no duplicate write)
  ELSE: INSERT con idempotency_key, return new response
```
TTL de la key ~24h. Resuelve `(C)` completamente. **Portable a HarvestPro en 1 sprint.**

### Patrón 3 — ID único pre-printed (Croptracker, NiceLabel)
Cada bucket trae un QR único desde la imprenta. `bucket_id` = PK natural. Un segundo scan del mismo QR es un UPDATE (no-op o "ya contado"), no un INSERT. Resuelve `(A)`, `(B)`, `(D)`, `(E)` de un golpe. Requiere reingeniería del flow.

### Patrón 4 — UNIQUE constraint compuesta DB-level (Odoo, Logiwa)
```sql
ALTER TABLE bucket_records
  ADD CONSTRAINT uq_bucket_scan UNIQUE (bucket_qr, picker_id, scanned_date);
-- o más estricto:
  ADD CONSTRAINT uq_bucket_once UNIQUE (bucket_qr); -- si 1 bucket = 1 scan lifetime
```
Defense-in-depth. No arregla la causa pero **corta los duplicados en el servidor** incluso si el cliente falla.

### Patrón 5 — Client-side mutex / single-flight
```js
let scanInFlight = false;
async function onScan(code) {
  if (scanInFlight) return;  // debounce hard
  scanInFlight = true;
  try { await postScan(code); }
  finally { scanInFlight = false; }
}
```
Trivial, pero HarvestPro tiene 30k duplicates, sugiere que esto **no existe** hoy. Debe ser el primer fix (horas de trabajo).

### Patrón 6 — Visual confirmation overlay (Scandit MatrixScan)
Después del scan exitoso, overlay AR verde sobre el QR. El usuario sabe que "ya está". Previene `(A)` por UX, no por código.

---

## 4. MPI / FMD traceability (NZ) — lo que afecta HarvestPro

MPI NZ requiere para export fruit (`[confirmed]` en docs MPI):
- **Registro del packhouse** — HarvestPro debe asegurar que cada bin record conecte con un packhouse_id registrado MPI.
- **Phytosanitary certification** — cada export lot necesita un certificate ID. HarvestPro debe exponer el `bin_record → packhouse → export_lot` trail.
- **Production site → packhouse chain** — `bucket_record.orchard_block_id` debe poder cascadearse al bin y al export lot.
- **GlobalGAP alignment** — para Zespri/Enza/Mr. Apple exporters, GlobalGAP es requerido encima de MPI. Demanda retention records de agrochemicals + who-picked-what-block.

**Modelo de datos mínimo para MPI compliance:**
```
bucket_record (id, picker_id, qr, orchard_block_id, scanned_at, gps, device_id, idempotency_key)
bin_record    (id, bucket_ids[], runner_id, sticker_code, bin_destination, scanned_at, device_id)
packhouse_event (bin_id, packhouse_id, received_at, operator_id)
export_lot    (lot_id, packhouse_id, bins[], phyto_cert_id, destination_country, shipped_at)
```
FoodLogiQ CTE/EPCIS es el referente global. MPI NZ no exige EPCIS formal (aún) pero el modelo cubre.

---

## 5. Chain of custody — bucket → bin → warehouse → truck

Comparativa del trail completo:

| Sistema | Bucket | Bin | Warehouse | Truck |
|---|---|---|---|---|
| Croptracker | badge+tag scan | tag→bin pallet | packhouse receipt | no nativo |
| Odoo Inventory | lot/serial | internal transfer | location moves | delivery order |
| Logiwa | receiving | putaway | bin move | shipping |
| FoodLogiQ | CTE "harvest" | CTE "aggregate" | CTE "receive" | CTE "ship" |
| ShipHero | N/A | receiving | location | shipping label |
| HarvestPro (hoy) | bucket_record | bin_record | ? | ? |
| HarvestPro (target) | bucket_record + idempotency | bin_record + bucket_ids[] | packhouse_event | export_lot + phyto |

---

## 6. Top 5 ideas portables a HarvestPro

### Idea 1 — Idempotency key en `bucket_records` (Stripe/Odoo pattern)
**Esfuerzo:** 4–8h backend + 2h client.
**Impacto:** Corta duplicates causa `(C)` (sync retry) al 100%.
**Diseño:**
- Client genera `uuidv4()` en cada tap "confirm scan", persiste junto al record en SQLite/IndexedDB offline queue.
- POST `/api/bucket-records` incluye `Idempotency-Key` header.
- Server tiene table `idempotency_keys (key PK, response_body, created_at)`.
- Duplicate POST devuelve cached 200 en lugar de crear nuevo row.

### Idea 2 — Lockout intervalo mínimo (QuickPick/FairPick pattern)
**Esfuerzo:** 1–2h client.
**Impacto:** Corta `(A)` UI double-tap + `(D)` fraude.
**Diseño:**
```js
const MIN_INTERVAL_MS = 15000; // 15s por bucket es físicamente plausible
const lastScanByPicker = new Map();
function canScan(pickerId, bucketId) {
  const last = lastScanByPicker.get(pickerId);
  if (last && Date.now() - last.ts < MIN_INTERVAL_MS) {
    if (last.bucketId === bucketId) {
      showError("Same bucket scanned twice — ignored");
      return false;
    }
    showWarning("Too fast — picker may be mis-scanning");
    // could still allow, but flag in DB
  }
  lastScanByPicker.set(pickerId, { ts: Date.now(), bucketId });
  return true;
}
```

### Idea 3 — UNIQUE constraint DB + conflict-on-upsert (Odoo pattern)
**Esfuerzo:** 1h SQL migration + 1h backend.
**Impacto:** Defense-in-depth final.
**Diseño:**
```sql
-- asumiendo que 1 bucket = 1 scan-confirm en su vida
CREATE UNIQUE INDEX uq_bucket_record_qr ON bucket_records (bucket_qr)
  WHERE status = 'confirmed';
-- backend:
INSERT INTO bucket_records (...) VALUES (...)
  ON CONFLICT (bucket_qr) WHERE status='confirmed'
  DO UPDATE SET last_seen_at = NOW() RETURNING id, 'duplicate' AS note;
```

### Idea 4 — Offline queue con WorkManager/Service pattern (Zebra Couchbase pattern)
**Esfuerzo:** 1–2 sprints si HarvestPro no tiene ya.
**Impacto:** Durabilidad offline robusta, sync confiable.
**Diseño:**
- SQLite local con table `outbox (id, payload, status, retries, created_at)`.
- Worker que cada 30s + on-network-change intenta POST.
- Exponential backoff en retry. TTL 7 días.
- Status visible en UI como "pending sync: N items".

### Idea 5 — MatrixScan-style AR confirmation overlay (Scandit pattern)
**Esfuerzo:** 4–8h client.
**Impacto:** UX — reduce `(A)` double-taps por ansiedad del usuario.
**Diseño:**
- Después de scan exitoso, mostrar overlay verde ✓ 1.5s con checkmark + haptic feedback.
- Mientras el overlay está visible, disable de la cámara para evitar re-scan.
- En el histórico de scans del shift, visible como "scanned ✓" para que picker no dude si ya escaneó.

---

## 7. Anti-patterns — qué NO hacer

1. **No usar html5-qrcode en 2026** `[deprecated]` — maintenance parado, bugs conocidos Samsung+Chrome. Migrar a `@capacitor-mlkit/barcode-scanning`.
2. **No usar Dynamsoft con license per-scan para operación remota** — el bloqueo a 3 días offline es un footgun para temporadas de harvest en orchards sin 4G.
3. **No apostar a Scandit para ops < 50 users** — pricing volume-based rompe presupuesto operador NZ.
4. **No depender de client-only debouncing para piece-rate wages** — siempre defense-in-depth server-side (idempotency key + UNIQUE constraint). El client-side debouncing falla si el usuario instala versión vieja de la app.
5. **No usar last-write-wins naive para records de piece-rate** — si Bob escanea bucket X a las 10:00 y Alice lo escanea a las 10:01 (mis-scan), LWW le da el bucket a Alice y Bob pierde salario. Usar insert-if-not-exists en lugar de update.
6. **No colocar auth/sync fence bloqueante al onboard del shift** — FieldAware anti-pattern. El runner de HarvestPro empieza shift 06:00 sin WiFi en el orchard; si la app necesita token refresh al boot, bloqueado 8h.
7. **No imprimir stickers bin con ID secuencial cliente-local** — si 2 estaciones están offline imprimiendo, colisionan. Server-side reservation (NiceLabel pattern) o UUID.
8. **No asumir ML Kit soporta GS1 DataBar** — si HarvestPro quiere GS1-compliant stickers para export Zespri/Enza en futuro, ML Kit falla. Verificar antes de commit.
9. **No loggear `scanned_at` con `new Date()` client-side solo** — clock skew en phone Android = duplicates imposibles de detectar. Siempre también `server_received_at`.
10. **No usar Capacitor plugin `[deprecated]` `phonegap-plugin-barcodescanner`** — sucesor es `@capacitor/barcode-scanner` (oficial) o `@capacitor-mlkit/barcode-scanning` (community, más activo).

---

## 8. Conclusión operativa para HarvestPro

**Priorización de fixes para los 30.464 duplicates:**

1. **Hoy (P0, horas):** Client-side mutex + Lockout intervalo mínimo → cubre `(A)` y `(D)`.
2. **Esta semana (P1, 1–2 días):** UNIQUE constraint DB + idempotency key en POST → cubre `(C)` retry y defense-in-depth.
3. **Este sprint (P2, 1 semana):** Offline outbox robust con WorkManager pattern → cubre reliability general.
4. **Próximo trimestre (P3):** Pre-printed bucket QRs con IDs únicos (Croptracker pattern) → rediseño de flow que elimina causa-raíz de `(E)`.

**Stack recomendado HarvestPro:**
- Scanner: `@capacitor-mlkit/barcode-scanning` (actual, correcto).
- Offline store: SQLite via `@capacitor-community/sqlite` o Capacitor Preferences para queue simple.
- Sync: custom outbox worker (Capacitor background task plugin).
- Label printing: si NZ exige GS1-compliant stickers futuros, integrar NiceLabel o BarTender + Zebra printer en packhouse (no en el runner phone).
- Traceability: modelar `bucket_record → bin_record → packhouse_event → export_lot` alineado con GS1 CTE para estar MPI-ready.

---

## Sources

- [Scandit Pricing](https://www.scandit.com/pricing/?rid=33)
- [Scandit SDK Documentation](https://docs.scandit.com/barcode-scanner-sdk.html)
- [Zebra DataWedge](https://www.zebra.com/us/en/software/scanner-software/datawedge.html)
- [Offline Inventory Scanning with Zebra DataWedge and Couchbase Mobile](https://developer.zebra.com/community/home/blog/2018/11/07/offline-inventory-scanning-with-zebra-datawedge-and-couchbase-mobile)
- [Dynamsoft Barcode Reader Mobile SDK](https://www.dynamsoft.com/barcode-reader/sdk-mobile/)
- [html5-qrcode performance issues](https://github.com/mebjas/html5-qrcode/issues/582)
- [Web barcode scanners: Quagga2 vs. html5-qrcode](https://scanbot.io/blog/quagga2-vs-html5-qrcode-scanner/)
- [Capacitor Barcode Scanner libraries comparison](https://scanbot.io/blog/capacitor-barcode-scanner-vs-capacitor-mlkit/)
- [@capacitor-mlkit/barcode-scanning npm](https://www.npmjs.com/package/@capacitor-mlkit/barcode-scanning)
- [Capawesome ML Kit plugin](https://capawesome.io/plugins/mlkit/barcode-scanning/)
- [Logiwa WMS RF Scanning](https://www.logiwa.com/solutions/rf-scanning-mobile-operations)
- [Fishbowl Go Mobile](https://www.fishbowlinventory.com/products/fishbowl-go)
- [Odoo Barcode documentation](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/barcode.html)
- [Sortly Barcode Inventory](https://www.sortly.com/barcode-inventory-system/)
- [ShipHero Mobile App](https://apps.apple.com/us/app/shiphero-wms-mobile/id1321543167)
- [FoodLogiQ Traceability (Trustwell)](https://www.trustwell.com/products/foodlogiq/traceability/)
- [Croptracker Orchard Management](https://www.croptracker.com/product/orchard-management-software.html)
- [Croptracker Pre-Print & Scan](https://www.croptracker.com/product/farm-management-software/harvest-crop-yield-records/harvest-pre-print-scan.html)
- [QuickPick (2ndSight) piece rate](https://www.2ndsightbio.com/en/labor-tracking/quickpick-fast-paced-piecework-tracking-system)
- [FairPick Advanced Harvest Scale](http://www.2ndsightbio.com/index.php/labor-tracking/fairpick-lite-harvest-scale-system)
- [innov8.ag Pay by Piece](https://www.innov8.ag/solutions/pay-by-piece/)
- [Hectre orchard management](https://hectre.com/)
- [Tātou harvest tracking](https://www.tatou.app/harvest-tracking-management)
- [AgriSmart Harvest Ticketing](https://agrismart.com/ticketing-for-horticulture/)
- [NiceLabel Label Cloud](https://help.nicelabel.com/hc/en-001/articles/10988413413009-NiceLabel-Label-Cloud)
- [ServiceTitan Field Mobile App](https://www.servicetitan.com/features/field-mobile-app)
- [ServiceTitan vs FieldAware](https://www.servicetitan.com/comparison/servicetitan-vs-fieldaware)
- [Locate2u Proof of Delivery](https://www.locate2u.com/us/products/proof-of-delivery/)
- [PackageX Platform](https://packagex.io/)
- [MPI NZ Exporting Fruit and Vegetables](https://www.mpi.govt.nz/export/food/fruit-and-vegetables/steps-to-exporting-fresh-fruit-and-vegetables)
- [MPI Packhouse register (export to China)](https://www.mpi.govt.nz/resources-and-forms/registers-and-lists/packhouse-and-processing-facilities-that-export-fresh-fruits-and-vegetables-to-china)
- [GlobalGAP Produce Handling Assurance](https://www.globalgap.org/what-we-offer/solutions/produce-handling-assurance/)
- [Trevelyan's Kiwifruit Packhouse](https://trevelyan.co.nz/pack-with-us/kiwifruit/kiwifruit-overview/)
- [Idempotency Key — Preventing Duplicate Requests](https://boundedcontext.com/idempotency-key/)
- [Implementing Idempotency Keys in REST APIs (Zuplo)](https://zuplo.com/learning-center/implementing-idempotency-keys-in-rest-apis-a-complete-guide)
- [Offline-First Mobile App Architecture (dev.to)](https://dev.to/odunayo_dada/offline-first-mobile-app-architecture-syncing-caching-and-conflict-resolution-518n)
- [SQLite-sync CRDT offline-first (GitHub)](https://github.com/sqliteai/sqlite-sync)
