import React from 'react';

interface UserDetailModalProps {
    user: any;
    onClose: () => void;
    onDelete: (id: string) => void;
    onUnassign: (id: string) => void;
}

const UserDetailModal: React.FC<UserDetailModalProps> = ({ user, onClose, onDelete, onUnassign }) => {
    if (!user) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-card-dark w-full max-w-sm rounded-3xl p-6 shadow-2xl relative">
                <button onClick={onClose} className="absolute right-4 top-4 text-gray-400">
                    <span className="material-symbols-outlined">close</span>
                </button>

                <div className="flex flex-col items-center mb-6">
                    <div className="w-20 h-20 rounded-full border-4 border-gray-100 dark:border-white/5 overflow-hidden mb-3">
                        <img src={`https://ui-avatars.com/api/?name=${user.name}&background=random`} alt={user.name} className="w-full h-full object-cover" />
                    </div>
                    <h2 className="text-xl font-black dark:text-white">{user.name}</h2>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{user.role || 'Picker'}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-xl text-center">
                        <span className="block text-2xl font-black text-primary">{user.total_buckets_today || 0}</span>
                        <span className="text-[10px] text-gray-500 uppercase font-bold">Buckets</span>
                    </div>
                    <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-xl text-center">
                        <span className="block text-2xl font-black text-blue-500">{user.row || '--'}</span>
                        <span className="text-[10px] text-gray-500 uppercase font-bold">Current Row</span>
                    </div>
                </div>

                <button
                    onClick={() => {
                        const isTeamMember = user.role && user.role !== 'picker';
                        const actionLabel = isTeamMember ? 'Unassign from Orchard' : 'Delete Picker';

                        if (confirm(`${actionLabel}?`)) {
                            if (isTeamMember) {
                                onUnassign(user.id);
                            } else {
                                onDelete(user.id || user.picker_id);
                            }
                            onClose();
                        }
                    }}
                    className="w-full py-3 bg-red-50 text-red-600 border border-red-100 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
                >
                    <span className="material-symbols-outlined text-lg">
                        {user.role && user.role !== 'picker' ? 'person_remove' : 'delete'}
                    </span>
                    {user.role && user.role !== 'picker' ? 'Unassign Team' : 'Remove from Crew'}
                </button>
            </div>
        </div>
    );
};

export default UserDetailModal;
