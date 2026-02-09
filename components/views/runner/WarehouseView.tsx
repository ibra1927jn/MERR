interface WarehouseViewProps {
    inventory?: {
        full_bins: number;
        empty_bins: number;
        in_progress: number;
        total: number;
    };
    onTransportRequest?: () => void;
}

const WarehouseView: React.FC<WarehouseViewProps> = ({ inventory, onTransportRequest }) => {
    const fullBins = inventory?.full_bins || 0;
    const emptyBins = inventory?.empty_bins || 0;
    const inProgress = inventory?.in_progress || 0;

    return (
        <div className="flex flex-col h-full bg-background-light">
            <header className="flex-none bg-white shadow-sm z-10">
                <div className="flex items-center px-4 py-3 justify-between">
                    <h2 className="text-[#1b0d0f] text-xl font-bold leading-tight tracking-[-0.015em] flex-1">Warehouse Inventory</h2>
                    <div className="flex items-center justify-end gap-3">
                        <button className="flex items-center justify-center rounded-full size-10 bg-slate-50 text-slate-400">
                            <span className="material-symbols-outlined">notifications</span>
                        </button>
                        <div className="size-10 rounded-full bg-gray-200 overflow-hidden border border-gray-100">
                            <img src={`https://ui-avatars.com/api/?name=Warehouse&background=random`} alt="Avatar" className="w-full h-full object-cover" />
                        </div>
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
                        <span className="text-6xl font-black text-gray-900 tracking-tighter">{fullBins}</span>
                        <span className="text-lg font-medium text-gray-500">filled</span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-green-600">
                            <span className="material-symbols-outlined text-xl">check_circle</span>
                            <span className="text-sm font-bold">{fullBins > 0 ? 'Ready for Pickup' : 'Awaiting Harvest'}</span>
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
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${emptyBins < 5 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                                {emptyBins < 5 ? 'Critical' : 'OK'}
                            </span>
                        </div>
                        <div className="flex-1 flex flex-col justify-end">
                            <span className="text-5xl font-bold text-gray-900 block mb-1 tracking-tight">{emptyBins}</span>
                            <span className="text-sm font-bold text-gray-600 leading-tight block">Empty Bins Available</span>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200 flex flex-col h-full hover:border-blue-200 transition-colors">
                        <div className="flex items-start justify-between mb-4">
                            <div className="size-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
                                <span className="material-symbols-outlined">shopping_basket</span>
                            </div>
                            <span className="px-2 py-1 rounded text-[10px] font-bold bg-blue-100 text-blue-700 uppercase">IN-FLOW</span>
                        </div>
                        <div className="flex-1 flex flex-col justify-end">
                            <span className="text-5xl font-bold text-gray-900 block mb-1 tracking-tight">{inProgress}</span>
                            <span className="text-sm font-bold text-gray-600 leading-tight block">Bins In Progress</span>
                        </div>
                    </div>
                </div>

                {/* Truck Info (Simulated based on full bins) */}
                <div className="bg-slate-50 rounded-2xl p-4 flex gap-3 border border-slate-100">
                    <div className="size-10 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm border border-slate-100">
                        <span className="material-symbols-outlined text-xl">local_shipping</span>
                    </div>
                    <div className="text-sm text-slate-600 flex-1">
                        <p className="font-bold text-slate-900">Next Resupply Truck</p>
                        <p className="text-xs mt-0.5">
                            {fullBins > 10 ? 'Dispatch requested for full bins.' : 'Scheduled arrival in 45 mins from Depot A.'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Action Button */}
            <div className="absolute bottom-4 left-0 w-full px-4 z-20">
                <button
                    onClick={onTransportRequest}
                    disabled={fullBins === 0}
                    className="w-full h-16 bg-primary hover:bg-primary-dark text-white rounded-xl shadow-lg shadow-primary/30 flex items-center justify-center gap-3 active:scale-[0.98] transition-all group disabled:opacity-50 disabled:shadow-none"
                >
                    <span className="material-symbols-outlined text-3xl group-active:scale-90 transition-transform">local_shipping</span>
                    <span className="text-lg font-extrabold uppercase tracking-wide">Request Transport</span>
                </button>
            </div>
        </div>
    );
};

export default WarehouseView;
