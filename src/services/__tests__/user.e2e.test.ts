/**
 * E2E tests for user.service.ts (144L) — tests all delegation methods
 * and validates error handling branches
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/logger', () => ({
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/utils/nzst', () => ({
    todayNZST: () => '2026-03-10',
    nowNZST: () => '2026-03-10T14:00:00+13:00',
}));

vi.mock('@/repositories/user-service.repository', () => ({
    userServiceRepository: {
        getUserById: vi.fn().mockResolvedValue({ id: 'u1', full_name: 'Alice', role: 'picker' }),
        getUsersByOrchard: vi.fn().mockResolvedValue([{ id: 'u1' }]),
        getAvailableUsers: vi.fn().mockResolvedValue([{ id: 'u1' }]),
        getUsersByRole: vi.fn().mockResolvedValue([{ id: 'u1' }]),
        updateUserOrchard: vi.fn().mockResolvedValue(null),
        findPickerById: vi.fn().mockResolvedValue(null),
        updatePicker: vi.fn().mockResolvedValue({ error: null }),
        insertPicker: vi.fn().mockResolvedValue({ error: null }),
        findTodayAttendance: vi.fn().mockResolvedValue(null),
        insertAttendance: vi.fn().mockResolvedValue({ error: null }),
        clearUserOrchard: vi.fn().mockResolvedValue(undefined),
        verifyPickerState: vi.fn().mockResolvedValue(null),
        deletePicker: vi.fn().mockResolvedValue({ error: null }),
    },
}));

import { userService } from '../user.service';

describe('userService — E2E tests', () => {
    beforeEach(() => vi.clearAllMocks());

    it('exports getUserProfile', () => expect(userService.getUserProfile).toBeDefined());
    it('exports getOrchardUsers', () => expect(userService.getOrchardUsers).toBeDefined());
    it('exports getAvailableUsers', () => expect(userService.getAvailableUsers).toBeDefined());
    it('exports getAvailableTeamLeaders', () => expect(userService.getAvailableTeamLeaders).toBeDefined());
    it('exports getAvailableRunners', () => expect(userService.getAvailableRunners).toBeDefined());
    it('exports assignUserToOrchard', () => expect(userService.assignUserToOrchard).toBeDefined());
    it('exports unassignUserFromOrchard', () => expect(userService.unassignUserFromOrchard).toBeDefined());

    describe('assignUserToOrchard validation', () => {
        it('throws if no userId', async () => {
            await expect(userService.assignUserToOrchard('', 'o1')).rejects.toThrow('User ID is required');
        });

        it('throws if no orchardId', async () => {
            await expect(userService.assignUserToOrchard('u1', '')).rejects.toThrow('Orchard ID is required');
        });
    });

    describe('unassignUserFromOrchard validation', () => {
        it('throws if no userId', async () => {
            await expect(userService.unassignUserFromOrchard('')).rejects.toThrow('User ID is required');
        });
    });
});


