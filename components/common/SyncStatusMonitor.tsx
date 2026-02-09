import React, { useState, useEffect } from 'react';
import { offlineService } from '../../services/offline.service';

const SyncStatusMonitor: React.FC = () => {
    const [status, setStatus] = useState({
        pending: 0,
        conflicts: 0,
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        isSyncing: false
    });

    useEffect(() => {
        const checkStatus = async () => {
            const pending = await offlineService.getPendingCount();
            const conflicts = await offlineService.getConflictCount();
            const syncState = offlineService.getSyncStatus();

            setStatus(prev => ({
                ...prev,
                pending,
                conflicts,
                isSyncing: syncState.inProgress
            }));
        };

        // Network listeners
        const handleOnline = () => setStatus(s => ({ ...s, isOnline: true }));
        const handleOffline = () => setStatus(s => ({ ...s, isOnline: false }));

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Poll for queue status
        const interval = setInterval(checkStatus, 2000);
        checkStatus(); // Initial check

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
        };
    }, []);

    // 1. Offline Warning (High Priority)
    if (!status.isOnline) {
        return (
            <div className="bg-red-50 border-b border-red-100 px-4 py-2 flex items-center justify-between shrink-0 z-50 animate-in slide-in-from-top">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-red-600 text-lg">wifi_off</span>
                    <p className="text-red-800 text-xs font-bold uppercase tracking-wide">You are Offline</p>
                </div>
                {status.pending > 0 && (
                    <span className="text-[10px] font-bold bg-white/50 px-2 py-0.5 rounded text-red-700">
                        {status.pending} queued
                    </span>
                )}
            </div>
        );
    }

    // 2. Conflict Warning
    if (status.conflicts > 0) {
        return (
            <div className="bg-yellow-50 border-b border-yellow-100 px-4 py-2 flex items-center justify-between shrink-0 z-50 animate-in slide-in-from-top">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-yellow-600 text-lg">warning</span>
                    <p className="text-yellow-800 text-xs font-bold uppercase tracking-wide">{status.conflicts} Sync Conflicts</p>
                </div>
                <button className="text-[10px] font-black underline text-yellow-800 uppercase">Review</button>
            </div>
        );
    }

    // 3. Syncing State
    if (status.isSyncing || status.pending > 0) {
        return (
            <div className="bg-orange-50 border-b border-orange-100 px-4 py-2 flex items-center justify-between shrink-0 z-50 animate-in slide-in-from-top">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-orange-600 text-lg">cloud_sync</span>
                    <p className="text-orange-800 text-xs font-bold uppercase tracking-wide">Syncing {status.pending} items...</p>
                </div>
                <div className="size-4 border-2 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return null;
};

export default SyncStatusMonitor;
