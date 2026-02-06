import React from 'react';

interface WarehouseViewProps {
    fullBinsCount: number;
}

const WarehouseView: React.FC<WarehouseViewProps> = ({ fullBinsCount }) => {
    return (
        <div className="p-4 space-y-5">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-2 h-full bg-primary"></div>
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">Harvested Stock</h3>
                        <h2 className="text-2xl font-bold text-gray-900">Full Cherry Bins</h2>
                    </div>
                    <div className="size-14 rounded-xl bg-red-50 flex items-center justify-center text-primary border border-red-100">
                        <span className="material-symbols-outlined text-3xl">inventory_2</span>
                    </div>
                </div>
                <div className="mt-6 flex items-baseline gap-3">
                    <span className="text-6xl font-black text-gray-900 tracking-tighter">{fullBinsCount}</span>
                    <span className="text-lg font-medium text-gray-500">filled</span>
                </div>
            </div>
            <div className="bg-gray-100 rounded-xl p-4 flex gap-3 border border-gray-200">
                <span className="material-symbols-outlined text-gray-500">local_shipping</span>
                <div className="text-sm text-gray-600">
                    <p className="font-bold">Next Resupply Truck</p>
                    <p className="text-xs mt-0.5">Scheduled arrival in 45 mins.</p>
                </div>
            </div>
        </div>
    );
};

export default WarehouseView;
