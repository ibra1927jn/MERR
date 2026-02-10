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
// import LoadingSpinner from './components/common/LoadingSpinner'; // No longer needed for root flow

const ProtectedRoute: React.FC<{ allowedRoles?: Role[] }> = ({ allowedRoles }) => {
    const { isAuthenticated, appUser, isLoading } = useAuth();
    // Casting seguro del rol
    const currentRole = appUser?.role as Role;

    if (isLoading) {
        return (
            <div style={{ backgroundColor: '#050505', height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#00f0ff', fontFamily: 'monospace' }}>
                <div style={{ border: '2px solid #00f0ff', borderTop: '2px solid transparent', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }}></div>
                <p style={{ marginTop: '20px', letterSpacing: '0.2em' }}>INICIANDO MOTOR DEL TANQUE...</p>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

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
    if (isLoading) return (
        <div style={{ backgroundColor: '#050505', height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#00f0ff', fontFamily: 'monospace' }}>
            <div style={{ border: '3px solid #00f0ff', borderTop: '3px solid transparent', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }}></div>
            <p style={{ marginTop: '20px', letterSpacing: '0.2em', fontSize: '12px' }}>INICIANDO MOTOR DEL TANQUE...</p>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
    );
    if (!isAuthenticated) return <Navigate to="/login" replace />;

    const currentRole = appUser?.role as Role;
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
