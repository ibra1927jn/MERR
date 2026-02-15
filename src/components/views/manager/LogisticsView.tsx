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
    queue: { label: 'In Queue', color: 'bg-slate-500', textColor: 'text-slate-500', icon: 'hourglass_empty' },
    loading: { label: 'Loading', color: 'bg-yellow-500', textColor: 'text-yellow-500', icon: 'local_shipping' },
    to_bin: { label: 'To Bin', color: 'bg-green-500', textColor: 'text-green-500', icon: 'arrow_forward' },
    returning: { label: 'Returning', color: 'bg-blue-500', textColor: 'text-blue-500', icon: 'arrow_back' }
};

type RunnerState = keyof typeof RUNNER_STATES;

const LogisticsView: React.FC<LogisticsViewProps> = ({ fullBins, emptyBins, activeRunners, _setActiveTab, onRequestPickup }) => {
    const [binFullAlert, setBinFullAlert] = useState(false);

    // Derive runner state from real status field
    const getRunnerState = (runner: { status?: string }): RunnerState => {
        const statusMap: Record<string, RunnerState> = {
            'active': 'to_bin',
            'checked_in': 'loading',
            'idle': 'queue',
            'returning': 'returning',
        };
        return statusMap[runner.status || ''] || 'queue';
    };

    // Derive fleet counts from real runner data
    const fleetActive = activeRunners.filter(r => r.status === 'active' || r.status === 'checked_in').length;
    const fleetIdle = activeRunners.filter(r => !r.status || r.status === 'idle').length;
    const fleetTotal = activeRunners.length || 0;

    const handleBinFullAlert = () => {
        setBinFullAlert(true);
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
                <div className="glass-card p-4 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <span className="material-symbols-outlined text-6xl text-primary">inventory_2</span>
                    </div>
                    <div className="relative z-10">
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Awaiting Pickup</p>
                        <div className="flex items-end gap-2">
                            <h3 className="text-3xl font-bold text-text-main">{fullBins}</h3>
                            <span className="text-xs font-bold text-primary mb-1.5">Full Bins</span>
                        </div>
                        <div className="mt-2 text-xs text-text-muted flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                            High Priority
                        </div>
                    </div>
                </div>

                {/* Empty Supply Card */}
                <div
                    onClick={onRequestPickup}
                    className="glass-card glass-card-hover p-4 relative overflow-hidden group cursor-pointer transition-all"
                >
                    <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <span className="material-symbols-outlined text-6xl text-green-500">check_box_outline_blank</span>
                    </div>
                    <div className="relative z-10">
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1 flex items-center justify-between">
                            Empty Supply
                            <span className="material-symbols-outlined text-green-500 text-sm opacity-0 group-hover:opacity-100 transition-opacity">touch_app</span>
                        </p>
                        <div className="flex items-end gap-2">
                            <h3 className="text-3xl font-bold text-text-main">{emptyBins}</h3>
                            <span className="text-xs font-bold text-green-500 mb-1.5">Bins</span>
                        </div>
                        <div className="mt-2 text-xs text-text-muted flex items-center gap-1">
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
                <div className="col-span-2 glass-card p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-bold tracking-tight flex items-center gap-2">
                            <span className="material-symbols-outlined text-slate-400 text-lg">agriculture</span>
                            Tractor Fleet Status
                        </h2>
                        <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-text-sub">{fleetTotal} Total</span>
                    </div>
                    <div className="flex gap-2">
                        <div className="flex-1 bg-green-500/10 border border-green-500/20 rounded-lg p-2 flex flex-col items-center justify-center text-center">
                            <span className="text-xl font-bold text-green-600">{fleetActive}</span>
                            <span className="text-[10px] uppercase font-bold text-green-600/70">Active</span>
                        </div>
                        <div className="flex-1 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2 flex flex-col items-center justify-center text-center">
                            <span className="text-xl font-bold text-yellow-600">{fleetIdle}</span>
                            <span className="text-[10px] uppercase font-bold text-yellow-600/70">Idle</span>
                        </div>
                        <div className="flex-1 bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 flex flex-col items-center justify-center text-center">
                            <span className="text-xl font-bold text-blue-600">{Math.max(0, fleetTotal - fleetActive - fleetIdle)}</span>
                            <span className="text-[10px] uppercase font-bold text-blue-600/70">Off</span>
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
                        <div key={key} className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-full border border-border-light">
                            <span className={`w-2 h-2 rounded-full ${val.color}`}></span>
                            <span className="text-text-sub">{val.label}</span>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col gap-3">
                    {activeRunners.map((runner, i) => {
                        const state = getRunnerState(runner);
                        const stateInfo = RUNNER_STATES[state];

                        return (
                            <div key={runner.id || i} className="glass-card p-3 flex items-center gap-3">
                                <div className="relative">
                                    <div
                                        className={`w-12 h-12 rounded-full bg-cover bg-center border-2 dynamic-bg-image ${stateInfo.color.replace('bg-', 'border-')}`}
                                        style={{ '--bg-image': `url('https://ui-avatars.com/api/?name=${runner.name}&background=random')` } as React.CSSProperties}
                                    ></div>
                                    {/* State indicator */}
                                    <div className={`absolute -bottom-1 -right-1 ${stateInfo.color} text-white p-1 rounded-full border-2 border-white`}>
                                        <span className="material-symbols-outlined text-[12px]">{stateInfo.icon}</span>
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h3 className="text-sm font-bold text-text-main truncate">{runner.name}</h3>
                                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${stateInfo.color}/20 ${stateInfo.textColor}`}>
                                            {stateInfo.label}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 truncate">Row {runner.row || runner.current_row || '?'}</p>
                                    <div className="mt-1.5 w-full bg-slate-100 rounded-full h-1.5">
                                        <div className={`${stateInfo.color} h-1.5 rounded-full transition-all dynamic-width`} style={{ '--w': state === 'to_bin' ? '100%' : state === 'loading' ? '60%' : '30%' } as React.CSSProperties}></div>
                                    </div>
                                </div>
                                <button className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-text-muted hover:text-primary transition-colors">
                                    <span className="material-symbols-outlined text-lg">chat</span>
                                </button>
                            </div>
                        );
                    })}
                    {activeRunners.length === 0 && (
                        <div className="text-center text-sm text-text-muted py-4">No active runners.</div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default LogisticsView;
