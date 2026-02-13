/**
 * FleetTab.tsx — Logistics Fleet Management
 * Orchard zone map + tractor list with status indicators
 */
import React, { useState, useMemo } from 'react';
import { Tractor } from '@/services/logistics-dept.service';
import FilterBar from '@/components/common/FilterBar';

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
    active: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    idle: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
    maintenance: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
    offline: { bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400' },
};

const LOAD_COLORS: Record<string, string> = {
    empty: 'text-gray-400', partial: 'text-amber-600', full: 'text-emerald-600',
};

interface FleetTabProps {
    tractors: Tractor[];
}

const FleetTab: React.FC<FleetTabProps> = ({ tractors }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

    const statusOptions = useMemo(() =>
        [...new Set(tractors.map(t => t.status))].sort(),
        [tractors]
    );

    const filtered = useMemo(() => tractors.filter(t => {
        const matchesSearch = !searchQuery ||
            t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.driver_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.zone.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = !activeFilters.status || t.status === activeFilters.status;
        return matchesSearch && matchesStatus;
    }), [tractors, searchQuery, activeFilters]);

    return (
        <div className="space-y-4">
            {/* Filter Bar */}
            <FilterBar
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search vehicles, drivers, zones..."
                filters={[
                    { key: 'status', label: 'Status', options: statusOptions, icon: 'local_shipping' },
                ]}
                activeFilters={activeFilters}
                onFilterChange={(key, value) => setActiveFilters(prev => ({ ...prev, [key]: value }))}
                onClearAll={() => { setSearchQuery(''); setActiveFilters({}); }}
            />

            {/* Zone Map */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 text-sm mb-3">Orchard Zone Map</h3>
                <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
                    {['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'C1'].map(zone => {
                        const tractorsInZone = tractors.filter(t => t.zone === zone);
                        const hasActive = tractorsInZone.some(t => t.status === 'active');
                        return (
                            <div
                                key={zone}
                                className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-bold border-2 transition-all cursor-pointer hover:scale-105 ${hasActive
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

            {/* Tractor Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                {filtered.map(tractor => {
                    const s = STATUS_STYLES[tractor.status] || STATUS_STYLES.offline;
                    return (
                        <div key={tractor.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <div className={`size-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                                        <span className={`material-symbols-outlined ${s.text}`}>agriculture</span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-sm">{tractor.name}</h4>
                                        <p className="text-xs text-gray-500">{tractor.driver_name} • Zone {tractor.zone}</p>
                                    </div>
                                </div>
                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${s.bg} ${s.text}`}>
                                    <span className={`size-1.5 rounded-full ${s.dot}`} />
                                    {tractor.status}
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span className={`flex items-center gap-1 font-medium ${LOAD_COLORS[tractor.load_status] || 'text-gray-400'}`}>
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
        </div>
    );
};

export default FleetTab;
