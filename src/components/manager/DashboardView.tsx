/**
 * Manager Dashboard View Component
 * Displays stats, charts, and quick actions for the manager
 */
import React from 'react';
import { Picker, Alert, HarvestSettings, BucketRecord } from '../../types';
import HeatMapView from './HeatMapView';

// Utility function for smooth path
const getSmoothPath = (points: number[], width: number, height: number): string => {
    if (points.length < 2) return '';
    const max = Math.max(...points);
    const min = Math.min(...points);
    const mapY = (val: number) => height - ((val - min) / (max - min || 1)) * height;
    const stepX = width / (points.length - 1);
    let d = `M0,${mapY(points[0])}`;
    for (let i = 1; i < points.length; i++) {
        const x = i * stepX;
        const y = mapY(points[i]);
        const cp1x = x - stepX / 2;
        const cp1y = mapY(points[i - 1]);
        const cp2x = x - stepX / 2;
        const cp2y = y;
        d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${x},${y}`;
    }
    return d;
};

interface DashboardStats {
    totalBuckets: number;
    totalTons: number;
    activePickers: number;
    avgBucketsPerHour: number;
    timeData: number[];
}

interface DashboardViewProps {
    stats: DashboardStats;
    settings: HarvestSettings;
    crew: Picker[];
    alerts: Alert[];
    onViewPicker: (picker: Picker) => void;
    onResolveAlert: (id: string) => void;
    bucketRecords?: BucketRecord[];
}

const DashboardView: React.FC<DashboardViewProps> = ({
    stats,
    settings,
    crew,
    alerts,
    onViewPicker,
    onResolveAlert,
    bucketRecords = []
}) => {
    const { totalBuckets, totalTons, activePickers, avgBucketsPerHour, timeData } = stats;
    const progress = Math.min(100, (totalTons / settings.target_tons) * 100);
    const earnings = totalBuckets * settings.piece_rate;

    return (
        <main className="flex-1 overflow-y-auto pb-24 px-4 pt-4 space-y-4">
            {/* Progress Card */}
            <div className="bg-gradient-to-r from-[#d91e36] to-[#ff1f3d] rounded-2xl p-5 text-white">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase opacity-80 mb-1">Today's Progress</p>
                        <p className="text-4xl font-black">{totalTons.toFixed(1)}t</p>
                        <p className="text-xs opacity-70 mt-1">of {settings.target_tons}t target</p>
                    </div>
                    <div className="text-right">
                        <p className="text-3xl font-black">{Math.round(progress)}%</p>
                        <p className="text-xs opacity-70">complete</p>
                    </div>
                </div>
                <div className="mt-4 bg-white/20 rounded-full h-3">
                    <div
                        className="bg-white rounded-full h-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-[#d91e36] text-lg">inventory_2</span>
                        <p className="text-xs font-bold text-gray-500 uppercase">Buckets</p>
                    </div>
                    <p className="text-2xl font-black text-gray-900">{totalBuckets}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-green-600 text-lg">groups</span>
                        <p className="text-xs font-bold text-gray-500 uppercase">Active</p>
                    </div>
                    <p className="text-2xl font-black text-gray-900">{activePickers}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-blue-600 text-lg">speed</span>
                        <p className="text-xs font-bold text-gray-500 uppercase">Velocity</p>
                    </div>
                    <p className="text-2xl font-black text-gray-900">{avgBucketsPerHour}/hr</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-purple-600 text-lg">
                            payments
                        </span>
                        <p className="text-xs font-bold text-gray-500 uppercase">Earnings</p>
                    </div>
                    <p className="text-2xl font-black text-gray-900">${earnings.toFixed(0)}</p>
                </div>
            </div>

            {/* HeatMap Integration */}
            <div className="bg-white rounded-xl overflow-hidden shadow-md border border-gray-100">
                <HeatMapView
                    bucketRecords={bucketRecords}
                    crew={crew}
                    blockName="Live Overview"
                    rows={20}
                />
            </div>

            {/* Chart */}
            <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Velocity Trend</h3>
                <svg className="w-full h-24" viewBox="0 0 200 60">
                    <path
                        d={getSmoothPath(timeData, 200, 60)}
                        fill="none"
                        stroke="#d91e36"
                        strokeWidth="2"
                    />
                </svg>
            </div>

            {/* Alerts */}
            {alerts.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-sm font-bold text-gray-900">Active Alerts</h3>
                    {alerts.slice(0, 3).map(alert => (
                        <div
                            key={alert.id}
                            className={`rounded-xl p-4 border-l-4 ${alert.severity === 'high'
                                ? 'bg-red-50 border-red-500'
                                : alert.severity === 'medium'
                                    ? 'bg-amber-50 border-amber-500'
                                    : 'bg-blue-50 border-blue-500'
                                }`}
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="font-bold text-gray-900">{alert.title}</p>
                                    <p className="text-sm text-gray-600">{alert.description}</p>
                                </div>
                                <button
                                    onClick={() => onResolveAlert(alert.id)}
                                    className="text-xs font-bold text-gray-500 hover:text-gray-700"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Top Performers */}
            <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Top Performers</h3>
                {crew
                    .sort((a, b) => b.total_buckets_today - a.total_buckets_today)
                    .slice(0, 5)
                    .map((picker, i) => (
                        <div
                            key={picker.id}
                            onClick={() => onViewPicker(picker)}
                            className="flex items-center gap-3 py-2 cursor-pointer hover:bg-gray-50 rounded-lg px-2 -mx-2"
                        >
                            <span className="text-lg font-bold text-gray-400 w-6">#{i + 1}</span>
                            <div className="size-8 rounded-full bg-[#d91e36] text-white flex items-center justify-center text-sm font-bold">
                                {picker.avatar}
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-gray-900">{picker.name}</p>
                            </div>
                            <p className="text-lg font-bold text-[#d91e36]">{picker.total_buckets_today}</p>
                        </div>
                    ))}
            </div>
        </main>
    );
};

export default DashboardView;
