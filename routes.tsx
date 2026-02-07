/**
 * ROUTES.TSX - Configuración Blindada
 */
import React from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Role } from './types'; // Importamos Role correctamente
import Login from './pages/Login';
import TeamLeader from './pages/TeamLeader';
import Runner from './pages/Runner';
import Manager from './pages/Manager';
import ErrorBoundary from './components/common/ErrorBoundary';

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
        };
        // Lo mandamos a su casa correcta
        return <Navigate to={roleRoutes[currentRole] || '/'} replace />;
    }

    return <Outlet />;
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
        default: return <Navigate to="/login" replace />;
    }
};

export const router = createBrowserRouter([
    { path: '/', element: <RootRedirect /> },
    { path: '/login', element: <Login /> }, // Login se maneja solo
    {
        element: <ProtectedRoute allowedRoles={[Role.MANAGER]} />,
        children: [{ path: '/manager', element: <ErrorBoundary><Manager /></ErrorBoundary> }],
    },
    {
        element: <ProtectedRoute allowedRoles={[Role.TEAM_LEADER]} />,
        children: [{ path: '/team-leader', element: <ErrorBoundary><TeamLeader /></ErrorBoundary> }],
    },
    {
        element: <ProtectedRoute allowedRoles={[Role.RUNNER]} />,
        children: [{ path: '/runner', element: <ErrorBoundary><Runner /></ErrorBoundary> }],
    },
    { path: '*', element: <Navigate to="/" replace /> },
]);

export default router;
