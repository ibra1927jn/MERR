/**
 * components/views/manager/TeamsView.tsx
 * FIXED: Corrected JSX syntax and implemented direct DB loading.
 * Phase 9: Added real-time subscription for auto-refresh.
 */
import React, { useState, useMemo, useEffect } from 'react';
import { Picker, Role } from '../../../types';
import TeamLeaderCard from './TeamLeaderCard';
import TeamLeaderSelectionModal from '../../modals/TeamLeaderSelectionModal';
import { databaseService } from '../../../services/database.service';
import { supabase } from '../../../services/supabase';
import TeamsToolbar from './teams/TeamsToolbar';
import RunnersSection from './teams/RunnersSection';

interface TeamsViewProps {
    crew?: Picker[];
    setShowAddUser: (show: boolean) => void;
    setSelectedUser: (user: Picker) => void;
    settings: any;
    orchardId?: string;
}

const TeamsView: React.FC<TeamsViewProps> = ({ setShowAddUser, setSelectedUser, settings, orchardId }) => {
    const [search, setSearch] = useState('');
    const [isAddTeamLeaderModalOpen, setIsAddTeamLeaderModalOpen] = useState(false);
    const [users, setUsers] = useState<Picker[]>([]);
    const [loading, setLoading] = useState(false);

    const loadTeam = async () => {
        if (!orchardId) return;
        setLoading(true);
        try {
            // Carga directa de la base de datos para evitar parpadeos
            const data = await databaseService.getPickersByTeam(undefined, orchardId);
            setUsers(data || []);
        } catch (err) {
            console.error("Error loading team:", err);
        } finally {
            setLoading(false);
        }
    };

    // Initial load + real-time subscription for cache invalidation
    useEffect(() => {
        loadTeam();

        // Phase 9: Subscribe to pickers changes for this orchard
        const channel = supabase
            .channel(`teams-view-${orchardId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pickers' }, () => {
                console.log('[TeamsView] Picker change detected, refreshing...');
                loadTeam();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_attendance' }, () => {
                console.log('[TeamsView] Attendance change detected, refreshing...');
                loadTeam();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [orchardId]);

    const { leaders, runners, groupedCrew } = useMemo(() => {
        const leaders = users.filter(p => p.role === 'team_leader' || p.role === Role.TEAM_LEADER);
        const runners = users.filter(p => p.role === 'runner' || p.role === Role.RUNNER);
        const grouped: Record<string, Picker[]> = {};

        users.forEach(p => {
            if (p.team_leader_id && p.role === 'picker') {
                if (!grouped[p.team_leader_id]) grouped[p.team_leader_id] = [];
                grouped[p.team_leader_id].push(p);
            }
        });
        return { leaders, runners, groupedCrew: grouped };
    }, [users]);

    const filteredLeaders = leaders.filter(l => l.name?.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-black/20">
            <TeamsToolbar
                orchardId={orchardId}
                usersCount={users.length}
                setIsAddTeamLeaderModalOpen={setIsAddTeamLeaderModalOpen}
                setShowAddUser={setShowAddUser}
                search={search}
                setSearch={setSearch}
            />

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8">
                {loading ? (
                    <div className="text-center p-10 animate-spin text-primary">
                        <span className="material-symbols-outlined text-4xl">sync</span>
                    </div>
                ) : (
                    <>
                        <RunnersSection runners={runners.filter(r => r.name?.toLowerCase().includes(search.toLowerCase()))} />

                        <section className="bg-white dark:bg-card-dark rounded-2xl p-5 shadow-sm border border-orange-100">
                            <h3 className="text-lg font-black mb-4">Teams</h3>
                            {filteredLeaders.length > 0 ? (
                                <div className="space-y-4">
                                    {filteredLeaders.map(leader => (
                                        <TeamLeaderCard key={leader.id} leader={leader} crew={groupedCrew[leader.id] || []} onSelectUser={setSelectedUser} settings={settings} />
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center py-10 opacity-50 italic">No teams found. Assign a leader to start.</p>
                            )}
                        </section>
                    </>
                )}
            </div>

            {isAddTeamLeaderModalOpen && (
                <TeamLeaderSelectionModal
                    onClose={() => setIsAddTeamLeaderModalOpen(false)}
                    orchardId={orchardId}
                    onAdd={async () => { await loadTeam(); setIsAddTeamLeaderModalOpen(false); }}
                />
            )}
        </div>
    );
};

export default TeamsView;
