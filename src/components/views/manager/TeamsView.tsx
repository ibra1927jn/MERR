/**
 * components/views/manager/TeamsView.tsx
 * REFACTORED: Uses crew prop from context for real-time consistency.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { Picker, Role, HarvestSettings } from '../../../types';
import TeamLeaderCard from './TeamLeaderCard';
import TeamLeaderSelectionModal from '../../modals/TeamLeaderSelectionModal';
import ImportCSVModal from '../../modals/ImportCSVModal';
import TeamsToolbar from './teams/TeamsToolbar';
import RunnersSection from './teams/RunnersSection';

interface TeamsViewProps {
    crew: Picker[];
    setShowAddUser: (show: boolean) => void;
    setSelectedUser: (user: Picker) => void;
    settings: HarvestSettings | null;
    orchardId?: string;
}

const TeamsView: React.FC<TeamsViewProps> = ({
    crew,
    setShowAddUser,
    setSelectedUser,
    settings,
    orchardId
}) => {
    const [search, setSearch] = useState('');
    const [isAddTeamLeaderModalOpen, setIsAddTeamLeaderModalOpen] = useState(false);
    const [showImportCSV, setShowImportCSV] = useState(false);

    const handleImportComplete = useCallback((_count: number) => {
        // Context has real-time listener, crew will update automatically
        setShowImportCSV(false);
    }, []);

    const { leaders, runners, groupedCrew } = useMemo(() => {
        // Filter out inactive pickers and ensure we only show those in this orchard 
        // (though current_row logic might vary, orchard_id is the primary filter)
        const activeCrew = crew.filter(p => p.status !== 'inactive');

        const leaders = activeCrew.filter(p => p.role === 'team_leader' || p.role === Role.TEAM_LEADER);
        const runners = activeCrew.filter(p => p.role === 'runner' || p.role === Role.RUNNER);
        const grouped: Record<string, Picker[]> = {};

        activeCrew.forEach(p => {
            if (p.team_leader_id && p.role === 'picker') {
                if (!grouped[p.team_leader_id]) grouped[p.team_leader_id] = [];
                grouped[p.team_leader_id].push(p);
            }
        });
        return { leaders, runners, groupedCrew: grouped };
    }, [crew]);

    const filteredLeaders = leaders.filter(l => l.name?.toLowerCase().includes(search.toLowerCase()));
    const filteredRunners = runners.filter(r => r.name?.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="flex flex-col h-full">
            <TeamsToolbar
                orchardId={orchardId}
                usersCount={crew.length}
                setIsAddTeamLeaderModalOpen={setIsAddTeamLeaderModalOpen}
                setShowAddUser={setShowAddUser}
                setShowImportCSV={setShowImportCSV}
                search={search}
                setSearch={setSearch}
            />

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8">
                <RunnersSection
                    runners={filteredRunners}
                    onSelectUser={setSelectedUser}
                />

                <section className="glass-card p-5">
                    <h3 className="text-lg font-black mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-orange-500">groups</span>
                        Harvest Teams
                    </h3>
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
                        <div className="text-center py-10 opacity-50 italic bg-white/5 rounded-xl border border-dashed border-white/10 text-slate-400">
                            <p>No teams found. Assign a leader to start.</p>
                        </div>
                    )}
                </section>
            </div>

            {isAddTeamLeaderModalOpen && (
                <TeamLeaderSelectionModal
                    onClose={() => setIsAddTeamLeaderModalOpen(false)}
                    orchardId={orchardId}
                    onAdd={async () => {
                        // The onAdd prop in the modal usually calls databaseService.assignUserToOrchard
                        // Since we use the crew prop from context, and context has a real-time listener,
                        // we don't need to manually refresh here. 
                        setIsAddTeamLeaderModalOpen(false);
                    }}
                />
            )}

            <ImportCSVModal
                isOpen={showImportCSV}
                onClose={() => setShowImportCSV(false)}
                orchardId={orchardId || ''}
                existingPickers={crew.map(p => ({ picker_id: p.picker_id, name: p.name }))}
                onImportComplete={handleImportComplete}
            />
        </div>
    );
};

export default React.memo(TeamsView);
