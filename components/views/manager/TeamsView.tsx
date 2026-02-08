/**
 * components/views/manager/TeamsView.tsx
 */
import React, { useState, useMemo } from 'react';
import { Picker, Role } from '../../../types';
import TeamLeaderCard from './TeamLeaderCard';

interface HarvestSettings {
    min_buckets_per_hour?: number;
    [key: string]: any;
}

interface TeamsViewProps {
    crew: Picker[];
    setShowAddUser: (show: boolean) => void;
    setSelectedUser: (user: Picker) => void;
    settings: HarvestSettings;
}

const TeamsView: React.FC<TeamsViewProps> = ({ crew, setShowAddUser, setSelectedUser, settings }) => {
    const [search, setSearch] = useState('');

    // 1. Group Data Hierarchy
    const { leaders, runners, unassigned, groupedCrew } = useMemo(() => {
        const leaders = crew.filter(p => p.role === Role.TEAM_LEADER || p.role === 'team_leader');
        const runners = crew.filter(p => p.role === Role.RUNNER || p.role === 'runner');

        // Group pickers by team_leader_id
        const grouped: Record<string, Picker[]> = {};
        const unassignedList: Picker[] = [];

        crew.forEach(p => {
            // Skip leaders and runners in the "picker list" logic
            if (p.role === Role.TEAM_LEADER || p.role === 'team_leader') return;
            if (p.role === Role.RUNNER || p.role === 'runner') return;

            if (p.team_leader_id) {
                if (!grouped[p.team_leader_id]) grouped[p.team_leader_id] = [];
                grouped[p.team_leader_id].push(p);
            } else {
                unassignedList.push(p);
            }
        });

        return { leaders, runners, unassigned: unassignedList, groupedCrew: grouped };
    }, [crew]);

    // 2. Filter Logic 
    const filteredLeaders = leaders.filter(l =>
        (l.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (l.picker_id || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-black/20">
            {/* Toolbar */}
            <div className="bg-white dark:bg-card-dark border-b border-slate-200 dark:border-white/10 px-6 py-4 space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">Teams & Hierarchy</h2>
                    <button
                        onClick={() => setShowAddUser(true)}
                        className="bg-slate-900 dark:bg-white dark:text-black text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition-all"
                    >
                        <span className="material-symbols-outlined text-lg">add</span>
                        Add Member
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                    <input
                        placeholder="Search Team Leaders..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-white/5 border-none rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/50"
                    />
                </div>
            </div>

            {/* Content: List of Team Leader Cards + Runners */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">

                {/* 1. RUNNERS SECTION (Visible at top) */}
                {runners.length > 0 && (
                    <div>
                        <h3 className="text-sm font-black text-slate-400 uppercase mb-3 px-1">Logistics (Runners)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {runners.map(r => (
                                <div
                                    key={r.id}
                                    onClick={() => setSelectedUser(r)}
                                    className="p-4 bg-white dark:bg-card-dark border border-slate-200 dark:border-white/5 rounded-xl flex items-center gap-3 hover:border-primary/50 cursor-pointer shadow-sm transition-all"
                                >
                                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                        <span className="material-symbols-outlined">person_apron</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-sm text-slate-900 dark:text-white">{r.name}</p>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase">Bucket Runner</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 2. TEAM LEADERS */}
                <div>
                    {filteredLeaders.length > 0 ? (
                        <div className="space-y-4">
                            {filteredLeaders.map(leader => (
                                <TeamLeaderCard
                                    key={leader.id}
                                    leader={leader}
                                    crew={groupedCrew[leader.id] || []}
                                    onSelectUser={setSelectedUser}
                                    settings={settings}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 opacity-50">
                            <span className="material-symbols-outlined text-4xl mb-2">group_off</span>
                            <p className="font-bold">No Team Leaders found.</p>
                        </div>
                    )}
                </div>

                {/* 3. UNASSIGNED Pickers */}
                {unassigned.length > 0 && (
                    <div className="mt-8">
                        <h3 className="text-sm font-black text-slate-400 uppercase mb-3 px-1">Unassigned Pickers ({unassigned.length})</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {unassigned.map(p => (
                                <div
                                    key={p.id}
                                    onClick={() => setSelectedUser(p)}
                                    className="p-3 bg-white dark:bg-card-dark border border-dashed border-slate-300 rounded-xl flex items-center gap-3 opacity-80 hover:opacity-100 cursor-pointer"
                                >
                                    <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                                        <img src={`https://ui-avatars.com/api/?name=${p.name}`} className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-xs">{p.name}</p>
                                        <p className="text-[10px] text-red-500 font-bold">No Leader</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeamsView;
