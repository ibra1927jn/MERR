// components/views/team-leader/ProfileView.tsx
import React from 'react';

const ProfileView = () => {
    return (
        <div>
            <header className="sticky top-0 z-30 bg-surface-white/95 backdrop-blur-sm border-b border-border-light pb-3 pt-4 shadow-sm">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                        <div>
                            <h1 className="text-text-main text-lg font-bold leading-tight tracking-tight">Session Setup</h1>
                            <p className="text-xs text-text-sub font-medium">Nov 14, 2023 • Profile & Config</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="flex size-2 bg-green-500 rounded-full"></span>
                        <span className="text-xs font-semibold text-text-sub uppercase">Online</span>
                    </div>
                </div>
            </header>

            <main className="px-4 mt-6 pb-24 space-y-6">
                {/* User Card */}
                <div className="bg-white rounded-xl p-5 border border-border-light shadow-sm flex items-start gap-4">
                    <div className="size-16 rounded-full bg-gray-100 flex items-center justify-center text-primary-vibrant text-2xl font-bold border border-gray-200">
                        JS
                    </div>
                    <div className="flex-1">
                        <h2 className="text-text-main font-bold text-lg leading-tight">James Smith</h2>
                        <p className="text-sm text-text-sub font-medium">Team Leader • ID: TL-882</p>
                    </div>
                    <button className="text-primary-vibrant text-sm font-semibold">Edit</button>
                </div>

                {/* Settings Form */}
                <div className="bg-white rounded-xl border border-border-light shadow-sm overflow-hidden p-5 space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-text-sub uppercase tracking-wider mb-1.5">Orchard Block</label>
                        <select className="block w-full rounded-lg border-border-light text-text-main font-medium shadow-sm py-2.5 px-3">
                            <option>El Pedregal - Block 4B</option>
                            <option>Sunny Hills - Block 2A</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-text-sub uppercase tracking-wider mb-3">Bin Allocation</label>
                        <div className="flex gap-3">
                            <label className="flex-1 cursor-pointer">
                                <input defaultChecked className="peer sr-only" name="bin_type" type="radio" />
                                <div className="h-full rounded-lg border border-border-light p-3 hover:bg-gray-50 peer-checked:border-primary-vibrant peer-checked:bg-red-50 transition-all flex flex-col items-center justify-center text-center">
                                    <span className="material-symbols-outlined text-primary-vibrant mb-1">shopping_basket</span>
                                    <span className="text-sm font-bold text-text-main">Standard</span>
                                </div>
                            </label>
                            <label className="flex-1 cursor-pointer">
                                <input className="peer sr-only" name="bin_type" type="radio" />
                                <div className="h-full rounded-lg border border-border-light p-3 hover:bg-gray-50 peer-checked:border-primary-vibrant peer-checked:bg-red-50 transition-all flex flex-col items-center justify-center text-center">
                                    <span className="material-symbols-outlined text-text-sub peer-checked:text-primary-vibrant mb-1">inventory_2</span>
                                    <span className="text-sm font-bold text-text-main">Export</span>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Finalize Button */}
                <button className="w-full bg-primary-vibrant hover:bg-primary-dim text-white font-bold py-3.5 px-4 rounded-lg shadow-md shadow-red-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined">lock</span>
                    Finalize Session
                </button>
            </main>
        </div>
    );
};

export default ProfileView;
