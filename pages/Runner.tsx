// pages/Runner.tsx
import React, { useState } from 'react';
import LogisticsView from '../components/views/runner/LogisticsView';
import WarehouseView from '../components/views/runner/WarehouseView';
import MessagingView from '../components/views/runner/MessagingView';
import RunnersView from '../components/views/runner/RunnersView';
import ScannerModal from '../components/modals/ScannerModal';
import QualityRatingModal from '../components/modals/QualityRatingModal';
import HelpOnboardingModal from '../components/modals/HelpOnboardingModal';
import { feedbackService } from '../services/feedback.service';

import { useHarvest } from '../context/HarvestContext';
import { useMessaging } from '../context/MessagingContext';
import { useAuth } from '../context/AuthContext';
import { useHarvestStore } from '../store/useHarvestStore';
import { useProductionStore } from '../store/useProductionStore';
import { offlineService } from '../services/offline.service';
import { productionService } from '../services/production.service';
import Toast from '../components/common/Toast';
import SyncStatusMonitor from '../components/common/SyncStatusMonitor';
import DebugConsole from '../components/common/DebugConsole';

const Runner = () => {
    // Contexts (Legacy/High-Level Logic)
    const { scanBucket, inventory, orchard } = useHarvest();
    const { sendBroadcast } = useMessaging();
    const { user } = useAuth();

    // Zustand Stores (High Performance Reads - THE FUTURE)
    const {
        settings,
        selectedBinId,
        setSelectedBinId,
        bins
    } = useHarvestStore();
    const { isDuplicate, recordScan } = useProductionStore();

    // UI States
    const [debugOpen, setDebugOpen] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [logoTapCount, setLogoTapCount] = useState(0);
    const lastTapTime = React.useRef(0);

    const handleLogoTap = () => {
        const now = Date.now();
        if (now - lastTapTime.current < 500) {
            const nextCount = logoTapCount + 1;
            setLogoTapCount(nextCount);
            if (nextCount >= 5) {
                setDebugOpen(true);
                setLogoTapCount(0);
            }
        } else {
            setLogoTapCount(1);
        }
        lastTapTime.current = now;
    };

    // Sunlight Mode State
    const [sunlightMode, setSunlightMode] = useState(() => {
        return localStorage.getItem('sunlightMode') === 'true';
    });

    React.useEffect(() => {
        if (sunlightMode) {
            document.body.classList.add('sunlight-mode');
        } else {
            document.body.classList.remove('sunlight-mode');
        }
        localStorage.setItem('sunlightMode', sunlightMode.toString());
    }, [sunlightMode]);

    // Toast State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    const [activeTab, setActiveTab] = useState<'logistics' | 'runners' | 'warehouse' | 'messaging'>('logistics');
    const [showScanner, setShowScanner] = useState(false);
    const [scanType, setScanType] = useState<'BIN' | 'BUCKET'>('BUCKET');
    const [pendingUploads, setPendingUploads] = useState(0);

    // Poll for pending uploads to keep UI in sync with offline service
    React.useEffect(() => {
        const interval = setInterval(async () => {
            const count = await offlineService.getPendingCount();
            setPendingUploads(count);
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    const handleScanClick = (type: 'BIN' | 'BUCKET' = 'BUCKET') => {
        feedbackService.vibrate(50);
        setScanType(type);
        setShowScanner(true);
    };

    const handleBroadcast = (message: string) => {
        sendBroadcast("Runner Request", message, 'normal');
        feedbackService.vibrate(50);
        setToast({ message: 'Broadcast Sent!', type: 'success' });
    };

    // Quality Assessment State
    const [qualityScan, setQualityScan] = useState<{ code: string; step: 'SCAN' | 'QUALITY' } | null>(null);

    const handleScanComplete = (scannedData: string) => {
        setShowScanner(false);
        if (!scannedData) return;

        if (scanType === 'BIN') {
            const bin = bins?.find(b => b.bin_code === scannedData || b.id === scannedData);
            if (bin) {
                setSelectedBinId(bin.id);
                feedbackService.vibrate(100);
                setToast({ message: `Bin ${bin.bin_code || 'Selected'} Active`, type: 'info' });
            } else {
                setToast({ message: 'Bin not found in system', type: 'error' });
            }
            return;
        }

        // Apply Premium Duplicate Check
        if (isDuplicate(scannedData, 5000)) {
            feedbackService.triggerError();
            setToast({ message: 'Sticker ya escaneado recientemente', type: 'error' });
            return;
        }

        setQualityScan({ code: scannedData, step: 'QUALITY' });
        feedbackService.vibrate(50);
    };

    const submitQuality = async (grade: 'A' | 'B' | 'C' | 'reject') => {
        if (!qualityScan) return;

        const { code } = qualityScan;
        setQualityScan(null);

        try {
            const result = await productionService.scanSticker(
                code,
                orchard?.id || 'offline_pending',
                grade,
                selectedBinId,
                user?.id
            );

            if (result.success) {
                recordScan(code); // Update duplicate history
                feedbackService.triggerSuccess();
                setPendingUploads(prev => prev + 1);
                setToast({ message: result.message || 'Scanned successfully', type: 'success' });
            } else {
                feedbackService.triggerError();
                setToast({ message: result.error || 'Scan Failed', type: 'error' });
            }

        } catch (err: any) {
            console.error("Scan failed:", err);
            feedbackService.triggerError();
            setToast({ message: `Scan Error: ${err.message || 'Could not record bucket.'}`, type: 'error' });
        }
    };

    const displayInventory = React.useMemo(() => {
        const full = (inventory || []).filter(b => b.status === 'full').length;
        const empty = (inventory || []).filter(b => b.status === 'empty').length;
        const inProgress = (inventory || []).filter(b => b.status === 'in-progress').length;

        return {
            full_bins: full,
            empty_bins: empty,
            in_progress: inProgress,
            total: (inventory || []).length || 50,
            raw: inventory || []
        };
    }, [inventory]);

    return (
        <div className="bg-background-light min-h-screen font-['Inter'] text-[#1b0d0f] flex flex-col relative overflow-hidden">

            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            <main className="flex-1 overflow-hidden flex flex-col relative z-0">
                <SyncStatusMonitor />

                {activeTab === 'logistics' && (
                    <LogisticsView
                        onScan={handleScanClick}
                        onLogoTap={handleLogoTap}
                        onShowHelp={() => setShowHelp(true)}
                        pendingUploads={pendingUploads}
                        inventory={displayInventory}
                        onBroadcast={handleBroadcast}
                        selectedBinId={selectedBinId}
                        sunlightMode={sunlightMode}
                        onToggleSunlight={() => setSunlightMode(!sunlightMode)}
                    />
                )}
                {activeTab === 'runners' && <RunnersView onBack={() => setActiveTab('logistics')} />}
                {activeTab === 'warehouse' && (
                    <WarehouseView
                        inventory={displayInventory}
                        onTransportRequest={() => handleBroadcast("Warehouse is full. Pickup needed.")}
                    />
                )}
                {activeTab === 'messaging' && <MessagingView />}
            </main>

            <div className="flex-none bg-white border-t border-gray-100 pb-safe z-40 shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
                <nav className="flex items-center justify-around px-2 pb-6 pt-3">
                    <button
                        onClick={() => setActiveTab('logistics')}
                        className={`flex flex-col items-center gap-1 min-w-[64px] ${activeTab === 'logistics' ? 'text-primary' : 'text-gray-400'}`}
                    >
                        <span className="material-symbols-outlined" style={activeTab === 'logistics' ? { fontVariationSettings: "'FILL' 1" } : {}}>local_shipping</span>
                        <span className="text-[10px] font-black uppercase tracking-tight">Logistics</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('runners')}
                        className={`flex flex-col items-center gap-1 min-w-[64px] ${activeTab === 'runners' ? 'text-primary' : 'text-gray-400'}`}
                    >
                        <span className="material-symbols-outlined" style={activeTab === 'runners' ? { fontVariationSettings: "'FILL' 1" } : {}}>groups</span>
                        <span className="text-[10px] font-black uppercase tracking-tight">Runners</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('warehouse')}
                        className={`flex flex-col items-center gap-1 min-w-[64px] ${activeTab === 'warehouse' ? 'text-primary' : 'text-gray-400'}`}
                    >
                        <span className="material-symbols-outlined" style={activeTab === 'warehouse' ? { fontVariationSettings: "'FILL' 1" } : {}}>warehouse</span>
                        <span className="text-[10px] font-black uppercase tracking-tight">Warehouse</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('messaging')}
                        className={`flex flex-col items-center gap-1 min-w-[64px] ${activeTab === 'messaging' ? 'text-primary' : 'text-gray-400'}`}
                    >
                        <div className="relative">
                            <span className="material-symbols-outlined" style={activeTab === 'messaging' ? { fontVariationSettings: "'FILL' 1" } : {}}>forum</span>
                            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary border border-white"></span>
                            </span>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-tight">Messaging</span>
                    </button>
                </nav>
            </div>

            {showScanner && (
                <ScannerModal
                    onClose={() => setShowScanner(false)}
                    onScan={handleScanComplete}
                    scanType="BUCKET"
                />
            )}

            {qualityScan?.step === 'QUALITY' && (
                <QualityRatingModal
                    scannedCode={qualityScan.code}
                    onRate={submitQuality}
                    onCancel={() => setQualityScan(null)}
                />
            )}

            {debugOpen && <DebugConsole onClose={() => setDebugOpen(false)} />}
            {showHelp && <HelpOnboardingModal onClose={() => setShowHelp(false)} />}
        </div>
    );
};

export default Runner;