/**
 * zod.schemas.test.ts — Tests para boundary validation schemas
 *
 * Verifica que los schemas rechacen datos inválidos y acepten datos válidos,
 * y que las utilidades safeParse/safeParseArray funcionen correctamente.
 */
import { describe, it, expect, vi } from 'vitest';
import {
    QRPayloadSchema,
    PickerSchema,
    AttendanceRecordSchema,
    HarvestSettingsSchema,
    safeParse,
    safeParseArray,
} from './zod.schemas';

// ─── QRPayloadSchema ────────────────────────────────────────────────────────

describe('QRPayloadSchema', () => {
    const validPayload = { picker_id: 'picker-abc-123' };

    it('acepta un payload mínimo válido', () => {
        const result = QRPayloadSchema.safeParse(validPayload);
        expect(result.success).toBe(true);
    });

    it('aplica default "A" a quality_grade si no se provee', () => {
        const result = QRPayloadSchema.safeParse(validPayload);
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.quality_grade).toBe('A');
    });

    it('acepta todos los quality_grade válidos', () => {
        for (const grade of ['A', 'B', 'C', 'reject'] as const) {
            const result = QRPayloadSchema.safeParse({ ...validPayload, quality_grade: grade });
            expect(result.success).toBe(true);
        }
    });

    it('rechaza quality_grade fuera del enum', () => {
        const result = QRPayloadSchema.safeParse({ ...validPayload, quality_grade: 'D' });
        expect(result.success).toBe(false);
    });

    it('rechaza picker_id vacío', () => {
        const result = QRPayloadSchema.safeParse({ picker_id: '' });
        expect(result.success).toBe(false);
    });

    it('rechaza picker_id mayor de 100 caracteres', () => {
        const result = QRPayloadSchema.safeParse({ picker_id: 'x'.repeat(101) });
        expect(result.success).toBe(false);
    });

    it('rechaza orchard_id que no es UUID', () => {
        const result = QRPayloadSchema.safeParse({ ...validPayload, orchard_id: 'no-es-uuid' });
        expect(result.success).toBe(false);
    });

    it('acepta orchard_id UUID válido', () => {
        const result = QRPayloadSchema.safeParse({
            ...validPayload,
            orchard_id: '550e8400-e29b-41d4-a716-446655440000',
        });
        expect(result.success).toBe(true);
    });

    it('acepta row_number en rango válido', () => {
        const result = QRPayloadSchema.safeParse({ ...validPayload, row_number: 42 });
        expect(result.success).toBe(true);
    });

    it('rechaza row_number negativo', () => {
        const result = QRPayloadSchema.safeParse({ ...validPayload, row_number: -1 });
        expect(result.success).toBe(false);
    });

    it('rechaza row_number mayor de 9999', () => {
        const result = QRPayloadSchema.safeParse({ ...validPayload, row_number: 10000 });
        expect(result.success).toBe(false);
    });

    it('rechaza payload sin picker_id', () => {
        const result = QRPayloadSchema.safeParse({});
        expect(result.success).toBe(false);
    });
});

// ─── PickerSchema ───────────────────────────────────────────────────────────

describe('PickerSchema', () => {
    const validPicker = {
        id: 'picker-uuid-001',
        name: 'Ana García',
    };

    it('acepta un picker mínimo válido', () => {
        const result = PickerSchema.safeParse(validPicker);
        expect(result.success).toBe(true);
    });

    it('aplica defaults: status="inactive", safety_verified=false, current_row=0', () => {
        const result = PickerSchema.safeParse(validPicker);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.status).toBe('inactive');
            expect(result.data.safety_verified).toBe(false);
            expect(result.data.current_row).toBe(0);
            expect(result.data.picker_id).toBe('');
        }
    });

    it('acepta todos los status válidos', () => {
        const statuses = ['active', 'break', 'on_break', 'issue', 'inactive', 'suspended', 'archived'] as const;
        for (const status of statuses) {
            const result = PickerSchema.safeParse({ ...validPicker, status });
            expect(result.success).toBe(true);
        }
    });

    it('rechaza status fuera del enum', () => {
        const result = PickerSchema.safeParse({ ...validPicker, status: 'deleted' });
        expect(result.success).toBe(false);
    });

    it('rechaza id vacío', () => {
        const result = PickerSchema.safeParse({ ...validPicker, id: '' });
        expect(result.success).toBe(false);
    });

    it('rechaza name vacío', () => {
        const result = PickerSchema.safeParse({ ...validPicker, name: '' });
        expect(result.success).toBe(false);
    });

    it('acepta campos nullable opcionales como null', () => {
        const result = PickerSchema.safeParse({
            ...validPicker,
            orchard_id: null,
            team_leader_id: null,
            archived_at: null,
        });
        expect(result.success).toBe(true);
    });
});

// ─── AttendanceRecordSchema ──────────────────────────────────────────────────

describe('AttendanceRecordSchema', () => {
    const validRecord = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        picker_id: '550e8400-e29b-41d4-a716-446655440002',
        orchard_id: '550e8400-e29b-41d4-a716-446655440003',
        date: '2026-04-10',
    };

    it('acepta un registro mínimo válido', () => {
        const result = AttendanceRecordSchema.safeParse(validRecord);
        expect(result.success).toBe(true);
    });

    it('aplica default status="present"', () => {
        const result = AttendanceRecordSchema.safeParse(validRecord);
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.status).toBe('present');
    });

    it('acepta todos los status de attendance válidos', () => {
        const statuses = ['present', 'absent', 'late', 'sick', 'left_early'] as const;
        for (const status of statuses) {
            const result = AttendanceRecordSchema.safeParse({ ...validRecord, status });
            expect(result.success).toBe(true);
        }
    });

    it('rechaza status fuera del enum', () => {
        const result = AttendanceRecordSchema.safeParse({ ...validRecord, status: 'vacation' });
        expect(result.success).toBe(false);
    });

    it('rechaza fecha con formato incorrecto', () => {
        const badDates = ['10-04-2026', '2026/04/10', 'April 10', ''];
        for (const date of badDates) {
            const result = AttendanceRecordSchema.safeParse({ ...validRecord, date });
            expect(result.success).toBe(false);
        }
    });

    it('acepta fecha en formato YYYY-MM-DD', () => {
        const result = AttendanceRecordSchema.safeParse({ ...validRecord, date: '2026-12-31' });
        expect(result.success).toBe(true);
    });

    it('rechaza id que no es UUID', () => {
        const result = AttendanceRecordSchema.safeParse({ ...validRecord, id: 'not-a-uuid' });
        expect(result.success).toBe(false);
    });

    it('acepta check_in_time y check_out_time como null', () => {
        const result = AttendanceRecordSchema.safeParse({
            ...validRecord,
            check_in_time: null,
            check_out_time: null,
        });
        expect(result.success).toBe(true);
    });
});

// ─── HarvestSettingsSchema ──────────────────────────────────────────────────

describe('HarvestSettingsSchema', () => {
    const validSettings = {
        min_wage_rate: 23.95,
        piece_rate: 6.5,
        min_buckets_per_hour: 3,
        target_tons: 10,
    };

    it('acepta settings válidos', () => {
        const result = HarvestSettingsSchema.safeParse(validSettings);
        expect(result.success).toBe(true);
    });

    it('rechaza min_wage_rate negativo', () => {
        const result = HarvestSettingsSchema.safeParse({ ...validSettings, min_wage_rate: -1 });
        expect(result.success).toBe(false);
    });

    it('rechaza min_wage_rate mayor de 500', () => {
        const result = HarvestSettingsSchema.safeParse({ ...validSettings, min_wage_rate: 501 });
        expect(result.success).toBe(false);
    });

    it('rechaza piece_rate negativo', () => {
        const result = HarvestSettingsSchema.safeParse({ ...validSettings, piece_rate: -0.1 });
        expect(result.success).toBe(false);
    });

    it('rechaza piece_rate mayor de 100', () => {
        const result = HarvestSettingsSchema.safeParse({ ...validSettings, piece_rate: 100.01 });
        expect(result.success).toBe(false);
    });

    it('rechaza min_buckets_per_hour no entero', () => {
        const result = HarvestSettingsSchema.safeParse({ ...validSettings, min_buckets_per_hour: 3.5 });
        expect(result.success).toBe(false);
    });

    it('rechaza target_tons negativo', () => {
        const result = HarvestSettingsSchema.safeParse({ ...validSettings, target_tons: -1 });
        expect(result.success).toBe(false);
    });

    it('acepta variety como campo opcional', () => {
        const result = HarvestSettingsSchema.safeParse({ ...validSettings, variety: 'Hayward' });
        expect(result.success).toBe(true);
    });
});

// ─── safeParse ──────────────────────────────────────────────────────────────

describe('safeParse', () => {
    it('devuelve {success:true, data} con input válido', () => {
        const result = safeParse(QRPayloadSchema, { picker_id: 'abc' });
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.picker_id).toBe('abc');
    });

    it('devuelve {success:false, error} con input inválido', () => {
        const result = safeParse(QRPayloadSchema, { picker_id: '' });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toContain('picker_id');
            expect(typeof result.error).toBe('string');
            expect(result.error.length).toBeGreaterThan(0);
        }
    });

    it('formatea múltiples errores de validación en un string legible', () => {
        const result = safeParse(HarvestSettingsSchema, {
            min_wage_rate: -1,
            piece_rate: -1,
            min_buckets_per_hour: 0,
            target_tons: 0,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            // Debe incluir ambos campos con error
            expect(result.error).toContain('min_wage_rate');
            expect(result.error).toContain('piece_rate');
        }
    });

    it('error incluye el path del campo fallido', () => {
        const result = safeParse(AttendanceRecordSchema, {
            id: 'not-uuid',
            picker_id: '550e8400-e29b-41d4-a716-446655440002',
            orchard_id: '550e8400-e29b-41d4-a716-446655440003',
            date: '2026-04-10',
        });
        expect(result.success).toBe(false);
        if (!result.success) expect(result.error).toContain('id');
    });
});

// ─── safeParseArray ─────────────────────────────────────────────────────────

describe('safeParseArray', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    it('devuelve solo los elementos válidos del array', () => {
        const input = [
            { picker_id: 'valid-001' },
            { picker_id: '' },            // inválido — vacío
            { picker_id: 'valid-002' },
            { picker_id: 'x'.repeat(200) }, // inválido — muy largo
        ];
        const result = safeParseArray(QRPayloadSchema, input);
        expect(result).toHaveLength(2);
        expect(result[0].picker_id).toBe('valid-001');
        expect(result[1].picker_id).toBe('valid-002');
    });

    it('devuelve array vacío si todos los elementos son inválidos', () => {
        const result = safeParseArray(QRPayloadSchema, [{ picker_id: '' }, {}]);
        expect(result).toHaveLength(0);
    });

    it('devuelve todos los elementos si todos son válidos', () => {
        const input = [
            { picker_id: 'a' },
            { picker_id: 'b' },
            { picker_id: 'c' },
        ];
        const result = safeParseArray(QRPayloadSchema, input);
        expect(result).toHaveLength(3);
    });

    it('devuelve array vacío con input vacío', () => {
        const result = safeParseArray(QRPayloadSchema, []);
        expect(result).toHaveLength(0);
    });

    it('emite console.warn por cada elemento inválido', () => {
        consoleWarnSpy.mockClear();
        safeParseArray(QRPayloadSchema, [{ picker_id: '' }, { picker_id: 'valid' }]);
        expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    });
});
