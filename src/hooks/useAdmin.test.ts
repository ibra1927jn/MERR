/**
 * useAdmin Hook Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('@/services/admin.service', () => ({
    adminService: {
        getAllOrchards: vi.fn().mockResolvedValue([
            { id: 'o1', name: 'Orchard A', status: 'active' },
            { id: 'o2', name: 'Orchard B', status: 'active' },
        ]),
        getAllUsers: vi.fn().mockResolvedValue([
            { id: 'u1', email: 'a@b.com', is_active: true, role: 'manager' },
            { id: 'u2', email: 'c@d.com', is_active: true, role: 'runner' },
            { id: 'u3', email: 'e@f.com', is_active: false, role: 'qc_inspector' },
        ]),
        updateUserRole: vi.fn().mockResolvedValue(true),
        deactivateUser: vi.fn().mockResolvedValue(true),
        reactivateUser: vi.fn().mockResolvedValue(true),
    },
}));

vi.mock('@/utils/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { useAdmin } from './useAdmin';
import { adminService } from '@/services/admin.service';

describe('useAdmin', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Re-set defaults after clearAllMocks
        vi.mocked(adminService.getAllOrchards).mockResolvedValue([
            { id: 'o1', name: 'Orchard A', status: 'active' } as any,
            { id: 'o2', name: 'Orchard B', status: 'active' } as any,
        ]);
        vi.mocked(adminService.getAllUsers).mockResolvedValue([
            { id: 'u1', email: 'a@b.com', is_active: true, role: 'manager' } as any,
            { id: 'u2', email: 'c@d.com', is_active: true, role: 'runner' } as any,
            { id: 'u3', email: 'e@f.com', is_active: false, role: 'qc_inspector' } as any,
        ]);
        vi.mocked(adminService.updateUserRole).mockResolvedValue(true);
        vi.mocked(adminService.deactivateUser).mockResolvedValue(true);
        vi.mocked(adminService.reactivateUser).mockResolvedValue(true);
    });

    it('starts with loading state', () => {
        const { result } = renderHook(() => useAdmin());
        expect(result.current.isLoading).toBe(true);
    });

    it('loads orchards and users on mount', async () => {
        const { result } = renderHook(() => useAdmin());
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.orchards).toHaveLength(2);
        expect(result.current.users).toHaveLength(3);
    });

    it('calculates activeUsers from data', async () => {
        const { result } = renderHook(() => useAdmin());
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.activeUsers).toBe(2);
    });

    it('calculates real complianceRate (Sprint B)', async () => {
        const { result } = renderHook(() => useAdmin());
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.complianceRate).toBe('67%');
    });

    it('provides search and filter setters', async () => {
        const { result } = renderHook(() => useAdmin());
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(typeof result.current.setUserSearch).toBe('function');
        expect(typeof result.current.setRoleFilter).toBe('function');
    });

    it('handleRoleChange calls service and reloads', async () => {
        const { result } = renderHook(() => useAdmin());
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        await result.current.handleRoleChange('u1', 'admin');
        expect(adminService.updateUserRole).toHaveBeenCalledWith('u1', 'admin');
    });

    it('handleToggleActive deactivates active user', async () => {
        const { result } = renderHook(() => useAdmin());
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        await result.current.handleToggleActive({ id: 'u1', is_active: true } as any);
        expect(adminService.deactivateUser).toHaveBeenCalledWith('u1');
    });

    it('handleToggleActive reactivates inactive user', async () => {
        const { result } = renderHook(() => useAdmin());
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        await result.current.handleToggleActive({ id: 'u3', is_active: false } as any);
        expect(adminService.reactivateUser).toHaveBeenCalledWith('u3');
    });
});
