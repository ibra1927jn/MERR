import React, { useState } from 'react';
import { Picker, HarvestSettings } from '../../../types';

interface TeamLeaderCardProps {
    leader: Picker;
    crew: Picker[];
    onSelectUser: (user: Picker) => void;
    settings: HarvestSettings | null;
}

const TeamLeaderCard: React.FC<TeamLeaderCardProps> = ({ leader, crew, onSelectUser, settings }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Calculate Team Stats
    const totalBuckets = crew.reduce((acc, p) => acc + (p.total_buckets_today || 0), 0) + (leader.total_buckets_today || 0);
    // Removed unused: const activeMembers = crew.filter(p => p.status === 'active').length;

    return (
        <div className="bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden transition-all shadow-sm hover:shadow-md">
            {/* LEADER HEADER (Click to Expand) */}
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-4 flex items-center gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
                {/* Avatar */}
                <div className="relative">
                    <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden border-2 border-slate-100 dark:border-white/10">
                        <img
                            src={`https://ui-avatars.com/api/?name=${leader.name}&background=0f172a&color=fff`}
                            alt={leader.name}
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white truncate">{leader.name}</h3>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">Team Leader</span>
                        <span>•</span>
                        <span>{crew.length} Members</span>
                    </div>
                </div>

                {/* Stats */}
                <div className="flex flex-col items-end gap-1">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">{totalBuckets}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Team Buckets</span>
                </div>

                {/* Chevron */}
                <span className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                    expand_more
                </span>
            </div>

            {/* EXPANDABLE CREW LIST */}
            <div className={`border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/20 overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* Add Leader as first item in list (optional, but good for management) */}
                    <div
                        onClick={(e) => { e.stopPropagation(); onSelectUser(leader); }}
                        className="flex items-center gap-3 p-3 bg-white dark:bg-card-lighter rounded-xl border border-primary/20 cursor-pointer hover:border-primary transition-colors group"
                    >
                        <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
                            <img src={`https://ui-avatars.com/api/?name=${leader.name}`} alt={`${leader.name} avatar`} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-slate-900 dark:text-white text-sm">{leader.name} (Lead)</p>
                            <p className="text-[10px] text-primary font-bold uppercase">View Profile</p>
                        </div>
                    </div>

                    {/* Crew Members */}
                    {crew.map(member => {
                        const isLowPerf = (member.total_buckets_today / (member.hours || 1)) < (settings.min_buckets_per_hour || 3.6) && (member.hours > 0.5);

                        return (
                            <div
                                key={member.id}
                                onClick={(e) => { e.stopPropagation(); onSelectUser(member); }}
                                className={`flex items-center gap-3 p-3 bg-white dark:bg-card-lighter rounded-xl border cursor-pointer transition-colors group relative overflow-hidden ${isLowPerf ? 'border-red-500/30 hover:border-red-500' : 'border-slate-200 dark:border-white/5 hover:border-primary/50'}`}
                            >
                                {isLowPerf && <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-bl" />}

                                <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
                                    <img src={`https://ui-avatars.com/api/?name=${member.name}&background=random`} alt={`${member.name} avatar`} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{member.name}</p>
                                    <div className="flex justify-between items-center mt-0.5">
                                        <span className="text-[10px] text-slate-400 font-mono">{member.picker_id || '---'}</span>
                                        <span className={`text-xs font-black ${isLowPerf ? 'text-red-500' : 'text-slate-700 dark:text-gray-300'}`}>
                                            {member.total_buckets_today} <span className="text-[9px] font-normal text-slate-400">bkt</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {crew.length === 0 && (
                        <div className="col-span-full py-4 text-center text-xs font-bold text-slate-400 italic">
                            No crew members assigned yet.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TeamLeaderCard;
