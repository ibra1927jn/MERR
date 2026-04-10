/**
 * routes.test.tsx — Tests para ProtectedRoute y RootRedirect
 *
 * Verifica:
 * - ProtectedRoute: redirige si no autenticado, redirige si rol equivocado,
 *   renderiza children si rol correcto
 * - RootRedirect: cada rol llega a su ruta correcta, sin auth → /login
 *
 * Estrategia: mockear useAuth + MemoryRouter para simular navegación.
 * No se testea el router completo (createBrowserRouter) porque requiere
 * DOM completo — se testean los componentes de lógica directamente.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Role } from './types';

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('./context/AuthContext', () => ({
    useAuth: vi.fn(),
}));

vi.mock('./components/common/HarvestSyncBridge', () => ({
    HarvestSyncBridge: () => null,
}));

vi.mock('./components/common/ErrorBoundary', () => ({
    default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { useAuth } from './context/AuthContext';
import { ProtectedRoute, RootRedirect } from './routes';

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

// ─── Helpers ────────────────────────────────────────────────────────────────

function mockAuth(overrides: Partial<{
    isAuthenticated: boolean;
    isLoading: boolean;
    appUser: { role: string } | null;
}> = {}) {
    mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        appUser: null,
        currentRole: null,
        ...overrides,
    });
}

// Componente hijo de prueba
const ChildPage = () => <div data-testid="child-page">Página protegida</div>;

// ─── ProtectedRoute ──────────────────────────────────────────────────────────

describe('ProtectedRoute', () => {
    beforeEach(() => vi.clearAllMocks());

    it('redirige a /login si el usuario no está autenticado', () => {
        mockAuth({ isAuthenticated: false });

        render(
            <MemoryRouter initialEntries={['/manager']}>
                <Routes>
                    <Route element={<ProtectedRoute allowedRoles={[Role.MANAGER]} />}>
                        <Route path="/manager" element={<ChildPage />} />
                    </Route>
                    <Route path="/login" element={<div data-testid="login-page">Login</div>} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByTestId('login-page')).toBeDefined();
        expect(screen.queryByTestId('child-page')).toBeNull();
    });

    it('muestra el loader mientras isLoading=true', () => {
        mockAuth({ isAuthenticated: false, isLoading: true });

        render(
            <MemoryRouter initialEntries={['/manager']}>
                <Routes>
                    <Route element={<ProtectedRoute allowedRoles={[Role.MANAGER]} />}>
                        <Route path="/manager" element={<ChildPage />} />
                    </Route>
                </Routes>
            </MemoryRouter>
        );

        expect(screen.queryByTestId('child-page')).toBeNull();
        expect(screen.queryByTestId('login-page')).toBeNull();
    });

    it('renderiza children si el rol es correcto', () => {
        mockAuth({
            isAuthenticated: true,
            appUser: { role: Role.MANAGER },
        });

        render(
            <MemoryRouter initialEntries={['/manager']}>
                <Routes>
                    <Route element={<ProtectedRoute allowedRoles={[Role.MANAGER]} />}>
                        <Route path="/manager" element={<ChildPage />} />
                    </Route>
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByTestId('child-page')).toBeDefined();
    });

    it('renderiza children si no se especifican allowedRoles (ruta sin restricción)', () => {
        mockAuth({ isAuthenticated: true, appUser: { role: Role.RUNNER } });

        render(
            <MemoryRouter initialEntries={['/open']}>
                <Routes>
                    <Route element={<ProtectedRoute />}>
                        <Route path="/open" element={<ChildPage />} />
                    </Route>
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByTestId('child-page')).toBeDefined();
    });

    it('redirige al dashboard del rol si intenta acceder a ruta de otro rol', () => {
        // Runner intentando acceder a /manager
        mockAuth({
            isAuthenticated: true,
            appUser: { role: Role.RUNNER },
        });

        render(
            <MemoryRouter initialEntries={['/manager']}>
                <Routes>
                    <Route element={<ProtectedRoute allowedRoles={[Role.MANAGER]} />}>
                        <Route path="/manager" element={<ChildPage />} />
                    </Route>
                    <Route path="/runner" element={<div data-testid="runner-page">Runner</div>} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.queryByTestId('child-page')).toBeNull();
        expect(screen.getByTestId('runner-page')).toBeDefined();
    });
});

// ─── RootRedirect ────────────────────────────────────────────────────────────

describe('RootRedirect', () => {
    beforeEach(() => vi.clearAllMocks());

    it('redirige a /login si no está autenticado', () => {
        mockAuth({ isAuthenticated: false });

        render(
            <MemoryRouter initialEntries={['/']}>
                <Routes>
                    <Route path="/" element={<RootRedirect />} />
                    <Route path="/login" element={<div data-testid="login-page">Login</div>} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByTestId('login-page')).toBeDefined();
    });

    it('no renderiza nada mientras isLoading=true', () => {
        mockAuth({ isLoading: true, isAuthenticated: false });

        const { container } = render(
            <MemoryRouter initialEntries={['/']}>
                <Routes>
                    <Route path="/" element={<RootRedirect />} />
                </Routes>
            </MemoryRouter>
        );

        expect(container.firstChild).toBeNull();
    });

    const roleRouteMap: [Role, string, string][] = [
        [Role.MANAGER, '/manager', 'manager-page'],
        [Role.TEAM_LEADER, '/team-leader', 'team-leader-page'],
        [Role.RUNNER, '/runner', 'runner-page'],
        [Role.QC_INSPECTOR, '/qc', 'qc-page'],
        [Role.PAYROLL_ADMIN, '/payroll', 'payroll-page'],
        [Role.ADMIN, '/admin', 'admin-page'],
        [Role.HR_ADMIN, '/hhrr', 'hhrr-page'],
        [Role.LOGISTICS, '/logistics-dept', 'logistics-page'],
    ];

    it.each(roleRouteMap)(
        'redirige el rol %s a %s',
        (role, path, testId) => {
            mockAuth({ isAuthenticated: true, appUser: { role } });

            render(
                <MemoryRouter initialEntries={['/']}>
                    <Routes>
                        <Route path="/" element={<RootRedirect />} />
                        <Route path={path} element={<div data-testid={testId}>{role}</div>} />
                    </Routes>
                </MemoryRouter>
            );

            expect(screen.getByTestId(testId)).toBeDefined();
        }
    );

    it('redirige a /login si el rol es desconocido', () => {
        mockAuth({ isAuthenticated: true, appUser: { role: 'unknown_role' } });

        render(
            <MemoryRouter initialEntries={['/']}>
                <Routes>
                    <Route path="/" element={<RootRedirect />} />
                    <Route path="/login" element={<div data-testid="login-page">Login</div>} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByTestId('login-page')).toBeDefined();
    });
});
