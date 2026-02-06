import React from 'react';
import { Bin } from '../../../types';

interface LogisticsViewProps {
    activeBin: Bin;
    inventory: Bin[];
    onScanClick: (type: 'BUCKET' | 'BIN') => void;
}

const LogisticsView: React.FC<LogisticsViewProps> = ({ activeBin, inventory, onScanClick }) => {
    const emptyBinsCount = inventory.filter(b => b.status === 'empty').length;
    const fullBinsCount = inventory.filter(b => b.status === 'full').length;

    return (
        <div className="p-4 space-y-4">
            {/* Tarjeta de Bin Activo */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between mb-2">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 leading-none">Bin {activeBin.id}</h2>
                        <p className="text-sm font-medium text-gray-500 mt-1">{activeBin.type || 'Standard'}</p>
                    </div>
                    <span className="px-2 py-1 rounded bg-green-50 text-green-700 text-[10px] font-black uppercase tracking-widest border border-green-100">Active</span>
                </div>

                {/* Gráfico Circular SVG */}
                <div className="flex items-center justify-center py-4 relative">
                    <div className="w-48 h-48 relative">
                        <svg className="circular-chart" viewBox="0 0 36 36">
                            <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"></path>
                            <path
                                className="circle stroke-primary"
                                strokeDasharray={`${activeBin.fillPercentage || 0}, 100`}
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            ></path>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-black text-gray-900">{activeBin.fillPercentage || 0}%</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Full</span>
                        </div>
                    </div>
                </div>

                <div className="text-center">
                    <p className="text-gray-900 text-xl font-black">
                        {Math.floor(((activeBin.fillPercentage || 0) / 100) * 48)}<span className="text-gray-400 font-bold mx-1">/</span>48
                    </p>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-0.5">Buckets Collected</p>
                </div>
            </div>

            {/* Supply Management */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4">Supply Management</h3>
                <div className="grid grid-cols-2 gap-4 mb-5">
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <p className="text-[11px] font-bold text-gray-500 uppercase">Empty Bins</p>
                        <div className="flex items-baseline justify-between mt-1">
                            <span className="text-2xl font-black text-gray-900">{emptyBinsCount}</span>
                            <span className="text-[10px] font-black text-primary uppercase">Low</span>
                        </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <p className="text-[11px] font-bold text-gray-500 uppercase">Full Bins</p>
                        <div className="flex items-baseline justify-between mt-1">
                            <span className="text-2xl font-black text-gray-900">{fullBinsCount}</span>
                            <span className="text-[10px] font-black text-green-600 uppercase">Ready</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-4 pb-2">
                <button
                    onClick={() => onScanClick('BIN')}
                    className="flex-1 flex flex-col items-center justify-center py-4 bg-white border-2 border-primary text-primary rounded-2xl font-black text-xs uppercase tracking-widest active:bg-gray-50"
                >
                    <span className="material-symbols-outlined mb-1" style={{ fontSize: '28px' }}>crop_free</span>
                    Scan Bin
                </button>
                <button
                    onClick={() => onScanClick('BUCKET')}
                    className="flex-1 flex flex-col items-center justify-center py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-200 active:bg-primary-dark"
                >
                    <span className="material-symbols-outlined mb-1" style={{ fontSize: '28px' }}>label</span>
                    Scan Sticker
                </button>
            </div>
        </div>
    );
};

export default LogisticsView;
