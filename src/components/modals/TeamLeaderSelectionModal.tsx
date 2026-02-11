import React, { useState, useEffect } from 'react';
import { databaseService } from '../../services/database.service';

interface TeamLeaderSelectionModalProps {
    isOpen?: boolean;
    onClose: () => void;
    orchardId?: string; // CRÍTICO: Necesitamos saber a dónde asignarlos
    onAdd: (userId: string) => void; // Callback para recargar la lista padre
    // Props viejos que ignoraremos o adaptaremos:
    selectedLeaderIds?: string[];
    onSave?: (ids: string[]) => void;
    onViewDetails?: (leader: any) => void;
}

const TeamLeaderSelectionModal: React.FC<TeamLeaderSelectionModalProps> = ({
    onClose,
    orchardId,
    onAdd
}) => {
    const [leaders, setLeaders] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // 1. Cargar TODOS los Team Leaders (Directorio Global)
    useEffect(() => {
        const fetchLeaders = async () => {
            setLoading(true);
            try {
                const data = await databaseService.getAvailableTeamLeaders();
                setLeaders(data || []);
            } catch (error) {
                 
                console.error("Error loading leaders:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchLeaders();
    }, []);

    // 2. Manejar la Asignación
    const handleSelect = async (userId: string) => {
        if (!orchardId) {
            alert("Error: No orchard selected.");
            return;
        }
        try {
            setLoading(true);
            // Asignamos el usuario al huerto actual
            await databaseService.assignUserToOrchard(userId, orchardId);
            onAdd(userId); // Avisamos al padre para que refresque
            onClose(); // Cerramos
        } catch (error) {
             
            console.error("Error assigning leader:", error);
            alert("Could not assign team leader.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-[#1e1e1e] rounded-3xl p-6 w-[90%] max-w-md shadow-2xl border border-gray-200 dark:border-[#333] max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>

                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-black text-gray-900 dark:text-white">Assign Team Leader</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-red-500">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2">
                    {loading ? (
                        <p className="text-center p-4">Loading Global Roster...</p>
                    ) : leaders.length === 0 ? (
                        <p className="text-center p-4 text-gray-500">No Team Leaders found in the system.</p>
                    ) : (
                        leaders.map(leader => (
                            <div
                                key={leader.id}
                                onClick={() => handleSelect(leader.id)}
                                className="p-4 rounded-xl border border-gray-200 dark:border-[#333] flex items-center justify-between cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-500 transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-full bg-purple-100 dark:bg-[#27272a] text-purple-600 dark:text-white flex items-center justify-center font-bold">
                                        {leader.full_name?.substring(0, 2).toUpperCase() || 'TL'}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-white">{leader.full_name}</p>
                                        <p className="text-xs text-gray-500">
                                            {leader.orchard_id === orchardId ? '✅ Already Here' : 'Click to Add'}
                                        </p>
                                    </div>
                                </div>
                                <span className="material-symbols-outlined text-purple-500">add_circle</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default TeamLeaderSelectionModal;
