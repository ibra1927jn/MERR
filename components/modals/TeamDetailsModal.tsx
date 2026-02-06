import React from 'react';
import { RegisteredUser } from '../../services/database.service';
import { Picker, MINIMUM_WAGE, PIECE_RATE } from '../../types';

interface TeamDetailsModalProps {
    leader: RegisteredUser;
    teamMembers: Picker[];
    onClose: () => void;
}

const TeamDetailsModal: React.FC<TeamDetailsModalProps> = ({
    leader,
    teamMembers,
    onClose
}) => {
    // Calculate stats
    const totalBuckets = teamMembers.reduce((sum, p) => sum + p.total_buckets_today, 0);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[#1e1e1e] rounded-3xl p-6 w-[90%] max-w-2xl shadow-2xl border border-[#333] max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between mb-6 border-b border-[#333] pb-4">
                    <div className="flex items-center gap-4">
                        <div className="size-16 rounded-full bg-purple-500 flex items-center justify-center font-bold text-white text-2xl">
                            {leader.full_name?.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-white">{leader.full_name}'s Team</h3>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-sm text-[#a1a1aa]">{teamMembers.length} Members</span>
                                <span className="w-1 h-1 rounded-full bg-[#333]"></span>
                                <span className="text-sm text-primary font-bold">{totalBuckets} Total Buckets</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-[#a1a1aa] hover:text-white bg-[#27272a] p-2 rounded-full">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Team Members List */}
                <div className="space-y-1">
                    <div className="grid grid-cols-12 gap-2 text-xs font-bold text-[#a1a1aa] uppercase px-4 pb-2">
                        <div className="col-span-5">Picker</div>
                        <div className="col-span-2 text-center">Buckets</div>
                        <div className="col-span-3 text-center">Performance</div>
                        <div className="col-span-2 text-right">Row</div>
                    </div>

                    {teamMembers.length === 0 ? (
                        <div className="text-center py-10 text-[#666]">
                            <span className="material-symbols-outlined text-4xl mb-2">group_off</span>
                            <p>No pickers assigned to this team.</p>
                        </div>
                    ) : (
                        teamMembers.map(picker => {
                            const hourlyRate = picker.hours && picker.hours > 0
                                ? (picker.total_buckets_today * PIECE_RATE) / picker.hours
                                : 0;
                            const isAboveMin = hourlyRate >= MINIMUM_WAGE;

                            return (
                                <div key={picker.id} className="grid grid-cols-12 gap-2 items-center bg-[#121212] p-3 rounded-xl border border-[#27272a]">
                                    {/* Name & ID */}
                                    <div className="col-span-5 flex items-center gap-3">
                                        <div className="size-8 rounded-full bg-[#1e1e1e] flex items-center justify-center text-xs font-bold">
                                            {picker.avatar}
                                        </div>
                                        <div>
                                            <p className="text-white font-bold text-sm truncate">{picker.name}</p>
                                            <p className="text-[10px] text-[#666]">{picker.picker_id}</p>
                                        </div>
                                    </div>

                                    {/* Buckets */}
                                    <div className="col-span-2 text-center">
                                        <span className="text-white font-black text-lg">{picker.total_buckets_today}</span>
                                    </div>

                                    {/* Rate */}
                                    <div className="col-span-3 text-center">
                                        <div className={`text-xs font-bold ${isAboveMin ? 'text-green-500' : 'text-red-500'}`}>
                                            ${hourlyRate.toFixed(2)}/hr
                                        </div>
                                        <div className="text-[10px] text-[#666]">
                                            {picker.hours ? `${picker.hours.toFixed(1)}h` : '0h'}
                                        </div>
                                    </div>

                                    {/* Row */}
                                    <div className="col-span-2 text-right">
                                        <span className="bg-[#27272a] px-2 py-1 rounded text-xs text-white">
                                            {picker.row ? `R${picker.row}` : '--'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default TeamDetailsModal;
