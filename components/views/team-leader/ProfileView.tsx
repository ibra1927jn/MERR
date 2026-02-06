import React from 'react';
import { useHarvest } from '../../../context/HarvestContext';
import { useAuth } from '../../../context/AuthContext';

const ProfileView = () => {
    const { currentUser } = useHarvest();
    const { signOut } = useAuth();

    return (
        <div className="flex-1 flex flex-col w-full pb-32">
            <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200 p-4 shadow-sm">
                <h1 className="text-slate-800 text-lg font-bold">Session Setup</h1>
            </header>

            <main className="p-4">
                <section className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-start gap-4 mb-6">
                    <div className="size-16 rounded-full bg-slate-100 flex items-center justify-center text-[#d91e36] text-2xl font-bold border border-slate-200">
                        {currentUser?.name?.substring(0, 2).toUpperCase() || 'TL'}
                    </div>
                    <div className="flex-1">
                        <h2 className="text-slate-800 font-bold text-lg leading-tight">{currentUser?.name || 'Team Leader'}</h2>
                        <p className="text-sm text-slate-500 font-medium">ID: {currentUser?.id?.substring(0, 6) || 'Unknown'}</p>
                    </div>
                </section>

                <button
                    onClick={signOut}
                    className="w-full bg-slate-200 text-slate-700 font-bold py-3.5 rounded-lg active:scale-[0.98] transition-all"
                >
                    Log Out
                </button>
            </main>
        </div>
    );
};

export default ProfileView;
