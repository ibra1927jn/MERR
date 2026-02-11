/**
 * DaySettingsModal - Modal para configurar los ajustes del día
 * Extraído de Manager.tsx
 */

import React, { useState } from 'react';



interface DaySettings {
    bucketRate?: number;
    targetTons?: number;
    startTime?: string;
    teams?: string[];
}

interface DaySettingsModalProps {
    settings: DaySettings;
    onClose: () => void;
    onSave: (settings: DaySettings) => void;
    minWage?: number;
}

const DaySettingsModal: React.FC<DaySettingsModalProps> = ({ settings, onClose, onSave, minWage = 23.50 }) => {
    const [bucketRate, setBucketRate] = useState(settings.bucketRate?.toString() || '6.50');
    const [targetTons, setTargetTons] = useState(settings.targetTons?.toString() || '40');

    const handleSave = () => {
        onSave({
            ...settings,
            bucketRate: parseFloat(bucketRate),
            targetTons: parseFloat(targetTons)
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[#1e1e1e] rounded-3xl p-6 w-[90%] max-w-md shadow-2xl border border-[#333]" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-white">Day Settings</h3>
                    <button onClick={onClose} className="text-[#a1a1aa] hover:text-white">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-[#a1a1aa] uppercase mb-2 block">Bucket Rate ($)</label>
                        <input
                            type="number"
                            step="0.50"
                            value={bucketRate}
                            onChange={(e) => setBucketRate(e.target.value)}
                            aria-label="Bucket Rate in dollars"
                            className="w-full bg-[#121212] border border-[#333] rounded-xl px-4 py-3 text-white font-mono text-lg focus:border-primary outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-[#a1a1aa] uppercase mb-2 block">Daily Target (Tons)</label>
                        <input
                            type="number"
                            value={targetTons}
                            onChange={(e) => setTargetTons(e.target.value)}
                            aria-label="Daily Target in tons"
                            className="w-full bg-[#121212] border border-[#333] rounded-xl px-4 py-3 text-white font-mono text-lg focus:border-primary outline-none"
                        />
                    </div>

                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                        <p className="text-xs font-bold text-blue-400 uppercase mb-2">Calculated Minimums</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-lg font-bold text-white">${minWage}/hr</p>
                                <p className="text-xs text-[#a1a1aa]">Min Wage</p>
                            </div>
                            <div>
                                <p className="text-lg font-bold text-white">{(minWage / parseFloat(bucketRate || '6.50')).toFixed(1)} bkt/hr</p>
                                <p className="text-xs text-[#a1a1aa]">Min Rate</p>
                            </div>
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    className="w-full mt-6 py-4 bg-primary text-white rounded-xl font-bold uppercase"
                >
                    Save Settings
                </button>
            </div>
        </div>
    );
};

export default DaySettingsModal;
