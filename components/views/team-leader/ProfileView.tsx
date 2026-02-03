/**
 * ProfileView Component - Day Configuration and Logout
 */
import React from 'react';
import LanguageSelector from '../../LanguageSelector';

interface DayConfig {
    orchard: string;
    variety: string;
    targetSize: string;
    targetColor: string;
    binType: string;
}

interface ProfileViewProps {
    dayConfig: DayConfig;
    onEditConfig: () => void;
    onLogout: () => void;
    isLoggingOut: boolean;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ dayConfig, onEditConfig, onLogout, isLoggingOut }) => (
    <main className="flex-1 overflow-y-auto pb-24 px-4 pt-4 space-y-6">
        {/* Language Selection */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Language / Idioma</h3>
            <LanguageSelector />
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
                <div className="size-16 rounded-full bg-[#ff1f3d] flex items-center justify-center text-white text-2xl font-bold">TL</div>
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Team Leader</h2>
                    <p className="text-sm text-gray-500">Team Alpha • Block 4B</p>
                </div>
            </div>
            <div className="space-y-3">
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-gray-600">Orchard</span>
                    <span className="font-bold text-gray-900">{dayConfig.orchard}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-gray-600">Variety</span>
                    <span className="font-bold text-gray-900">{dayConfig.variety}</span>
                </div>
                <div className="flex justify-between items-center py-3">
                    <span className="text-gray-600">Bin Type</span>
                    <span className="font-bold text-[#ff1f3d]">{dayConfig.binType}</span>
                </div>
            </div>
            <button onClick={onEditConfig} className="w-full mt-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[20px]">settings</span>Edit Day Config
            </button>
        </div>
        <button onClick={onLogout} disabled={isLoggingOut}
            className="w-full py-4 bg-red-50 text-red-600 border-2 border-red-200 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">
            <span className="material-symbols-outlined text-[20px]">logout</span>
            {isLoggingOut ? 'Logging out...' : 'Logout'}
        </button>
    </main>
);

export default ProfileView;
