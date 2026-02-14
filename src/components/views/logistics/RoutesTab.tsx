/**
 * RoutesTab.tsx — Logistics Route Planning
 * Route planning placeholder + common routes list
 */
import React from 'react';

const COMMON_ROUTES = [
    { from: 'A1-A4', to: 'Warehouse', distance: '1.2km', time: '8 min', frequency: '12/day' },
    { from: 'B1-B3', to: 'Warehouse', distance: '0.8km', time: '5 min', frequency: '8/day' },
    { from: 'C1', to: 'Warehouse', distance: '1.5km', time: '10 min', frequency: '4/day' },
];

const RoutesTab: React.FC = () => (
    <div className="space-y-4">
        <div className="bg-white rounded-xl p-8 shadow-sm border border-border-light text-center">
            <span className="material-symbols-outlined text-text-disabled text-5xl mb-3 block">map</span>
            <h3 className="font-bold text-text-primary mb-1">Route Planning</h3>
            <p className="text-sm text-text-secondary mb-4">Optimize tractor routes between orchard zones and the warehouse</p>
            <button className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors">
                Plan New Route
            </button>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-border-light">
            <h3 className="font-bold text-text-primary text-sm mb-3">Common Routes</h3>
            {COMMON_ROUTES.map((route, i) => (
                <div key={i} className="flex items-center gap-3 py-3 border-b border-border-light last:border-0">
                    <div className="size-8 rounded bg-indigo-50 flex items-center justify-center">
                        <span className="material-symbols-outlined text-indigo-600 text-sm">route</span>
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-text-primary">{route.from} → {route.to}</p>
                        <p className="text-xs text-text-secondary">{route.distance} • ~{route.time}</p>
                    </div>
                    <span className="text-xs text-text-muted font-medium">{route.frequency}</span>
                </div>
            ))}
        </div>
    </div>
);

export default RoutesTab;
