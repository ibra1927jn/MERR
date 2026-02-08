/**
 * components/views/manager/TeamsView.tsx
 */
import React, { useState } from 'react';
import { Picker, Role } from '../../../types';
// Remove useHarvest import as we are getting settings via props now per instruction, 
// OR keep it if we still need other things, but user said "add settings to props".
// I will keep import but rely on prop for logic to be safe.

interface HarvestSettings {
    min_buckets_per_hour?: number;
    // add other fields if needed
    [key: string]: any;
}

interface TeamsViewProps {
    crew: Picker[];
    setShowAddUser: (show: boolean) => void;
    setSelectedUser: (user: Picker) => void;
    settings: HarvestSettings;
}

const TeamsView: React.FC<TeamsViewProps> = ({ crew, setShowAddUser, setSelectedUser, settings }) => {
    const [filter, setFilter] = useState<'ALL' | 'LEADERS' | 'RUNNERS' | 'LOW'>('ALL');
    const [search, setSearch] = useState('');

    // Lógica de filtrado combinada
    const filteredCrew = crew.filter(member => {
        // 1. Filtro por Rol / Performance
        let roleMatch = true;

        if (filter === 'LEADERS') roleMatch = (member.role === Role.TEAM_LEADER || member.role === 'team_leader');
        else if (filter === 'RUNNERS') roleMatch = (member.role === Role.RUNNER || member.role === 'runner');
        else if (filter === 'LOW') {
            return (member.total_buckets_today / (member.hours || 1)) < (settings.min_buckets_per_hour || 3.6);
        }

        // 2. Filtro por Búsqueda
        const searchMatch = (member.name || '').toLowerCase().includes(search.toLowerCase()) ||
            (member.picker_id || '').toLowerCase().includes(search.toLowerCase());

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
                    <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl overflow-x-auto">
                        {(['ALL', 'LEADERS', 'RUNNERS', 'LOW'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${filter === f
                                    ? 'bg-white dark:bg-card-lighter shadow-sm text-primary dark:text-white'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                {f === 'ALL' ? 'All Crew' : f === 'LEADERS' ? 'Leaders' : f === 'RUNNERS' ? 'Runners' : '⚠️ Low Perf'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCrew.map(member => {
                        // Re-calculate simplistic low perf just for visual tag if needed, 
                        // or trust the filter. 
                        const isLowPerformer = (member.total_buckets_today / (member.hours || 1)) < (settings.min_buckets_per_hour || 3.6);

                        return (
                            <div
                                key={member.id}
                                onClick={() => setSelectedUser(member)}
                                className={`bg-white dark:bg-card-dark p-4 rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden ${isLowPerformer ? 'border-red-500/50 dark:border-red-500/50 ring-1 ring-red-500/20' : 'border-slate-100 dark:border-white/5'
                                    }`}
                            >
                                {isLowPerformer && (
                                    <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg">
                                        LOW PERF
                                    </div>
                                )}

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
                                        <span className={`block text-xl font-black ${isLowPerformer ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>
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
                                    {member.current_row && (
                                        <span className="text-xs font-medium text-slate-500">
                                            Row <span className="text-slate-900 dark:text-white font-bold">{member.current_row}</span>
                                        </span>
                                    )}
                                </div>
                            </div>
                        )
                    })}

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
