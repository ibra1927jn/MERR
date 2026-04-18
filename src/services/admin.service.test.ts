/**
 * admin.service — HR/Admin wrapper sobre adminRepository (read) + edge
 * function manage-admin (write).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminRepository } from '@/repositories/admin.repository';
import { edgeFunctionsRepository } from '@/repositories/edge-functions.repository';
import { logger } from '@/utils/logger';
import { adminService } from './admin.service';

beforeEach(() => vi.restoreAllMocks());

describe('adminService.getAllOrchards', () => {
    it('delega en repo', async () => {
        const spy = vi.spyOn(adminRepository, 'getAllOrchards').mockResolvedValue([
            {
                id: 'o1',
                name: 'Farm A',
                total_rows: 50,
                active_pickers: 0,
                today_buckets: 0,
                compliance_score: 100,
            },
        ]);
        const res = await adminService.getAllOrchards();
        expect(spy).toHaveBeenCalled();
        expect(res).toHaveLength(1);
    });

    it('[] cuando repo throws', async () => {
        vi.spyOn(adminRepository, 'getAllOrchards').mockRejectedValue(new Error('down'));
        vi.spyOn(logger, 'error').mockImplementation(() => {});
        expect(await adminService.getAllOrchards()).toEqual([]);
    });
});

describe('adminService.getAllUsers', () => {
    it('pasa filters al repo', async () => {
        const spy = vi.spyOn(adminRepository, 'getAllUsers').mockResolvedValue([]);
        await adminService.getAllUsers({ role: 'picker' });
        expect(spy).toHaveBeenCalledWith({ role: 'picker' });
    });

    it('[] cuando repo throws', async () => {
        vi.spyOn(adminRepository, 'getAllUsers').mockRejectedValue(new Error('rls'));
        vi.spyOn(logger, 'error').mockImplementation(() => {});
        expect(await adminService.getAllUsers()).toEqual([]);
    });
});

describe('adminService.updateUserRole', () => {
    it('invoca edge function manage-admin con action update_role', async () => {
        const spy = vi
            .spyOn(edgeFunctionsRepository, 'invoke')
            .mockResolvedValue({ data: null, error: null });
        const res = await adminService.updateUserRole('u1', 'admin');
        expect(spy).toHaveBeenCalledWith('manage-admin', {
            action: 'update_role',
            user_id: 'u1',
            new_role: 'admin',
        });
        expect(res).toBe(true);
    });

    it('false cuando edge function devuelve error', async () => {
        vi.spyOn(edgeFunctionsRepository, 'invoke').mockResolvedValue({
            data: null,
            error: { message: 'forbidden' },
        });
        vi.spyOn(logger, 'error').mockImplementation(() => {});
        expect(await adminService.updateUserRole('u1', 'admin')).toBe(false);
    });

    it('false cuando invoke throws', async () => {
        vi.spyOn(edgeFunctionsRepository, 'invoke').mockRejectedValue(new Error('net'));
        vi.spyOn(logger, 'error').mockImplementation(() => {});
        expect(await adminService.updateUserRole('u1', 'admin')).toBe(false);
    });
});

describe('adminService.deactivateUser / reactivateUser', () => {
    it('deactivate → action deactivate', async () => {
        const spy = vi
            .spyOn(edgeFunctionsRepository, 'invoke')
            .mockResolvedValue({ data: null, error: null });
        expect(await adminService.deactivateUser('u1')).toBe(true);
        expect(spy).toHaveBeenCalledWith('manage-admin', { action: 'deactivate', user_id: 'u1' });
    });

    it('reactivate → action reactivate', async () => {
        const spy = vi
            .spyOn(edgeFunctionsRepository, 'invoke')
            .mockResolvedValue({ data: null, error: null });
        expect(await adminService.reactivateUser('u1')).toBe(true);
        expect(spy).toHaveBeenCalledWith('manage-admin', { action: 'reactivate', user_id: 'u1' });
    });

    it('deactivate false en error', async () => {
        vi.spyOn(edgeFunctionsRepository, 'invoke').mockResolvedValue({
            data: null,
            error: { message: 'x' },
        });
        vi.spyOn(logger, 'error').mockImplementation(() => {});
        expect(await adminService.deactivateUser('u1')).toBe(false);
    });

    it('reactivate false en error', async () => {
        vi.spyOn(edgeFunctionsRepository, 'invoke').mockResolvedValue({
            data: null,
            error: { message: 'x' },
        });
        vi.spyOn(logger, 'error').mockImplementation(() => {});
        expect(await adminService.reactivateUser('u1')).toBe(false);
    });
});
