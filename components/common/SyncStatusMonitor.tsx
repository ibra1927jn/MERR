import React, { useState, useEffect } from 'react';
import { useHarvestStore } from '../../src/stores/useHarvestStore';

const SyncStatusMonitor: React.FC = () => {
    const buckets = useHarvestStore((state) => state.buckets);
    const pendingCount = buckets.filter(b => !b.synced).length;
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    // derived state for "syncing" visual only - bridge handles actual shuffle
    // For now, simpler: if pending > 0, we can show as "Queue Active"

    // 1. Offline Warning (High Priority)
    if (!isOnline) {
        return (
            <div className="bg-red-50 border-b border-red-100 px-4 py-2 flex items-center justify-between shrink-0 z-50 animate-in slide-in-from-top">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-red-600 text-lg">wifi_off</span>
                    <p className="text-red-800 text-xs font-bold uppercase tracking-wide">You are Offline</p>
                </div>
                {pendingCount > 0 && (
                    <span className="text-[10px] font-bold bg-white/50 px-2 py-0.5 rounded text-red-700">
                        {pendingCount} queued
                    </span>
                )}
            </div>
        );
    }

    // 3. Syncing State / Pending Queue
    if (pendingCount > 0) {
        return (
            <div className="bg-orange-50 border-b border-orange-100 px-4 py-2 flex items-center justify-between shrink-0 z-50 animate-in slide-in-from-top">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-orange-600 text-lg">cloud_sync</span>
                    <p className="text-orange-800 text-xs font-bold uppercase tracking-wide">Syncing {pendingCount} items...</p>
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
