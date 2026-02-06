/**
 * RUNNER.TSX - High Fidelity UI
 * Modular implementation of the Runner Dashboard
 */
import React, { useState, useEffect } from 'react';
import { useHarvest } from '../context/HarvestContext';
import { useAuth } from '../context/AuthContext';
import ScannerModal from '../components/modals/ScannerModal';
import ProfileModal from '../components/modals/ProfileModal';
import { offlineService } from '../services/offline.service';

// Modular Views
import LogisticsView from '../components/views/runner/LogisticsView';
import WarehouseView from '../components/views/runner/WarehouseView';
import MessagingView from '../components/views/runner/MessagingView';

// Nav type
type Tab = 'logistics' | 'runners' | 'warehouse' | 'messaging';

const Runner = () => {
    // --------------------------------------------------------
    // 1. DATA CONNECTION
    // --------------------------------------------------------
    const { inventory = [], scanBucket, currentUser, orchard } = useHarvest();
    const { signOut } = useAuth();

    // UI State
    const [activeTab, setActiveTab] = useState<Tab>('logistics');
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [scanType, setScanType] = useState<'BUCKET' | 'BIN'>('BUCKET');

    // Offline Status
    const [isOnline, setIsOnline] = useState(offlineService.isOnline());
    const [pendingCount, setPendingCount] = useState(0);

    // Monitor connectivity
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        const checkPending = async () => {
            const count = await offlineService.getPendingCount();
            setPendingCount(count);
        };
        checkPending();
        const interval = setInterval(checkPending, 5000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
        };
    }, []);

    // Derived Data
    const activeBin = inventory.find(b => b.status === 'in-progress') || {
        id: '#4092', fillPercentage: 63, type: 'Stella Cherries', status: 'in-progress' as const
    };
    // Type coercion for safety if status missing in mock

    const fullBinsCount = inventory.filter(b => b.status === 'full').length;

    // Handlers
    const handleScanClick = (type: 'BUCKET' | 'BIN') => {
        setScanType(type);
        setIsScannerOpen(true);
    };

    const handleScan = async (code: string) => {
        if (scanType === 'BUCKET') {
            await scanBucket(code, 'A');
        } else {
            console.log("Bin Scanned:", code);
            // Future Bin Scan Logic
        }
        setIsScannerOpen(false);
    };

    // Header Component (Wrapper)
    const Header = () => (
        <header className="flex-none bg-white shadow-sm z-30 relative">
            <div className="flex items-center px-4 py-3 justify-between">
                <div>
                    <h1 className="text-[#1b0d0f] text-xl font-extrabold tracking-tight">
                        {activeTab === 'logistics' && 'Logistics Hub'}
                        {activeTab === 'runners' && 'Orchard Runners'}
                        {activeTab === 'warehouse' && 'Warehouse Inventory'}
                        {activeTab === 'messaging' && 'Messaging Hub'}
                    </h1>
                    <p className="text-[10px] text-primary font-bold tracking-widest uppercase">
                        {orchard?.id || 'Central Pac'} • {currentUser?.name}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="relative flex items-center justify-center rounded-full size-10 bg-gray-50 text-gray-700">
                        <span className="material-symbols-outlined">notifications</span>
                        <span className="absolute top-2 right-2.5 size-2 bg-primary rounded-full border-2 border-white"></span>
                    </button>
                    <div onClick={() => setIsProfileOpen(true)} className="size-10 rounded-full bg-gray-200 overflow-hidden border border-gray-100 cursor-pointer">
                        <img
                            src={`https://ui-avatars.com/api/?name=${currentUser?.name || 'User'}&background=ec1325&color=fff`}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>
            </div>

            {/* Offline Banner */}
            <div className={`${isOnline ? 'bg-green-50 border-green-100' : 'bg-orange-50 border-orange-100'} border-y px-4 py-2.5 flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                    <span className={`material-symbols-outlined ${isOnline ? 'text-green-600' : 'text-orange-600'}`} style={{ fontSize: '20px' }}>
                        {isOnline ? 'cloud_done' : 'cloud_off'}
                    </span>
                    <p className={`${isOnline ? 'text-green-800' : 'text-orange-800'} text-sm font-bold`}>
                        {isOnline ? 'Connected' : 'Working Offline'}
                    </p>
                </div>
                <div className={`flex items-center gap-1.5 ${isOnline ? 'bg-green-100' : 'bg-orange-100'} px-2 py-0.5 rounded-full`}>
                    <span className={`material-symbols-outlined ${isOnline ? 'text-green-700' : 'text-orange-700'}`} style={{ fontSize: '16px' }}>
                        {isOnline ? 'wifi' : 'wifi_off'}
                    </span>
                    <span className={`text-xs font-black ${isOnline ? 'text-green-800' : 'text-orange-800'} uppercase`}>
                        {isOnline ? 'Online' : `${pendingCount} Pending`}
                    </span>
                </div>
            </div>
        </header>
    );

    return (
        <div className="flex flex-col h-screen bg-background-light overflow-hidden font-display text-slate-800">
            <Header />

            <main className="flex-1 overflow-y-auto pb-32">
                {activeTab === 'logistics' && (
                    <LogisticsView
                        activeBin={activeBin as any} // Cast for safety if mock is partial
                        inventory={inventory}
                        onScanClick={handleScanClick}
                    />
                )}

                {activeTab === 'warehouse' && (
                    <WarehouseView
                        fullBinsCount={fullBinsCount}
                    />
                )}

                {activeTab === 'messaging' && (
                    <MessagingView />
                )}

                {activeTab === 'runners' && (
                    <div className="p-4 flex flex-col items-center justify-center h-full text-center text-gray-400">
                        <span className="material-symbols-outlined text-5xl mb-2">groups</span>
                        <p className="font-bold">Team Active</p>
                    </div>
                )}
            </main>

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 w-full z-40 bg-white border-t border-gray-100 shadow-[0_-10px_20px_rgba(0,0,0,0.03)] pb-safe pt-2">
                <nav className="flex items-center justify-around px-2 pb-6">
                    <button onClick={() => setActiveTab('logistics')} className={`flex flex-col items-center gap-1 min-w-[64px] ${activeTab === 'logistics' ? 'text-primary' : 'text-gray-400'}`}>
                        <span className="material-symbols-outlined" style={activeTab === 'logistics' ? { fontVariationSettings: "'FILL' 1" } : {}}>local_shipping</span>
                        <span className="text-[10px] font-black uppercase">Logistics</span>
                    </button>

                    <button onClick={() => setActiveTab('runners')} className={`flex flex-col items-center gap-1 min-w-[64px] ${activeTab === 'runners' ? 'text-primary' : 'text-gray-400'}`}>
                        <span className="material-symbols-outlined" style={activeTab === 'runners' ? { fontVariationSettings: "'FILL' 1" } : {}}>groups</span>
                        <span className="text-[10px] font-black uppercase">Runners</span>
                    </button>

                    <button onClick={() => setActiveTab('warehouse')} className={`flex flex-col items-center gap-1 min-w-[64px] ${activeTab === 'warehouse' ? 'text-primary' : 'text-gray-400'}`}>
                        <span className="material-symbols-outlined" style={activeTab === 'warehouse' ? { fontVariationSettings: "'FILL' 1" } : {}}>warehouse</span>
                        <span className="text-[10px] font-black uppercase">Warehouse</span>
                    </button>

                    <button onClick={() => setActiveTab('messaging')} className={`flex flex-col items-center gap-1 min-w-[64px] ${activeTab === 'messaging' ? 'text-primary' : 'text-gray-400'}`}>
                        <div className="relative">
                            <span className="material-symbols-outlined" style={activeTab === 'messaging' ? { fontVariationSettings: "'FILL' 1" } : {}}>forum</span>
                            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                            </span>
                        </div>
                        <span className="text-[10px] font-black uppercase">Messaging</span>
                    </button>
                </nav>
            </div>

            {/* Modals */}
            <ScannerModal
                onClose={() => setIsScannerOpen(false)}
                onScan={handleScan}
                scanType={scanType}
            />

            {isProfileOpen && (
                <ProfileModal
                    onClose={() => setIsProfileOpen(false)}
                    onLogout={signOut}
                />
            )}
        </div>
    );
};

export default Runner;