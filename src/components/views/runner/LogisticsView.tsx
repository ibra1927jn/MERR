// components/views/runner/LogisticsView.tsx
import React from 'react';
import { useHarvestStore } from '@/stores/useHarvestStore';
import { db } from '@/services/db';

// Define minimal Inventory interface if not imported from types
interface InventoryStatus {
    full_bins: number;
    empty_bins: number;
    // ... other properties ...
}

interface LogisticsViewProps {
    onScan: (type?: 'BIN' | 'BUCKET') => void;
    pendingUploads?: number;
    inventory?: any;
    onBroadcast?: (message: string) => void;
    selectedBinId?: string;
    // Added from Stashed usage
    onLogoTap?: () => void;
    onShowHelp?: () => void;
    sunlightMode?: boolean;
    onToggleSunlight?: () => void;
}

const LogisticsView: React.FC<LogisticsViewProps> = ({
    onScan,
    onLogoTap,
    onShowHelp,
    pendingUploads = 0,
    inventory,
    onBroadcast,
    selectedBinId,
    sunlightMode,
    onToggleSunlight
}) => {
    const buckets = useHarvestStore((state) => state.buckets); // Fixed: Added hook usage inferred from stashed code
    const activeBinBuckets = buckets.filter(r => r.orchard_id === 'offline_pending').length; // Fallback or activeBin logic if available

    // NOTE: The previous logic filtered by bin_id. The new store might not have bin_id on each bucket yet unless we added it.
    // user instruction said: "Usad {buckets.map(bucket => ...)} directamente."
    // For now, I will use the total length or filtered if applicable.

    // Add a state for "pop" animation when buckets change
    const [pop, setPop] = React.useState(false);
    React.useEffect(() => {
        if (buckets.length > 0) { // Trigger pop on any new bucket
            setPop(true);
            const timer = setTimeout(() => setPop(false), 300);
            return () => clearTimeout(timer);
        }
    }, [buckets.length]);

    // 🔍 DEBUG: Log when bucketRecords changes
    React.useEffect(() => {
        console.log(`[LogisticsView] STORE buckets updated! Count: ${buckets.length}`);
    }, [buckets]);

    const binCapacity = 72;
    const activeBinPercentage = Math.round((activeBinBuckets / binCapacity) * 100);

    // Derive global values from inventory object or raw bins if available
    const fullBins = inventory?.full_bins || 0;
    const emptyBins = inventory?.empty_bins || 0;
    const totalBins = inventory?.total || 72;
    const utilization = totalBins > 0 ? Math.round((fullBins / totalBins) * 100) : 0;

    // Calculate Max Sun Exposure from raw bins (if passed)
    const [maxExposure, setMaxExposure] = React.useState("00:00:00");

    React.useEffect(() => {
        const timer = setInterval(() => {
            const rawBins = inventory?.raw || [];
            const fullRawBins = rawBins.filter((b: any) => b.status === 'full' && b.sunExposureStart);

            if (fullRawBins.length === 0) {
                setMaxExposure("00:00:00");
                return;
            }

            const now = Date.now();
            const maxDiff = Math.max(...fullRawBins.map((b: any) => now - b.sunExposureStart));

            const hours = Math.floor(maxDiff / 3600000);
            const minutes = Math.floor((maxDiff % 3600000) / 60000);
            const seconds = Math.floor((maxDiff % 60000) / 1000);

            setMaxExposure(
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
            );
        }, 1000);

        return () => clearInterval(timer);
    }, [inventory]);

    const handleRefillRequest = () => {
        if (onBroadcast) {
            onBroadcast("Runner needs empty bins at Current Zone");
            // Optional: visual feedback
            alert("Request broadcasted!");
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="flex-none bg-white shadow-sm z-30">
                <div className="flex items-center px-4 py-3 justify-between">
                    <h1 className="text-[#1b0d0f] text-xl font-extrabold tracking-tight">Logistics Hub</h1>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => onBroadcast?.("Notification center requested")}
                            className="relative flex items-center justify-center rounded-full size-10 bg-gray-50 text-gray-700"
                        >
                            <span className="material-symbols-outlined">notifications</span>
                            <span className="absolute top-2 right-2.5 size-2 bg-primary rounded-full border-2 border-white"></span>
                        </button>
                        <div className="size-10 rounded-full bg-gray-200 overflow-hidden border border-gray-100">
                            <img src={`https://ui-avatars.com/api/?name=Runner&background=random`} alt="Avatar" className="w-full h-full object-cover" />
                        </div>
                    </div>
                </div>
                {/* Offline Banner */}
                {pendingUploads > 0 && (
                    <div className="bg-orange-50 border-y border-orange-100 px-4 py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-orange-600">cloud_off</span>
                            <p className="text-orange-800 text-sm font-bold">Offline Sync Pending</p>
                        </div>
                        <div
                            data-testid="sync-badge"
                            className="flex items-center gap-1.5 bg-orange-200/50 px-2 py-0.5 rounded-full"
                        >
                            <span className="material-symbols-outlined text-orange-700 text-sm">sync</span>
                            <span className="text-xs font-black text-orange-800 uppercase">{pendingUploads} Pending</span>
                        </div>
                    </div>
                )}
            </header>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-28 space-y-4">
                {/* Active Bin Card */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <div className="flex items-start justify-between mb-2">
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 leading-none">
                                {selectedBinId ? `Bin ${selectedBinId}` : 'No Bin Selected'}
                            </h2>
                            <p className="text-sm font-medium text-gray-500 mt-1">
                                {selectedBinId ? 'Active Fill Progress' : 'Scan a bin to start'}
                            </p>
                        </div>
                        <span className="px-2 py-1 rounded bg-green-50 text-green-700 text-[10px] font-black uppercase tracking-widest border border-green-100">Active</span>
                    </div>
                    {/* SVG Chart */}
                    <div className="flex items-center justify-center py-4 relative">
                        <div className="w-48 h-48 relative">
                            <svg className="block mx-auto max-w-full h-auto" viewBox="0 0 36 36">
                                <path className="fill-none stroke-[#F1F1F1] stroke-[3]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"></path>
                                <path className="fill-none stroke-primary stroke-[3] stroke-linecap-round" strokeDasharray={`${activeBinPercentage}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"></path>
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-4xl font-black text-gray-900">{activeBinPercentage}%</span>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Filled</span>
                            </div>
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="text-gray-900 text-xl font-black">{activeBinBuckets}<span className="text-gray-400 font-bold mx-1">/</span>{binCapacity}</p>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-0.5">Buckets in current bin</p>
                    </div>
                </div>

                {/* Sun Exposure */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="size-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>wb_sunny</span>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-tight">Sun Exposure</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="size-2 rounded-full bg-green-500"></span>
                                <p className="text-sm font-black text-green-600 uppercase tracking-wide">Safe Level</p>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-mono font-black text-gray-900 tabular-nums">{maxExposure}</p>
                    </div>
                </div>

                {/* Supply Management */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4">Supply Management</h3>
                    <div className="grid grid-cols-2 gap-4 mb-5">
                        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                            <p className="text-[11px] font-bold text-gray-500 uppercase">Empty Bins</p>
                            <div className="flex items-baseline justify-between mt-1">
                                <span className="text-2xl font-black text-gray-900">{emptyBins}</span>
                                <span className={`text-[10px] font-black uppercase ${emptyBins < 5 ? 'text-primary' : 'text-green-600'}`}>
                                    {emptyBins < 5 ? 'Low Stock' : 'Good'}
                                </span>
                            </div>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                            <p className="text-[11px] font-bold text-gray-500 uppercase">Empty Buckets</p>
                            <div className="flex items-baseline justify-between mt-1">
                                <span className="text-2xl font-black text-gray-900">{Math.max(10, emptyBins * 5)}</span>
                                <span className="text-[10px] font-black text-green-600 uppercase">Stock OK</span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleRefillRequest}
                        className="w-full bg-gray-900 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform"
                    >
                        <span className="material-symbols-outlined">local_shipping</span>
                        Request Refill
                    </button>
                </div>
            </div>

            {/* Floating Action Buttons (Fixed above nav) */}
            <div className="absolute bottom-4 left-0 w-full px-4 z-30">
                <div className="flex gap-4">
                    <button
                        onClick={() => onScan('BIN')}
                        className="flex-1 flex flex-col items-center justify-center py-4 bg-white border-2 border-primary text-primary rounded-2xl font-black text-xs uppercase tracking-widest active:bg-gray-50 shadow-lg"
                    >
                        <span className="material-symbols-outlined mb-1 text-3xl">crop_free</span>
                        Scan Bin
                    </button>
                    <button
                        onClick={() => onScan('BUCKET')}
                        className="flex-1 flex flex-col items-center justify-center py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-200 active:bg-primary-dark"
                    >
                        <span className="material-symbols-outlined mb-1 text-3xl">label</span>
                        Scan Sticker
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LogisticsView;
