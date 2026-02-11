/**
 * CreateGroupModal - Modal para crear grupos de chat
 * Reutilizable en Manager, TeamLeader y Runner
 * Soporta tema claro y oscuro
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
    availableMembers: Array<{ id: string; name: string; role: string; department?: string }>;
    _currentUserId?: string;
    _orchardId?: string;
    variant?: 'light' | 'dark';
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
    onClose,
    onCreate,
    availableMembers,
    _currentUserId,
    _orchardId,
    variant = 'dark'
}) => {
    const [groupName, setGroupName] = useState('');
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isLight = variant === 'light';

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
            const memberNames = availableMembers.filter(m => selectedMembers.includes(m.id)).map(m => m.name);
            const newGroup: ChatGroup = {
                id: crypto.randomUUID(),
                name: groupName,
                members: memberNames,
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

    // Estilos según el tema
    const styles = {
        overlay: 'fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm',
        modal: isLight
            ? 'bg-white rounded-3xl p-6 w-[90%] max-w-md shadow-2xl max-h-[85vh] overflow-y-auto'
            : 'bg-[#1e1e1e] rounded-3xl p-6 w-[90%] max-w-md shadow-2xl border border-[#333] max-h-[85vh] overflow-y-auto',
        title: isLight ? 'text-xl font-black text-gray-900' : 'text-xl font-black text-white',
        closeBtn: isLight ? 'text-gray-400 hover:text-gray-600' : 'text-[#a1a1aa] hover:text-white',
        input: isLight
            ? 'w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#ff1f3d] outline-none text-gray-900 bg-white mb-4 disabled:opacity-50'
            : 'w-full bg-[#121212] border border-[#333] rounded-xl px-4 py-3 text-white focus:border-primary outline-none mb-4 disabled:opacity-50',
        label: isLight ? 'text-xs font-bold text-gray-500 uppercase mb-3' : 'text-xs font-bold text-[#a1a1aa] uppercase mb-3',
        memberItem: (selected: boolean) => isLight
            ? `flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${selected ? 'bg-[#ff1f3d]/10 border-2 border-[#ff1f3d]' : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'} ${isCreating ? 'opacity-50 pointer-events-none' : ''}`
            : `flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${selected ? 'bg-primary/20 border border-primary/50' : 'bg-[#121212] border border-[#333]'} ${isCreating ? 'opacity-50 pointer-events-none' : ''}`,
        memberName: isLight ? 'font-bold text-gray-900 text-sm' : 'font-bold text-white text-sm',
        memberRole: isLight ? 'text-xs text-gray-500' : 'text-xs text-[#a1a1aa]',
        button: isLight
            ? 'w-full py-4 bg-[#ff1f3d] text-white rounded-xl font-bold uppercase disabled:bg-gray-300 flex items-center justify-center gap-2'
            : 'w-full py-4 bg-primary text-white rounded-xl font-bold uppercase disabled:bg-gray-600 flex items-center justify-center gap-2',
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h3 className={styles.title}>Create Group</h3>
                    <button onClick={onClose} className={styles.closeBtn} disabled={isCreating}>
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
                    className={styles.input}
                />

                <p className={styles.label}>Select Members ({selectedMembers.length})</p>
                <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
                    {availableMembers.map(member => (
                        <label key={member.id} className={styles.memberItem(selectedMembers.includes(member.id))}>
                            <input
                                type="checkbox"
                                checked={selectedMembers.includes(member.id)}
                                onChange={() => toggleMember(member.id)}
                                disabled={isCreating}
                                className="size-5 accent-[#ff1f3d]"
                            />
                            <div>
                                <p className={styles.memberName}>{member.name}</p>
                                <p className={styles.memberRole}>{member.role}</p>
                            </div>
                        </label>
                    ))}
                </div>

                <button
                    onClick={handleCreate}
                    disabled={!groupName.trim() || selectedMembers.length === 0 || isCreating}
                    className={styles.button}
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