import React from 'react';

interface LogisticsViewProps {
    fullBins: number;
    emptyBins: number;
    activeRunners: any[];
    setActiveTab: (tab: any) => void;
    onRequestPickup?: () => void;
}

const LogisticsView: React.FC<LogisticsViewProps> = ({ fullBins, emptyBins, activeRunners, setActiveTab, onRequestPickup }) => {
    return (
        <div className="flex flex-col gap-6 p-4">
            <section className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-card-dark rounded-xl p-4 shadow-sm border border-gray-100 dark:border-white/5 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <span className="material-symbols-outlined text-6xl text-primary">inventory_2</span>
                    </div>
                    <div className="relative z-10">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-1">Awaiting Pickup</p>
                        <div className="flex items-end gap-2">
                            <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{fullBins}</h3>
                            <span className="text-xs font-bold text-primary mb-1.5">Full Bins</span>
                        </div>
                        <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                            High Priority
                        </div>
                    </div>
                </div>
                <div
                    onClick={onRequestPickup}
                    className="bg-white dark:bg-card-dark rounded-xl p-4 shadow-sm border border-gray-100 dark:border-white/5 relative overflow-hidden group cursor-pointer hover:ring-2 hover:ring-green-500 transition-all active:scale-[0.98]"
                >
                    <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <span className="material-symbols-outlined text-6xl text-green-500">check_box_outline_blank</span>
                    </div>
                    <div className="relative z-10">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-1 flex items-center justify-between">
                            Empty Supply
                            <span className="material-symbols-outlined text-green-500 text-sm opacity-0 group-hover:opacity-100 transition-opacity">touch_app</span>
                        </p>
                        <div className="flex items-end gap-2">
                            <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{emptyBins}</h3>
                            <span className="text-xs font-bold text-green-500 mb-1.5">Bins</span>
                        </div>
                        <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                            Request Pickup
                        </div>
                    </div>
                </div>
                <div className="col-span-2 bg-white dark:bg-card-dark rounded-xl p-4 shadow-sm border border-gray-100 dark:border-white/5">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-bold tracking-tight flex items-center gap-2">
                            <span className="material-symbols-outlined text-gray-400 text-lg">agriculture</span>
                            Tractor Fleet Status
                        </h2>
                        <span className="text-xs bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded text-gray-500 dark:text-gray-300">5 Total</span>
                    </div>
                    <div className="flex gap-2">
                        <div className="flex-1 bg-green-500/10 border border-green-500/20 rounded-lg p-2 flex flex-col items-center justify-center text-center">
                            <span className="text-xl font-bold text-green-600 dark:text-green-400">3</span>
                            <span className="text-[10px] uppercase font-bold text-green-600/70 dark:text-green-400/70">Active</span>
                        </div>
                        <div className="flex-1 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2 flex flex-col items-center justify-center text-center">
                            <span className="text-xl font-bold text-yellow-600 dark:text-yellow-400">1</span>
                            <span className="text-[10px] uppercase font-bold text-yellow-600/70 dark:text-yellow-400/70">Idle</span>
                        </div>
                        <div className="flex-1 bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 flex flex-col items-center justify-center text-center">
                            <span className="text-xl font-bold text-blue-600 dark:text-blue-400">1</span>
                            <span className="text-[10px] uppercase font-bold text-blue-600/70 dark:text-blue-400/70">Empty</span>
                        </div>
                    </div>
                </div>
            </section>

            <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold tracking-tight">Active Bucket Runners</h2>
                    <div className="flex gap-1">
                        <span className="text-xs font-semibold bg-primary text-white px-2 py-0.5 rounded-full">{activeRunners.length} Active</span>
                    </div>
                </div>
                <div className="flex flex-col gap-3">
                    {activeRunners.map((runner, i) => (
                        <div key={runner.id || i} className="bg-white dark:bg-card-dark rounded-xl p-3 shadow-sm border border-gray-100 dark:border-white/5 flex items-center gap-3">
                            <div className="relative">
                                <div className="w-12 h-12 rounded-full bg-cover bg-center border-2 border-green-500" style={{ backgroundImage: `url('https://ui-avatars.com/api/?name=${runner.name}&background=random')` }}></div>
                                <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-card-dark">100%</div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">{runner.name}</h3>
                                    <span className="text-xs font-mono text-gray-500 dark:text-gray-400">#{runner.picker_id}</span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Row {runner.row || '?'}</p>
                                <div className="mt-1.5 w-full bg-gray-200 dark:bg-white/10 rounded-full h-1.5">
                                    <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '85%' }}></div>
                                </div>
                            </div>
                            <button className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-500 hover:text-primary transition-colors">
                                <span className="material-symbols-outlined text-lg">chat</span>
                            </button>
                        </div>
                    ))}
                    {activeRunners.length === 0 && (
                        <div className="text-center text-sm text-gray-400 py-4">No active runners.</div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default LogisticsView;
