/**
 * Auth Service - Rate Limiting & Account Lockout
 * 
 * Handles login attempts tracking and account lockout logic
 */

import { supabase } from './supabase';

export interface LoginAttemptResult {
    success: boolean;
    error?: string;
    lockedUntil?: Date;
    remainingAttempts?: number;
}

export interface AccountLockStatus {
    isLocked: boolean;
    lockedUntil?: Date;
    remainingMs?: number;
}

// =============================================
// CONSTANTS
// =============================================

const MAX_ATTEMPTS = 5;


// =============================================
// AUTH SERVICE
// =============================================

export const authHardeningService = {
    /**
     * Check if account is currently locked (via database)
     */
    async checkAccountLock(email: string): Promise<AccountLockStatus> {
        try {
            const { data, error } = await supabase
                .rpc('is_account_locked', { check_email: email.toLowerCase().trim() });

            if (error) {
                console.error('[AuthHardening] Error checking lock status:', error);
                return { isLocked: false };
            }

            // If locked, get lock details
            if (data === true) {
                const { data: lockData } = await supabase
                    .from('account_locks')
                    .select('locked_until')
                    .eq('email', email.toLowerCase().trim())
                    .gt('locked_until', new Date().toISOString())
                    .is('unlocked_at', null)
                    .order('locked_at', { ascending: false })
                    .limit(1)
                    .single();

                if (lockData) {
                    const lockedUntil = new Date(lockData.locked_until);
                    const remainingMs = lockedUntil.getTime() - Date.now();

                    return {
                        isLocked: true,
                        lockedUntil,
                        remainingMs: Math.max(0, remainingMs),
                    };
                }
            }

            return { isLocked: false };
        } catch (error) {
            console.error('[AuthHardening] Error in checkAccountLock:', error);
            return { isLocked: false }; // Fail open - don't block legitimate users
        }
    },

    /**
     * Get failed login count for email in last 15 minutes
     */
    async getFailedLoginCount(email: string): Promise<number> {
        try {
            const { data, error } = await supabase
                .rpc('get_failed_login_count', { check_email: email.toLowerCase().trim() });

            if (error) {
                console.error('[AuthHardening] Error getting failed count:', error);
                return 0;
            }

            return data || 0;
        } catch (error) {
            console.error('[AuthHardening] Error in getFailedLoginCount:', error);
            return 0;
        }
    },

    /**
     * Log login attempt (success or failure)
     */
    async logLoginAttempt(
        email: string,
        success: boolean,
        failureReason?: string
    ): Promise<void> {
        try {
            await supabase.from('login_attempts').insert({
                email: email.toLowerCase().trim(),
                success,
                failure_reason: failureReason,
                ip_address: null, // Could get from client if needed
                user_agent: navigator?.userAgent || null,
            });
        } catch (error) {
            console.error('[AuthHardening] Failed to log attempt:', error);
            // Don't throw - logging failure shouldn't break login
        }
    },

    /**
     * Login with rate limiting protection
     */
    async loginWithProtection(
        email: string,
        password: string
    ): Promise<LoginAttemptResult> {
        const normalizedEmail = email.toLowerCase().trim();

        // 1. Check if account is locked
        const lockStatus = await this.checkAccountLock(normalizedEmail);
        if (lockStatus.isLocked && lockStatus.remainingMs && lockStatus.remainingMs > 0) {
            const remainingMin = Math.ceil(lockStatus.remainingMs / 60000);

            return {
                success: false,
                error: `Account temporarily locked due to multiple failed login attempts. Try again in ${remainingMin} ${remainingMin === 1 ? 'minute' : 'minutes'}.`,
                lockedUntil: lockStatus.lockedUntil,
            };
        }

        // 2. Get current failed attempt count
        const failedCount = await this.getFailedLoginCount(normalizedEmail);
        const remainingAttempts = Math.max(0, MAX_ATTEMPTS - failedCount);

        // 3. Attempt login
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: normalizedEmail,
                password,
            });

            if (error) {
                // Log failed attempt (trigger will handle lockout if needed)
                await this.logLoginAttempt(normalizedEmail, false, error.message);

                // Calculate new remaining attempts
                const newRemaining = Math.max(0, remainingAttempts - 1);

                let errorMessage = 'Invalid email or password.';
                if (newRemaining > 0) {
                    errorMessage += ` ${newRemaining} attempt${newRemaining === 1 ? '' : 's'} remaining.`;
                } else {
                    errorMessage = 'Too many failed attempts. Account locked for 15 minutes.';
                }

                return {
                    success: false,
                    error: errorMessage,
                    remainingAttempts: newRemaining,
                };
            }

            // Success - log successful attempt
            await this.logLoginAttempt(normalizedEmail, true);

            return {
                success: true,
            };
        } catch (error: any) {
            // Log failed attempt
            await this.logLoginAttempt(normalizedEmail, false, error.message);

            return {
                success: false,
                error: error.message || 'Login failed',
                remainingAttempts: Math.max(0, remainingAttempts - 1),
            };
        }
    },

    /**
     * Manager unlock account (requires manager role)
     */
    async unlockAccount(email: string, reason?: string): Promise<boolean> {
        try {
            const { data, error } = await supabase.rpc('unlock_account', {
                target_email: email.toLowerCase().trim(),
                unlock_reason_text: reason || 'Unlocked by manager',
            });

            if (error) {
                console.error('[AuthHardening] Error unlocking account:', error);
                throw error;
            }

            return data === true;
        } catch (error) {
            console.error('[AuthHardening] Error in unlockAccount:', error);
            throw error;
        }
    },

    /**
     * Get recent failed login attempts (for managers)
     */
    async getRecentFailedAttempts(limit: number = 50): Promise<any[]> {
        try {
            const { data, error } = await supabase
                .from('login_attempts')
                .select('*')
                .eq('success', false)
                .order('attempt_time', { ascending: false })
                .limit(limit);

            if (error) {
                console.error('[AuthHardening] Error fetching failed attempts:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error('[AuthHardening] Error in getRecentFailedAttempts:', error);
            return [];
        }
    },

    /**
     * Get current account locks (for managers)
     */
    async getCurrentLocks(): Promise<any[]> {
        try {
            const { data, error } = await supabase
                .from('account_locks')
                .select('*')
                .gt('locked_until', new Date().toISOString())
                .is('unlocked_at', null)
                .order('locked_at', { ascending: false });

            if (error) {
                console.error('[AuthHardening] Error fetching locks:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error('[AuthHardening] Error in getCurrentLocks:', error);
            return [];
        }
    },
};
