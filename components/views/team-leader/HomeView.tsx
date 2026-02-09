import React, { useMemo } from 'react';
import { useHarvest } from '../../../context/HarvestContext';
import { useAuth } from '../../../context/AuthContext';

const HomeView = () => {
    // 1. Conexión a datos reales
    const { crew, bucketRecords, stats } = useHarvest();
    const { appUser } = useAuth();

    // 2. Filtrado de Cuadrilla (Solo mi equipo)
    const myCrew = useMemo(() => {
        if (!appUser) return [];
        // Filtramos pickers asignados a este usuario logueado
        // Si el usuario es manager o admin, quizás ver todo (opcional), pero por defecto solo su equipo
        return crew.filter(p => p.team_leader_id === appUser.id);
    }, [crew, appUser]);

    // 3. Cálculos en tiempo real (Solo registros de HOY para MI equipo)
    const teamStats = useMemo(() => {
        const myPickerIds = myCrew.map(p => p.id);
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const todayRecords = bucketRecords.filter(r =>
            myPickerIds.includes(r.picker_id) &&
            new Date(r.scanned_at).getTime() >= startOfDay.getTime()
        );

        const totalBuckets = todayRecords.length;
        // Fallback a variable global si stats no está cargado
        const pieceRate = (stats as any)?.piece_rate || 6.50;
        const estimatedPay = totalBuckets * pieceRate;
        // Estimado: 1 bucket ~ 18kg (0.018 tons)
        const estimatedTons = totalBuckets * 0.018;

        return { totalBuckets, estimatedPay, estimatedTons };
    }, [myCrew, bucketRecords, stats]);

    return (
        <div className="pb-6">
            {/* HEADER DINÁMICO */}
            <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200 pb-3 pt-4 shadow-sm">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center size-10 rounded-full bg-white border border-[#22c55e]/20 text-[#22c55e] shadow-[0_2px_8px_rgba(34,197,94,0.15)]">
                            <span className="material-symbols-outlined text-[24px]">agriculture</span>
                        </div>
                        <div>
                            <h1 className="text-slate-900 text-lg font-bold leading-tight tracking-tight">
                                {appUser?.full_name || 'Team Leader'}
                            </h1>
                            <p className="text-xs text-slate-500 font-medium">
                                {myCrew.length} Pickers Assigned
                            </p>
                        </div>
                    </div>
                </div>

                {/* KPIs REALES */}
                <div className="grid grid-cols-3 gap-3 px-4 mt-1">
                    <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-white border border-slate-200 shadow-sm">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Buckets</span>
                        <span className="text-[#22c55e] text-xl font-bold font-mono tracking-tight">
                            {teamStats.totalBuckets}
                        </span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-white border border-slate-200 shadow-sm">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Pay Est.</span>
                        <span className="text-slate-900 text-xl font-bold font-mono tracking-tight">
                            ${teamStats.estimatedPay.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-white border border-slate-200 shadow-sm">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Tons</span>
                        <span className="text-slate-900 text-xl font-bold font-mono tracking-tight">
                            {teamStats.estimatedTons.toFixed(1)}
                        </span>
                    </div>
                </div>
            </header>

            {/* LISTA DINÁMICA */}
            <section className="mt-8 px-4 pb-20">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[#22c55e] text-lg font-bold">My Crew ({myCrew.length})</h2>
                </div>

                <div className="flex flex-col gap-3">
                    {myCrew.length === 0 ? (
                        <div className="text-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-400">
                            No tienes pickers asignados.
                            <br /><span className="text-xs">Ve a la pestaña "Team" para añadir uno.</span>
                        </div>
                    ) : (
                        myCrew.map(picker => (
                            <div key={picker.id} className="group bg-white rounded-xl p-4 border border-slate-200 shadow-sm transition-all hover:bg-gray-50">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 rounded-full bg-gray-100 flex items-center justify-center text-[#22c55e] font-bold border border-gray-200">
                                            {picker.avatar || (picker.name || '??').substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="text-slate-900 font-bold text-base leading-tight">{picker.name}</h3>
                                            <p className="text-xs text-slate-500">
                                                ID #{picker.picker_id} • Row {picker.current_row || '-'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[#22c55e] text-2xl font-bold font-mono leading-none">
                                            {picker.total_buckets_today || 0}
                                        </p>
                                        <p className="text-[10px] text-slate-400 uppercase font-medium">Buckets</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>
        </div>
    );
};

export default HomeView;
