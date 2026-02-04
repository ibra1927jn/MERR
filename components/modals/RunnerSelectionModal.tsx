import React, { useState } from 'react';
import { RegisteredUser } from '../../services/database.service';

interface RunnerSelectionModalProps {
    availableRunners: RegisteredUser[];
    selectedRunnerIds: string[];
    onClose: () => void;
    onSave: (ids: string[]) => void;
}

const RunnerSelectionModal: React.FC<RunnerSelectionModalProps> = ({
    availableRunners,
    selectedRunnerIds,
    onClose,
    onSave
}) => {
    const [selected, setSelected] = useState<string[]>(selectedRunnerIds);

    const toggleRunner = (id: string) => {
        setSelected(prev =>
            prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
        );
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[#1e1e1e] rounded-3xl p-6 w-[90%] max-w-md shadow-2xl border border-[#333] max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-white">Select Active Runners</h3>
                    <button onClick={onClose} className="text-[#a1a1aa] hover:text-white">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="space-y-2 mb-6">
                    {availableRunners.map(runner => (
                        <div
                            key={runner.id}
                            onClick={() => toggleRunner(runner.id)}
                            className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${selected.includes(runner.id)
                                ? 'bg-blue-500/20 border-blue-500'
                                : 'bg-[#121212] border-[#333] hover:border-gray-500'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`size-10 rounded-full flex items-center justify-center font-bold text-white ${selected.includes(runner.id) ? 'bg-blue-500' : 'bg-[#27272a]'
                                    }`}>
                                    {runner.full_name?.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-white font-bold">{runner.full_name}</p>
                                    <p className="text-xs text-[#a1a1aa]">{runner.email}</p>
                                </div>
                            </div>
                            {selected.includes(runner.id) && (
                                <span className="material-symbols-outlined text-blue-500">check_circle</span>
                            )}
                        </div>
                    ))}
                    {availableRunners.length === 0 && (
                        <p className="text-center text-[#666] py-8">No runners found.</p>
                    )}
                </div>

                <button
                    onClick={() => { onSave(selected); onClose(); }}
                    className="w-full py-4 bg-blue-500 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-blue-600 transition-all"
                >
                    Confirm Selection ({selected.length})
                </button>
            </div>
        </div>
    );
};

export default RunnerSelectionModal;
