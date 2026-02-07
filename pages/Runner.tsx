// pages/Runner.tsx
import React, { useState } from 'react';
import LogisticsView from '../components/views/runner/LogisticsView';
import WarehouseView from '../components/views/runner/WarehouseView';
import MessagingView from '../components/views/runner/MessagingView';
import RunnersView from '../components/views/runner/RunnersView'; // Nueva vista
import ScannerModal from '../components/modals/ScannerModal';
import { feedbackService } from '../services/feedback.service';

const Runner = () => {
    const [activeTab, setActiveTab] = useState<'logistics' | 'runners' | 'warehouse' | 'messaging'>('logistics');
    const [showScanner, setShowScanner] = useState(false);
    const [pendingUploads, setPendingUploads] = useState(0);

    const handleScanClick = () => {
        feedbackService.vibrate(50);
        setShowScanner(true);
    };

    const handleScanComplete = () => {
        setShowScanner(false);
        feedbackService.triggerSuccess();
        // Mock Offline Logic: If browser is offline, increment pending
        if (!navigator.onLine) {
            setPendingUploads(prev => prev + 1);
        }
    };

    return (
        <div className="bg-background-light min-h-screen font-['Inter'] text-[#1b0d0f] flex flex-col relative overflow-hidden">

            {/* Main Content Area */}
            <main className="flex-1 overflow-hidden flex flex-col relative z-0">
                {activeTab === 'logistics' && <LogisticsView onScan={handleScanClick} pendingUploads={pendingUploads} />}
                {activeTab === 'runners' && <RunnersView />}
                {activeTab === 'warehouse' && <WarehouseView />}
                {activeTab === 'messaging' && <MessagingView />}
            </main>

            {/* Bottom Navigation (Fixed) */}
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
                            {/* Notification Dot */}
                            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary border border-white"></span>
                            </span>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-tight">Messaging</span>
                    </button>
                </nav>
            </div>

            {/* Modals */}
            {showScanner && (
                <ScannerModal
                    onClose={() => setShowScanner(false)}
                    onScan={handleScanComplete}
                    scanType="BUCKET"
                />
            )}
        </div>
    );
};

export default Runner;