// =============================================
// TEAM LEADER DETAIL MODAL
// =============================================
// Muestra estadísticas del equipo del Team Leader

import React, { useState, useEffect } from 'react';
import { databaseService, RegisteredUser } from '../../services/database.service';

interface TeamStats {
    pickerCount: number;
    totalBuckets: number;
    activeRows: number[];
    aboveMinimum: number;
    belowMinimum: number;
}

interface TeamLeaderDetailModalProps {
    teamLeader: RegisteredUser;
    onClose: () => void;
}

const TeamLeaderDetailModal: React.FC<TeamLeaderDetailModalProps> = ({
    teamLeader,
    onClose
}) => {
    const [stats, setStats] = useState<TeamStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadStats = async () => {
            try {
                const data = await databaseService.getTeamStats(teamLeader.id);
                setStats(data);
            } catch (error) {
                console.error('Error loading team stats:', error);
            } finally {
                setLoading(false);
            }
        };
        loadStats();
    }, [teamLeader.id]);

    const avatar = teamLeader.full_name
        ? teamLeader.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : 'TL';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[#1e1e1e] rounded-3xl p-6 w-[90%] max-w-md shadow-2xl border border-[#333] max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="size-14 rounded-full bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center font-bold text-blue-500 text-xl">
                            {avatar}
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white">{teamLeader.full_name}</h3>
                            <p className="text-sm text-blue-400 font-medium">Team Leader</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-[#a1a1aa] hover:text-white">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin size-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                    </div>
                ) : stats ? (
                    <>
                        {/* Team Stats */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-[#121212] rounded-xl p-4 border border-[#333]">
                                <p className="text-[10px] text-[#a1a1aa] uppercase font-bold">Pickers</p>
                                <p className="text-3xl font-black text-white mt-1">{stats.pickerCount}</p>
                            </div>
                            <div className="bg-[#121212] rounded-xl p-4 border border-[#333]">
                                <p className="text-[10px] text-[#a1a1aa] uppercase font-bold">Total Buckets</p>
                                <p className="text-3xl font-black text-primary mt-1">{stats.totalBuckets}</p>
                            </div>
                        </div>

                        {/* Active Rows */}
                        <div className="bg-[#121212] rounded-xl p-4 border border-[#333] mb-6">
                            <p className="text-xs font-bold text-[#a1a1aa] uppercase mb-3">Active Rows</p>
                            {stats.activeRows.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {stats.activeRows.map(row => (
                                        <span key={row} className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-sm font-bold">
                                            Row {row}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[#666] text-sm">No active rows assigned</p>
                            )}
                        </div>

                        {/* Minimum Wage Status */}
                        <div className="bg-[#121212] rounded-xl p-4 border border-[#333] mb-6">
                            <p className="text-xs font-bold text-[#a1a1aa] uppercase mb-3">Minimum Wage Status</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
                                    <p className="text-2xl font-black text-green-500">{stats.aboveMinimum}</p>
                                    <p className="text-xs text-green-400">Above Minimum</p>
                                </div>
                                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
                                    <p className="text-2xl font-black text-red-500">{stats.belowMinimum}</p>
                                    <p className="text-xs text-red-400">Below Minimum</p>
                                </div>
                            </div>
                        </div>

                        {/* Contact Info */}
                        <div className="bg-[#121212] rounded-xl p-4 border border-[#333]">
                            <p className="text-xs font-bold text-[#a1a1aa] uppercase mb-2">Contact</p>
                            <p className="text-white text-sm">{teamLeader.email}</p>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-8">
                        <p className="text-[#a1a1aa]">No team data available</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeamLeaderDetailModal;
