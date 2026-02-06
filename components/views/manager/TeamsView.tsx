import React, { useState } from 'react';
import { Role } from '../../../types';

interface TeamsViewProps {
    crew: any[];
    setShowAddUser: (show: boolean) => void;
    setSelectedUser: (user: any) => void;
}

const TeamsView: React.FC<TeamsViewProps> = ({ crew, setShowAddUser, setSelectedUser }) => {
    const [filterRole, setFilterRole] = useState<'all' | 'team_leader' | 'runner'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredMembers = crew.filter(member => {
        const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            member.picker_id?.toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;

        if (filterRole === 'team_leader') return member.role === 'team_leader' || member.role === Role.TEAM_LEADER;
        if (filterRole === 'runner') return member.role === 'runner' || member.role === Role.RUNNER;
        return true;
    });

    // Use total_buckets_today for sorting, defaulting to 0
    const sortedMembers = [...filteredMembers].sort((a, b) => (b.total_buckets_today || 0) - (a.total_buckets_today || 0));

    return (
        <div className="flex flex-col gap-6 p-4">
            <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-500 dark:text-gray-400">search</span>
                <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white dark:bg-card-dark border border-gray-200 dark:border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder-gray-500 dark:placeholder-gray-500 dark:text-white shadow-sm transition-all"
                    placeholder="Search team or leader..."
                    type="text"
                />
            </div>

            <div className="flex gap-2 mb-2 overflow-x-auto hide-scrollbar">
                <button
                    onClick={() => setFilterRole('all')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${filterRole === 'all' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-white dark:bg-card-dark text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-white/5'}`}
                >
                    All Members
                </button>
                <button
                    onClick={() => setFilterRole('team_leader')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${filterRole === 'team_leader' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-white dark:bg-card-dark text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-white/5'}`}
                >
                    Team Leaders
                </button>
                <button
                    onClick={() => setFilterRole('runner')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${filterRole === 'runner' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-white dark:bg-card-dark text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-white/5'}`}
                >
                    Bucket Runners
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-2">
                <button
                    onClick={() => setShowAddUser(true)}
                    className="flex flex-col items-center justify-center p-4 bg-white dark:bg-card-dark border-2 border-dashed border-gray-300 dark:border-white/20 rounded-2xl active:scale-[0.98] transition-all hover:border-primary hover:text-primary dark:text-white"
                >
                    <span className="material-symbols-outlined text-3xl mb-1">group_add</span>
                    <span className="text-xs font-bold uppercase">Add Team Lead</span>
                </button>
                <button
                    onClick={() => setShowAddUser(true)}
                    className="flex flex-col items-center justify-center p-4 bg-white dark:bg-card-dark border-2 border-dashed border-gray-300 dark:border-white/20 rounded-2xl active:scale-[0.98] transition-all hover:border-primary hover:text-primary dark:text-white"
                >
                    <span className="material-symbols-outlined text-3xl mb-1">person_add</span>
                    <span className="text-xs font-bold uppercase">Add Runner</span>
                </button>
            </div>

            <section className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold tracking-tight">Team Members</h2>
                    <span className="text-xs font-bold bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded text-gray-500 dark:text-gray-300">
                        {filteredMembers.length} Found
                    </span>
                </div>
                <div className="flex flex-col gap-3">
                    {sortedMembers.map((member, i) => (
                        <div
                            key={member.id || i}
                            onClick={() => setSelectedUser(member)}
                            className="bg-white dark:bg-card-dark rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-white/5 active:scale-[0.99] transition-transform cursor-pointer"
                        >
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <div className="w-14 h-14 rounded-full bg-cover bg-center border-2 border-green-500 shadow-sm" style={{ backgroundImage: `url('https://ui-avatars.com/api/?name=${member.name}&background=random')` }}></div>
                                    <div className="absolute -bottom-1 -right-1 bg-gray-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-gray-700">
                                        {member.role === 'team_leader' || member.role === Role.TEAM_LEADER ? 'TL' : 'BR'}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">{member.name}</h3>
                                            <p className="text-xs font-medium text-primary mb-1 capitalize">{member.role?.replace('_', ' ') || 'Picker'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold leading-none dark:text-white">{member.total_buckets_today || 0} <span className="text-xs font-normal text-gray-500">bkts</span></p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 gap-1">
                                            <span className="material-symbols-outlined text-[14px]">location_on</span>
                                            Row {member.row || '?'}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className={`w-2 h-2 rounded-full ${member.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                                            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase">{member.status || 'Active'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {sortedMembers.length === 0 && (
                        <div className="text-center py-12 text-gray-400">
                            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">search_off</span>
                            <p>No members found matching your filter.</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default TeamsView;
