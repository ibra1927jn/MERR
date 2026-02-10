/**
 * ROUTES.TSX - Protocolo de Rescate MERR
 */
import React from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Role } from './types';
import Login from './pages/Login';
import TeamLeader from './pages/TeamLeader';
import Runner from './pages/Runner';
import Manager from './pages/Manager';
import ErrorBoundary from './components/common/ErrorBoundary';

const LoadingScreen = () => (
    <div id="loading-screen" style={{ backgroundColor: '#050505', height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#00f0ff', fontFamily: 'monospace' }}>
        <div style={{ border: '3px solid #00f0ff', borderTop: '3px solid transparent', borderRadius: '50%', width: '50px', height: '50px', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ marginTop: '20px', letterSpacing: '0.3em', fontSize: '12px' }}>INICIANDO MOTOR DEL TANQUE...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
);

const ProtectedRoute: React.FC<{ allowedRoles?: Role[] }> = ({ allowedRoles }) => {
    const { isAuthenticated, appUser, isLoading } = useAuth();
    const currentRole = appUser?.role as Role;

    if (isLoading) return <LoadingScreen />;
    if (!isAuthenticated) return <Navigate to="/login" replace />;

    if (allowedRoles && currentRole && !allowedRoles.includes(currentRole)) {
        const roleRoutes: Record<string, string> = {
            [Role.MANAGER]: '/manager',
            [Role.TEAM_LEADER]: '/team-leader',
            [Role.RUNNER]: '/runner',
        };
        return <Navigate to={roleRoutes[currentRole] || '/'} replace />;
    }
    return <Outlet />;
};

const RootRedirect: React.FC = () => {
    const { isAuthenticated, appUser, isLoading } = useAuth();
    if (isLoading) return <LoadingScreen />;
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
    { path: '/login', element: <Login /> },
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

