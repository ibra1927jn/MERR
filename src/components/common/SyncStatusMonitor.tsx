import React, { useState, useEffect } from 'react';
import { useHarvestStore } from '../../stores/useHarvestStore';
import { offlineService } from '../../services/offline.service';

const SyncStatusMonitor: React.FC = () => {
    const buckets = useHarvestStore((state) => state.buckets);
    const storePending = buckets.filter(b => !b.synced).length;
    const [vaultPending, setVaultPending] = useState<number>(0);

    // FIX H1: Reactive network status with event listeners
    const [isOnline, setIsOnline] = useState(
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );

    useEffect(() => {
        const goOnline = () => setIsOnline(true);
        const goOffline = () => setIsOnline(false);
        window.addEventListener('online', goOnline);
        window.addEventListener('offline', goOffline);
        return () => {
            window.removeEventListener('online', goOnline);
            window.removeEventListener('offline', goOffline);
        };
    }, []);

    // Poll Dexie for "True" pending count
    useEffect(() => {
        const checkVault = async () => {
            try {
                const count = await offlineService.getPendingCount();
                setVaultPending(count);
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error('Failed to check vault:', error);
            }
        };

        checkVault();
        const interval = setInterval(checkVault, 5000);
        return () => clearInterval(interval);
    }, []);

    // 1. Offline Warning (High Priority)
    if (!isOnline) {
        return (
            <div className="bg-red-50 border-b border-red-100 px-4 py-2 flex items-center justify-between shrink-0 z-50 animate-in slide-in-from-top">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-red-600 text-lg">wifi_off</span>
                    <p className="text-red-800 text-xs font-bold uppercase tracking-wide">You are Offline</p>
                </div>
                {(storePending > 0 || vaultPending > 0) && (
                    <span className="text-[10px] font-bold bg-white/50 px-2 py-0.5 rounded text-red-700">
                        {Math.max(storePending, vaultPending)} pending
                    </span>
                )}
            </div>
        );
    }

    // 2. Discrepancy Warning (Store vs Vault)
    if (storePending !== vaultPending) {
        // This usually resolves quickly via hydration, but good to know if it persists
    }

    // 3. Syncing State / Pending Queue
    const displayCount = Math.max(storePending, vaultPending);

    if (displayCount > 0) {
        return (
            <div className="bg-orange-50 border-b border-orange-100 px-4 py-2 flex items-center justify-between shrink-0 z-50 animate-in slide-in-from-top">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-orange-600 text-lg">cloud_sync</span>
                    <p className="text-orange-800 text-xs font-bold uppercase tracking-wide">
                        Syncing {displayCount} items...
                        {storePending !== vaultPending && <span className="text-[10px] opacity-75 ml-1">(Vault: {vaultPending})</span>}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="size-4 border-2 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
                </div>
            </div >
        );
    }

    return null;
};

export default SyncStatusMonitor;