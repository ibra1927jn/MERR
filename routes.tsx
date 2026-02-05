/**
 * ROUTES.TSX - React Router Configuration
 */
import React from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Role } from './types';
import Login from './pages/Login';
import TeamLeader from './pages/TeamLeader';
import Runner from './pages/Runner';
import Manager from './pages/Manager';

// =============================================
// PROTECTED ROUTE WRAPPER
// =============================================
const ProtectedRoute: React.FC<{ allowedRoles?: Role[] }> = ({ allowedRoles }) => {
    const { isAuthenticated, appUser, isLoading } = useAuth();

    // Mapeo de roles de texto (DB) a Enum
    const currentRole = appUser?.role as Role;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#d91e36] to-[#8b0000] flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-white/30 border-t-white mx-auto mb-4"></div>
                    <p className="text-white font-bold text-lg">HarvestPro NZ</p>
                    <p className="text-white/70 text-sm mt-1">Loading...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

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

// =============================================
// AUTO REDIRECT FROM ROOT
// =============================================
const RootRedirect: React.FC = () => {
    const { isAuthenticated, appUser, isLoading } = useAuth();
    const currentRole = appUser?.role as Role;

    if (isLoading) return null;

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    switch (currentRole) {
        case Role.MANAGER: return <Navigate to="/manager" replace />;
        case Role.TEAM_LEADER: return <Navigate to="/team-leader" replace />;
        case Role.RUNNER: return <Navigate to="/runner" replace />;
        default: return <Navigate to="/login" replace />;
    }
};

// =============================================
// LOGIN REDIRECT
// =============================================
const LoginRedirect: React.FC = () => {
    const { isAuthenticated, appUser, isLoading } = useAuth();
    const currentRole = appUser?.role as Role;

    if (isLoading) return <Login />;

    if (isAuthenticated && currentRole) {
        const roleRoutes: Record<string, string> = {
            [Role.MANAGER]: '/manager',
            [Role.TEAM_LEADER]: '/team-leader',
            [Role.RUNNER]: '/runner',
        };
        return <Navigate to={roleRoutes[currentRole] || '/'} replace />;
    }

    return <Login />;
};

export const router = createBrowserRouter([
    { path: '/', element: <RootRedirect /> },
    { path: '/login', element: <LoginRedirect /> },
    {
        element: <ProtectedRoute allowedRoles={[Role.MANAGER]} />,
        children: [{ path: '/manager', element: <Manager /> }],
    },
    {
        element: <ProtectedRoute allowedRoles={[Role.TEAM_LEADER]} />,
        children: [{ path: '/team-leader', element: <TeamLeader /> }],
    },
    {
        element: <ProtectedRoute allowedRoles={[Role.RUNNER]} />,
        children: [{ path: '/runner', element: <Runner /> }],
    },
    { path: '*', element: <Navigate to="/" replace /> },
]);

export default router;
