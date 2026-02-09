import React, { useState, useEffect } from 'react';
import { RegisteredUser, databaseService } from '../../services/database.service';

interface TeamLeaderSelectionModalProps {
    // availableLeaders prop is now optional/deprecated as we load internally
    availableLeaders?: RegisteredUser[];
    selectedLeaderIds: string[];
    onClose: () => void;
    onSave: (ids: string[]) => void;
    onViewDetails: (leader: RegisteredUser) => void;
}

const TeamLeaderSelectionModal: React.FC<TeamLeaderSelectionModalProps> = ({
    availableLeaders: propLeaders,
    selectedLeaderIds,
    onClose,
    onSave,
    onViewDetails
}) => {
    const [selected, setSelected] = useState<string[]>(selectedLeaderIds);
    const [availableLeaders, setAvailableUsers] = useState<RegisteredUser[]>(propLeaders || []);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadLeaders = async () => {
            setLoading(true);
            try {
                // ANTES: const users = await databaseService.getUsersByOrchard(...) <- ERROR
                // AHORA: Usamos la búsqueda global
                const leaders = await databaseService.getAvailableTeamLeaders();

                // Opcional: Filtrar en cliente si quieres excluir los que YA están asignados a ESTE huerto
                // const available = leaders.filter(l => l.orchard_id !== currentOrchardId);

                // For now, show ALL including those already assigned elsewhere (so we can steal them)
                setAvailableUsers(leaders.map((u: any) => ({
                    id: u.id,
                    full_name: u.full_name || 'Unknown',
                    role: u.role,
                    orchard_id: u.orchard_id
                })));
            } catch (error) {
                console.error("Error loading team leaders:", error);
            } finally {
                setLoading(false);
            }
        };

        loadLeaders();
    }, []);

    const toggleLeader = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelected(prev =>
            prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]
        );
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[#1e1e1e] rounded-3xl p-6 w-[90%] max-w-md shadow-2xl border border-[#333] max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-white">Select Active Leaders</h3>
                    <button onClick={onClose} className="text-[#a1a1aa] hover:text-white">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <p className="text-xs text-[#a1a1aa] mb-4">
                    Tap the checkbox to select as active. Tap the card to view team details.
                </p>

                <div className="space-y-2 mb-6">
                    {availableLeaders.map(leader => (
                        <div
                            key={leader.id}
                            onClick={() => onViewDetails(leader)}
                            className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${selected.includes(leader.id)
                                ? 'bg-purple-500/10 border-purple-500/50'
                                : 'bg-[#121212] border-[#333] hover:border-gray-500'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    onClick={(e) => toggleLeader(leader.id, e)}
                                    className={`size-6 rounded-md border flex items-center justify-center transition-colors ${selected.includes(leader.id)
                                        ? 'bg-purple-500 border-purple-500'
                                        : 'border-[#444] hover:border-white'
                                        }`}
                                >
                                    {selected.includes(leader.id) && (
                                        <span className="material-symbols-outlined text-white text-sm">check</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-full bg-[#27272a] flex items-center justify-center font-bold text-white">
                                        {leader.full_name?.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-white font-bold">{leader.full_name}</p>
                                        <p className="text-xs text-[#a1a1aa]">View Team Details</p>
                                    </div>
                                </div>
                            </div>
                            <span className="material-symbols-outlined text-[#333]">chevron_right</span>
                        </div>
                    ))}
                    {availableLeaders.length === 0 && (
                        <p className="text-center text-[#666] py-8">No team leaders found.</p>
                    )}
                </div>

                <button
                    onClick={() => { onSave(selected); onClose(); }}
                    className="w-full py-4 bg-purple-500 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-purple-600 transition-all"
                >
                    Confirm Selection ({selected.length})
                </button>
            </div>
        </div>
    );
};

export default TeamLeaderSelectionModal;
