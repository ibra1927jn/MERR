import React, { useState } from 'react';
import { useHarvest } from '../../../context/HarvestContext';
import { Picker } from '../../../types';

interface RowAssignmentModalProps {
    onClose: () => void;
    initialRow?: number;
}

const RowAssignmentModal: React.FC<RowAssignmentModalProps> = ({ onClose, initialRow = 1 }) => {
    const { assignRow, crew, orchard } = useHarvest();
    const [selectedRow, setSelectedRow] = useState(initialRow);
    const [selectedLeader, setSelectedLeader] = useState<string>('');
    const [selectedSide, setSelectedSide] = useState<'north' | 'south'>('north');

    const teamLeaders = crew.filter(p => p.role === 'team_leader');

    const handleAssign = async () => {
        if (!assignRow || !selectedLeader) return;

        // Find all runners for this leader
        const teamMembers = crew.filter(p => p.team_leader_id === selectedLeader || p.id === selectedLeader);
        const memberIds = teamMembers.map(p => p.id);

        await assignRow(selectedRow, selectedSide, memberIds);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-card-dark w-full max-w-sm rounded-3xl p-6 shadow-2xl relative">
                <button onClick={onClose} className="absolute right-4 top-4 text-gray-400">
                    <span className="material-symbols-outlined">close</span>
                </button>

                <h2 className="text-xl font-black dark:text-white mb-1">Assign Row {selectedRow}</h2>
                <p className="text-sm text-gray-500 mb-6">{orchard?.name || 'Orchard Block'}</p>

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase">Select Row</label>
                        <select
                            value={selectedRow}
                            onChange={(e) => setSelectedRow(Number(e.target.value))}
                            className="w-full bg-gray-50 dark:bg-card-lighter border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 font-bold outline-none dark:text-white"
                        >
                            {Array.from({ length: 50 }, (_, i) => i + 1).map(r => (
                                <option key={r} value={r}>Row {r}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase">Assign Team Leader</label>
                        <select
                            value={selectedLeader}
                            onChange={(e) => setSelectedLeader(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-card-lighter border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 font-bold outline-none dark:text-white"
                        >
                            <option value="">Select Leader...</option>
                            {teamLeaders.map(tl => (
                                <option key={tl.id} value={tl.id}>{tl.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase">Side</label>
                        <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
                            <button
                                onClick={() => setSelectedSide('north')}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${selectedSide === 'north' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}
                            >North Face</button>
                            <button
                                onClick={() => setSelectedSide('south')}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${selectedSide === 'south' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}
                            >South Face</button>
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleAssign}
                    disabled={!selectedLeader}
                    className="w-full mt-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Confirm Assignment
                </button>
            </div>
        </div>
    );
};

export default RowAssignmentModal;
