/**
 * admin.service.ts — HR/Admin Service
 * 
 * Provides cross-orchard management capabilities for system administrators.
 * Read operations stay client-side (RLS-protected).
 * Write operations delegate to server-side Edge Function (owner-only).
 */
import { logger } from '@/utils/logger';
import { adminRepository } from '@/repositories/admin.repository';
import { edgeFunctionsRepository } from '@/repositories/edgeFunctions.repository';

export interface OrchardOverview {
    id: string;
    name: string;
    total_rows: number;
    active_pickers: number;
    today_buckets: number;
    compliance_score: number;
}

export interface UserRecord {
    id: string;
    email: string;
    full_name: string;
    role: string;
    is_active: boolean;
    orchard_id: string | null;
    orchard_name?: string;
    created_at: string;
}

export const adminService = {
    /**
     * Fetch all orchards with aggregated stats (read-only)
     */
    async getAllOrchards(): Promise<OrchardOverview[]> {
        try {
            return await adminRepository.getAllOrchards();
        } catch (error) {
            logger.error('[AdminService] Failed to fetch orchards:', (error as Error).message);
            return [];
        }
    },

    /**
     * Fetch all users with optional role filter (read-only)
     */
    async getAllUsers(filters?: {
        role?: string;
        orchardId?: string;
        search?: string;
    }): Promise<UserRecord[]> {
        try {
            return await adminRepository.getAllUsers(filters);
        } catch (error) {
            logger.error('[AdminService] Failed to fetch users:', (error as Error).message);
            return [];
        }
    },

    /**
     * Update a user's role — via Edge Function (server-side, owner-only)
     */
    async updateUserRole(userId: string, newRole: string): Promise<boolean> {
        try {
            const { error } = await edgeFunctionsRepository.invoke('manage-admin', {
                action: 'update_role',
                user_id: userId,
                new_role: newRole,
            });
            if (error) throw new Error(error.message);
            return true;
        } catch (error) {
            logger.error('[AdminService] Failed to update user role:', (error as Error).message);
            return false;
        }
    },

    /**
     * Deactivate a user (soft-delete) — via Edge Function (server-side, owner-only)
     */
    async deactivateUser(userId: string): Promise<boolean> {
        try {
            const { error } = await edgeFunctionsRepository.invoke('manage-admin', {
                action: 'deactivate',
                user_id: userId,
            });
            if (error) throw new Error(error.message);
            return true;
        } catch (error) {
            logger.error('[AdminService] Failed to deactivate user:', (error as Error).message);
            return false;
        }
    },

    /**
     * Reactivate a user — via Edge Function (server-side, owner-only)
     */
    async reactivateUser(userId: string): Promise<boolean> {
        try {
            const { error } = await edgeFunctionsRepository.invoke('manage-admin', {
                action: 'reactivate',
                user_id: userId,
            });
            if (error) throw new Error(error.message);
            return true;
        } catch (error) {
            logger.error('[AdminService] Failed to reactivate user:', (error as Error).message);
            return false;
        }
    },
};
