// =============================================
// AUTH HARDENING SERVICE TESTS
// =============================================
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

// Mock supabase
const mockRpc = vi.fn();
const mockFrom = vi.fn();
vi.mock('./supabase', () => ({
    supabase: {
        auth: {
            signInWithPassword: vi.fn(),
        },
        rpc: (...args: unknown[]) => mockRpc(...args),
        from: (...args: unknown[]) => mockFrom(...args),
    },
}));

vi.mock('@/utils/nzst', () => ({
    nowNZST: () => '2026-02-13T10:00:00+13:00',
}));

import { authHardeningService } from './authHardening.service';
import { supabase } from './supabase';

// =============================================
// TESTS
// =============================================

describe('Auth Hardening Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // =============================================
    // checkAccountLock
    // =============================================
    describe('checkAccountLock', () => {
        it('should return not locked when RPC returns false', async () => {
            mockRpc.mockResolvedValue({ data: false, error: null });

            const result = await authHardeningService.checkAccountLock('test@example.com');

            expect(result.isLocked).toBe(false);
            expect(mockRpc).toHaveBeenCalledWith('is_account_locked', {
                check_email: 'test@example.com',
            });
        });

        it('should return locked with details when RPC returns true', async () => {
            const lockedUntil = new Date(Date.now() + 900000).toISOString(); // 15 min from now
            mockRpc.mockResolvedValue({ data: true, error: null });
            mockFrom.mockReturnValue({
                select: () => ({
                    eq: () => ({
                        gt: () => ({
                            is: () => ({
                                order: () => ({
                                    limit: () => ({
                                        single: () => Promise.resolve({
                                            data: { locked_until: lockedUntil },
                                            error: null,
                                        }),
                                    }),
                                }),
                            }),
                        }),
                    }),
                }),
            });

            const result = await authHardeningService.checkAccountLock('test@example.com');

            expect(result.isLocked).toBe(true);
            expect(result.lockedUntil).toBeInstanceOf(Date);
            expect(result.remainingMs).toBeGreaterThan(0);
        });

        it('should normalize email to lowercase and trim', async () => {
            mockRpc.mockResolvedValue({ data: false, error: null });

            await authHardeningService.checkAccountLock('  Test@EXAMPLE.com  ');

            expect(mockRpc).toHaveBeenCalledWith('is_account_locked', {
                check_email: 'test@example.com',
            });
        });

        it('should fail open on RPC error (not block users)', async () => {
            mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } });

            const result = await authHardeningService.checkAccountLock('test@example.com');

            expect(result.isLocked).toBe(false);
        });

        it('should fail open on exception', async () => {
            mockRpc.mockRejectedValue(new Error('Network timeout'));

            const result = await authHardeningService.checkAccountLock('test@example.com');

            expect(result.isLocked).toBe(false);
        });
    });

    // =============================================
    // getFailedLoginCount
    // =============================================
    describe('getFailedLoginCount', () => {
        it('should return count from RPC', async () => {
            mockRpc.mockResolvedValue({ data: 3, error: null });

            const count = await authHardeningService.getFailedLoginCount('test@example.com');

            expect(count).toBe(3);
        });

        it('should return 0 on error', async () => {
            mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } });

            const count = await authHardeningService.getFailedLoginCount('test@example.com');

            expect(count).toBe(0);
        });

        it('should return 0 on exception', async () => {
            mockRpc.mockRejectedValue(new Error('Network timeout'));

            const count = await authHardeningService.getFailedLoginCount('test@example.com');

            expect(count).toBe(0);
        });

        it('should normalize email', async () => {
            mockRpc.mockResolvedValue({ data: 0, error: null });

            await authHardeningService.getFailedLoginCount('  Admin@EXAMPLE.COM ');

            expect(mockRpc).toHaveBeenCalledWith('get_failed_login_count', {
                check_email: 'admin@example.com',
            });
        });
    });

    // =============================================
    // logLoginAttempt
    // =============================================
    describe('logLoginAttempt', () => {
        it('should insert login attempt record', async () => {
            const mockInsert = vi.fn().mockResolvedValue({ error: null });
            mockFrom.mockReturnValue({ insert: mockInsert });

            await authHardeningService.logLoginAttempt('test@example.com', true);

            expect(mockFrom).toHaveBeenCalledWith('login_attempts');
            expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
                email: 'test@example.com',
                success: true,
                failure_reason: undefined,
            }));
        });

        it('should include failure reason on failed attempt', async () => {
            const mockInsert = vi.fn().mockResolvedValue({ error: null });
            mockFrom.mockReturnValue({ insert: mockInsert });

            await authHardeningService.logLoginAttempt('test@example.com', false, 'Invalid credentials');

            expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                failure_reason: 'Invalid credentials',
            }));
        });

        it('should not throw on insert error (logging should not break login)', async () => {
            mockFrom.mockReturnValue({
                insert: vi.fn().mockRejectedValue(new Error('DB error')),
            });

            // Should NOT throw
            await expect(
                authHardeningService.logLoginAttempt('test@example.com', true)
            ).resolves.toBeUndefined();
        });
    });

    // =============================================
    // loginWithProtection
    // =============================================
    describe('loginWithProtection', () => {
        beforeEach(() => {
            // By default: not locked, 0 failed attempts
            mockRpc.mockImplementation((funcName: string) => {
                if (funcName === 'is_account_locked') {
                    return Promise.resolve({ data: false, error: null });
                }
                if (funcName === 'get_failed_login_count') {
                    return Promise.resolve({ data: 0, error: null });
                }
                return Promise.resolve({ data: null, error: null });
            });

            // Default: log attempts succeeds
            mockFrom.mockReturnValue({
                insert: vi.fn().mockResolvedValue({ error: null }),
            });
        });

        it('should reject login when account is locked', async () => {
            const lockedUntil = new Date(Date.now() + 900000);
            mockRpc.mockImplementation((funcName: string) => {
                if (funcName === 'is_account_locked') {
                    return Promise.resolve({ data: true, error: null });
                }
                return Promise.resolve({ data: 0, error: null });
            });
            mockFrom.mockReturnValueOnce({
                select: () => ({
                    eq: () => ({
                        gt: () => ({
                            is: () => ({
                                order: () => ({
                                    limit: () => ({
                                        single: () => Promise.resolve({
                                            data: { locked_until: lockedUntil.toISOString() },
                                            error: null,
                                        }),
                                    }),
                                }),
                            }),
                        }),
                    }),
                }),
            });

            const result = await authHardeningService.loginWithProtection('test@example.com', 'pass123');

            expect(result.success).toBe(false);
            expect(result.error).toContain('temporarily locked');
            expect(result.lockedUntil).toBeInstanceOf(Date);
        });

        it('should return success on valid credentials', async () => {
            (supabase.auth.signInWithPassword as Mock).mockResolvedValue({
                data: { user: { id: 'u1' }, session: {} },
                error: null,
            });

            const result = await authHardeningService.loginWithProtection('test@example.com', 'correct-pass');

            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();
        });

        it('should return remaining attempts on failed login', async () => {
            mockRpc.mockImplementation((funcName: string) => {
                if (funcName === 'is_account_locked') {
                    return Promise.resolve({ data: false, error: null });
                }
                if (funcName === 'get_failed_login_count') {
                    return Promise.resolve({ data: 2, error: null }); // 2 prior failures
                }
                return Promise.resolve({ data: null, error: null });
            });

            (supabase.auth.signInWithPassword as Mock).mockResolvedValue({
                data: null,
                error: { message: 'Invalid login credentials' },
            });

            const result = await authHardeningService.loginWithProtection('test@example.com', 'wrong-pass');

            expect(result.success).toBe(false);
            expect(result.remainingAttempts).toBe(2); // 5 max - 2 prior - 1 this = 2
            expect(result.error).toContain('2 attempts remaining');
        });

        it('should show lockout message when last attempt exhausted', async () => {
            mockRpc.mockImplementation((funcName: string) => {
                if (funcName === 'is_account_locked') {
                    return Promise.resolve({ data: false, error: null });
                }
                if (funcName === 'get_failed_login_count') {
                    return Promise.resolve({ data: 4, error: null }); // 4 prior = 1 remaining
                }
                return Promise.resolve({ data: null, error: null });
            });

            (supabase.auth.signInWithPassword as Mock).mockResolvedValue({
                data: null,
                error: { message: 'Invalid login credentials' },
            });

            const result = await authHardeningService.loginWithProtection('test@example.com', 'wrong-pass');

            expect(result.success).toBe(false);
            expect(result.remainingAttempts).toBe(0);
            expect(result.error).toContain('locked for 15 minutes');
        });

        it('should normalize email before all operations', async () => {
            (supabase.auth.signInWithPassword as Mock).mockResolvedValue({
                data: { user: {}, session: {} },
                error: null,
            });

            await authHardeningService.loginWithProtection('  Admin@TEST.com  ', 'pass');

            expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
                email: 'admin@test.com',
                password: 'pass',
            });
        });

        it('should handle unexpected exceptions gracefully', async () => {
            (supabase.auth.signInWithPassword as Mock).mockRejectedValue(new Error('Network failure'));

            const result = await authHardeningService.loginWithProtection('test@example.com', 'pass');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Network failure');
        });
    });

    // =============================================
    // unlockAccount
    // =============================================
    describe('unlockAccount', () => {
        it('should call RPC to unlock account', async () => {
            mockRpc.mockResolvedValue({ data: true, error: null });

            const result = await authHardeningService.unlockAccount('locked@test.com', 'Manager override');

            expect(mockRpc).toHaveBeenCalledWith('unlock_account', {
                target_email: 'locked@test.com',
                unlock_reason_text: 'Manager override',
            });
            expect(result).toBe(true);
        });

        it('should use default reason when none provided', async () => {
            mockRpc.mockResolvedValue({ data: true, error: null });

            await authHardeningService.unlockAccount('locked@test.com');

            expect(mockRpc).toHaveBeenCalledWith('unlock_account', {
                target_email: 'locked@test.com',
                unlock_reason_text: 'Unlocked by manager',
            });
        });

        it('should throw on RPC error', async () => {
            mockRpc.mockResolvedValue({ data: null, error: { message: 'Permission denied' } });

            await expect(
                authHardeningService.unlockAccount('locked@test.com')
            ).rejects.toBeDefined();
        });
    });

    // =============================================
    // getRecentFailedAttempts
    // =============================================
    describe('getRecentFailedAttempts', () => {
        it('should return failed attempts from database', async () => {
            const mockData = [
                { id: '1', email: 'test@test.com', success: false, attempt_time: '2026-02-13T10:00:00' },
            ];
            mockFrom.mockReturnValue({
                select: () => ({
                    eq: () => ({
                        order: () => ({
                            limit: () => Promise.resolve({ data: mockData, error: null }),
                        }),
                    }),
                }),
            });

            const attempts = await authHardeningService.getRecentFailedAttempts(10);

            expect(attempts).toHaveLength(1);
            expect(mockFrom).toHaveBeenCalledWith('login_attempts');
        });

        it('should return empty array on error', async () => {
            mockFrom.mockReturnValue({
                select: () => ({
                    eq: () => ({
                        order: () => ({
                            limit: () => Promise.resolve({ data: null, error: { message: 'Error' } }),
                        }),
                    }),
                }),
            });

            const attempts = await authHardeningService.getRecentFailedAttempts();

            expect(attempts).toEqual([]);
        });
    });

    // =============================================
    // getCurrentLocks
    // =============================================
    describe('getCurrentLocks', () => {
        it('should return active locks', async () => {
            const mockLocks = [
                { id: '1', email: 'locked@test.com', locked_at: '2026-02-13T09:45:00', locked_until: '2026-02-13T10:00:00' },
            ];
            mockFrom.mockReturnValue({
                select: () => ({
                    gt: () => ({
                        is: () => ({
                            order: () => Promise.resolve({ data: mockLocks, error: null }),
                        }),
                    }),
                }),
            });

            const locks = await authHardeningService.getCurrentLocks();

            expect(locks).toHaveLength(1);
            expect(mockFrom).toHaveBeenCalledWith('account_locks');
        });

        it('should return empty array on error', async () => {
            mockFrom.mockReturnValue({
                select: () => ({
                    gt: () => ({
                        is: () => ({
                            order: () => Promise.resolve({ data: null, error: { message: 'Error' } }),
                        }),
                    }),
                }),
            });

            const locks = await authHardeningService.getCurrentLocks();

            expect(locks).toEqual([]);
        });
    });
});
