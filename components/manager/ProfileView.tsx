import React from 'react';
import LanguageSelector from '../LanguageSelector';
import { useHarvest } from '../../context/HarvestContext';

interface ProfileViewProps {
    onLogout: () => void;
    onOpenSettings: () => void;
    isLoggingOut: boolean;
}

const ProfileView: React.FC<ProfileViewProps> = ({
    onLogout,
    onOpenSettings,
    isLoggingOut
}) => {
    const { appUser, orchard } = useHarvest();

    return (
        <div className="space-y-6 pb-8 px-4 pt-4 overflow-y-auto">
            {/* Profile Card */}
            <div className="bg-[#1e1e1e] rounded-2xl p-6 border border-[#27272a] flex flex-col items-center">
                <div className="size-20 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold mb-4">
                    {appUser?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'MG'}
                </div>
                <h2 className="text-xl font-bold text-white">{appUser?.full_name || 'Manager'}</h2>
                <p className="text-[#a1a1aa] text-sm">{appUser?.email || 'manager@harvestpro.nz'}</p>
                <div className="flex gap-2 mt-3">
                    <span className="bg-primary/20 text-primary text-xs font-bold px-3 py-1 rounded-full uppercase">
                        Manager
                    </span>
                    <span className="bg-[#27272a] text-[#a1a1aa] text-xs font-bold px-3 py-1 rounded-full">
                        {orchard?.name || 'Central Pac'}
                    </span>
                </div>
            </div>

            {/* Quick Settings */}
            <div className="space-y-2">
                {/* Language Selection */}
                <div className="w-full bg-[#1e1e1e] border border-[#27272a] rounded-xl p-4">
                    <div className="flex items-center gap-4 mb-3">
                        <div className="size-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-orange-500">translate</span>
                        </div>
                        <div className="flex-1">
                            <p className="text-white font-bold">Language / Idioma</p>
                            <p className="text-xs text-[#a1a1aa]">Multi-language support</p>
                        </div>
                    </div>
                    <LanguageSelector />
                </div>
                <button
                    onClick={onOpenSettings}
                    className="w-full bg-[#1e1e1e] border border-[#27272a] rounded-xl p-4 flex items-center gap-4 hover:border-primary transition-colors"
                >
                    <div className="size-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-blue-500">tune</span>
                    </div>
                    <div className="flex-1 text-left">
                        <p className="text-white font-bold">Day Settings</p>
                        <p className="text-xs text-[#a1a1aa]">Rates, targets, and configuration</p>
                    </div>
                    <span className="material-symbols-outlined text-[#333]">chevron_right</span>
                </button>

                <button className="w-full bg-[#1e1e1e] border border-[#27272a] rounded-xl p-4 flex items-center gap-4 hover:border-primary transition-colors">
                    <div className="size-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-green-500">assessment</span>
                    </div>
                    <div className="flex-1 text-left">
                        <p className="text-white font-bold">Reports</p>
                        <p className="text-xs text-[#a1a1aa]">View and export daily reports</p>
                    </div>
                    <span className="material-symbols-outlined text-[#333]">chevron_right</span>
                </button>

                <button className="w-full bg-[#1e1e1e] border border-[#27272a] rounded-xl p-4 flex items-center gap-4 hover:border-primary transition-colors">
                    <div className="size-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-purple-500">groups</span>
                    </div>
                    <div className="flex-1 text-left">
                        <p className="text-white font-bold">Team Management</p>
                        <p className="text-xs text-[#a1a1aa]">Manage team leaders and crews</p>
                    </div>
                    <span className="material-symbols-outlined text-[#333]">chevron_right</span>
                </button>
            </div>

            {/* Logout */}
            <button
                onClick={onLogout}
                disabled={isLoggingOut}
                className="w-full bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl p-4 font-bold flex items-center justify-center gap-2 hover:bg-red-500/20 transition-colors disabled:opacity-50"
            >
                <span className="material-symbols-outlined">logout</span>
                {isLoggingOut ? 'Logging out...' : 'Logout'}
            </button>
        </div>
    );
};

export default ProfileView;
