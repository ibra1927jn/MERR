/**
 * useRunnerData — Data loading + scan handlers for the Runner page
 *
 * Extracts store access, polling, scan logic, and quality submission
 * from Runner.tsx following the usePayroll pattern.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useHarvestStore } from '@/stores/useHarvestStore';
import { useMessaging } from '@/context/MessagingContext';
import { offlineService } from '@/services/offline.service';
import { feedbackService } from '@/services/feedback.service';
import { nowNZST } from '@/utils/nzst';
import { logger } from '@/utils/logger';

export interface DisplayInventory {
    [key: string]: unknown;
    full_bins: number;
    empty_bins: number;
    in_progress: number;
    total: number;
    raw: any[];
}

export interface UseRunnerDataResult {
    inventory: DisplayInventory;
    orchard: any;
    crew: any[];
    selectedBinId: string | undefined;
    pendingUploads: number;
    showScanner: boolean;
    scanType: 'BIN' | 'BUCKET';
    toast: { message: string; type: 'success' | 'error' | 'info' | 'warning' } | null;
    qualityScan: { code: string; step: 'SCAN' | 'QUALITY' } | null;
    setSelectedBinId: (id: string | undefined) => void;
    setShowScanner: (show: boolean) => void;
    setToast: (toast: { message: string; type: 'success' | 'error' | 'info' | 'warning' } | null) => void;
    handleScanClick: (type?: 'BIN' | 'BUCKET') => void;
    handleBroadcast: (message: string) => void;
    handleScanComplete: (scannedData: string) => void;
    submitQuality: (grade: 'A' | 'B' | 'C' | 'reject') => Promise<void>;
    setQualityScan: (scan: { code: string; step: 'SCAN' | 'QUALITY' } | null) => void;
}

export function useRunnerData(): UseRunnerDataResult {
    const rawInventory = useHarvestStore((state) => state.inventory);
    const orchard = useHarvestStore((state) => state.orchard);
    const crew = useHarvestStore((state) => state.crew);
    const addBucket = useHarvestStore((state) => state.addBucket);
    const fetchGlobalData = useHarvestStore((state) => state.fetchGlobalData);
    const { sendBroadcast } = useMessaging();

    const [selectedBinId, setSelectedBinId] = useState<string | undefined>(undefined);
    const [pendingUploads, setPendingUploads] = useState<number>(0);
    const [showScanner, setShowScanner] = useState<boolean>(false);
    const [scanType, setScanType] = useState<'BIN' | 'BUCKET'>('BUCKET');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);
    const [qualityScan, setQualityScan] = useState<{ code: string; step: 'SCAN' | 'QUALITY' } | null>(null);

    // Initial data load
    useEffect(() => {
        fetchGlobalData();
    }, [fetchGlobalData]);

    // Poll for pending uploads — 5s interval, pauses when tab is hidden
    useEffect(() => {
        const poll = async () => {
            if (document.visibilityState === 'visible') {
                const count = await offlineService.getPendingCount();
                setPendingUploads(count);
            }
        };
        poll();
        const interval = setInterval(poll, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleScanClick = useCallback((type: 'BIN' | 'BUCKET' = 'BUCKET') => {
        feedbackService.vibrate(50);
        setScanType(type);
        setShowScanner(true);
    }, []);

    const handleBroadcast = useCallback((message: string) => {
        sendBroadcast("Runner Request", message, 'normal');
        feedbackService.vibrate(50);
        setToast({ message: 'Broadcast Sent!', type: 'success' });
    }, [sendBroadcast]);

    const handleScanComplete = useCallback((scannedData: string) => {
        setShowScanner(false);
        if (!scannedData) return;

        if (scanType === 'BIN') {
            const bin = rawInventory?.find(b => b.bin_code === scannedData || b.id === scannedData);
            if (bin) {
                setSelectedBinId(bin.id);
                feedbackService.vibrate(100);
                setToast({ message: `Bin ${bin.bin_code || 'Selected'} Active`, type: 'info' });
            } else {
                setToast({ message: 'Bin not found in system', type: 'error' });
            }
            return;
        }

        // Validate picker is checked in before accepting bucket
        const isCheckedIn = crew.some(p => p.id === scannedData || p.picker_id === scannedData);
        if (!isCheckedIn) {
            setToast({
                message: '⚠️ Picker not checked in. Ask Team Leader to check them in first.',
                type: 'warning',
            });
            return;
        }

        setQualityScan({ code: scannedData, step: 'QUALITY' });
        feedbackService.vibrate(50);
    }, [scanType, rawInventory, crew]);

    const submitQuality = useCallback(async (grade: 'A' | 'B' | 'C' | 'reject') => {
        if (!qualityScan) return;
        const { code } = qualityScan;
        setQualityScan(null);
        logger.debug(`[Runner] Scanning bucket with bin_id: ${selectedBinId}`);

        addBucket({
            picker_id: code,
            quality_grade: grade,
            timestamp: nowNZST(),
            orchard_id: orchard?.id || 'offline_pending',
        });

        feedbackService.triggerSuccess();
        setToast({ message: 'Bucket Saved (Offline Ready)', type: 'success' });
    }, [qualityScan, selectedBinId, addBucket, orchard?.id]);

    // Calculate real inventory data from context
    const inventory = useMemo<DisplayInventory>(() => {
        const full = (rawInventory || []).filter(b => b.status === 'full').length;
        const empty = (rawInventory || []).filter(b => b.status === 'empty').length;
        const inProgress = (rawInventory || []).filter(b => b.status === 'in-progress').length;

        return {
            full_bins: full,
            empty_bins: empty,
            in_progress: inProgress,
            total: (rawInventory || []).length || 50,
            raw: rawInventory || [],
        };
    }, [rawInventory]);

    return {
        inventory, orchard, crew, selectedBinId, pendingUploads,
        showScanner, scanType, toast, qualityScan,
        setSelectedBinId, setShowScanner, setToast,
        handleScanClick, handleBroadcast, handleScanComplete,
        submitQuality, setQualityScan,
    };
}
