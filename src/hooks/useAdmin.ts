/**
 * useAdmin — Data loading for the Admin page
 *
 * Extracts data fetching and user management actions from Admin.tsx
 * following the usePayroll pattern.
 */
import { useState, useEffect, useCallback } from 'react';
import { adminService, OrchardOverview, UserRecord } from '@/services/admin.service';
import { logger } from '@/utils/logger';

export interface UseAdminResult {
    orchards: OrchardOverview[];
    users: UserRecord[];
    userSearch: string;
    roleFilter: string;
    isLoading: boolean;
    activeUsers: number;
    /** 🔧 Sprint B: Real compliance rate calculated from data (replaces hardcoded '98%') */
    complianceRate: string;
    setUserSearch: (search: string) => void;
    setRoleFilter: (filter: string) => void;
    handleRoleChange: (userId: string, newRole: string) => Promise<void>;
    handleToggleActive: (user: UserRecord) => Promise<void>;
    reload: () => Promise<void>;
}

export function useAdmin(): UseAdminResult {
    const [orchards, setOrchards] = useState<OrchardOverview[]>([]);
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [userSearch, setUserSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const reload = useCallback(async () => {
        setIsLoading(true);
        try {
            const [orchardData, userData] = await Promise.all([
                adminService.getAllOrchards(),
                adminService.getAllUsers({ role: roleFilter || undefined, search: userSearch || undefined }),
            ]);
            setOrchards(orchardData);
            setUsers(userData);
        } catch (err) {
            logger.warn('[Admin] Failed to load admin data:', err);
        } finally {
            setIsLoading(false);
        }
    }, [roleFilter, userSearch]);

    useEffect(() => {
        reload();
    }, [reload]);

    const handleRoleChange = useCallback(async (userId: string, newRole: string) => {
        const success = await adminService.updateUserRole(userId, newRole);
        if (success) reload();
    }, [reload]);

    const handleToggleActive = useCallback(async (user: UserRecord) => {
        const success = user.is_active
            ? await adminService.deactivateUser(user.id)
            : await adminService.reactivateUser(user.id);
        if (success) reload();
    }, [reload]);

    const activeUsers = users.filter(u => u.is_active).length;

    // 🔧 Sprint B: Real compliance rate (active users / total users)
    const complianceRate = users.length > 0
        ? `${Math.round((activeUsers / users.length) * 100)}%`
        : '—';

    return {
        orchards, users, userSearch, roleFilter, isLoading, activeUsers, complianceRate,
        setUserSearch, setRoleFilter, handleRoleChange, handleToggleActive, reload,
    };
}
