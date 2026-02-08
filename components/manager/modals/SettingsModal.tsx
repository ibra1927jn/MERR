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

    // Initial state based on props or defaults
    const [formData, setFormData] = useState({
        startTime: '06:00', // Default start time
        variety: 'Lapins', // Default variety
        targetTons: settings?.target_tons || 40,
        pieceRate: settings?.piece_rate || 6.50
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Lógica para cambiar de huerto
    const handleOrchardSelect = (newOrchard: any) => {
        updateAuthState({ orchardId: newOrchard.id });
        window.location.reload();
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
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-card-dark w-full max-w-lg rounded-3xl p-6 shadow-2xl relative">
                <button onClick={onClose} className="absolute right-6 top-6 text-gray-400 hover:text-white">
                    <span className="material-symbols-outlined">close</span>
                </button>

                <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6">Manage Day</h2>

                <div className="space-y-4">
                    {/* ✅ EL SELECTOR ESTÁ AQUI */}
                    <div className="space-y-1.5 relative z-[70]">
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
                            <label className="text-xs font-bold text-gray-500 uppercase">Start Time</label>
                            <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} className="w-full bg-gray-50 dark:bg-card-lighter border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 dark:text-white outline-none" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 uppercase">Bucket Rate ($)</label>
                            <input type="number" name="pieceRate" value={formData.pieceRate} onChange={handleChange} className="w-full bg-gray-50 dark:bg-card-lighter border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 dark:text-white outline-none" />
                        </div>
                    </div>
                </div>

                <div className="mt-8">
                    <button onClick={handleSave} className="w-full py-4 bg-primary text-white rounded-xl font-bold">Update Settings</button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
