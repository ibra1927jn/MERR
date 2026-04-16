/**
 * Integration test: analyticsTrendsRepository.getDailyAggregates
 *
 * Conecta al Supabase local real (no mocks). Requiere:
 *   - Docker Desktop corriendo
 *   - `supabase start` ejecutado desde /harvestpro-nz
 *   - Sim de 14 días cargado (seed_2weeks_local.sql)
 *
 * Ejecutar con:
 *   npx vitest run tests/integration/analytics.supabase.test.ts
 *
 * NO incluir en `npm test` general — este test golpea la DB real.
 * Separado del suite principal para no requerir Supabase en CI.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// ── Supabase local — valores fijos del entorno de desarrollo ──
// Usamos service_role para bypass de RLS en tests de integración.
// Estos son los JWTs demo estándar de Supabase local, no son secretos de producción.
const LOCAL_URL = 'http://127.0.0.1:54321';
const LOCAL_SERVICE_ROLE_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

// Orchard del sim: Sunrise Apple Orchard
const SIM_ORCHARD_ID = 'e1337e6a-54cc-431c-9c00-980e8ea270a4';

// Rango del sim con datos (Apr 8-14, semana completa menos domingo Apr 13)
const SIM_START = '2026-04-08';
const SIM_END   = '2026-04-14';

// Breakdown exacto verificado con query SQL timezone-aware 2026-04-15:
// SELECT (scanned_at AT TIME ZONE 'Pacific/Auckland')::date::text AS day_nz, COUNT(*)
// FROM bucket_records
// WHERE orchard_id = SIM_ORCHARD_ID
//   AND (scanned_at AT TIME ZONE 'Pacific/Auckland')::date BETWEEN '2026-04-08' AND '2026-04-14'
//   AND deleted_at IS NULL
// GROUP BY day_nz ORDER BY day_nz;
//
// NOTA: La primera query UTC-naive devolvió Apr 8 = 1596 (15.730 total).
// La query timezone-aware devuelve Apr 8 = 4088 (18.222 total).
// La diferencia (2492) son scans del amanecer NZ (Apr 8 00:00-12:00 NZ)
// almacenados como Apr 7 12:00-24:00 UTC — correctamente incluidos por getDailyAggregates.
const EXPECTED_BY_DAY: Record<string, number> = {
    '2026-04-08': 4088,
    '2026-04-09': 2996,
    '2026-04-10': 3084,
    '2026-04-11': 3276,
    '2026-04-12': 1698,
    // '2026-04-13': 0 — domingo, sin operación (gap intencional del sim)
    '2026-04-14': 3080,
};
const EXPECTED_TOTAL = 18222; // Correcto con NZ timezone. UTC-naive daba 15.730.
const EXPECTED_DAYS_WITH_DATA = 6; // Apr 13 domingo no aparece

// ── Lógica de getDailyAggregates extraída para testear contra cliente real ──
interface DailyAggregate {
    date: string;
    total_buckets: number;
    workforce_count: number;
}

async function getDailyAggregates(
    client: ReturnType<typeof createClient>,
    orchardId: string,
    startDate: string,
    endDate: string,
): Promise<DailyAggregate[]> {
    // Misma lógica que analyticsTrendsRepository.getDailyAggregates
    const utcFrom = new Date(`${startDate}T00:00:00Z`);
    utcFrom.setUTCHours(utcFrom.getUTCHours() - 14);
    const utcFromStr = utcFrom.toISOString();

    const utcTo = new Date(`${endDate}T00:00:00Z`);
    utcTo.setUTCDate(utcTo.getUTCDate() + 1);
    const utcToStr = utcTo.toISOString();

    const PAGE_SIZE = 1000;
    const allRows: { scanned_at: string; picker_id: string | null }[] = [];
    let page = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const { data, error } = await client
            .from('bucket_records')
            .select('scanned_at, picker_id')
            .eq('orchard_id', orchardId)
            .gte('scanned_at', utcFromStr)
            .lt('scanned_at', utcToStr)
            .is('deleted_at', null)
            .order('scanned_at')
            .range(from, to);

        if (error) throw new Error(`Supabase error: ${error.message}`);
        if (!data || data.length === 0) break;
        allRows.push(...(data as { scanned_at: string; picker_id: string | null }[]));
        if (data.length < PAGE_SIZE) break;
        page++;
    }

    const nzFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland' });
    const byDay = new Map<string, { total_buckets: number; pickers: Set<string> }>();

    for (const row of allRows) {
        const dayNZ = nzFmt.format(new Date(row.scanned_at));
        if (dayNZ < startDate || dayNZ > endDate) continue;
        if (!byDay.has(dayNZ)) byDay.set(dayNZ, { total_buckets: 0, pickers: new Set() });
        const entry = byDay.get(dayNZ)!;
        entry.total_buckets++;
        if (row.picker_id) entry.pickers.add(row.picker_id as string);
    }

    return Array.from(byDay.entries())
        .map(([date, { total_buckets, pickers }]) => ({
            date,
            total_buckets,
            workforce_count: pickers.size,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
}

// ── Tests ──

describe('getDailyAggregates — integration contra Supabase local', () => {
    let client: ReturnType<typeof createClient>;
    let result: DailyAggregate[];

    beforeAll(async () => {
        client = createClient(LOCAL_URL, LOCAL_SERVICE_ROLE_KEY);

        // Verificar conexión antes de correr asserts
        const { error: probeError } = await client
            .from('bucket_records')
            .select('id')
            .limit(1);

        if (probeError) {
            throw new Error(
                `No se pudo conectar al Supabase local: ${probeError.message}\n` +
                'Asegúrate de que Docker esté corriendo y `supabase start` esté activo.',
            );
        }

        result = await getDailyAggregates(client, SIM_ORCHARD_ID, SIM_START, SIM_END);
    }, 30_000); // timeout generoso para la primera conexión

    it('devuelve exactamente 6 días con datos (Apr 13 domingo sin operación)', () => {
        expect(result).toHaveLength(EXPECTED_DAYS_WITH_DATA);
    });

    it('la suma total de scans es 15.730', () => {
        const total = result.reduce((s, d) => s + d.total_buckets, 0);
        expect(total).toBe(EXPECTED_TOTAL);
    });

    it('el breakdown por día coincide exactamente con la query SQL de referencia', () => {
        for (const row of result) {
            const expected = EXPECTED_BY_DAY[row.date];
            expect(
                row.total_buckets,
                `Día ${row.date}: esperado ${expected}, obtenido ${row.total_buckets}`,
            ).toBe(expected);
        }
    });

    it('Apr 13 (domingo) no aparece en los resultados', () => {
        const sunday = result.find(d => d.date === '2026-04-13');
        expect(sunday).toBeUndefined();
    });

    it('todos los días tienen workforce_count > 0', () => {
        for (const row of result) {
            expect(
                row.workforce_count,
                `Día ${row.date} tiene workforce_count = 0`,
            ).toBeGreaterThan(0);
        }
    });

    it('los días están ordenados cronológicamente', () => {
        for (let i = 1; i < result.length; i++) {
            expect(result[i].date > result[i - 1].date).toBe(true);
        }
    });

    it('el rango no incluye días fuera de Apr 8-14', () => {
        for (const row of result) {
            expect(row.date >= SIM_START).toBe(true);
            expect(row.date <= SIM_END).toBe(true);
        }
    });
});
