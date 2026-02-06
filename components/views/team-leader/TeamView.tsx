import React, { useState } from 'react';
import { useHarvest } from '../../../context/HarvestContext';
import AddPickerModal from '../../modals/AddPickerModal';

const TeamView = () => {
    const { crew, addPicker } = useHarvest();
    const [isAddOpen, setIsAddOpen] = useState(false);

    return (
        <div className="flex-1 flex flex-col w-full pb-40">
            <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200 p-4 shadow-sm">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-slate-800 text-lg font-bold">Crew Setup</h1>
                        <p className="text-xs text-slate-500 font-medium">Manage IDs & Harnesses</p>
                    </div>
                    <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-green-50 border border-green-100">
                        <span className="text-[10px] text-green-700 uppercase font-bold">Active</span>
                        <span className="text-green-800 text-lg font-bold leading-none">{crew.length}</span>
                    </div>
                </div>
            </header>

            <main className="p-4 space-y-3">
                <div className="flex justify-between items-end mb-2">
                    <h2 className="text-[#d91e36] text-xl font-bold">Picker List</h2>
                    <button onClick={() => setIsAddOpen(true)} className="text-[#ff1f3d] text-sm font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-lg">person_add</span> Add New
                    </button>
                </div>

                {crew.map(picker => (
                    <div key={picker.id} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm group transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="size-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-lg border-2 border-white shadow-sm">
                                    {picker.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="text-slate-800 font-bold text-base">{picker.name}</h3>
                                    <p className="text-xs text-green-600 font-medium flex items-center gap-1 mt-0.5">
                                        <span className="size-1.5 bg-green-500 rounded-full"></span> Active
                                    </p>
                                </div>
                            </div>
                            <button className="text-slate-400 hover:text-slate-600">
                                <span className="material-symbols-outlined">more_vert</span>
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Picker ID</label>
                                <div className="text-sm font-mono font-bold text-slate-800 bg-white px-2 py-1 rounded border border-slate-200">
                                    {picker.picker_id || '---'}
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-[#d91e36] block mb-1">Harness</label>
                                <div className="text-sm font-mono font-bold text-[#d91e36] bg-white px-2 py-1 rounded border border-slate-200 uppercase">
                                    {/* CORRECCIÓN CRÍTICA: harness_id para coincidir con types.ts */}
                                    {picker.harness_id || 'MISSING'}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </main>

            {isAddOpen && (
                <AddPickerModal
                    isOpen={isAddOpen}
                    onClose={() => setIsAddOpen(false)}
                    onAdd={(data) => { addPicker(data); setIsAddOpen(false); }}
                />
            )}
        </div>
    );
};

export default TeamView;
