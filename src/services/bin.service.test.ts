/**
 * bin.service — tests puros del mapping capa repositorio → dominio.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/repositories/bin.repository', () => ({
    binRepository: {
        getByOrchard: vi.fn(),
        updateStatus: vi.fn(),
    },
}));

vi.mock('@/utils/nzst', () => ({
    nowNZST: vi.fn(() => '2026-04-18T09:00:00+12:00'),
}));

import { binService } from './bin.service';
import { binRepository } from '@/repositories/bin.repository';
import { nowNZST } from '@/utils/nzst';

describe('binService.getBins', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns [] when repo returns null', async () => {
        (binRepository.getByOrchard as ReturnType<typeof vi.fn>).mockResolvedValue(null);
        const result = await binService.getBins('o1');
        expect(result).toEqual([]);
    });

    it('returns [] when repo returns []', async () => {
        (binRepository.getByOrchard as ReturnType<typeof vi.fn>).mockResolvedValue([]);
        const result = await binService.getBins('o1');
        expect(result).toEqual([]);
    });

    it('maps repo row to Bin dominio', async () => {
        (binRepository.getByOrchard as ReturnType<typeof vi.fn>).mockResolvedValue([
            { id: 'b1', status: 'empty', variety: 'Hayward', bin_code: 'B-001' },
        ]);
        const result = await binService.getBins('o1');
        expect(result).toEqual([
            { id: 'b1', status: 'empty', fillPercentage: 0, type: 'Hayward', bin_code: 'B-001' },
        ]);
    });

    it('fillPercentage siempre 0 al venir del repo (se calcula en UI)', async () => {
        (binRepository.getByOrchard as ReturnType<typeof vi.fn>).mockResolvedValue([
            { id: 'b1', status: 'full', bin_code: 'B-001' },
        ]);
        const [b] = await binService.getBins('o1');
        expect(b.fillPercentage).toBe(0);
    });

    it('defaults type=Standard cuando falta variety', async () => {
        (binRepository.getByOrchard as ReturnType<typeof vi.fn>).mockResolvedValue([
            { id: 'b1', status: 'empty', bin_code: 'B-001' },
        ]);
        const [b] = await binService.getBins('o1');
        expect(b.type).toBe('Standard');
    });
});

describe('binService.updateBinStatus', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('pasa filled_at con timestamp cuando status=full', async () => {
        await binService.updateBinStatus('b1', 'full');
        expect(binRepository.updateStatus).toHaveBeenCalledWith('b1', 'full', '2026-04-18T09:00:00+12:00');
        expect(nowNZST).toHaveBeenCalled();
    });

    it('pasa filled_at null cuando status!=full', async () => {
        await binService.updateBinStatus('b1', 'empty');
        expect(binRepository.updateStatus).toHaveBeenCalledWith('b1', 'empty', null);
    });

    it('pasa filled_at null para in-progress y collected', async () => {
        await binService.updateBinStatus('b1', 'in-progress');
        await binService.updateBinStatus('b1', 'collected');
        expect(binRepository.updateStatus).toHaveBeenNthCalledWith(1, 'b1', 'in-progress', null);
        expect(binRepository.updateStatus).toHaveBeenNthCalledWith(2, 'b1', 'collected', null);
    });
});
