/**
 * CreateGroupModal - Modal para crear grupos de chat
 * Reutilizable en Manager, TeamLeader y Runner
 */

import React, { useState } from 'react';

export interface ChatGroup {
    id: string;
    name: string;
    members: string[];
    isGroup: boolean;
    lastMsg: string;
    time: string;
    unread?: boolean;
}

interface CreateGroupModalProps {
    onClose: () => void;
    onCreate: (group: ChatGroup) => Promise<void> | void;
    availableMembers: Array<{ id: string; name: string; role: string }>;
    currentUserId?: string;
    orchardId?: string;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
    onClose,
    onCreate,
    availableMembers,
    currentUserId,
    orchardId
}) => {
    const [groupName, setGroupName] = useState('');
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const toggleMember = (id: string) => {
        setSelectedMembers(prev =>
            prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
        );
    };

    const handleCreate = async () => {
        if (!groupName.trim() || selectedMembers.length === 0) return;

        setIsCreating(true);
        setError(null);

        try {
            const newGroup: ChatGroup = {
                id: '',
                name: groupName,
                members: selectedMembers,
                isGroup: true,
                lastMsg: `Group created with ${selectedMembers.length} members`,
                time: new Date().toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' })
            };

            await onCreate(newGroup);
            onClose();
        } catch (err: any) {
            console.error('Error creating group:', err);
            setError(err.message || 'Failed to create group');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[#1e1e1e] rounded-3xl p-6 w-[90%] max-w-md shadow-2xl border border-[#333] max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-white">Create Group</h3>
                    <button onClick={onClose} className="text-[#a1a1aa] hover:text-white" disabled={isCreating}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
                        <p className="text-sm text-red-400">{error}</p>
                    </div>
                )}

                <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Group name"
                    disabled={isCreating}
                    className="w-full bg-[#121212] border border-[#333] rounded-xl px-4 py-3 text-white focus:border-primary outline-none mb-4 disabled:opacity-50"
                />

                <p className="text-xs font-bold text-[#a1a1aa] uppercase mb-3">Select Members ({selectedMembers.length})</p>
                <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
                    {availableMembers.map(member => (
                        <label key={member.id} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${selectedMembers.includes(member.id) ? 'bg-primary/20 border border-primary/50' : 'bg-[#121212] border border-[#333]'
                            } ${isCreating ? 'opacity-50 pointer-events-none' : ''}`}>
                            <input
                                type="checkbox"
                                checked={selectedMembers.includes(member.id)}
                                onChange={() => toggleMember(member.id)}
                                disabled={isCreating}
                                className="size-5 accent-primary"
                            />
                            <div>
                                <p className="font-bold text-white text-sm">{member.name}</p>
                                <p className="text-xs text-[#a1a1aa]">{member.role}</p>
                            </div>
                        </label>
                    ))}
                </div>

                <button
                    onClick={handleCreate}
                    disabled={!groupName.trim() || selectedMembers.length === 0 || isCreating}
                    className="w-full py-4 bg-primary text-white rounded-xl font-bold uppercase disabled:bg-gray-600 flex items-center justify-center gap-2"
                >
                    {isCreating ? (
                        <>
                            <span className="animate-spin">⏳</span>
                            Creating...
                        </>
                    ) : (
                        'Create Group'
                    )}
                </button>
            </div>
        </div>
    );
};

export default CreateGroupModal;
