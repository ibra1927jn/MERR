import React, { useState } from 'react';
import { Role } from '../../../types';

interface AddUserModalProps {
    onClose: () => void;
    onAdd: (user: any) => void;
}

const AddUserModal: React.FC<AddUserModalProps & { onAssign?: (userId: string) => void }> = ({ onClose, onAdd, onAssign }) => {
    const [mode, setMode] = useState<'new' | 'existing'>('existing');
    const [role, setRole] = useState<Role>(Role.TEAM_LEADER);
    const [name, setName] = useState('');
    const [idCode, setIdCode] = useState('');

    // Existing Users State
    const [availableUsers, setAvailableUsers] = useState<any[]>([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [loading, setLoading] = useState(false);

    // Load users when mode or role changes
    React.useEffect(() => {
        if (mode === 'existing') {
            loadUsers();
        }
    }, [mode, role]);

    const loadUsers = async () => {
        setLoading(true);
        try {
            // Import dynamically or pass as prop if cleaner, but for speed:
            const { databaseService } = await import('../../../services/database.service');
            const users = await databaseService.getAvailableUsers(role);
            setAvailableUsers(users || []);
        } catch (e) {
            console.error("Failed to load users", e);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = () => {
        if (mode === 'existing') {
            if (!selectedUserId) return;
            onAssign?.(selectedUserId);
        } else {
            if (!name || !idCode) return;
            onAdd({
                picker_id: idCode,
                full_name: name,
                role: role,
                safety_verified: true
            });
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-card-dark w-full max-w-sm rounded-3xl p-6 shadow-2xl relative">
                <button onClick={onClose} className="absolute right-4 top-4 text-gray-400">
                    <span className="material-symbols-outlined">close</span>
                </button>
                <h2 className="text-xl font-black mb-6 dark:text-white">Add Team Member</h2>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-white/10 mb-4">
                    <button
                        onClick={() => setMode('existing')}
                        className={`flex-1 pb-2 text-sm font-bold border-b-2 transition-colors ${mode === 'existing' ? 'border-primary text-primary' : 'border-transparent text-gray-500'}`}
                    >
                        Select Existing
                    </button>
                    <button
                        onClick={() => setMode('new')}
                        className={`flex-1 pb-2 text-sm font-bold border-b-2 transition-colors ${mode === 'new' ? 'border-primary text-primary' : 'border-transparent text-gray-500'}`}
                    >
                        Create New
                    </button>
                </div>

                {/* Role Toggle */}
                <div className="flex gap-2 mb-4 bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
                    <button
                        onClick={() => setRole(Role.TEAM_LEADER)}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${role === Role.TEAM_LEADER ? 'bg-white dark:bg-primary shadow text-primary dark:text-white' : 'text-gray-500'}`}
                    >Team Leader</button>
                    <button
                        onClick={() => setRole(Role.RUNNER)}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${role === Role.RUNNER ? 'bg-white dark:bg-primary shadow text-primary dark:text-white' : 'text-gray-500'}`}
                    >Bucket Runner</button>
                </div>

                <div className="space-y-3">
                    {mode === 'existing' ? (
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Select User</label>
                            {loading ? (
                                <p className="text-xs text-gray-400 italic">Loading...</p>
                            ) : (
                                <select
                                    value={selectedUserId}
                                    onChange={(e) => setSelectedUserId(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-card-lighter border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 font-bold outline-none dark:text-white appearance-none"
                                >
                                    <option value="">-- Select {role === Role.TEAM_LEADER ? 'Leader' : 'Runner'} --</option>
                                    {availableUsers.map(u => (
                                        <option key={u.id} value={u.id}>
                                            {u.full_name} {u.orchard_id ? '(Assigned)' : '(Available)'}
                                        </option>
                                    ))}
                                </select>
                            )}
                            <p className="text-[10px] text-gray-400 mt-2">
                                Assigns an existing account to this orchard. No new ID required.
                            </p>
                        </div>
                    ) : (
                        <>
                            <input
                                placeholder="Full Name"
                                value={name} onChange={e => setName(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-card-lighter border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 font-bold outline-none dark:text-white"
                            />
                            <input
                                placeholder="ID / Badge Code"
                                value={idCode} onChange={e => setIdCode(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-card-lighter border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 font-bold outline-none dark:text-white"
                            />
                        </>
                    )}
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={mode === 'existing' && !selectedUserId}
                    className="w-full mt-6 py-3 bg-gray-900 dark:bg-white dark:text-black text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {mode === 'existing' ? 'Assign Member' : 'Create & Add'}
                </button>
            </div>
        </div>
    );
};

export default AddUserModal;
