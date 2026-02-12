/* eslint-disable react-refresh/only-export-components */
/**
 * ROUTES.TSX - Configuración Blindada + Code Splitting
 */
import React, { Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Role } from './types';
import ErrorBoundary from './components/common/ErrorBoundary';
import { HarvestSyncBridge } from './components/common/HarvestSyncBridge';

// ── Lazy-loaded pages (code splitting) ─────────
const Login = React.lazy(() => import('./pages/Login'));
const TeamLeader = React.lazy(() => import('./pages/TeamLeader'));
const Runner = React.lazy(() => import('./pages/Runner'));
const Manager = React.lazy(() => import('./pages/Manager'));
const QualityControl = React.lazy(() => import('./pages/QualityControl'));

// ── Loading fallback ───────────────────────────
const PageLoader = () => (
    <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
            <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500 text-sm font-medium">Loading...</p>
        </div>
    </div>
);

const ProtectedRoute: React.FC<{ allowedRoles?: Role[] }> = ({ allowedRoles }) => {
    const { isAuthenticated, appUser, isLoading } = useAuth();
    // Casting seguro del rol
    const currentRole = appUser?.role as Role;

    if (isLoading) return <div className="h-screen flex items-center justify-center">Loading...</div>;

    if (!isAuthenticated) return <Navigate to="/login" replace />;

    // Si tiene rol pero intenta entrar donde no debe (Seguridad entre departamentos)
    if (allowedRoles && currentRole && !allowedRoles.includes(currentRole)) {
        const roleRoutes: Record<string, string> = {
            [Role.MANAGER]: '/manager',
            [Role.TEAM_LEADER]: '/team-leader',
            [Role.RUNNER]: '/runner',
            [Role.QC_INSPECTOR]: '/qc',
            [Role.PAYROLL_ADMIN]: '/manager', // Payroll admin shares manager dashboard for now
        };
        // Lo mandamos a su casa correcta
        return <Navigate to={roleRoutes[currentRole] || '/'} replace />;
    }

    return (
        <>
            <HarvestSyncBridge />
            <Outlet />
        </>
    );
};

// Redirección inteligente para la raíz "/"
const RootRedirect: React.FC = () => {
    const { isAuthenticated, appUser, isLoading } = useAuth();
    const currentRole = appUser?.role as Role;

    if (isLoading) return null;
    if (!isAuthenticated) return <Navigate to="/login" replace />;

    // Mapa de redirección automática
    switch (currentRole) {
        case Role.MANAGER: return <Navigate to="/manager" replace />;
        case Role.TEAM_LEADER: return <Navigate to="/team-leader" replace />;
        case Role.RUNNER: return <Navigate to="/runner" replace />;
        case Role.QC_INSPECTOR: return <Navigate to="/qc" replace />;
        case Role.PAYROLL_ADMIN: return <Navigate to="/manager" replace />;
        default: return <Navigate to="/login" replace />;
    }
};

export const router = createBrowserRouter([
    { path: '/', element: <RootRedirect /> },
    { path: '/login', element: <Suspense fallback={<PageLoader />}><Login /></Suspense> },
    {
        element: <ProtectedRoute allowedRoles={[Role.MANAGER]} />,
        children: [{ path: '/manager', element: <ErrorBoundary><Suspense fallback={<PageLoader />}><Manager /></Suspense></ErrorBoundary> }],
    },
    {
        element: <ProtectedRoute allowedRoles={[Role.TEAM_LEADER]} />,
        children: [{ path: '/team-leader', element: <ErrorBoundary><Suspense fallback={<PageLoader />}><TeamLeader /></Suspense></ErrorBoundary> }],
    },
    {
        element: <ProtectedRoute allowedRoles={[Role.RUNNER]} />,
        children: [{ path: '/runner', element: <ErrorBoundary><Suspense fallback={<PageLoader />}><Runner /></Suspense></ErrorBoundary> }],
    },
    {
        element: <ProtectedRoute allowedRoles={[Role.MANAGER, Role.QC_INSPECTOR]} />,
        children: [{ path: '/qc', element: <ErrorBoundary><Suspense fallback={<PageLoader />}><QualityControl /></Suspense></ErrorBoundary> }],
    },
    { path: '*', element: <Navigate to="/" replace /> },
]);

export default router;

