/**
 * Profile Modal - Shared component for user profile settings
 */
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface ProfileModalProps {
    onClose: () => void;
    onLogout: () => void;
    roleLabel?: string;
    stats?: {
        bucketsHandled?: number;
        binsCompleted?: number;
        pickersManaged?: number;
        rowsCompleted?: number;
    };
}

const ProfileModal: React.FC<ProfileModalProps> = ({
    onClose,
    onLogout,
    roleLabel = 'User',
    stats,
}) => {
    const { appUser } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(appUser?.full_name || 'User');

    const handleSave = () => {
        // In a real app, this would update the user profile
        setIsEditing(false);
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-3xl p-6 w-[90%] max-w-md shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-gray-900">Profile Settings</h3>
                    <button onClick={onClose} className="text-gray-400">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="flex flex-col items-center mb-6">
                    <div className="size-20 rounded-full bg-[#d91e36] text-white flex items-center justify-center text-3xl font-bold mb-3">
                        {name.charAt(0)}
                    </div>
                    {isEditing ? (
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="text-center text-xl font-bold px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#d91e36] outline-none"
                        />
                    ) : (
                        <h4 className="text-xl font-black text-gray-900">{name}</h4>
                    )}
                    <p className="text-sm text-gray-500 mt-1">{roleLabel}</p>
                </div>

                <div className="space-y-3 mb-6">
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <p className="text-xs font-bold text-gray-500 uppercase mb-1">Email</p>
                        <p className="text-sm font-medium text-gray-900">
                            {appUser?.email || 'user@harvestpro.nz'}
                        </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <p className="text-xs font-bold text-gray-500 uppercase mb-1">PIN</p>
                        <p className="text-sm font-medium text-gray-900">••••</p>
                    </div>
                    {stats && (
                        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                            <p className="text-xs font-bold text-blue-600 uppercase mb-1">Today's Stats</p>
                            <div className="grid grid-cols-2 gap-3 mt-2">
                                {stats.bucketsHandled !== undefined && (
                                    <div>
                                        <p className="text-2xl font-black text-blue-900">{stats.bucketsHandled}</p>
                                        <p className="text-xs text-blue-700">Buckets Moved</p>
                                    </div>
                                )}
                                {stats.binsCompleted !== undefined && (
                                    <div>
                                        <p className="text-2xl font-black text-blue-900">{stats.binsCompleted}</p>
                                        <p className="text-xs text-blue-700">Bins Completed</p>
                                    </div>
                                )}
                                {stats.pickersManaged !== undefined && (
                                    <div>
                                        <p className="text-2xl font-black text-blue-900">{stats.pickersManaged}</p>
                                        <p className="text-xs text-blue-700">Pickers</p>
                                    </div>
                                )}
                                {stats.rowsCompleted !== undefined && (
                                    <div>
                                        <p className="text-2xl font-black text-blue-900">{stats.rowsCompleted}</p>
                                        <p className="text-xs text-blue-700">Rows Completed</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    {isEditing ? (
                        <>
                            <button
                                onClick={handleSave}
                                className="w-full py-3 bg-[#d91e36] text-white rounded-xl font-bold"
                            >
                                Save Changes
                            </button>
                            <button
                                onClick={() => setIsEditing(false)}
                                className="w-full py-3 bg-gray-200 text-gray-700 rounded-xl font-bold"
                            >
                                Cancel
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="w-full py-3 bg-gray-200 text-gray-700 rounded-xl font-bold flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined">edit</span>
                                Edit Profile
                            </button>
                            <button
                                onClick={() => {
                                    if (confirm('Are you sure you want to logout?')) {
                                        onLogout();
                                    }
                                }}
                                className="w-full py-3 bg-red-50 text-red-600 border-2 border-red-200 rounded-xl font-bold flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined">logout</span>
                                Logout
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfileModal;
