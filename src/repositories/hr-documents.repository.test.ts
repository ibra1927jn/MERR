/**
 * hr-documents.repository — upload/list/delete + signed URL.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/services/supabase';
import { hrDocumentsRepository } from './hr-documents.repository';

function mockChain(result: { data?: unknown; error?: unknown }) {
    const chain: Record<string, unknown> = {
        select: vi.fn(() => chain),
        insert: vi.fn(() => chain),
        update: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        is: vi.fn(() => chain),
        not: vi.fn(() => chain),
        lte: vi.fn(() => chain),
        order: vi.fn(() => chain),
        single: vi.fn(() => chain),
        then: (onF?: (v: unknown) => unknown, onR?: (r: unknown) => unknown) =>
            Promise.resolve(result).then(onF, onR),
    };
    return chain;
}

beforeEach(() => {
    vi.restoreAllMocks();
});

describe('hrDocumentsRepository.listByOrchard', () => {
    it('devuelve array de docs no-eliminados, newest first', async () => {
        const fromSpy = vi.spyOn(supabase, 'from').mockReturnValue(
            mockChain({ data: [{ id: 'd1' }, { id: 'd2' }], error: null }) as never,
        );
        const res = await hrDocumentsRepository.listByOrchard('o1');
        expect(fromSpy).toHaveBeenCalledWith('hr_documents');
        expect(res).toHaveLength(2);
    });

    it('[] cuando data es null', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(mockChain({ data: null, error: null }) as never);
        expect(await hrDocumentsRepository.listByOrchard('o1')).toEqual([]);
    });

    it('throws cuando error', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(
            mockChain({ data: null, error: { message: 'rls' } }) as never,
        );
        await expect(hrDocumentsRepository.listByOrchard('o1')).rejects.toBeTruthy();
    });
});

describe('hrDocumentsRepository.upload', () => {
    it('rechaza archivos > 10 MB', async () => {
        const big = new File([new Uint8Array(11 * 1024 * 1024)], 'big.pdf', { type: 'application/pdf' });
        await expect(
            hrDocumentsRepository.upload(big, {
                orchardId: 'o1',
                userId: 'u1',
                documentType: 'work_visa',
                title: 'X',
            }),
        ).rejects.toThrow(/demasiado grande/);
    });

    it('rechaza cuando no hay picker_id ni user_id', async () => {
        const file = new File(['x'], 'x.pdf');
        await expect(
            hrDocumentsRepository.upload(file, {
                orchardId: 'o1',
                documentType: 'work_visa',
                title: 'X',
            }),
        ).rejects.toThrow(/picker_id o user_id requerido/);
    });

    it('sube + inserta fila correctamente', async () => {
        const file = new File(['content'], 'doc.pdf', { type: 'application/pdf' });

        const uploadMock = vi.fn().mockResolvedValue({ error: null });
        const fromStorageMock = vi.spyOn(supabase.storage, 'from').mockReturnValue({
            upload: uploadMock,
            remove: vi.fn().mockResolvedValue({ error: null }),
        } as never);

        const insertChain = mockChain({ data: { id: 'new-doc', title: 'X' }, error: null });
        vi.spyOn(supabase, 'from').mockReturnValue(insertChain as never);

        const result = await hrDocumentsRepository.upload(file, {
            orchardId: 'o1',
            userId: 'u1',
            documentType: 'work_visa',
            title: 'X',
        });
        expect(fromStorageMock).toHaveBeenCalledWith('hr-documents');
        expect(uploadMock).toHaveBeenCalled();
        expect((result as { id: string }).id).toBe('new-doc');
    });

    it('rollback storage cuando insert falla', async () => {
        const file = new File(['x'], 'x.pdf');
        const removeMock = vi.fn().mockResolvedValue({ error: null });
        vi.spyOn(supabase.storage, 'from').mockReturnValue({
            upload: vi.fn().mockResolvedValue({ error: null }),
            remove: removeMock,
        } as never);

        vi.spyOn(supabase, 'from').mockReturnValue(
            mockChain({ data: null, error: { message: 'rls' } }) as never,
        );

        await expect(
            hrDocumentsRepository.upload(file, {
                orchardId: 'o1',
                userId: 'u1',
                documentType: 'work_visa',
                title: 'X',
            }),
        ).rejects.toBeTruthy();
        expect(removeMock).toHaveBeenCalled();
    });
});

describe('hrDocumentsRepository.softDelete', () => {
    it('update deleted_at + storage.remove (best-effort)', async () => {
        const updateChain = mockChain({ data: null, error: null });
        vi.spyOn(supabase, 'from').mockReturnValue(updateChain as never);
        const removeMock = vi.fn().mockResolvedValue({ error: null });
        vi.spyOn(supabase.storage, 'from').mockReturnValue({
            remove: removeMock,
        } as never);
        await hrDocumentsRepository.softDelete('d1', 'path/to/x.pdf');
        expect(removeMock).toHaveBeenCalledWith(['path/to/x.pdf']);
    });

    it('no propaga error de storage remove', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue(
            mockChain({ data: null, error: null }) as never,
        );
        vi.spyOn(supabase.storage, 'from').mockReturnValue({
            remove: vi.fn().mockRejectedValue(new Error('storage gone')),
        } as never);
        // No throws
        await expect(hrDocumentsRepository.softDelete('d1', 'p')).resolves.toBeUndefined();
    });
});

describe('hrDocumentsRepository.getSignedUrl', () => {
    it('devuelve signed URL', async () => {
        vi.spyOn(supabase.storage, 'from').mockReturnValue({
            createSignedUrl: vi
                .fn()
                .mockResolvedValue({ data: { signedUrl: 'https://signed.url/abc' }, error: null }),
        } as never);
        const url = await hrDocumentsRepository.getSignedUrl('x/y.pdf');
        expect(url).toBe('https://signed.url/abc');
    });

    it('throws on error', async () => {
        vi.spyOn(supabase.storage, 'from').mockReturnValue({
            createSignedUrl: vi.fn().mockResolvedValue({ data: null, error: { message: 'nope' } }),
        } as never);
        await expect(hrDocumentsRepository.getSignedUrl('p')).rejects.toBeTruthy();
    });
});

describe('hrDocumentsRepository.listExpiringSoon', () => {
    it('filtra por expires_at <= cutoff', async () => {
        const chain = mockChain({ data: [{ id: 'd1' }], error: null });
        vi.spyOn(supabase, 'from').mockReturnValue(chain as never);
        const result = await hrDocumentsRepository.listExpiringSoon('o1', 30);
        expect(result).toHaveLength(1);
    });
});
