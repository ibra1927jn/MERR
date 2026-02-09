import React from 'react';
import { useHarvest } from '../../../context/HarvestContext';
import { useAuth } from '../../../context/AuthContext';

const ProfileView = () => {
    const { currentUser, orchard, settings, appUser, crew } = useHarvest();
    const { logout } = useAuth();

    // Find the picker record to get the ID (number)
    const pickerRecord = crew.find(p => p.id === currentUser?.id);
    const pickerId = pickerRecord?.picker_id || 'N/A';

    return (
        <div className="bg-background-light min-h-screen pb-24">
            <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-border-light pb-3 pt-4 shadow-sm">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                        <div>
                            <h1 className="text-slate-900 text-lg font-bold leading-tight tracking-tight">My Profile</h1>
                            <p className="text-xs text-slate-500 font-medium">
                                {new Date().toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'short' })} • Session Active
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="flex size-2 bg-green-500 rounded-full animate-pulse"></span>
                        <span className="text-xs font-semibold text-slate-500 uppercase">Online</span>
                    </div>
                </div>
            </header>

            <main className="px-4 mt-6 space-y-6">
                {/* User Card */}
                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-start gap-4">
                    <div className="size-16 rounded-full bg-slate-100 flex items-center justify-center text-[#ff1f3d] text-2xl font-bold border border-slate-200">
                        {currentUser?.name ? currentUser.name.substring(0, 2).toUpperCase() : 'TL'}
                    </div>
                    <div className="flex-1">
                        <h2 className="text-slate-900 font-bold text-lg leading-tight">
                            {currentUser?.name || appUser?.full_name || 'Unknown User'}
                        </h2>
                        <p className="text-sm text-slate-500 font-medium">
                            {currentUser?.role || 'Team Leader'} • ID: {pickerId}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                            {appUser?.email || ''}
                        </p>
                    </div>
                </div>

                {/* Settings Information (Read Only for now) */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Current Orchard</label>
                        <div className="w-full rounded-lg bg-slate-50 border border-slate-200 text-slate-700 font-bold py-2.5 px-3">
                            {orchard?.name || 'No Orchard Selected'}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Piece Rate</label>
                            <div className="w-full rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-mono font-black py-2.5 px-3">
                                ${settings?.piece_rate?.toFixed(2) || '0.00'}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Min Wage</label>
                            <div className="w-full rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-mono font-black py-2.5 px-3">
                                ${settings?.min_wage_rate?.toFixed(2) || '0.00'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Logout Button */}
                <button
                    onClick={logout}
                    className="w-full bg-slate-900 hover:bg-black text-white font-bold py-3.5 px-4 rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                    <span className="material-symbols-outlined">logout</span>
                    Sign Out
                </button>

                <p className="text-center text-[10px] text-slate-300 font-mono mt-4">
                    HarvestPro NZ v1.2.0 • Build 2024
                </p>
            </main>
        </div>
    );
};

export default ProfileView;
