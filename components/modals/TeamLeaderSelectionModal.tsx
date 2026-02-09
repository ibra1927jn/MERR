import React, { useState, useEffect } from 'react';
import { RegisteredUser, databaseService } from '../../services/database.service';

interface TeamLeaderSelectionModalProps {
    // availableLeaders prop is now optional/deprecated as we load internally
    availableLeaders?: RegisteredUser[];
    selectedLeaderIds: string[];
    onClose: () => void;
    // Updated to single ID based on user instruction for immediate assignment
    onAdd?: (userId: string) => void;
    onSave?: (ids: string[]) => void; // Keep for backward compat if needed, but logic is changing
    onViewDetails: (leader: RegisteredUser) => void;
    orchardId?: string; // New required prop
}

const TeamLeaderSelectionModal: React.FC<TeamLeaderSelectionModalProps> = ({
    availableLeaders: propLeaders,
    selectedLeaderIds,
    onClose,
    onAdd,
    onSave,
    onViewDetails,
    orchardId
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

        if (availableLeaders.length === 0) {
            loadLeaders();
        }
    }, []);

    const handleSelectUser = async (userId: string) => {
        try {
            setLoading(true);

            // VALIDACIÓN CRÍTICA
            if (!orchardId) {
                alert("Error: No orchard selected. Please select an orchard first.");
                return;
            }

            // Llamada al servicio con los DOS IDs
            // This assigns them immediately
            await databaseService.assignUserToOrchard(userId, orchardId);

            if (onAdd) onAdd(userId); // Notify parent

            // Also call onSave for compat if provided (passing just this one)
            if (onSave) onSave([userId]);

            onClose();
        } catch (error: any) {
            console.error("Error assigning TL:", error);
            alert(`Failed to assign Team Leader: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[#1e1e1e] rounded-3xl p-6 w-[90%] max-w-md shadow-2xl border border-[#333] max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-white">Associate Team Leader</h3>
                    <button onClick={onClose} className="text-[#a1a1aa] hover:text-white">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <p className="text-xs text-[#a1a1aa] mb-4">
                    Tap a Team Leader to assign them to this orchard immediately.
                </p>

                {loading ? (
                    <div className="text-center py-8 text-white">Loading directory...</div>
                ) : (
                    <div className="space-y-2 mb-6">
                        {availableLeaders.map(leader => (
                            <div
                                key={leader.id}
                                className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${leader.orchard_id === orchardId
                                    ? 'bg-green-500/10 border-green-500/50 cursor-default'
                                    : 'bg-[#121212] border-[#333] hover:border-gray-500'
                                    }`}
                                onClick={() => {
                                    if (leader.orchard_id === orchardId) return; // Already assigned
                                    handleSelectUser(leader.id);
                                }}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 rounded-full bg-[#27272a] flex items-center justify-center font-bold text-white">
                                            {leader.full_name?.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-white font-bold">{leader.full_name}</p>
                                            <p className="text-xs text-[#a1a1aa]">
                                                {leader.orchard_id ? (leader.orchard_id === orchardId ? 'Already Assigned' : 'Assigned elsewhere') : 'Available'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                {leader.orchard_id === orchardId ? (
                                    <span className="material-symbols-outlined text-green-500">check_circle</span>
                                ) : (
                                    <span className="material-symbols-outlined text-[#333]">add_circle</span>
                                )}
                            </div>
                        ))}
                        {availableLeaders.length === 0 && (
                            <p className="text-center text-[#666] py-8">No team leaders found.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeamLeaderSelectionModal;

