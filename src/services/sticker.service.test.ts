/**
 * sticker.service — extract picker id + scan con dedup DB + offline.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { stickerRepository } from '@/repositories/sticker.repository';
import {
    extractPickerIdFromSticker,
    checkStickerScanned,
    scanSticker,
} from './sticker.service';

describe('extractPickerIdFromSticker', () => {
    it('extrae los primeros 5 dígitos del código', () => {
        expect(extractPickerIdFromSticker('2662200498')).toBe('26622');
    });

    it('ignora caracteres no dígito (strip antes de extract)', () => {
        expect(extractPickerIdFromSticker('P-26620-0498')).toBe('26620');
        expect(extractPickerIdFromSticker('AB 12345 X')).toBe('12345');
    });

    it('devuelve null cuando < 5 dígitos', () => {
        expect(extractPickerIdFromSticker('1234')).toBeNull();
        expect(extractPickerIdFromSticker('abc')).toBeNull();
        expect(extractPickerIdFromSticker('')).toBeNull();
    });

    it('exactamente 5 dígitos → picker_id con todo el código', () => {
        expect(extractPickerIdFromSticker('12345')).toBe('12345');
    });
});

describe('checkStickerScanned', () => {
    beforeEach(() => vi.restoreAllMocks());

    it('true cuando repo devuelve data (sticker existente)', async () => {
        vi.spyOn(stickerRepository, 'findByCode').mockResolvedValue({ id: 'st1' } as never);
        expect(await checkStickerScanned('ABC-001')).toBe(true);
    });

    it('false cuando repo devuelve null', async () => {
        vi.spyOn(stickerRepository, 'findByCode').mockResolvedValue(null as never);
        expect(await checkStickerScanned('NEW-001')).toBe(false);
    });

    it('normaliza código (trim + uppercase)', async () => {
        const spy = vi.spyOn(stickerRepository, 'findByCode').mockResolvedValue(null as never);
        await checkStickerScanned('  abc-001  ');
        expect(spy).toHaveBeenCalledWith('ABC-001');
    });

    it('throws cuando repo throws', async () => {
        vi.spyOn(stickerRepository, 'findByCode').mockRejectedValue(new Error('boom'));
        await expect(checkStickerScanned('X')).rejects.toThrow('boom');
    });
});

describe('scanSticker', () => {
    beforeEach(() => vi.restoreAllMocks());

    it('success:false cuando no se puede extraer picker_id', async () => {
        const res = await scanSticker('AB', 'bin-1');
        expect(res.success).toBe(false);
        expect(res.error).toMatch(/Código QR inválido/);
    });

    it('inserta y devuelve success:true con pickerId extraído', async () => {
        const spy = vi.spyOn(stickerRepository, 'insert').mockResolvedValue({
            data: { id: 'st1', sticker_code: 'ABC123456', picker_id: '12345' },
            error: null,
        } as never);

        const res = await scanSticker('abc123456', 'bin-1', 'user-1', 'tl-1', 'orchard-1');
        expect(res.success).toBe(true);
        expect(res.pickerId).toBe('12345');
        expect(spy.mock.calls[0][0]).toMatchObject({
            sticker_code: 'ABC123456', // trimmed + uppercased
            picker_id: '12345',
            bin_id: 'bin-1',
            scanned_by: 'user-1',
            team_leader_id: 'tl-1',
            orchard_id: 'orchard-1',
        });
    });

    it('detecta duplicado (error code 23505)', async () => {
        vi.spyOn(stickerRepository, 'insert').mockResolvedValue({
            data: null,
            error: { code: '23505', message: 'duplicate key' },
        } as never);
        const res = await scanSticker('12345-NEW', 'bin-1');
        expect(res.success).toBe(false);
        expect(res.error).toMatch(/ya fue escaneado/);
    });

    it('OFFLINE_MODE cuando error es "Failed to fetch"', async () => {
        vi.spyOn(stickerRepository, 'insert').mockResolvedValue({
            data: null,
            error: { message: 'Failed to fetch' },
        } as never);
        const res = await scanSticker('12345-NEW', 'bin-1');
        expect(res.success).toBe(false);
        expect(res.error).toBe('OFFLINE_MODE');
    });

    it('generic error con message cuando otra razón', async () => {
        vi.spyOn(stickerRepository, 'insert').mockResolvedValue({
            data: null,
            error: { message: 'RLS denied', code: '42501' },
        } as never);
        const res = await scanSticker('12345-NEW', 'bin-1');
        expect(res.success).toBe(false);
        expect(res.error).toContain('RLS denied');
    });
});
