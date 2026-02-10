/**
 * Add Runner Modal - For adding new bucket runners
 */
import React, { useState } from 'react';

export interface RunnerData {
    id: string;
    name: string;
    avatar: string;
    status: 'Active' | 'Break' | 'Off Duty';
    startTime: string;
    breakTime?: string;
    currentRow?: number;
    bucketsHandled: number;
    binsCompleted: number;
}

interface AddRunnerModalProps {
    onClose: () => void;
    onAdd: (runner: RunnerData) => void;
}

const AddRunnerModal: React.FC<AddRunnerModalProps> = ({ onClose, onAdd }) => {
    const [name, setName] = useState('');
    const [startTime, setStartTime] = useState('');
    const [currentRow, setCurrentRow] = useState('');

    const handleAdd = () => {
        if (name && startTime) {
            const newRunner: RunnerData = {
                id: `RUNNER-${Date.now()}`,
                name,
                avatar: name.charAt(0).toUpperCase(),
                status: 'Active',
                startTime,
                currentRow: currentRow ? parseInt(currentRow) : undefined,
                bucketsHandled: 0,
                binsCompleted: 0,
            };
            onAdd(newRunner);
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-3xl p-6 w-[90%] max-w-md shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-gray-900">Add New Runner</h3>
                    <button onClick={onClose} className="text-gray-400">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">
                            Full Name *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g. John Smith"
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#d91e36] outline-none"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">
                            Start Time *
                        </label>
                        <input
                            type="time"
                            value={startTime}
                            onChange={e => setStartTime(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#d91e36] outline-none"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">
                            Assigned Row (Optional)
                        </label>
                        <input
                            type="number"
                            value={currentRow}
                            onChange={e => setCurrentRow(e.target.value)}
                            placeholder="e.g. 12"
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#d91e36] outline-none"
                        />
                    </div>

                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                        <p className="text-xs font-bold text-blue-600 uppercase mb-1">📋 Initial Status</p>
                        <p className="text-sm text-blue-900">
                            Will be set to <strong>Active</strong> upon creation
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleAdd}
                    disabled={!name || !startTime}
                    className="w-full mt-6 py-4 bg-[#d91e36] text-white rounded-xl font-bold uppercase tracking-widest disabled:bg-gray-300 active:scale-95 transition-all"
                >
                    Add Runner
                </button>
            </div>
        </div>
    );
};

export default AddRunnerModal;
