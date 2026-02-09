/**
 * components/views/manager/TeamsView.tsx
 * Hierarchical view: Runners (top) -> Team Leaders (bottom) with expandable Pickers
 */
import React, { useState, useMemo, useEffect } from 'react';
import { Picker, Role } from '../../../types';
import TeamLeaderCard from './TeamLeaderCard';
import TeamLeaderSelectionModal from '../../modals/TeamLeaderSelectionModal';
import { databaseService } from '../../../services/database.service';

interface HarvestSettings {
    min_buckets_per_hour?: number;
    [key: string]: any;
}

interface TeamsViewProps {
    crew: Picker[]; // Keeping for legacy reference or fallback, but primarily using local state for stability
    setShowAddUser: (show: boolean) => void;
    setSelectedUser: (user: Picker) => void;
    settings: HarvestSettings;
    orchardId?: string; // Passed from parent
}

const RUNNER_STATES = {
    queue: { label: 'In Queue', color: 'bg-gray-500', border: 'border-gray-400', icon: 'hourglass_empty' },
    loading: { label: 'Loading', color: 'bg-yellow-500', border: 'border-yellow-400', icon: 'local_shipping' },
    to_bin: { label: 'To Bin', color: 'bg-green-500', border: 'border-green-400', icon: 'arrow_forward' },
    returning: { label: 'Returning', color: 'bg-blue-500', border: 'border-blue-400', icon: 'arrow_back' }
};

type RunnerState = keyof typeof RUNNER_STATES;

const TeamsView: React.FC<TeamsViewProps> = ({ crew, setShowAddUser, setSelectedUser, settings, orchardId }) => {
    const [search, setSearch] = useState('');
    const [isAddTeamLeaderModalOpen, setIsAddTeamLeaderModalOpen] = useState(false);

    // 1. Local State for Stability (Decoupled from Session Context)
    const [users, setUsers] = useState<Picker[]>([]);
    const [loading, setLoading] = useState(false);

    // 2. Load Team Function (Direct DB Fetch)
    const loadTeam = async () => {
        if (!orchardId) return;
        setLoading(true);
        try {
            // Fetch directly from DB to avoid session context clearing issues
            const orchardUsers = await databaseService.getPickersByTeam(undefined, orchardId);
            console.log("TeamsView: Loaded fresh team data:", orchardUsers.length);
            setUsers(orchardUsers);
        } catch (err) {
            console.error("TeamsView: Failed to load team:", err);
        } finally {
            setLoading(false);
        }
    };

    // 3. Effect: Load on Mount or Orchard Change
    useEffect(() => {
        loadTeam();
    }, [orchardId]);

    // Simulate runner state (in production, from context/server)
    const getRunnerState = (index: number): RunnerState => {
        const states: RunnerState[] = ['queue', 'loading', 'to_bin', 'returning'];
        return states[index % states.length];
    };

    const handleAddTeamLeader = async (userId: string) => {
        // Force refresh after adding
        await loadTeam();
        console.log("Team Leader Added/Assigned & Refreshed:", userId);
    };

    // 4. Group Hierarchy using LOCAL 'users' state (not 'crew' prop)
    const { leaders, runners, unassigned, groupedCrew } = useMemo(() => {
        // Use 'users' state if populated, otherwise fallback to 'crew' prop (mostly for initial render)
        const sourceData = users;

        const leaders = sourceData.filter(p => p.role === Role.TEAM_LEADER || p.role === 'team_leader');
        const runners = sourceData.filter(p => p.role === Role.RUNNER || p.role === 'runner');

        // Group pickers by team_leader_id
        const grouped: Record<string, Picker[]> = {};
        const unassignedList: Picker[] = [];

        sourceData.forEach(p => {
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
    }, [users, crew]);

    // 5. Filter Logic 
    const filteredLeaders = leaders.filter(l =>
        (l.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (l.picker_id || '').toLowerCase().includes(search.toLowerCase())
    );

    const filteredRunners = runners.filter(r =>
        (r.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.picker_id || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-black/20">
            {/* Toolbar */}
            <div className="bg-white dark:bg-card-dark border-b border-slate-200 dark:border-white/10 px-6 py-4 space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        Teams & Hierarchy
                        {loading && <span className="text-xs text-slate-400 animate-pulse">(Refreshing...)</span>}
                    </h2>
                    <div className="flex gap-2">
                        {/* New Button for Existing TL Selection */}
                        <button
                            onClick={() => setIsAddTeamLeaderModalOpen(true)}
                            className="bg-purple-600 dark:bg-purple-500 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-purple-700 transition-all"
                        >
                            <span className="material-symbols-outlined text-lg">person_add</span>
                            Link Leader
                        </button>

                        <button
                            onClick={() => setShowAddUser(true)}
                            className="bg-slate-900 dark:bg-white dark:text-black text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition-all"
                        >
                            <span className="material-symbols-outlined text-lg">add</span>
                            New Member
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                    <input
                        placeholder="Search Personnel (Leaders, Runners)..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-white/5 border-none rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/50"
                    />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8">

                {/* ========== SECTION 1: LOGISTICS (Bucket Runners) ========== */}
                <section className="bg-white dark:bg-card-dark rounded-2xl p-5 shadow-sm border border-blue-100 dark:border-blue-500/20">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-500">local_shipping</span>
                            Logistics
                        </h3>
                        {/* State Legend */}
                        <div className="hidden md:flex gap-2 text-[10px]">
                            {Object.entries(RUNNER_STATES).map(([key, val]) => (
                                <div key={key} className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-card-dark rounded-full border border-slate-100 dark:border-white/10">
                                    <span className={`w-2 h-2 rounded-full ${val.color}`}></span>
                                    <span className="text-slate-500">{val.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {filteredRunners.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredRunners.map((r, idx) => {
                                const state = getRunnerState(idx);
                                const stateInfo = RUNNER_STATES[state];

                                return (
                                    <div
                                        key={r.id}
                                        onClick={() => setSelectedUser(r)}
                                        className={`p-4 bg-white dark:bg-card-dark border-2 ${stateInfo.border} rounded-2xl flex items-center gap-4 hover:shadow-lg cursor-pointer transition-all group`}
                                    >
                                        {/* Avatar with State Indicator */}
                                        <div className="relative">
                                            <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-2xl font-bold">
                                                {r.name?.charAt(0) || 'R'}
                                            </div>
                                            <div className={`absolute -bottom-1 -right-1 ${stateInfo.color} text-white p-1.5 rounded-full border-2 border-white dark:border-card-dark`}>
                                                <span className="material-symbols-outlined text-xs">{stateInfo.icon}</span>
                                            </div>
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{r.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${stateInfo.color} text-white`}>
                                                    {stateInfo.label}
                                                </span>
                                                <span className="text-[10px] text-slate-400">Row {r.current_row || '?'}</span>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center hover:bg-green-200">
                                                <span className="material-symbols-outlined text-lg">call</span>
                                            </button>
                                            <button className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200">
                                                <span className="material-symbols-outlined text-lg">chat</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-400 bg-white dark:bg-card-dark rounded-xl border border-dashed border-slate-200 dark:border-white/10">
                            <span className="material-symbols-outlined text-3xl mb-2">person_off</span>
                            <p className="text-sm font-medium">No Bucket Runners assigned</p>
                        </div>
                    )}
                </section>

                {/* ========== SECTION 2: TEAMS (Team Leaders & Crews) ========== */}
                <section className="bg-white dark:bg-card-dark rounded-2xl p-5 shadow-sm border border-orange-100 dark:border-orange-500/20">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-orange-500">groups</span>
                            Teams
                        </h3>
                        <span className="text-xs bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 px-3 py-1 rounded-full font-bold">
                            {filteredLeaders.length} leaders • {Object.values(groupedCrew).flat().length} pickers
                        </span>
                    </div>

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
                </section>

                {/* ========== SECTION 3: UNASSIGNED (Hidden unless needed) ========== */}
                {unassigned.length > 0 && (
                    <section className="mt-8 pt-6 border-t border-slate-200 dark:border-white/10">
                        <h3 className="text-sm font-black text-red-500 uppercase mb-3 flex items-center gap-2">
                            <span className="material-symbols-outlined">warning</span>
                            Unassigned Pickers ({unassigned.length})
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                            {unassigned.map(p => (
                                <div
                                    key={p.id}
                                    onClick={() => setSelectedUser(p)}
                                    className="p-3 bg-white dark:bg-card-dark border border-dashed border-red-300 dark:border-red-500/30 rounded-xl flex items-center gap-3 opacity-80 hover:opacity-100 cursor-pointer"
                                >
                                    <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                                        <img src={`https://ui-avatars.com/api/?name=${p.name}`} className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-xs">{p.name}</p>
                                        <p className="text-[10px] text-red-500 font-bold">⚠ No Team Leader</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

            </div>

            {/* Modal Injection */}
            {isAddTeamLeaderModalOpen && (
                <TeamLeaderSelectionModal
                    onClose={() => setIsAddTeamLeaderModalOpen(false)}
                    orchardId={orchardId} // Pass the current orchard ID
                    selectedLeaderIds={[]}
                    onAdd={async (userId) => {
                        await handleAddTeamLeader(userId); // Use handleAddTeamLeader which now triggers reload
                        setIsAddTeamLeaderModalOpen(false);
                    }}
                    onSave={(ids) => {
                        // Compatibility with potential old usage if any, though our new modal uses onAdd
                        ids.forEach(id => handleAddTeamLeader(id));
                    }}
                    onViewDetails={() => { }}
                />
            )}
        </div>
    );
};

export default TeamsView;
