/**
 * Manager Logistics View Component
 * Displays bin inventory and logistics status
 */
import React from 'react';

interface InventoryState {
    emptyBins: number;
    binsOfBuckets: number;
}

import HeatMapView from './HeatMapView';
import { Picker } from '../../types';

interface InventoryState {
    emptyBins: number;
    binsOfBuckets: number;
}

interface LogisticsViewProps {
    inventory: InventoryState;
    crew: Picker[];
}

const LogisticsView: React.FC<LogisticsViewProps> = ({ inventory, crew }) => {
    const { emptyBins, binsOfBuckets } = inventory;
    const isLow = emptyBins < 15;
    const isCritical = emptyBins < 5;

    return (
        <main className="flex-1 overflow-y-auto pb-24 px-4 pt-4 space-y-4">
            {/* Inventory Summary */}
            <div
                className={`rounded-2xl p-5 ${isCritical
                    ? 'bg-red-50 border-2 border-red-300'
                    : isLow
                        ? 'bg-amber-50 border-2 border-amber-300'
                        : 'bg-white border border-gray-100'
                    }`}
            >
                <div className="flex items-center gap-3 mb-4">
                    <span
                        className={`material-symbols-outlined text-2xl ${isCritical ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-[#d91e36]'
                            }`}
                    >
                        inventory_2
                    </span>
                    <h2 className="text-lg font-black text-gray-900">Bin Inventory</h2>
                    {(isLow || isCritical) && (
                        <span
                            className={`px-2 py-1 rounded-full text-xs font-bold ${isCritical
                                ? 'bg-red-200 text-red-700'
                                : 'bg-amber-200 text-amber-700'
                                }`}
                        >
                            {isCritical ? '⚠️ CRITICAL' : '⚡ Low'}
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                        <p className="text-xs font-bold text-gray-500 uppercase mb-1">Empty Bins</p>
                        <p className="text-3xl font-black text-gray-900">{emptyBins}</p>
                        <p className="text-xs text-gray-500 mt-1">Available</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                        <p className="text-xs font-bold text-gray-500 uppercase mb-1">Full Bins</p>
                        <p className="text-3xl font-black text-green-600">{binsOfBuckets}</p>
                        <p className="text-xs text-gray-500 mt-1">Ready for transport</p>
                    </div>
                </div>
            </div>

            {/* Runner Status */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-4">
                    Runner Status
                </h3>
                {[
                    { id: 1, name: 'Runner 1', status: 'Active', load: 4, row: 'Row 12' },
                    { id: 2, name: 'Runner 2', status: 'Delivering', load: 8, row: 'Depot' },
                    { id: 3, name: 'Runner 3', status: 'Break', load: 0, row: '-' },
                ].map(runner => (
                    <div
                        key={runner.id}
                        className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0"
                    >
                        <div className="size-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                            <span className="material-symbols-outlined">local_shipping</span>
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-gray-900">{runner.name}</p>
                            <p className="text-xs text-gray-500">{runner.row}</p>
                        </div>
                        <div className="text-right">
                            <span
                                className={`px-2 py-1 rounded-full text-xs font-bold ${runner.status === 'Active'
                                    ? 'bg-green-100 text-green-700'
                                    : runner.status === 'Delivering'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-gray-100 text-gray-600'
                                    }`}
                            >
                                {runner.status}
                            </span>
                            <p className="text-xs text-gray-500 mt-1">{runner.load} buckets</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Live Geo-Tracking */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">
                        Live Geo-Tracking
                    </h3>
                    <button className="text-xs text-[#d91e36] font-medium">Expand Map</button>
                </div>
                <div className="rounded-xl overflow-hidden border border-gray-200">
                    <HeatMapView
                        bucketRecords={[]} // Passing empty array to trigger simulation mode for now
                        crew={crew}
                        rows={20}
                    />
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-4">
                    Quick Actions
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    <button className="p-4 rounded-xl bg-[#d91e36] text-white text-center">
                        <span className="material-symbols-outlined text-2xl mb-1">add_box</span>
                        <p className="text-sm font-bold">Request Bins</p>
                    </button>
                    <button className="p-4 rounded-xl bg-blue-600 text-white text-center">
                        <span className="material-symbols-outlined text-2xl mb-1">local_shipping</span>
                        <p className="text-sm font-bold">Dispatch Runner</p>
                    </button>
                </div>
            </div>
        </main>
    );
};

export default LogisticsView;
