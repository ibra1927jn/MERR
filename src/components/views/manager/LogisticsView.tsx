import React, { useState } from 'react';
import { Tab } from '../../../types';

interface LogisticsViewProps {
    fullBins: number;
    emptyBins: number;
    activeRunners: { id: string; name: string; status?: string; row?: number; current_row?: number }[];
    _setActiveTab: (tab: Tab) => void;
    onRequestPickup?: () => void;
}

// Runner movement states with visual styling
const RUNNER_STATES = {
    queue: { label: 'In Queue', color: 'bg-gray-500', textColor: 'text-gray-500', icon: 'hourglass_empty' },
    loading: { label: 'Loading', color: 'bg-yellow-500', textColor: 'text-yellow-500', icon: 'local_shipping' },
    to_bin: { label: 'To Bin', color: 'bg-green-500', textColor: 'text-green-500', icon: 'arrow_forward' },
    returning: { label: 'Returning', color: 'bg-blue-500', textColor: 'text-blue-500', icon: 'arrow_back' }
};

type RunnerState = keyof typeof RUNNER_STATES;

const LogisticsView: React.FC<LogisticsViewProps> = ({ fullBins, emptyBins, activeRunners, _setActiveTab, onRequestPickup }) => {
    const [binFullAlert, setBinFullAlert] = useState(false);

    // Simulate runner states (in real app, comes from context or server)
    const getRunnerState = (index: number): RunnerState => {
        const states: RunnerState[] = ['queue', 'loading', 'to_bin', 'returning'];
        return states[index % states.length];
    };

    const handleBinFullAlert = () => {
        setBinFullAlert(true);
        // In production: trigger push notification / realtime event to runners
        setTimeout(() => setBinFullAlert(false), 3000);
    };

    return (
        <div className="flex flex-col gap-6 p-4">
            {/* Bin Full Alert Toast */}
            {binFullAlert && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
                    <span className="material-symbols-outlined">warning</span>
                    <span className="font-bold">BIN FULL ALERT SENT!</span>
                </div>
            )}

            <section className="grid grid-cols-2 gap-4">
                {/* Full Bins Card */}
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

                {/* Empty Supply Card */}
                <div
                    onClick={onRequestPickup}
                    className="bg-white dark:bg-card-dark rounded-xl p-4 shadow-sm border border-gray-100 dark:border-white/5 relative overflow-hidden group cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-all"
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

                {/* Bin Full Alert Button */}
                <div className="col-span-2">
                    <button
                        onClick={handleBinFullAlert}
                        className="w-full py-4 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl font-bold flex items-center justify-center gap-3 shadow-lg hover:from-red-700 hover:to-red-600 active:scale-95 transition-all"
                    >
                        <span className="material-symbols-outlined text-2xl">notification_important</span>
                        SEND "BIN FULL" ALERT
                    </button>
                </div>

                {/* Tractor Fleet Status */}
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

            {/* Active Bucket Runners with Movement States */}
            <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold tracking-tight">Active Bucket Runners</h2>
                    <div className="flex gap-1">
                        <span className="text-xs font-semibold bg-primary text-white px-2 py-0.5 rounded-full">{activeRunners.length} Active</span>
                    </div>
                </div>

                {/* Runner State Legend */}
                <div className="flex flex-wrap gap-2 text-[10px]">
                    {Object.entries(RUNNER_STATES).map(([key, val]) => (
                        <div key={key} className="flex items-center gap-1 bg-white dark:bg-card-dark px-2 py-1 rounded-full border border-gray-100 dark:border-white/10">
                            <span className={`w-2 h-2 rounded-full ${val.color}`}></span>
                            <span className="text-gray-600 dark:text-gray-300">{val.label}</span>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col gap-3">
                    {activeRunners.map((runner, i) => {
                        const state = getRunnerState(i);
                        const stateInfo = RUNNER_STATES[state];

                        return (
                            <div key={runner.id || i} className="bg-white dark:bg-card-dark rounded-xl p-3 shadow-sm border border-gray-100 dark:border-white/5 flex items-center gap-3">
                                <div className="relative">
                                    <div
                                        className={`w-12 h-12 rounded-full bg-cover bg-center border-2 ${stateInfo.color.replace('bg-', 'border-')}`}
                                        style={{ backgroundImage: `url('https://ui-avatars.com/api/?name=${runner.name}&background=random')` }}
                                    ></div>
                                    {/* State indicator */}
                                    <div className={`absolute -bottom-1 -right-1 ${stateInfo.color} text-white p-1 rounded-full border-2 border-card-dark`}>
                                        <span className="material-symbols-outlined text-[12px]">{stateInfo.icon}</span>
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">{runner.name}</h3>
                                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${stateInfo.color}/20 ${stateInfo.textColor}`}>
                                            {stateInfo.label}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Row {runner.row || runner.current_row || '?'}</p>
                                    <div className="mt-1.5 w-full bg-gray-200 dark:bg-white/10 rounded-full h-1.5">
                                        <div className={`${stateInfo.color} h-1.5 rounded-full transition-all`} style={{ width: state === 'to_bin' ? '100%' : state === 'loading' ? '60%' : '30%' }}></div>
                                    </div>
                                </div>
                                <button className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-500 hover:text-primary transition-colors">
                                    <span className="material-symbols-outlined text-lg">chat</span>
                                </button>
                            </div>
                        );
                    })}
                    {activeRunners.length === 0 && (
                        <div className="text-center text-sm text-gray-400 py-4">No active runners.</div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default LogisticsView;
