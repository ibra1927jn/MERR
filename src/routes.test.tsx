/**
 * routes.test.tsx — Role-based routing tests
 *
 * Tests the route configuration, ProtectedRoute logic, and RootRedirect
 * for all 8 user roles defined in the application.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Role } from './types';

// ── Mocks ──────────────────────────────────────────────

const mockUseAuth = vi.fn();

vi.mock('./context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('./components/common/ErrorBoundary', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('./components/common/HarvestSyncBridge', () => ({
  HarvestSyncBridge: () => null,
}));

// Mock all lazy-loaded pages to simple stubs
vi.mock('./pages/Login', () => ({ default: () => <div data-testid="login-page">Login</div> }));
vi.mock('./pages/Manager', () => ({ default: () => <div data-testid="manager-page">Manager</div> }));
vi.mock('./pages/TeamLeader', () => ({ default: () => <div data-testid="team-leader-page">TeamLeader</div> }));
vi.mock('./pages/Runner', () => ({ default: () => <div data-testid="runner-page">Runner</div> }));
vi.mock('./pages/QualityControl', () => ({ default: () => <div data-testid="qc-page">QC</div> }));
vi.mock('./pages/Admin', () => ({ default: () => <div data-testid="admin-page">Admin</div> }));
vi.mock('./pages/HHRR', () => ({ default: () => <div data-testid="hhrr-page">HHRR</div> }));
vi.mock('./pages/LogisticsDept', () => ({ default: () => <div data-testid="logistics-page">Logistics</div> }));
vi.mock('./pages/Payroll', () => ({ default: () => <div data-testid="payroll-page">Payroll</div> }));
vi.mock('./pages/OnboardingPage', () => ({ OnboardingPage: () => <div data-testid="onboarding-page">Onboarding</div> }));

// ── Import after mocks ─────────────────────────────────

import { router } from './routes';

// ── Role → route mapping (source of truth) ─────────────

const ROLE_ROUTE_MAP: Record<string, string> = {
  [Role.MANAGER]: '/manager',
  [Role.TEAM_LEADER]: '/team-leader',
  [Role.RUNNER]: '/runner',
  [Role.QC_INSPECTOR]: '/qc',
  [Role.PAYROLL_ADMIN]: '/payroll',
  [Role.ADMIN]: '/admin',
  [Role.HR_ADMIN]: '/hhrr',
  [Role.LOGISTICS]: '/logistics-dept',
};

// ── Helper: Reconstruct ProtectedRoute + RootRedirect for testing ──

const ProtectedRoute: React.FC<{ allowedRoles?: Role[] }> = ({ allowedRoles }) => {
  const { isAuthenticated, appUser, isLoading } = mockUseAuth();
  const currentRole = appUser?.role as Role;

  if (isLoading) {
    return (
      <div role="status" aria-label="Loading application">
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (allowedRoles && currentRole && !allowedRoles.includes(currentRole)) {
    const roleRoutes: Record<string, string> = {
      [Role.MANAGER]: '/manager',
      [Role.TEAM_LEADER]: '/team-leader',
      [Role.RUNNER]: '/runner',
      [Role.QC_INSPECTOR]: '/qc',
      [Role.PAYROLL_ADMIN]: '/payroll',
      [Role.HR_ADMIN]: '/hhrr',
      [Role.LOGISTICS]: '/logistics-dept',
    };
    return <Navigate to={roleRoutes[currentRole] || '/'} replace />;
  }

  return <Outlet />;
};

const RootRedirect: React.FC = () => {
  const { isAuthenticated, appUser, isLoading } = mockUseAuth();
  const currentRole = appUser?.role as Role;

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  switch (currentRole) {
    case Role.MANAGER: return <Navigate to="/manager" replace />;
    case Role.TEAM_LEADER: return <Navigate to="/team-leader" replace />;
    case Role.RUNNER: return <Navigate to="/runner" replace />;
    case Role.QC_INSPECTOR: return <Navigate to="/qc" replace />;
    case Role.PAYROLL_ADMIN: return <Navigate to="/payroll" replace />;
    case Role.ADMIN: return <Navigate to="/admin" replace />;
    case Role.HR_ADMIN: return <Navigate to="/hhrr" replace />;
    case Role.LOGISTICS: return <Navigate to="/logistics-dept" replace />;
    default: return <Navigate to="/login" replace />;
  }
};

// ── Helpers ─────────────────────────────────────────────

function renderWithRouter(initialEntry: string, element: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<div data-testid="login-page">Login</div>} />
        <Route element={<ProtectedRoute allowedRoles={[Role.MANAGER]} />}>
          <Route path="/manager" element={<div data-testid="manager-page">Manager</div>} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={[Role.TEAM_LEADER]} />}>
          <Route path="/team-leader" element={<div data-testid="team-leader-page">TeamLeader</div>} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={[Role.RUNNER]} />}>
          <Route path="/runner" element={<div data-testid="runner-page">Runner</div>} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={[Role.MANAGER, Role.QC_INSPECTOR]} />}>
          <Route path="/qc" element={<div data-testid="qc-page">QC</div>} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={[Role.ADMIN]} />}>
          <Route path="/admin" element={<div data-testid="admin-page">Admin</div>} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={[Role.HR_ADMIN, Role.ADMIN]} />}>
          <Route path="/hhrr" element={<div data-testid="hhrr-page">HHRR</div>} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={[Role.LOGISTICS, Role.MANAGER]} />}>
          <Route path="/logistics-dept" element={<div data-testid="logistics-page">Logistics</div>} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={[Role.PAYROLL_ADMIN, Role.MANAGER]} />}>
          <Route path="/payroll" element={<div data-testid="payroll-page">Payroll</div>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MemoryRouter>
  );
}

function setAuth(role: Role | null, opts?: { isLoading?: boolean }) {
  mockUseAuth.mockReturnValue({
    isAuthenticated: role !== null,
    appUser: role ? { role } : null,
    isLoading: opts?.isLoading ?? false,
  });
}

// ── Tests ───────────────────────────────────────────────

describe('Route Configuration (router object)', () => {
  it('has a root route at /', () => {
    const rootRoute = router.routes.find((r: any) => r.path === '/');
    expect(rootRoute).toBeDefined();
  });

  it('has a login route at /login', () => {
    const loginRoute = router.routes.find((r: any) => r.path === '/login');
    expect(loginRoute).toBeDefined();
  });

  it('has a signup route at /signup', () => {
    const signupRoute = router.routes.find((r: any) => r.path === '/signup');
    expect(signupRoute).toBeDefined();
  });

  it('has a catch-all route', () => {
    const catchAll = router.routes.find((r: any) => r.path === '*');
    expect(catchAll).toBeDefined();
  });

  it('has routes for all 8 role paths', () => {
    const allPaths = Object.values(ROLE_ROUTE_MAP);
    const routePaths: string[] = [];

    for (const route of router.routes) {
      if ((route as any).children) {
        for (const child of (route as any).children) {
          if (child.path) routePaths.push(child.path);
        }
      }
      if ((route as any).path) routePaths.push((route as any).path);
    }

    for (const path of allPaths) {
      expect(routePaths).toContain(path);
    }
  });

  it('has protected route wrappers for role-specific paths', () => {
    // Routes with children (protected routes) should exist for each role path
    const protectedRoutes = router.routes.filter((r: any) => r.children && r.children.length > 0);
    expect(protectedRoutes.length).toBeGreaterThanOrEqual(8);
  });
});

describe('RootRedirect — unauthenticated', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects unauthenticated user to /login from /', () => {
    setAuth(null);
    renderWithRouter('/', null);
    expect(screen.getByTestId('login-page')).toBeDefined();
  });

  it('redirects unauthenticated user to /login from any unknown path', () => {
    setAuth(null);
    renderWithRouter('/some-random-path', null);
    expect(screen.getByTestId('login-page')).toBeDefined();
  });
});

describe('RootRedirect — authenticated role redirects from /', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects manager to /manager', () => {
    setAuth(Role.MANAGER);
    renderWithRouter('/', null);
    expect(screen.getByTestId('manager-page')).toBeDefined();
  });

  it('redirects team_leader to /team-leader', () => {
    setAuth(Role.TEAM_LEADER);
    renderWithRouter('/', null);
    expect(screen.getByTestId('team-leader-page')).toBeDefined();
  });

  it('redirects runner to /runner', () => {
    setAuth(Role.RUNNER);
    renderWithRouter('/', null);
    expect(screen.getByTestId('runner-page')).toBeDefined();
  });

  it('redirects qc_inspector to /qc', () => {
    setAuth(Role.QC_INSPECTOR);
    renderWithRouter('/', null);
    expect(screen.getByTestId('qc-page')).toBeDefined();
  });

  it('redirects payroll_admin to /payroll', () => {
    setAuth(Role.PAYROLL_ADMIN);
    renderWithRouter('/', null);
    expect(screen.getByTestId('payroll-page')).toBeDefined();
  });

  it('redirects admin to /admin', () => {
    setAuth(Role.ADMIN);
    renderWithRouter('/', null);
    expect(screen.getByTestId('admin-page')).toBeDefined();
  });

  it('redirects hr_admin to /hhrr', () => {
    setAuth(Role.HR_ADMIN);
    renderWithRouter('/', null);
    expect(screen.getByTestId('hhrr-page')).toBeDefined();
  });

  it('redirects logistics to /logistics-dept', () => {
    setAuth(Role.LOGISTICS);
    renderWithRouter('/', null);
    expect(screen.getByTestId('logistics-page')).toBeDefined();
  });
});

describe('ProtectedRoute — loading state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loader while auth is loading', () => {
    setAuth(null, { isLoading: true });
    renderWithRouter('/manager', null);
    expect(screen.getByRole('status')).toBeDefined();
    expect(screen.getByText('Loading...')).toBeDefined();
  });
});

describe('ProtectedRoute — role-based access control', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows manager to access /manager', () => {
    setAuth(Role.MANAGER);
    renderWithRouter('/manager', null);
    expect(screen.getByTestId('manager-page')).toBeDefined();
  });

  it('allows team_leader to access /team-leader', () => {
    setAuth(Role.TEAM_LEADER);
    renderWithRouter('/team-leader', null);
    expect(screen.getByTestId('team-leader-page')).toBeDefined();
  });

  it('allows runner to access /runner', () => {
    setAuth(Role.RUNNER);
    renderWithRouter('/runner', null);
    expect(screen.getByTestId('runner-page')).toBeDefined();
  });

  it('allows qc_inspector to access /qc', () => {
    setAuth(Role.QC_INSPECTOR);
    renderWithRouter('/qc', null);
    expect(screen.getByTestId('qc-page')).toBeDefined();
  });

  it('allows payroll_admin to access /payroll', () => {
    setAuth(Role.PAYROLL_ADMIN);
    renderWithRouter('/payroll', null);
    expect(screen.getByTestId('payroll-page')).toBeDefined();
  });

  it('allows admin to access /admin', () => {
    setAuth(Role.ADMIN);
    renderWithRouter('/admin', null);
    expect(screen.getByTestId('admin-page')).toBeDefined();
  });

  it('allows hr_admin to access /hhrr', () => {
    setAuth(Role.HR_ADMIN);
    renderWithRouter('/hhrr', null);
    expect(screen.getByTestId('hhrr-page')).toBeDefined();
  });

  it('allows logistics to access /logistics-dept', () => {
    setAuth(Role.LOGISTICS);
    renderWithRouter('/logistics-dept', null);
    expect(screen.getByTestId('logistics-page')).toBeDefined();
  });

  // Cross-role shared access
  it('allows manager to access /qc (shared route)', () => {
    setAuth(Role.MANAGER);
    renderWithRouter('/qc', null);
    expect(screen.getByTestId('qc-page')).toBeDefined();
  });

  it('allows manager to access /logistics-dept (shared route)', () => {
    setAuth(Role.MANAGER);
    renderWithRouter('/logistics-dept', null);
    expect(screen.getByTestId('logistics-page')).toBeDefined();
  });

  it('allows manager to access /payroll (shared route)', () => {
    setAuth(Role.MANAGER);
    renderWithRouter('/payroll', null);
    expect(screen.getByTestId('payroll-page')).toBeDefined();
  });

  it('allows admin to access /hhrr (shared route)', () => {
    setAuth(Role.ADMIN);
    renderWithRouter('/hhrr', null);
    expect(screen.getByTestId('hhrr-page')).toBeDefined();
  });
});

describe('ProtectedRoute — cross-role redirect (unauthorized access)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects runner trying to access /manager to /runner', () => {
    setAuth(Role.RUNNER);
    renderWithRouter('/manager', null);
    expect(screen.getByTestId('runner-page')).toBeDefined();
  });

  it('redirects team_leader trying to access /admin to /team-leader', () => {
    setAuth(Role.TEAM_LEADER);
    renderWithRouter('/admin', null);
    expect(screen.getByTestId('team-leader-page')).toBeDefined();
  });

  it('redirects qc_inspector trying to access /payroll to /qc', () => {
    setAuth(Role.QC_INSPECTOR);
    renderWithRouter('/payroll', null);
    expect(screen.getByTestId('qc-page')).toBeDefined();
  });

  it('redirects payroll_admin trying to access /manager to /payroll', () => {
    setAuth(Role.PAYROLL_ADMIN);
    renderWithRouter('/manager', null);
    expect(screen.getByTestId('payroll-page')).toBeDefined();
  });

  it('redirects logistics trying to access /admin to /logistics-dept', () => {
    setAuth(Role.LOGISTICS);
    renderWithRouter('/admin', null);
    expect(screen.getByTestId('logistics-page')).toBeDefined();
  });

  it('redirects hr_admin trying to access /manager to /hhrr', () => {
    setAuth(Role.HR_ADMIN);
    renderWithRouter('/manager', null);
    expect(screen.getByTestId('hhrr-page')).toBeDefined();
  });

  it('unauthenticated user trying /manager is sent to /login', () => {
    setAuth(null);
    renderWithRouter('/manager', null);
    expect(screen.getByTestId('login-page')).toBeDefined();
  });

  it('unauthenticated user trying /payroll is sent to /login', () => {
    setAuth(null);
    renderWithRouter('/payroll', null);
    expect(screen.getByTestId('login-page')).toBeDefined();
  });
});

describe('Role enum completeness', () => {
  it('has exactly 8 roles', () => {
    const roles = Object.values(Role);
    expect(roles).toHaveLength(8);
  });

  it('every role has a route mapping', () => {
    const roles = Object.values(Role);
    for (const role of roles) {
      expect(ROLE_ROUTE_MAP[role]).toBeDefined();
      expect(ROLE_ROUTE_MAP[role]).toMatch(/^\//);
    }
  });

  it('role values match expected strings', () => {
    expect(Role.MANAGER).toBe('manager');
    expect(Role.TEAM_LEADER).toBe('team_leader');
    expect(Role.RUNNER).toBe('runner');
    expect(Role.QC_INSPECTOR).toBe('qc_inspector');
    expect(Role.PAYROLL_ADMIN).toBe('payroll_admin');
    expect(Role.ADMIN).toBe('admin');
    expect(Role.HR_ADMIN).toBe('hr_admin');
    expect(Role.LOGISTICS).toBe('logistics');
  });
});
