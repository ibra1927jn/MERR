/**
 * DayConfigModal - Modal para configurar el día de trabajo
 * Usado en TeamLeader para configurar orchard, variety y bin type
 */

import React, { useState } from 'react';

export interface DayConfig {
    orchard: string;
    variety: string;
    targetSize: string;
    targetColor: string;
    binType: 'Standard' | 'Export' | 'Process';
}

interface DayConfigModalProps {
    config: DayConfig;
    onClose: () => void;
    onSave: (config: DayConfig) => void;
}

const DayConfigModal: React.FC<DayConfigModalProps> = ({ config, onClose, onSave }) => {
    const [editedConfig, setEditedConfig] = useState({ ...config });

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-3xl p-6 w-[90%] max-w-md shadow-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-gray-900">Day Configuration</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Orchard Block</label>
                        <select
                            value={editedConfig.orchard}
                            onChange={(e) => setEditedConfig({ ...editedConfig, orchard: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#ff1f3d] outline-none text-gray-900 bg-white"
                        >
                            <option>El Pedregal - Block 4B</option>
                            <option>Sunny Hills - Block 2A</option>
                            <option>Mountain View - Block 1C</option>
                            <option>Valley Farm - Block 3D</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Variety</label>
                        <select
                            value={editedConfig.variety}
                            onChange={(e) => setEditedConfig({ ...editedConfig, variety: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#ff1f3d] outline-none text-gray-900 bg-white"
                        >
                            <option>Lapin</option>
                            <option>Santina</option>
                            <option>Sweetheart</option>
                            <option>Rainier</option>
                            <option>Bing</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Bin Type</label>
                        <div className="grid grid-cols-3 gap-3">
                            {(['Standard', 'Export', 'Process'] as const).map(type => (
                                <label key={type} className="cursor-pointer">
                                    <input
                                        type="radio"
                                        name="binType"
                                        checked={editedConfig.binType === type}
                                        onChange={() => setEditedConfig({ ...editedConfig, binType: type })}
                                        className="peer sr-only"
                                    />
                                    <div className="h-full rounded-xl border-2 border-gray-200 p-3 peer-checked:border-[#ff1f3d] peer-checked:bg-red-50 flex flex-col items-center transition-all">
                                        <span className="material-symbols-outlined text-[#ff1f3d] mb-1">
                                            {type === 'Standard' ? 'shopping_basket' : type === 'Export' ? 'inventory_2' : 'recycling'}
                                        </span>
                                        <span className="text-sm font-bold text-gray-900">{type}</span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                        <p className="text-xs font-bold text-blue-600 uppercase mb-2">📋 Quality Standards</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                                <span className="text-blue-900 font-bold">Size:</span>
                                <span className="text-blue-700 ml-1">{editedConfig.targetSize || '28mm+'}</span>
                            </div>
                            <div>
                                <span className="text-blue-900 font-bold">Color:</span>
                                <span className="text-blue-700 ml-1">{editedConfig.targetColor || 'Dark Red'}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => { onSave(editedConfig); onClose(); }}
                    className="w-full mt-6 py-4 bg-[#ff1f3d] text-white rounded-xl font-bold uppercase active:scale-95 transition-all"
                >
                    Save Configuration
                </button>
            </div>
        </div>
    );
};

export default DayConfigModal;
