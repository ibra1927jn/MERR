// =============================================
// RUNNER DETAIL MODAL
// =============================================
// Muestra información del Bucket Runner

import React from 'react';
import { RegisteredUser } from '../../services/database.service';

interface RunnerDetailModalProps {
    runner: RegisteredUser;
    assignedRows?: number[];
    bucketsToday?: number;
    status?: 'Active' | 'Break' | 'Inactive';
    onClose: () => void;
}

const RunnerDetailModal: React.FC<RunnerDetailModalProps> = ({
    runner,
    assignedRows = [],
    bucketsToday = 0,
    status = 'Active',
    onClose
}) => {
    const avatar = runner.full_name
        ? runner.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : 'BR';

    const statusConfig = {
        'Active': { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-500', icon: 'check_circle' },
        'Break': { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-500', icon: 'coffee' },
        'Inactive': { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-500', icon: 'cancel' },
    };

    const cfg = statusConfig[status];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[#1e1e1e] rounded-3xl p-6 w-[90%] max-w-md shadow-2xl border border-[#333] max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="size-14 rounded-full bg-orange-500/20 border-2 border-orange-500 flex items-center justify-center font-bold text-orange-500 text-xl">
                            {avatar}
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white">{runner.full_name}</h3>
                            <p className="text-sm text-orange-400 font-medium">Bucket Runner</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-[#a1a1aa] hover:text-white">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Status Banner */}
                <div className={`mb-6 p-4 rounded-xl border ${cfg.bg} ${cfg.border}`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase text-[#a1a1aa]">Current Status</p>
                            <p className={`text-lg font-black ${cfg.text}`}>{status}</p>
                        </div>
                        <span className={`material-symbols-outlined text-3xl ${cfg.text}`}>{cfg.icon}</span>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-[#121212] rounded-xl p-4 border border-[#333]">
                        <p className="text-[10px] text-[#a1a1aa] uppercase font-bold">Buckets Today</p>
                        <p className="text-3xl font-black text-primary mt-1">{bucketsToday}</p>
                    </div>
                    <div className="bg-[#121212] rounded-xl p-4 border border-[#333]">
                        <p className="text-[10px] text-[#a1a1aa] uppercase font-bold">Rows Covered</p>
                        <p className="text-3xl font-black text-white mt-1">{assignedRows.length}</p>
                    </div>
                </div>

                {/* Assigned Rows */}
                <div className="bg-[#121212] rounded-xl p-4 border border-[#333] mb-6">
                    <p className="text-xs font-bold text-[#a1a1aa] uppercase mb-3">Assigned Rows</p>
                    {assignedRows.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {assignedRows.map(row => (
                                <span key={row} className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-lg text-sm font-bold">
                                    Row {row}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <p className="text-[#666] text-sm">No rows currently assigned</p>
                    )}
                </div>

                {/* Contact Info */}
                <div className="bg-[#121212] rounded-xl p-4 border border-[#333]">
                    <p className="text-xs font-bold text-[#a1a1aa] uppercase mb-2">Contact</p>
                    <p className="text-white text-sm">{runner.email}</p>
                </div>

                {/* Quick Actions */}
                <div className="mt-6 space-y-2">
                    <button className="w-full py-3 bg-[#121212] border border-[#333] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:border-primary transition-colors">
                        <span className="material-symbols-outlined text-[20px]">chat</span>
                        Send Message
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RunnerDetailModal;
