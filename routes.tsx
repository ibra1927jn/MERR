/**
 * ROUTES.TSX - React Router Configuration
 * 
 * Defines application routes and role-based navigation.
 */
import React from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { useHarvest, Role } from './context/HarvestContext';
import Login from './pages/Login';
import TeamLeader from './pages/TeamLeader';
import Runner from './pages/Runner';
import Manager from './pages/Manager';

// =============================================
// PROTECTED ROUTE WRAPPER
// =============================================
const ProtectedRoute: React.FC<{ allowedRoles?: Role[] }> = ({ allowedRoles }) => {
    const { isSetupComplete, currentRole, isLoading } = useHarvest();

    // Show loading while checking auth
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

    // Not authenticated -> redirect to login
    if (!isSetupComplete) {
        return <Navigate to="/login" replace />;
    }

    // Check role access if specified
    if (allowedRoles && currentRole && !allowedRoles.includes(currentRole)) {
        // Redirect to appropriate dashboard based on role
        const roleRoutes: Record<Role, string> = {
            [Role.MANAGER]: '/manager',
            [Role.TEAM_LEADER]: '/team-leader',
            [Role.RUNNER]: '/runner',
        };
        return <Navigate to={roleRoutes[currentRole]} replace />;
    }

    return <Outlet />;
};

// =============================================
// AUTO REDIRECT FROM ROOT
// =============================================
const RootRedirect: React.FC = () => {
    const { isSetupComplete, currentRole, isLoading } = useHarvest();

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

    if (!isSetupComplete) {
        return <Navigate to="/login" replace />;
    }

    // Redirect based on role
    switch (currentRole) {
        case Role.MANAGER:
            return <Navigate to="/manager" replace />;
        case Role.TEAM_LEADER:
            return <Navigate to="/team-leader" replace />;
        case Role.RUNNER:
            return <Navigate to="/runner" replace />;
        default:
            return <Navigate to="/login" replace />;
    }
};

// =============================================
// LOGIN REDIRECT (if already logged in)
// =============================================
const LoginRedirect: React.FC = () => {
    const { isSetupComplete, currentRole, isLoading } = useHarvest();

    if (isLoading) {
        return <Login />;
    }

    if (isSetupComplete && currentRole) {
        const roleRoutes: Record<Role, string> = {
            [Role.MANAGER]: '/manager',
            [Role.TEAM_LEADER]: '/team-leader',
            [Role.RUNNER]: '/runner',
        };
        return <Navigate to={roleRoutes[currentRole]} replace />;
    }

    return <Login />;
};

// =============================================
// ROUTER CONFIGURATION
// =============================================
export const router = createBrowserRouter([
    {
        path: '/',
        element: <RootRedirect />,
    },
    {
        path: '/login',
        element: <LoginRedirect />,
    },
    {
        element: <ProtectedRoute allowedRoles={[Role.MANAGER]} />,
        children: [
            { path: '/manager', element: <Manager /> },
        ],
    },
    {
        element: <ProtectedRoute allowedRoles={[Role.TEAM_LEADER]} />,
        children: [
            { path: '/team-leader', element: <TeamLeader /> },
        ],
    },
    {
        element: <ProtectedRoute allowedRoles={[Role.RUNNER]} />,
        children: [
            { path: '/runner', element: <Runner /> },
        ],
    },
    {
        // Catch-all redirect
        path: '*',
        element: <Navigate to="/" replace />,
    },
]);

export default router;
