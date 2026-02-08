import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import OrchardSelector from '../OrchardSelector';

interface SettingsModalProps {
    onClose: () => void;
    settings: any;
    onUpdate: (settings: any) => void;
    currentOrchard: any;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, settings, onUpdate, currentOrchard }) => {
    const { updateAuthState } = useAuth();

    const [formData, setFormData] = useState({
        startTime: '06:00',
        variety: 'Lapins',
        targetTons: settings?.target_tons || 40,
        pieceRate: settings?.piece_rate || 6.50
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Handle orchard change via selector
    const handleOrchardSelect = (newOrchard: any) => {
        updateAuthState({ orchardId: newOrchard.id });
        window.location.reload(); // Reload to apply the new orchard context
    };

    const handleSave = () => {
        onUpdate({
            ...settings,
            target_tons: parseFloat(formData.targetTons.toString()),
            piece_rate: parseFloat(formData.pieceRate.toString())
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-card-dark w-full max-w-lg rounded-3xl p-6 shadow-2xl relative animate-in slide-in-from-bottom duration-300">
                <button onClick={onClose} className="absolute right-6 top-6 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                    <span className="material-symbols-outlined">close</span>
                </button>

                <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-1">Manage Day</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Setup daily parameters and goals.</p>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 uppercase">Start Time</label>
                            <input
                                type="time" name="startTime" value={formData.startTime} onChange={handleChange}
                                className="w-full bg-gray-50 dark:bg-card-lighter border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 uppercase">Variety</label>
                            <select
                                name="variety" value={formData.variety} onChange={handleChange}
                                className="w-full bg-gray-50 dark:bg-card-lighter border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
                            >
                                <option>Lapins</option>
                                <option>Stella</option>
                                <option>Sweetheart</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1.5 relative z-50">
                        <label className="text-xs font-bold text-gray-500 uppercase">Active Orchard</label>
                        <div className="w-full">
                            <OrchardSelector
                                selectedOrchard={currentOrchard}
                                onSelect={handleOrchardSelect}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 uppercase">Bucket Price ($)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                                <input
                                    type="number" name="pieceRate" value={formData.pieceRate} onChange={handleChange}
                                    className="w-full bg-gray-50 dark:bg-card-lighter border border-gray-200 dark:border-white/10 rounded-xl pl-8 pr-4 py-3 text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 uppercase">Target (Tons)</label>
                            <div className="relative">
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">TONS</span>
                                <input
                                    type="number" name="targetTons" value={formData.targetTons} onChange={handleChange}
                                    className="w-full bg-gray-50 dark:bg-card-lighter border border-gray-200 dark:border-white/10 rounded-xl pl-4 pr-12 py-3 text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8">
                    <button onClick={handleSave} className="w-full py-4 bg-primary text-white rounded-xl font-bold text-lg shadow-lg shadow-primary/30 active:scale-[0.98] transition-all">
                        Update Settings
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
