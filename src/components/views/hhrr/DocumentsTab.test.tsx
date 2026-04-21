/**
 * DocumentsTab — tests post-implementación (live, no stub).
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import DocumentsTab from './DocumentsTab';
import { hrDocumentsRepository } from '@/repositories/hr-documents.repository';
import { useHarvestStore } from '@/stores/useHarvestStore';

vi.mock('@/stores/useHarvestStore', () => ({
    useHarvestStore: vi.fn(),
}));

beforeEach(() => {
    vi.restoreAllMocks();
    (useHarvestStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        (sel: (s: unknown) => unknown) => sel({ orchard: { id: 'orchard-1', name: 'Farm A' } }),
    );
});

afterEach(() => vi.restoreAllMocks());

describe('DocumentsTab', () => {
    it('muestra empty state cuando no hay docs', async () => {
        vi.spyOn(hrDocumentsRepository, 'listByOrchard').mockResolvedValue([]);
        render(<DocumentsTab />);
        await waitFor(() => expect(screen.getByTestId('hr-docs-empty')).toBeInTheDocument());
    });

    it('lista docs cuando hay datos', async () => {
        vi.spyOn(hrDocumentsRepository, 'listByOrchard').mockResolvedValue([
            {
                id: 'd1',
                orchard_id: 'orchard-1',
                picker_id: null,
                user_id: null,
                document_type: 'work_visa',
                title: 'Visa Juan',
                storage_path: 'orchard-1/work_visa/xxx.pdf',
                file_size_bytes: 1024 * 200,
                mime_type: 'application/pdf',
                expires_at: null,
                notes: null,
                uploaded_by: null,
                uploaded_at: '2026-04-18T10:00:00Z',
                deleted_at: null,
            },
        ]);
        render(<DocumentsTab />);
        await waitFor(() => expect(screen.getByTestId('hr-doc-d1')).toBeInTheDocument());
        expect(screen.getByText('Visa Juan')).toBeInTheDocument();
        expect(screen.getByText(/Work Visa/)).toBeInTheDocument();
    });

    it('badge "Vencido" cuando expires_at < today', async () => {
        const past = new Date(Date.now() - 10 * 24 * 3600_000).toISOString().slice(0, 10);
        vi.spyOn(hrDocumentsRepository, 'listByOrchard').mockResolvedValue([
            {
                id: 'd1', orchard_id: 'orchard-1', picker_id: null, user_id: null,
                document_type: 'passport', title: 'Passport X', storage_path: 'x',
                file_size_bytes: 100, mime_type: 'image/jpeg',
                expires_at: past, notes: null, uploaded_by: null,
                uploaded_at: '2026-04-18T00:00:00Z', deleted_at: null,
            },
        ]);
        render(<DocumentsTab />);
        await waitFor(() => expect(screen.getByText(/Vencido/)).toBeInTheDocument());
    });

    it('badge amarillo "Expira en" cuando < 60 días', async () => {
        const soon = new Date(Date.now() + 30 * 24 * 3600_000).toISOString().slice(0, 10);
        vi.spyOn(hrDocumentsRepository, 'listByOrchard').mockResolvedValue([
            {
                id: 'd1', orchard_id: 'orchard-1', picker_id: null, user_id: null,
                document_type: 'work_visa', title: 'Visa soon', storage_path: 'x',
                file_size_bytes: 100, mime_type: 'application/pdf',
                expires_at: soon, notes: null, uploaded_by: null,
                uploaded_at: '2026-04-18T00:00:00Z', deleted_at: null,
            },
        ]);
        render(<DocumentsTab />);
        await waitFor(() => expect(screen.getByText(/Expira en/)).toBeInTheDocument());
    });

    it('click upload-btn abre modal', async () => {
        vi.spyOn(hrDocumentsRepository, 'listByOrchard').mockResolvedValue([]);
        render(<DocumentsTab />);
        await waitFor(() => expect(screen.getByTestId('hr-docs-upload-btn')).toBeInTheDocument());
        fireEvent.click(screen.getByTestId('hr-docs-upload-btn'));
        expect(screen.getByTestId('upload-submit')).toBeInTheDocument();
    });

    it('muestra banner cuando no hay orchardId', async () => {
        (useHarvestStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
            (sel: (s: unknown) => unknown) => sel({ orchard: null }),
        );
        render(<DocumentsTab />);
        expect(screen.getByText(/Selecciona un orchard/)).toBeInTheDocument();
    });

    it('muestra error inline cuando list falla', async () => {
        vi.spyOn(hrDocumentsRepository, 'listByOrchard').mockRejectedValue(new Error('rls denied'));
        render(<DocumentsTab />);
        await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/rls denied/));
    });
});
