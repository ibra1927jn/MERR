import React, { useState } from 'react';
import { Role } from '../../../types';

interface AddUserModalProps {
    onClose: () => void;
    onAdd: (user: any) => void;
}

const AddUserModal: React.FC<AddUserModalProps> = ({ onClose, onAdd }) => {
    const [role, setRole] = useState<Role>(Role.TEAM_LEADER);
    const [name, setName] = useState('');
    const [idCode, setIdCode] = useState('');

    const handleSubmit = () => {
        if (!name || !idCode) return;
        onAdd({
            picker_id: idCode,
            full_name: name,
            role: role,
            safety_verified: true
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-card-dark w-full max-w-sm rounded-3xl p-6 shadow-2xl relative">
                <button onClick={onClose} className="absolute right-4 top-4 text-gray-400">
                    <span className="material-symbols-outlined">close</span>
                </button>
                <h2 className="text-xl font-black mb-6 dark:text-white">Add New Member</h2>

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
                </div>

                <button onClick={handleSubmit} className="w-full mt-6 py-3 bg-gray-900 dark:bg-white dark:text-black text-white rounded-xl font-bold">
                    Add Member
                </button>
            </div>
        </div>
    );
};

export default AddUserModal;
