// components/views/runner/WarehouseView.tsx
import React from 'react';

const WarehouseView = () => {
    return (
        <div className="flex flex-col h-full bg-background-light">
            <header className="flex-none bg-white shadow-sm z-10">
                <div className="flex items-center px-4 py-3 justify-between">
                    <h2 className="text-[#1b0d0f] text-xl font-bold leading-tight tracking-[-0.015em] flex-1">Warehouse Inventory</h2>
                    <div className="flex items-center justify-end gap-3">
                        <button className="flex items-center justify-center rounded-full size-10 bg-cherry-light text-primary">
                            <span className="material-symbols-outlined">notifications</span>
                        </button>
                        <div className="size-10 rounded-full bg-gray-200 overflow-hidden border border-gray-100">
                            <img src={`https://ui-avatars.com/api/?name=Runner&background=random`} alt="Avatar" className="w-full h-full object-cover" />
                        </div>
                    </div>
                </div>
                <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 flex items-center gap-3">
                    <span className="material-symbols-outlined text-amber-600">cloud_off</span>
                    <p className="text-amber-800 text-sm font-medium flex-1">Offline Sync Pending</p>
                    <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-amber-600 animate-spin text-sm">sync</span>
                        <span className="text-xs font-semibold text-amber-700">Updated 2m ago</span>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-5 pb-28">
                {/* Hero Card */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-2 h-full bg-primary group-hover:w-3 transition-all"></div>
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
                        <span className="text-6xl font-black text-gray-900 tracking-tighter">28</span>
                        <span className="text-lg font-medium text-gray-500">filled</span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-green-600">
                            <span className="material-symbols-outlined text-xl">check_circle</span>
                            <span className="text-sm font-bold">Ready for Pickup</span>
                        </div>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200 flex flex-col h-full hover:border-orange-200 transition-colors">
                        <div className="flex items-start justify-between mb-4">
                            <div className="size-10 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600 border border-orange-100">
                                <span className="material-symbols-outlined">grid_view</span>
                            </div>
                            <span className="px-2 py-1 rounded text-[10px] font-bold bg-orange-100 text-orange-700 uppercase">Low</span>
                        </div>
                        <div className="flex-1 flex flex-col justify-end">
                            <span className="text-5xl font-bold text-gray-900 block mb-1 tracking-tight">15</span>
                            <span className="text-sm font-bold text-gray-600 leading-tight block">Empty Bins Available</span>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200 flex flex-col h-full hover:border-blue-200 transition-colors">
                        <div className="flex items-start justify-between mb-4">
                            <div className="size-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
                                <span className="material-symbols-outlined">shopping_basket</span>
                            </div>
                            <span className="px-2 py-1 rounded text-[10px] font-bold bg-blue-100 text-blue-700 uppercase">OK</span>
                        </div>
                        <div className="flex-1 flex flex-col justify-end">
                            <span className="text-5xl font-bold text-gray-900 block mb-1 tracking-tight">8</span>
                            <span className="text-sm font-bold text-gray-600 leading-tight block">Bins with Empty Buckets</span>
                        </div>
                    </div>
                </div>

                {/* Truck Info */}
                <div className="bg-gray-100 rounded-xl p-4 flex gap-3 border border-gray-200">
                    <span className="material-symbols-outlined text-gray-500">local_shipping</span>
                    <div className="text-sm text-gray-600">
                        <p className="font-bold">Next Resupply Truck</p>
                        <p className="text-xs mt-0.5">Scheduled arrival in 45 mins from Depot A.</p>
                    </div>
                </div>
            </div>

            {/* Action Button */}
            <div className="absolute bottom-4 left-0 w-full px-4 z-20">
                <button className="w-full h-16 bg-primary hover:bg-primary-dark text-white rounded-xl shadow-lg shadow-primary/30 flex items-center justify-center gap-3 active:scale-[0.98] transition-all group">
                    <span className="material-symbols-outlined text-3xl group-active:scale-90 transition-transform">local_shipping</span>
                    <span className="text-lg font-extrabold uppercase tracking-wide">Request Transport</span>
                </button>
            </div>
        </div>
    );
};

export default WarehouseView;
