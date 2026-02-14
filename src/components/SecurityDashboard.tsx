/**
 * SecurityDashboard Component
 * 
 * Manager dashboard for viewing and managing security events:
 * - Recent failed login attempts
 * - Currently locked accounts
 * - Manual account unlock capability
 */

import { logger } from '@/utils/logger';
import { useState, useEffect } from 'react';
import { authHardeningService, type LoginAttempt, type AccountLock } from '../services/authHardening.service';
import { format } from 'date-fns';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/common/Toast';


// FailedAttempt is just an alias for LoginAttempt with guaranteed id and attempt_time
type FailedAttempt = LoginAttempt;

export function SecurityDashboard() {
    const [failedAttempts, setFailedAttempts] = useState<FailedAttempt[]>([]);
    const [accountLocks, setAccountLocks] = useState<AccountLock[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [unlockingEmail, setUnlockingEmail] = useState<string | null>(null);
    const { toast, showToast, hideToast } = useToast();

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [attempts, locks] = await Promise.all([
                authHardeningService.getRecentFailedAttempts(20),
                authHardeningService.getCurrentLocks(),
            ]);

            setFailedAttempts(attempts);
            setAccountLocks(locks);
        } catch (error) {

            logger.error('[SecurityDashboard] Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleUnlock = async (email: string) => {
        if (!window.confirm(`Unlock account for ${email}?`)) {
            return;
        }

        setUnlockingEmail(email);
        try {
            await authHardeningService.unlockAccount(email, 'Manual unlock by manager');

            // Refresh data
            await fetchData();

            showToast(`Account unlocked successfully: ${email}`, 'success');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            showToast(`Failed to unlock account: ${errorMessage}`, 'error');
        } finally {
            setUnlockingEmail(null);
        }
    };

    return (
        <div className="security-dashboard p-4 bg-white rounded-lg shadow">
            {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-2xl text-blue-600">shield</span>
                    Security Dashboard
                </h2>
                <p className="text-text-secondary mt-1">
                    Monitor login attempts and manage account locks
                </p>
                <button
                    onClick={fetchData}
                    className="mt-2 px-3 py-1 bg-surface-secondary hover:bg-surface-tertiary rounded flex items-center gap-2"
                    disabled={isLoading}
                >
                    <span className={`material-symbols-outlined text-sm ${isLoading ? 'animate-spin' : ''}`}>refresh</span>
                    Refresh
                </button>
            </div>

            {isLoading && (
                <div className="text-center  py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-text-secondary">Loading security data...</p>
                </div>
            )}

            {!isLoading && (
                <div className="space-y-6">
                    {/* Account Locks Section */}
                    <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg text-red-600">lock</span>
                            Currently Locked Accounts ({accountLocks.length})
                        </h3>

                        {accountLocks.length === 0 ? (
                            <div className="bg-green-50 border border-green-200 rounded p-4 text-green-800">
                                ✅ No accounts currently locked
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-border-light">
                                    <thead className="bg-background-light">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">
                                                Email
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">
                                                Locked At
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">
                                                Locked Until
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-border-light">
                                        {accountLocks.map((lock) => (
                                            <tr key={lock.id}>
                                                <td className="px-4 py-3 whitespace-nowrap font-medium">
                                                    {lock.email}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">
                                                    {format(new Date(lock.locked_at), 'PPp')}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">
                                                    {format(new Date(lock.locked_until), 'PPp')}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <button
                                                        onClick={() => handleUnlock(lock.email)}
                                                        disabled={unlockingEmail === lock.email}
                                                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-surface-tertiary flex items-center gap-1"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">lock_open</span>
                                                        {unlockingEmail === lock.email ? 'Unlocking...' : 'Unlock'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Failed Login Attempts */}
                    <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg text-orange-600">warning</span>
                            Recent Failed Login Attempts ({failedAttempts.length})
                        </h3>

                        {failedAttempts.length === 0 ? (
                            <div className="bg-background-light border border-border-light rounded p-4 text-text-secondary">
                                No failed attempts in the last 24 hours
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-border-light">
                                    <thead className="bg-background-light">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">
                                                Email
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">
                                                Time
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">
                                                Reason
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">
                                                IP Address
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-border-light">
                                        {failedAttempts.map((attempt) => (
                                            <tr key={attempt.id}>
                                                <td className="px-4 py-3 whitespace-nowrap font-medium">
                                                    {attempt.email}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">
                                                    {format(new Date(attempt.attempt_time), 'PPp')}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-text-secondary max-w-xs truncate">
                                                    {attempt.failure_reason || 'Invalid credentials'}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">
                                                    {attempt.ip_address || 'N/A'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
