/**
 * components/views/manager/TeamsView.tsx
 */
import React, { useState } from 'react';
import { Picker, Role } from '../../../types';

interface TeamsViewProps {
    crew: Picker[];
    setShowAddUser: (show: boolean) => void;
    setSelectedUser: (user: Picker) => void;
}

const TeamsView: React.FC<TeamsViewProps> = ({ crew, setShowAddUser, setSelectedUser }) => {
    const [filter, setFilter] = useState<'ALL' | 'LEADERS' | 'RUNNERS'>('ALL');
    const [search, setSearch] = useState('');

    // Lógica de filtrado combinada
    const filteredCrew = crew.filter(member => {
        // 1. Filtro por Rol
        const roleMatch =
            filter === 'ALL' ? true :
                filter === 'LEADERS' ? (member.role === Role.TEAM_LEADER || member.role === 'team_leader') :
                    filter === 'RUNNERS' ? (member.role === Role.RUNNER || member.role === 'runner') : true;

        // 2. Filtro por Búsqueda
        const searchMatch = member.name.toLowerCase().includes(search.toLowerCase()) ||
            member.picker_id?.toLowerCase().includes(search.toLowerCase());

        return roleMatch && searchMatch;
    });

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-black/20">
            {/* Toolbar */}
            <div className="bg-white dark:bg-card-dark border-b border-slate-200 dark:border-white/10 px-6 py-4 space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">Workforce</h2>
                    <button
                        onClick={() => setShowAddUser(true)}
                        className="bg-slate-900 dark:bg-white dark:text-black text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition-all"
                    >
                        <span className="material-symbols-outlined text-lg">add</span>
                        Add Member
                    </button>
                </div>

                {/* Filters & Search Row */}
                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Search Input */}
                    <div className="relative flex-1">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                        <input
                            placeholder="Search by name or ID..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-white/5 border-none rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>

                    {/* Filter Pills */}
                    <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
                        {(['ALL', 'LEADERS', 'RUNNERS'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === f
                                        ? 'bg-white dark:bg-card-lighter shadow-sm text-primary dark:text-white'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                {f === 'ALL' ? 'All Crew' : f === 'LEADERS' ? 'Leaders' : 'Runners'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCrew.map(member => (
                        <div
                            key={member.id}
                            onClick={() => setSelectedUser(member)}
                            className="bg-white dark:bg-card-dark p-4 rounded-xl border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                                        <img
                                            src={`https://ui-avatars.com/api/?name=${member.name}&background=random`}
                                            alt={member.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    {/* Status Indicator (Simulated logic based on buckets) */}
                                    <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-white dark:border-card-dark rounded-full ${(member.total_buckets_today || 0) > 0 ? 'bg-green-500' : 'bg-slate-300'
                                        }`}></span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-slate-900 dark:text-white truncate">{member.name}</h3>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                                        {member.role === Role.TEAM_LEADER ? 'Team Leader' : member.role === Role.RUNNER ? 'Runner' : 'Picker'}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="block text-xl font-black text-slate-900 dark:text-white">
                                        {member.total_buckets_today || 0}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Buckets</span>
                                </div>
                            </div>

                            {/* Card Footer Info */}
                            <div className="mt-4 pt-3 border-t border-slate-50 dark:border-white/5 flex justify-between items-center">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-white/10 px-2 py-1 rounded">
                                    ID: {member.picker_id || '---'}
                                </span>
                                {member.row && (
                                    <span className="text-xs font-medium text-slate-500">
                                        Row <span className="text-slate-900 dark:text-white font-bold">{member.row}</span>
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}

                    {filteredCrew.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-12 text-slate-400 opacity-60">
                            <span className="material-symbols-outlined text-4xl mb-2">group_off</span>
                            <p className="font-medium">No members found matching filters.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TeamsView;
