/**
 * SecurityDashboard Component
 * 
 * Manager dashboard for viewing and managing security events:
 * - Recent failed login attempts
 * - Currently locked accounts
 * - Manual account unlock capability
 */

import { useState, useEffect } from 'react';
import { authHardeningService } from '../services/authHardening.service';
import { format } from 'date-fns';
import { Shield, Lock, Unlock, AlertTriangle, RefreshCw } from 'lucide-react';

interface FailedAttempt {
    id: string;
    email: string;
    attempt_time: string;
    failure_reason: string;
    ip_address: string | null;
}

interface AccountLock {
    id: string;
    email: string;
    locked_at: string;
    locked_until: string;
    locked_by_system: boolean;
}

export function SecurityDashboard() {
    const [failedAttempts, setFailedAttempts] = useState<FailedAttempt[]>([]);
    const [accountLocks, setAccountLocks] = useState<AccountLock[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [unlockingEmail, setUnlockingEmail] = useState<string | null>(null);

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
            // eslint-disable-next-line no-console
            console.error('[SecurityDashboard] Error fetching data:', error);
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

            alert(`Account unlocked successfully: ${email}`);
        } catch (error: any) {
            alert(`Failed to unlock account: ${error.message}`);
        } finally {
            setUnlockingEmail(null);
        }
    };

    return (
        <div className="security-dashboard p-4 bg-white rounded-lg shadow">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Shield size={24} className="text-blue-600" />
                    Security Dashboard
                </h2>
                <p className="text-gray-600 mt-1">
                    Monitor login attempts and manage account locks
                </p>
                <button
                    onClick={fetchData}
                    className="mt-2 px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded flex items-center gap-2"
                    disabled={isLoading}
                >
                    <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {isLoading && (
                <div className="text-center  py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading security data...</p>
                </div>
            )}

            {!isLoading && (
                <div className="space-y-6">
                    {/* Account Locks Section */}
                    <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <Lock size={18} className="text-red-600" />
                            Currently Locked Accounts ({accountLocks.length})
                        </h3>

                        {accountLocks.length === 0 ? (
                            <div className="bg-green-50 border border-green-200 rounded p-4 text-green-800">
                                âœ… No accounts currently locked
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                Email
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                Locked At
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                Locked Until
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {accountLocks.map((lock) => (
                                            <tr key={lock.id}>
                                                <td className="px-4 py-3 whitespace-nowrap font-medium">
                                                    {lock.email}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                                    {format(new Date(lock.locked_at), 'PPp')}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                                    {format(new Date(lock.locked_until), 'PPp')}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <button
                                                        onClick={() => handleUnlock(lock.email)}
                                                        disabled={unlockingEmail === lock.email}
                                                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 flex items-center gap-1"
                                                    >
                                                        <Unlock size={14} />
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
                            <AlertTriangle size={18} className="text-orange-600" />
                            Recent Failed Login Attempts ({failedAttempts.length})
                        </h3>

                        {failedAttempts.length === 0 ? (
                            <div className="bg-gray-50 border border-gray-200 rounded p-4 text-gray-600">
                                No failed attempts in the last 24 hours
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                Email
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                Time
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                Reason
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                IP Address
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {failedAttempts.map((attempt) => (
                                            <tr key={attempt.id}>
                                                <td className="px-4 py-3 whitespace-nowrap font-medium">
                                                    {attempt.email}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                                    {format(new Date(attempt.attempt_time), 'PPp')}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                                                    {attempt.failure_reason || 'Invalid credentials'}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
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
