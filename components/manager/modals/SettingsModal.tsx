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
        selectedDate: new Date().toISOString().split('T')[0],
        startTime: '06:00',
        variety: settings?.variety || 'Lapins',
        fruitSize: settings?.fruit_size || '28mm+',
        fruitColor: settings?.fruit_color || 'Dark Red',
        targetTons: settings?.target_tons || 40,
        pieceRate: settings?.piece_rate || 6.50
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleOrchardSelect = (newOrchard: any) => {
        updateAuthState({ orchardId: newOrchard.id });
        window.location.reload();
    };

    const handleSave = () => {
        // Aquí enviamos todos los datos nuevos a la función de actualización
        onUpdate({
            ...settings,
            date: formData.selectedDate,
            variety: formData.variety,
            fruit_size: formData.fruitSize,
            fruit_color: formData.fruitColor,
            target_tons: parseFloat(formData.targetTons.toString()),
            piece_rate: parseFloat(formData.pieceRate.toString())
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-card-dark w-full max-w-lg rounded-3xl p-6 shadow-2xl relative animate-in slide-in-from-bottom duration-300 border border-slate-100 dark:border-white/10">
                <button onClick={onClose} className="absolute right-5 top-5 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                    <span className="material-symbols-outlined">close</span>
                </button>

                <div className="mb-6">
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-none mb-1">Manage Day</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Configure harvest parameters for today.</p>
                </div>

                <div className="space-y-5">
                    {/* 1. SELECCIÓN DE HUERTO (Prioridad Alta) */}
                    <div className="space-y-1.5 relative z-[70]">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Active Block</label>
                        <div className="w-full">
                            <OrchardSelector
                                selectedOrchard={currentOrchard}
                                onSelect={handleOrchardSelect}
                            />
                        </div>
                    </div>

                    {/* 2. TIEMPO: Día y Hora */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Date</label>
                            <input type="date" name="selectedDate" value={formData.selectedDate} onChange={handleChange} className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-[#00f0ff]/50" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Start Time</label>
                            <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-[#00f0ff]/50" />
                        </div>
                    </div>

                    {/* 3. FRUTA: Variedad, Tamaño, Color (NUEVO) */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Variety</label>
                            <select name="variety" value={formData.variety} onChange={handleChange} className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-3 text-sm font-bold text-gray-900 dark:text-white outline-none appearance-none">
                                <option>Lapins</option>
                                <option>Stella</option>
                                <option>Sweetheart</option>
                                <option>Cherish</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Size</label>
                            <input type="text" name="fruitSize" placeholder="e.g. 28mm" value={formData.fruitSize} onChange={handleChange} className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-3 text-sm font-bold text-gray-900 dark:text-white outline-none" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Color</label>
                            <select name="fruitColor" value={formData.fruitColor} onChange={handleChange} className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-3 text-sm font-bold text-gray-900 dark:text-white outline-none appearance-none">
                                <option>Red</option>
                                <option>Dark Red</option>
                                <option>Black</option>
                            </select>
                        </div>
                    </div>

                    {/* 4. OBJETIVOS: Precio y Toneladas */}
                    <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 grid grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Bucket Price</label>
                            <div className="relative group">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold group-focus-within:text-[#00f0ff]">$</span>
                                <input type="number" name="pieceRate" value={formData.pieceRate} onChange={handleChange} className="w-full bg-white dark:bg-black border border-gray-200 dark:border-white/10 rounded-xl pl-7 pr-3 py-2 text-xl font-black text-gray-900 dark:text-white outline-none focus:border-[#00f0ff]" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Target Yield</label>
                            <div className="relative group">
                                <input type="number" name="targetTons" value={formData.targetTons} onChange={handleChange} className="w-full bg-white dark:bg-black border border-gray-200 dark:border-white/10 rounded-xl pl-4 pr-12 py-2 text-xl font-black text-gray-900 dark:text-white outline-none focus:border-[#00f0ff]" />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 uppercase">TONS</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8">
                    <button onClick={handleSave} className="w-full py-4 bg-gradient-to-r from-[#00f0ff] to-[#00d0df] hover:from-[#00d0df] hover:to-[#00b0bf] text-black rounded-xl font-black text-lg shadow-lg shadow-[#00f0ff]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined">save</span>
                        Confirm Day Setup
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
