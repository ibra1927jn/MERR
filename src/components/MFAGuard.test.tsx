/**
 * MFAGuard.test.tsx — Tests para el componente MFAGuard
 *
 * MFA obligatorio para: manager, admin, payroll_admin, hr_admin
 * MFA no requerido para: runner, team_leader, qc_inspector, logistics
 *
 * Escenarios:
 * 1. Usuario no autenticado → renderiza children (sin bloqueo)
 * 2. Rol sin MFA requerido → renderiza children
 * 3. Rol con MFA, factor verificado → renderiza children
 * 4. Rol con MFA, sin factor → muestra pantalla de setup obligatorio
 * 5. Error en checkMFAStatus → fail open (renderiza children)
 * 6. Mientras verifica → spinner "Checking security settings..."
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('../context/AuthContext', () => ({
    useAuth: vi.fn(),
}));

vi.mock('../hooks/useMFA', () => ({
    useMFA: vi.fn(),
}));

vi.mock('./MFASetup', () => ({
    MFASetup: ({ onComplete }: { onComplete: () => void; requireSetup: boolean }) => (
        <div data-testid="mfa-setup-modal">
            <button onClick={onComplete}>Complete MFA</button>
        </div>
    ),
}));

import { useAuth } from '../context/AuthContext';
import { useMFA } from '../hooks/useMFA';
import { MFAGuard } from './MFAGuard';

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockUseMFA = useMFA as ReturnType<typeof vi.fn>;

// ─── Helpers ────────────────────────────────────────────────────────────────

function setupAuth(overrides: Partial<{ isAuthenticated: boolean; currentRole: string }> = {}) {
    mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        currentRole: 'manager',
        ...overrides,
    });
}

function setupMFA(hasVerifiedFactor: boolean, shouldThrow = false) {
    const checkMFAStatus = shouldThrow
        ? vi.fn().mockRejectedValue(new Error('MFA service unavailable'))
        : vi.fn().mockResolvedValue({ hasVerifiedFactor });
    mockUseMFA.mockReturnValue({ checkMFAStatus });
    return checkMFAStatus;
}

const ChildContent = () => <div data-testid="protected-content">Contenido protegido</div>;

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('MFAGuard', () => {
    beforeEach(() => vi.clearAllMocks());

    it('renderiza children directamente si el usuario no está autenticado', async () => {
        setupAuth({ isAuthenticated: false, currentRole: undefined as unknown as string });
        setupMFA(false);

        render(
            <MFAGuard>
                <ChildContent />
            </MFAGuard>
        );

        await waitFor(() => {
            expect(screen.getByTestId('protected-content')).toBeDefined();
        });
        expect(screen.queryByTestId('mfa-setup-modal')).toBeNull();
    });

    it('renderiza children si el rol no requiere MFA (team_leader)', async () => {
        setupAuth({ isAuthenticated: true, currentRole: 'team_leader' });
        setupMFA(false); // no importa el valor — no se llama para roles sin MFA requerido

        render(
            <MFAGuard>
                <ChildContent />
            </MFAGuard>
        );

        await waitFor(() => {
            expect(screen.getByTestId('protected-content')).toBeDefined();
        });
        expect(screen.queryByTestId('mfa-setup-modal')).toBeNull();
    });

    it.each(['runner', 'qc_inspector', 'logistics'])(
        'renderiza children para rol %s sin requerir MFA',
        async (role) => {
            setupAuth({ isAuthenticated: true, currentRole: role });
            setupMFA(false);

            render(
                <MFAGuard>
                    <ChildContent />
                </MFAGuard>
            );

            await waitFor(() => {
                expect(screen.getByTestId('protected-content')).toBeDefined();
            });
        }
    );

    it.each(['admin', 'payroll_admin', 'hr_admin'])(
        'muestra setup MFA para rol privilegiado %s sin MFA configurado',
        async (role) => {
            setupAuth({ isAuthenticated: true, currentRole: role });
            setupMFA(false); // hasVerifiedFactor = false

            render(
                <MFAGuard>
                    <ChildContent />
                </MFAGuard>
            );

            await waitFor(() => {
                expect(screen.getByTestId('mfa-setup-modal')).toBeDefined();
            });
            expect(screen.queryByTestId('protected-content')).toBeNull();
        }
    );

    it.each(['admin', 'payroll_admin', 'hr_admin'])(
        'renderiza children para rol privilegiado %s que ya tiene MFA',
        async (role) => {
            setupAuth({ isAuthenticated: true, currentRole: role });
            setupMFA(true); // hasVerifiedFactor = true

            render(
                <MFAGuard>
                    <ChildContent />
                </MFAGuard>
            );

            await waitFor(() => {
                expect(screen.getByTestId('protected-content')).toBeDefined();
            });
            expect(screen.queryByTestId('mfa-setup-modal')).toBeNull();
        }
    );

    it('muestra el spinner mientras verifica el estado MFA', () => {
        setupAuth({ isAuthenticated: true, currentRole: 'manager' });
        // checkMFAStatus que nunca resuelve durante el test
        mockUseMFA.mockReturnValue({
            checkMFAStatus: vi.fn().mockImplementation(() => new Promise(() => {})),
        });

        render(
            <MFAGuard>
                <ChildContent />
            </MFAGuard>
        );

        expect(screen.getByText('Checking security settings...')).toBeDefined();
        expect(screen.queryByTestId('protected-content')).toBeNull();
        expect(screen.queryByTestId('mfa-setup-modal')).toBeNull();
    });

    it('renderiza children si el manager ya tiene MFA configurado', async () => {
        setupAuth({ isAuthenticated: true, currentRole: 'manager' });
        setupMFA(true); // hasVerifiedFactor = true

        render(
            <MFAGuard>
                <ChildContent />
            </MFAGuard>
        );

        await waitFor(() => {
            expect(screen.getByTestId('protected-content')).toBeDefined();
        });
        expect(screen.queryByTestId('mfa-setup-modal')).toBeNull();
    });

    it('muestra el modal de setup si el manager NO tiene MFA', async () => {
        setupAuth({ isAuthenticated: true, currentRole: 'manager' });
        setupMFA(false); // hasVerifiedFactor = false

        render(
            <MFAGuard>
                <ChildContent />
            </MFAGuard>
        );

        await waitFor(() => {
            expect(screen.getByTestId('mfa-setup-modal')).toBeDefined();
        });
        expect(screen.queryByTestId('protected-content')).toBeNull();
        expect(screen.getByText(/Two-Factor Authentication Required/)).toBeDefined();
    });

    it('fail open: renderiza children si checkMFAStatus lanza un error', async () => {
        setupAuth({ isAuthenticated: true, currentRole: 'manager' });
        setupMFA(false, true); // shouldThrow = true

        render(
            <MFAGuard>
                <ChildContent />
            </MFAGuard>
        );

        await waitFor(() => {
            expect(screen.getByTestId('protected-content')).toBeDefined();
        });
        expect(screen.queryByTestId('mfa-setup-modal')).toBeNull();
    });

    it('llama a checkMFAStatus solo para managers autenticados', async () => {
        setupAuth({ isAuthenticated: true, currentRole: 'manager' });
        const checkMFAStatus = setupMFA(true);

        render(
            <MFAGuard>
                <ChildContent />
            </MFAGuard>
        );

        await waitFor(() => screen.getByTestId('protected-content'));
        expect(checkMFAStatus).toHaveBeenCalledTimes(1);
    });

    it('NO llama a checkMFAStatus para roles que no requieren MFA (runner)', async () => {
        setupAuth({ isAuthenticated: true, currentRole: 'runner' });
        const checkMFAStatus = setupMFA(false);

        render(
            <MFAGuard>
                <ChildContent />
            </MFAGuard>
        );

        await waitFor(() => screen.getByTestId('protected-content'));
        expect(checkMFAStatus).not.toHaveBeenCalled();
    });
});
