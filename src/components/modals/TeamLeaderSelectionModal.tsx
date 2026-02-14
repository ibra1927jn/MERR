import React, { useState, useEffect } from 'react';
import { databaseService } from '../../services/database.service';
import { logger } from '@/utils/logger';
import ModalOverlay from '../common/ModalOverlay';

interface TeamLeaderInfo {
    id: string;
    full_name: string;
    orchard_id?: string;
}

interface TeamLeaderSelectionModalProps {
    isOpen?: boolean;
    onClose: () => void;
    orchardId?: string;
    onAdd: (userId: string) => void;
    selectedLeaderIds?: string[];
    onSave?: (ids: string[]) => void;
    onViewDetails?: (leader: TeamLeaderInfo) => void;
}

const TeamLeaderSelectionModal: React.FC<TeamLeaderSelectionModalProps> = ({
    onClose,
    orchardId,
    onAdd
}) => {
    const [leaders, setLeaders] = useState<TeamLeaderInfo[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchLeaders = async () => {
            setLoading(true);
            try {
                const data = await databaseService.getAvailableTeamLeaders();
                setLeaders(data || []);
            } catch (error) {
                logger.error("Error loading leaders:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchLeaders();
    }, []);

    const handleSelect = async (userId: string) => {
        if (!orchardId) {
            alert("Error: No orchard selected.");
            return;
        }
        try {
            setLoading(true);
            await databaseService.assignUserToOrchard(userId, orchardId);
            onAdd(userId);
            onClose();
        } catch (error) {
            logger.error("Error assigning leader:", error);
            alert("Could not assign team leader.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <ModalOverlay onClose={onClose}>
            <div className="max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-border-light">
                    <h3 className="text-xl font-black text-text-main">Assign Team Leader</h3>
                    <button onClick={onClose} className="text-text-muted hover:text-text-main transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-2">
                    {loading ? (
                        <p className="text-center p-4 text-text-muted">Loading Global Roster...</p>
                    ) : leaders.length === 0 ? (
                        <p className="text-center p-4 text-text-muted">No Team Leaders found in the system.</p>
                    ) : (
                        leaders.map(leader => (
                            <div
                                key={leader.id}
                                onClick={() => handleSelect(leader.id)}
                                className="p-4 rounded-xl border border-border-light flex items-center justify-between cursor-pointer hover:bg-primary-light hover:border-primary transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                                        {leader.full_name?.substring(0, 2).toUpperCase() || 'TL'}
                                    </div>
                                    <div>
                                        <p className="font-bold text-text-main">{leader.full_name}</p>
                                        <p className="text-xs text-text-muted">
                                            {leader.orchard_id === orchardId ? '✅ Already Here' : 'Click to Add'}
                                        </p>
                                    </div>
                                </div>
                                <span className="material-symbols-outlined text-primary">add_circle</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </ModalOverlay>
    );
};

export default TeamLeaderSelectionModal;
