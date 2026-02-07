import { useHarvest } from '../../../context/HarvestContext';

const TeamView = () => {
    const { crew, totalBucketsToday } = useHarvest();

    // Calculate stats
    const totalCrew = crew.length;
    const activeCrew = crew.filter(p => p.status === 'active').length;
    const pendingCrew = crew.filter(p => !p.safety_verified).length;

    return (
        <div>
            <header className="sticky top-0 z-30 bg-surface-white/95 backdrop-blur-sm border-b border-border-light pb-3 pt-4 shadow-sm">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                        {/* Botón atrás simulado si fuera necesario */}
                        <div>
                            <h1 className="text-text-main text-lg font-bold leading-tight tracking-tight">Crew Setup</h1>
                            <p className="text-xs text-text-sub font-medium">Harness & ID Assignment</p>
                        </div>
                    </div>
                    <button className="size-10 flex items-center justify-center rounded-full text-primary-vibrant hover:bg-primary-vibrant/5 active:bg-primary-vibrant/10 transition-colors relative">
                        <span className="material-symbols-outlined">save</span>
                    </button>
                </div>
                <div className="grid grid-cols-3 gap-3 px-4 mt-1">
                    {/* Stats Header */}
                    <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-white border border-border-light shadow-sm">
                        <span className="text-[10px] text-text-sub uppercase tracking-wider font-semibold">Total Crew</span>
                        <span className="text-text-main text-xl font-bold font-mono tracking-tight">{totalCrew}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-white border border-border-light shadow-sm">
                        <span className="text-[10px] text-text-sub uppercase tracking-wider font-semibold">Active</span>
                        <span className="text-success text-xl font-bold font-mono tracking-tight">{activeCrew}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-white border-l-4 border-l-warning border-y border-r border-border-light shadow-sm">
                        <span className="text-[10px] text-text-sub uppercase tracking-wider font-semibold">Pending</span>
                        <span className="text-warning text-xl font-bold font-mono tracking-tight">{pendingCrew}</span>
                    </div>
                </div>
            </header>

            <main className="px-4 mt-6 space-y-3 pb-24">
                {crew.map(picker => (
                    <div key={picker.id} className="bg-white rounded-xl p-4 border border-border-light shadow-sm relative overflow-hidden group focus-within:ring-1 focus-within:ring-primary-vibrant/50 transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="size-12 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500 overflow-hidden">
                                    {picker.avatar && picker.avatar.length > 2 ? <img src={picker.avatar} alt={picker.name} className="w-full h-full object-cover" /> : picker.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <h3 className="text-text-main font-bold text-base">{picker.name}</h3>
                                        <span className="material-symbols-outlined text-bonus text-[16px] fill-current">star</span>
                                    </div>
                                    <p className="text-xs text-text-sub font-medium flex items-center gap-1.5 mt-0.5">
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${picker.safety_verified ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {picker.safety_verified ? 'Onboarded' : 'Pending'}
                                        </span>
                                        <span className="text-gray-300">|</span>
                                        <span className="text-primary font-bold">Row {picker.current_row || 0}</span>
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="block text-2xl font-black text-slate-800">{picker.total_buckets_today || 0}</span>
                                <span className="text-[10px] text-gray-400 font-bold uppercase">Buckets</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 bg-background-light/50 p-3 rounded-lg border border-border-light/50">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-text-sub tracking-wide block mb-1.5">Picker ID</label>
                                <div className="relative">
                                    <input className="w-full bg-white border-border-light rounded-lg px-3 py-2 text-sm font-mono font-bold text-text-main focus:ring-2 focus:ring-primary-vibrant focus:border-primary-vibrant shadow-sm transition-all" type="text" readOnly value={picker.picker_id} />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-primary-dim tracking-wide block mb-1.5">Harness No.</label>
                                <div className="relative">
                                    <input className="w-full bg-white border-border-light rounded-lg px-3 py-2 text-sm font-mono font-bold text-primary-vibrant focus:ring-2 focus:ring-primary-vibrant focus:border-primary-vibrant shadow-sm transition-all uppercase" type="text" readOnly defaultValue={picker.harness_id || ''} placeholder="Assign..." />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Botón flotante para añadir */}
                <div className="fixed bottom-24 left-0 w-full px-4 pb-2 z-40 pointer-events-none">
                    <div className="pointer-events-auto">
                        <button className="w-full bg-primary-vibrant hover:bg-primary-dim text-white text-lg font-bold py-3.5 rounded-xl shadow-[0_8px_20px_rgba(255,31,61,0.4)] flex items-center justify-center gap-2 transform active:scale-[0.98] transition-all border border-white/10">
                            <span className="material-symbols-outlined text-[24px]">person_add</span>
                            Add New Picker
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default TeamView;
