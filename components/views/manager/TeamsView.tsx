import React, { useState, useMemo, useEffect } from 'react';
import { Picker, Role } from '../../../types';
import TeamLeaderCard from './TeamLeaderCard';
import TeamLeaderSelectionModal from '../../modals/TeamLeaderSelectionModal';
import { databaseService } from '../../../services/database.service';
import TeamsToolbar from './teams/TeamsToolbar';
import RunnersSection from './teams/RunnersSection';

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

const TeamsView: React.FC<TeamsViewProps> = ({ crew, setShowAddUser, setSelectedUser, settings, orchardId }) => {
    const [search, setSearch] = useState('');
    const [isAddTeamLeaderModalOpen, setIsAddTeamLeaderModalOpen] = useState(false);

    // 1. Local State for Stability (Decoupled from Session Context)
    const [users, setUsers] = useState<Picker[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 2. FUNCIÓN DE CARGA ROBUSTA
    const loadTeam = async () => {
        if (!orchardId) {
            console.warn("TeamsView: No Orchard ID provided, skipping load.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            console.log(`TeamsView: Fetching users for Orchard [${orchardId}]...`);
            // Solicitamos a la DB filtrar por este huerto
            const orchardUsers = await databaseService.getPickersByTeam(undefined, orchardId);

            console.log("TeamsView: Loaded users:", orchardUsers.length);
            setUsers(orchardUsers);
        } catch (err: any) {
            console.error("TeamsView: Failed to load team:", err);
            setError("Failed to load team data.");
        } finally {
            setLoading(false);
        }
    };

    // 3. EFECTO: Recargar solo cuando cambia el Huerto o se monta
    useEffect(() => {
        loadTeam();
    }, [orchardId]);

    // 4. LÓGICA DE FILTRADO (Solo usa 'users', ignora 'crew' global)
    const { leaders, runners, unassigned, groupedCrew } = useMemo(() => {
        // SOLUCIÓN FINAL: Usamos SOLO users. Si está vacío, está vacío (mejor que parpadear).
        const sourceData = users;

        const leaders = sourceData.filter(p => p.role === Role.TEAM_LEADER || p.role === 'team_leader');
        const runners = sourceData.filter(p => p.role === Role.RUNNER || p.role === 'runner');

        const grouped: Record<string, Picker[]> = {};
        const unassignedList: Picker[] = [];

        sourceData.forEach(p => {
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
    }, [users]); // Dependencia única: users

    const handleAddTeamLeader = async (userId: string) => {
        await loadTeam(); // Recarga forzada tras asignar
        setIsAddTeamLeaderModalOpen(false);
    };

    // Filtrado de búsqueda visual
    const filteredLeaders = leaders.filter(l =>
        (l.name || '').toLowerCase().includes(search.toLowerCase())
    );
    const filteredRunners = runners.filter(r =>
        (r.name || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-black/20">
            {/* 1. Modularized Toolbar */}
            <TeamsToolbar
                orchardId={orchardId}
                usersCount={users.length}
                setIsAddTeamLeaderModalOpen={setIsAddTeamLeaderModalOpen}
                setShowAddUser={setShowAddUser}
                search={search}
                setSearch={setSearch}
            />

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8">

                {/* 2. Modularized Runners Section */}
                <RunnersSection runners={filteredRunners} />

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
                    orchardId={orchardId}
                    selectedLeaderIds={[]}
                    onAdd={async (userId) => {
                        await handleAddTeamLeader(userId);
                        setIsAddTeamLeaderModalOpen(false);
                    }}
                    onSave={(ids) => {
                        ids.forEach(id => handleAddTeamLeader(id));
                    }}
                    onViewDetails={() => { }}
                />
            )}
        </div>
    );
};

export default TeamsView;
