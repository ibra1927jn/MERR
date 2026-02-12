/**
 * LOGISTICS DEPARTMENT PAGE — LogisticsDept.tsx
 * Matches Stitch "HarvestPro Logistics Dashboard" design
 * Professional light theme with indigo accents
 */
import React, { useState, useEffect } from 'react';
import {
    fetchLogisticsSummary, fetchFleet, fetchBinInventory,
    fetchTransportRequests, fetchTransportHistory,
    type LogisticsSummary, type Tractor, type BinInventory,
    type TransportRequest, type TransportLog
} from '@/services/logistics-dept.service';

type LogTab = 'fleet' | 'bins' | 'requests' | 'routes' | 'history';

const LogisticsDept: React.FC = () => {
    const [activeTab, setActiveTab] = useState<LogTab>('fleet');
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

    const getStatusColor = (status: string) => {
        const colors: Record<string, { bg: string; text: string; dot: string }> = {
            active: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
            idle: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
            maintenance: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
            offline: { bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400' },
        };
        return colors[status] || colors.offline;
    };

    const getLoadColor = (load: string) => {
        const colors: Record<string, string> = {
            empty: 'text-gray-400', partial: 'text-amber-600', full: 'text-emerald-600',
        };
        return colors[load] || 'text-gray-400';
    };

    const getPriorityBadge = (priority: string) => {
        const badges: Record<string, string> = {
            urgent: 'bg-red-100 text-red-700',
            high: 'bg-amber-100 text-amber-700',
            normal: 'bg-gray-100 text-gray-600',
        };
        return badges[priority] || 'bg-gray-100 text-gray-600';
    };

    const getRequestStatusBadge = (status: string) => {
        const badges: Record<string, string> = {
            pending: 'bg-amber-50 text-amber-700',
            assigned: 'bg-sky-50 text-sky-700',
            in_progress: 'bg-indigo-50 text-indigo-700',
            completed: 'bg-emerald-50 text-emerald-700',
            cancelled: 'bg-red-50 text-red-700',
        };
        return badges[status] || 'bg-gray-100 text-gray-600';
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">Loading logistics data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
                <div className="flex items-center px-4 py-3 justify-between">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-primary shadow-md shadow-primary/20 flex items-center justify-center">
                            <span className="material-symbols-outlined text-white text-[22px]">local_shipping</span>
                        </div>
                        <div>
                            <h1 className="text-gray-900 text-lg font-bold tracking-tight">Logistics</h1>
                            <p className="text-xs text-gray-500">HarvestPro • Fleet & Bins</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="size-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors relative">
                            <span className="material-symbols-outlined text-[20px]">notifications</span>
                            {summary.pendingRequests > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 size-5 bg-amber-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                                    {summary.pendingRequests}
                                </span>
                            )}
                        </button>
                        <button className="size-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-sm shadow-md shadow-primary/20">LG</button>
                    </div>
                </div>
            </header>

            <div className="px-4 py-5 space-y-5 pb-24">
                {/* Live Status Banner */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-3">
                    <span className="size-2.5 bg-emerald-500 rounded-full animate-pulse" />
                    <p className="text-sm font-medium text-emerald-800">
                        {summary.activeTractors} Tractors Active • {summary.binsInTransit} Bins in Transit
                    </p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-3">
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
                            <span className="material-symbols-outlined text-primary text-lg">agriculture</span>
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

                {/* Tab Bar */}
                <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
                    {([
                        { key: 'fleet', label: 'Fleet', icon: 'agriculture' },
                        { key: 'bins', label: 'Bins', icon: 'grid_view' },
                        { key: 'requests', label: 'Requests', icon: 'swap_horiz' },
                        { key: 'routes', label: 'Routes', icon: 'map' },
                        { key: 'history', label: 'History', icon: 'history' },
                    ] as { key: LogTab; label: string; icon: string }[]).map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${activeTab === tab.key
                                    ? 'bg-white text-primary shadow-sm'
                                    : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ── Fleet Tab ─────────────────────── */}
                {activeTab === 'fleet' && (
                    <div className="space-y-3">
                        {/* Zone Map Placeholder */}
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-900 text-sm mb-3">Orchard Zone Map</h3>
                            <div className="grid grid-cols-4 gap-2">
                                {['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'C1'].map(zone => {
                                    const tractorsInZone = tractors.filter(t => t.zone === zone);
                                    const hasActive = tractorsInZone.some(t => t.status === 'active');
                                    return (
                                        <div
                                            key={zone}
                                            className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-bold border-2 transition-all ${hasActive
                                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                                                    : tractorsInZone.length > 0
                                                        ? 'bg-amber-50 border-amber-300 text-amber-700'
                                                        : 'bg-gray-50 border-gray-200 text-gray-400'
                                                }`}
                                        >
                                            <span>{zone}</span>
                                            {tractorsInZone.length > 0 && (
                                                <span className="material-symbols-outlined text-sm mt-0.5">agriculture</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Tractor List */}
                        {tractors.map(tractor => {
                            const statusStyle = getStatusColor(tractor.status);
                            return (
                                <div key={tractor.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className={`size-10 rounded-lg ${statusStyle.bg} flex items-center justify-center`}>
                                                <span className={`material-symbols-outlined ${statusStyle.text}`}>agriculture</span>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900 text-sm">{tractor.name}</h4>
                                                <p className="text-xs text-gray-500">{tractor.driver_name} • Zone {tractor.zone}</p>
                                            </div>
                                        </div>
                                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${statusStyle.bg} ${statusStyle.text}`}>
                                            <span className={`size-1.5 rounded-full ${statusStyle.dot}`} />
                                            {tractor.status}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                        <span className={`flex items-center gap-1 font-medium ${getLoadColor(tractor.load_status)}`}>
                                            <span className="material-symbols-outlined text-xs">inventory_2</span>
                                            {tractor.bins_loaded}/{tractor.max_capacity} bins — {tractor.load_status}
                                        </span>
                                        <span className="ml-auto text-gray-400">
                                            {new Date(tractor.last_update).toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ── Bins Tab ──────────────────────── */}
                {activeTab === 'bins' && (
                    <div className="space-y-3">
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-900 text-sm mb-3">Bin Inventory Overview</h3>
                            <div className="grid grid-cols-4 gap-2 text-center">
                                {[
                                    { label: 'Empty', count: summary.emptyBins, color: 'text-gray-500' },
                                    { label: 'Filling', count: bins.filter(b => b.status === 'filling').length, color: 'text-amber-600' },
                                    { label: 'Full', count: summary.fullBins, color: 'text-red-600' },
                                    { label: 'Transit', count: summary.binsInTransit, color: 'text-sky-600' },
                                ].map((item, i) => (
                                    <div key={i}>
                                        <p className={`text-xl font-black ${item.color}`}>{item.count}</p>
                                        <p className="text-[10px] text-gray-500 uppercase font-bold">{item.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {bins.length === 0 && (
                            <div className="text-center py-12 text-gray-400">
                                <span className="material-symbols-outlined text-4xl mb-2 block">inventory_2</span>
                                <p className="font-medium">No bin data available</p>
                                <p className="text-xs mt-1">Bins will appear as they are scanned</p>
                            </div>
                        )}

                        {bins.map(bin => (
                            <div key={bin.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-bold text-gray-900 text-sm">#{bin.bin_code}</h4>
                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${bin.status === 'full' ? 'bg-red-50 text-red-700' :
                                            bin.status === 'in_transit' ? 'bg-sky-50 text-sky-700' :
                                                bin.status === 'filling' ? 'bg-amber-50 text-amber-700' :
                                                    'bg-gray-100 text-gray-600'
                                        }`}>{bin.status.replace('_', ' ')}</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                    <span>Zone {bin.zone}</span>
                                    <span>•</span>
                                    <span>{bin.fill_percentage}% full</span>
                                </div>
                                <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${bin.fill_percentage > 80 ? 'bg-red-400' :
                                            bin.fill_percentage > 50 ? 'bg-amber-400' :
                                                'bg-emerald-400'
                                        }`} style={{ width: `${bin.fill_percentage}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Requests Tab ──────────────────── */}
                {activeTab === 'requests' && (
                    <div className="space-y-3">
                        {requests.length === 0 && (
                            <div className="text-center py-12 text-gray-400">
                                <span className="material-symbols-outlined text-4xl mb-2 block">inbox</span>
                                <p className="font-medium">No pending requests</p>
                            </div>
                        )}
                        {requests.map(req => (
                            <div key={req.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${getPriorityBadge(req.priority)}`}>
                                            {req.priority}
                                        </span>
                                        <h4 className="font-bold text-gray-900 text-sm">Zone {req.zone}</h4>
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${getRequestStatusBadge(req.status)}`}>
                                        {req.status.replace('_', ' ')}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                                    <span>{req.requester_name}</span>
                                    <span>•</span>
                                    <span>{req.bins_count} bins</span>
                                    {req.assigned_tractor && (
                                        <>
                                            <span>•</span>
                                            <span className="text-primary font-medium">Assigned to {req.assigned_tractor}</span>
                                        </>
                                    )}
                                </div>
                                {req.notes && (
                                    <p className="text-xs text-gray-400 italic">{req.notes}</p>
                                )}
                                <p className="text-[10px] text-gray-400 mt-1">
                                    {new Date(req.created_at).toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' })} — {new Date(req.created_at).toLocaleDateString('en-NZ')}
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Routes Tab ────────────────────── */}
                {activeTab === 'routes' && (
                    <div className="space-y-3">
                        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
                            <span className="material-symbols-outlined text-gray-300 text-5xl mb-3 block">map</span>
                            <h3 className="font-bold text-gray-900 mb-1">Route Planning</h3>
                            <p className="text-sm text-gray-500 mb-4">Optimize tractor routes between orchard zones and the warehouse</p>
                            <button className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-dim transition-colors">
                                Plan New Route
                            </button>
                        </div>

                        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-900 text-sm mb-3">Common Routes</h3>
                            {[
                                { from: 'A1-A4', to: 'Warehouse', distance: '1.2km', time: '8 min', frequency: '12/day' },
                                { from: 'B1-B3', to: 'Warehouse', distance: '0.8km', time: '5 min', frequency: '8/day' },
                                { from: 'C1', to: 'Warehouse', distance: '1.5km', time: '10 min', frequency: '4/day' },
                            ].map((route, i) => (
                                <div key={i} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
                                    <div className="size-8 rounded bg-primary/10 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-primary text-sm">route</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-900">{route.from} → {route.to}</p>
                                        <p className="text-xs text-gray-500">{route.distance} • ~{route.time}</p>
                                    </div>
                                    <span className="text-xs text-gray-400 font-medium">{route.frequency}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── History Tab ───────────────────── */}
                {activeTab === 'history' && (
                    <div className="space-y-3">
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-900 text-sm mb-1">Today's Transport Log</h3>
                            <p className="text-xs text-gray-500">{history.length} trips completed</p>
                        </div>

                        {history.map(log => (
                            <div key={log.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-gray-900 text-sm">{log.tractor_name}</span>
                                        <span className="text-xs text-gray-500">• {log.driver_name}</span>
                                    </div>
                                    <span className="text-xs font-mono text-gray-400">
                                        {new Date(log.started_at).toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <span className="font-medium">{log.from_zone}</span>
                                    <span className="material-symbols-outlined text-xs text-gray-400">arrow_forward</span>
                                    <span className="font-medium">{log.to_zone}</span>
                                    <span>•</span>
                                    <span>{log.bins_count} bins</span>
                                    <span>•</span>
                                    <span>{log.duration_minutes} min</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* FAB */}
            <button className="fixed bottom-20 right-4 z-40 size-14 rounded-2xl bg-primary text-white shadow-lg shadow-primary/30 flex items-center justify-center hover:bg-primary-dim transition-colors active:scale-95">
                <span className="material-symbols-outlined text-2xl">add_circle</span>
            </button>

            {/* Bottom Nav */}
            <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 pb-6 pt-3 px-6 z-50">
                <ul className="flex justify-between items-center">
                    {([
                        { key: 'fleet', icon: 'dashboard', label: 'Home' },
                        { key: 'fleet', icon: 'local_shipping', label: 'Fleet' },
                        { key: 'bins', icon: 'grid_view', label: 'Bins' },
                        { key: 'requests', icon: 'swap_horiz', label: 'Requests' },
                        { key: 'history', icon: 'settings', label: 'Settings' },
                    ] as { key: LogTab; icon: string; label: string }[]).map((nav, i) => (
                        <li key={i}>
                            <button
                                onClick={() => setActiveTab(nav.key)}
                                className={`flex flex-col items-center gap-1 transition-all ${(i === 1 && activeTab === 'fleet') || (i === 2 && activeTab === 'bins') || (i === 3 && activeTab === 'requests')
                                        ? 'text-primary'
                                        : 'text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-xl">{nav.icon}</span>
                                <span className="text-[10px] font-medium">{nav.label}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>
        </div>
    );
};

export default LogisticsDept;
