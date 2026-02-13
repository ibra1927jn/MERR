/**
 * LOGISTICS DEPARTMENT — LogisticsDept.tsx
 * Uses DesktopLayout sidebar + modular tab views
 */
import React, { useState, useEffect } from 'react';
import DesktopLayout, { NavItem } from '@/components/common/DesktopLayout';
import FleetTab from '@/components/views/logistics/FleetTab';
import BinsTab from '@/components/views/logistics/BinsTab';
import RequestsTab from '@/components/views/logistics/RequestsTab';
import RoutesTab from '@/components/views/logistics/RoutesTab';
import HistoryTab from '@/components/views/logistics/HistoryTab';
import {
    fetchLogisticsSummary, fetchFleet, fetchBinInventory,
    fetchTransportRequests, fetchTransportHistory,
    type LogisticsSummary, type Tractor, type BinInventory,
    type TransportRequest, type TransportLog
} from '@/services/logistics-dept.service';

const LOG_NAV_ITEMS: NavItem[] = [
    { id: 'fleet', label: 'Fleet', icon: 'agriculture' },
    { id: 'bins', label: 'Bin Inventory', icon: 'grid_view' },
    { id: 'requests', label: 'Requests', icon: 'swap_horiz' },
    { id: 'routes', label: 'Routes', icon: 'map' },
    { id: 'history', label: 'History', icon: 'history' },
];

const LogisticsDept: React.FC = () => {
    const [activeTab, setActiveTab] = useState('fleet');
    const [summary, setSummary] = useState<LogisticsSummary>({ fullBins: 0, emptyBins: 0, activeTractors: 0, pendingRequests: 0, binsInTransit: 0 });
    const [tractors, setTractors] = useState<Tractor[]>([]);
    const [bins, setBins] = useState<BinInventory[]>([]);
    const [requests, setRequests] = useState<TransportRequest[]>([]);
    const [history, setHistory] = useState<TransportLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            const [sum, fleet, binData, reqs, hist] = await Promise.all([
                fetchLogisticsSummary(),
                fetchFleet(),
                fetchBinInventory(),
                fetchTransportRequests(),
                fetchTransportHistory(),
            ]);
            setSummary(sum);
            setTractors(fleet);
            setBins(binData);
            setRequests(reqs);
            setHistory(hist);
            setIsLoading(false);
        };
        loadData();
    }, []);

    const navItems = LOG_NAV_ITEMS.map(item => ({
        ...item,
        badge: item.id === 'requests' ? summary.pendingRequests : undefined,
    }));

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">Loading logistics data...</p>
                </div>
            </div>
        );
    }

    const renderContent = () => {
        switch (activeTab) {
            case 'fleet': return <FleetTab tractors={tractors} />;
            case 'bins': return <BinsTab bins={bins} summary={summary} />;
            case 'requests': return <RequestsTab requests={requests} />;
            case 'routes': return <RoutesTab />;
            case 'history': return <HistoryTab history={history} />;
            default: return <FleetTab tractors={tractors} />;
        }
    };

    return (
        <DesktopLayout
            navItems={navItems}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            title="Logistics"
            accentColor="teal"
            titleIcon="local_shipping"
        >
            {/* Live Status Banner */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-3 mb-4">
                <span className="size-2.5 bg-emerald-500 rounded-full animate-pulse" />
                <p className="text-sm font-medium text-emerald-800">
                    {summary.activeTractors} Tractors Active • {summary.binsInTransit} Bins in Transit
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="material-symbols-outlined text-red-500 text-lg">inventory_2</span>
                        <span className="text-xs text-gray-500 font-medium">Full Bins</span>
                    </div>
                    <p className="text-2xl font-black text-gray-900">{summary.fullBins}</p>
                    <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-red-400 to-amber-400 rounded-full" style={{ width: `${Math.min(100, (summary.fullBins / (summary.fullBins + summary.emptyBins || 1)) * 100)}%` }} />
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="material-symbols-outlined text-emerald-500 text-lg">check_box_outline_blank</span>
                        <span className="text-xs text-gray-500 font-medium">Empty Bins</span>
                    </div>
                    <p className="text-2xl font-black text-gray-900">{summary.emptyBins}</p>
                    <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${Math.min(100, (summary.emptyBins / (summary.fullBins + summary.emptyBins || 1)) * 100)}%` }} />
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="material-symbols-outlined text-indigo-500 text-lg">agriculture</span>
                        <span className="text-xs text-gray-500 font-medium">Active Tractors</span>
                    </div>
                    <p className="text-2xl font-black text-gray-900">{summary.activeTractors}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="material-symbols-outlined text-amber-500 text-lg">swap_horiz</span>
                        <span className="text-xs text-gray-500 font-medium">Transport Requests</span>
                    </div>
                    <p className="text-2xl font-black text-gray-900">{summary.pendingRequests}</p>
                </div>
            </div>

            {/* Tab Content */}
            {renderContent()}
        </DesktopLayout>
    );
};

export default LogisticsDept;
