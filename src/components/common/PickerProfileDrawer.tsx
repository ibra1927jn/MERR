/**
 * PickerProfileDrawer — Slide-in profile panel con dispatch por rol
 *
 * Roles despachados:
 *   team_leader → TeamLeaderPanel  (stats del equipo, roster, sin métricas de picker)
 *   runner      → RunnerPanel      (ruta, trips, sin harness/earned/rate)
 *   picker/otro → PickerPanel      (bins, horas, earned — con fix $0 cuando horas=0)
 *
 * Triggered globally via Zustand UISlice (openPickerProfile).
 */
import React, { useEffect, useState, useMemo } from 'react';
import { useHarvestStore } from '@/stores/useHarvestStore';
import { pickerHistoryService, PickerHistory } from '@/services/picker-history.service';
import { logger } from '@/utils/logger';
import { Picker } from '@/types';
import { Sparkline, QualityRing, RiskBadge as RiskBadgeComponent, TabButton as TabBtn } from './picker-profile';

/* ══════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════ */

function getRouteLabel(row: number): string {
    if (row <= 20) return 'Block A → Bin Station 1';
    if (row <= 40) return 'Block B → Bin Station 2';
    return 'Block C → Bin Station 3';
}

/* ══════════════════════════════════════════════
   RUNNER PANEL — ruta y trips, sin métricas de picker
   ══════════════════════════════════════════════ */
const RunnerPanel: React.FC<{ member: Picker; crew: Picker[] }> = ({ member, crew }) => {
    const effectiveHours = member.check_in_time
        ? Math.max(0, (Date.now() - new Date(member.check_in_time).getTime()) / 3600000)
        : 0;
    const teamLeaderName = member.team_leader_id
        ? (crew.find(c => c.id === member.team_leader_id)?.name || 'Assigned')
        : 'Unassigned';

    return (
        <div className="space-y-4">
            {/* Stats de actividad */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-amber-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-black text-amber-700">{member.total_buckets_today ?? 0}</p>
                    <p className="text-[10px] text-amber-600 font-bold">TRIPS COMPLETED</p>
                </div>
                <div className="bg-sky-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-black text-sky-700">{effectiveHours > 0 ? effectiveHours.toFixed(1) : '0'}h</p>
                    <p className="text-[10px] text-sky-600 font-bold">HOURS ON-SITE</p>
                </div>
            </div>

            {/* Ruta y equipo */}
            <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Route & Assignment</p>
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 rounded-lg p-2">
                        <p className="text-[10px] text-slate-400 mb-0.5">Current Route</p>
                        <p className="text-xs font-bold text-slate-900">
                            {member.current_row ? getRouteLabel(member.current_row) : 'Not assigned'}
                        </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2">
                        <p className="text-[10px] text-slate-400 mb-0.5">Assigned Team</p>
                        <p className="text-xs font-bold text-slate-900">{teamLeaderName}</p>
                    </div>
                </div>
            </div>

            {/* Acciones */}
            <div className="flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-indigo-50 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors shadow-sm">
                    <span className="material-symbols-outlined text-sm">chat</span>
                    Message TL
                </button>
                <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-amber-50 text-xs font-bold text-amber-700 hover:bg-amber-100 transition-colors shadow-sm">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    Mark Route Complete
                </button>
            </div>
        </div>
    );
};

/* ══════════════════════════════════════════════
   TEAM LEADER PANEL — métricas de equipo, roster, compliance
   ══════════════════════════════════════════════ */
const TeamLeaderPanel: React.FC<{ leader: Picker; crew: Picker[]; pieceRate: number; minWage: number }> = ({
    leader, crew, pieceRate, minWage
}) => {
    const myPickers = useMemo(() =>
        crew.filter(p => p.team_leader_id === leader.id && (p.role === 'picker' || !p.role)),
        [crew, leader.id]
    );
    const activePickers = myPickers.filter(p => p.status === 'active');
    const totalBuckets = myPickers.reduce((s, p) => s + (p.total_buckets_today ?? 0), 0);
    const avgBuckets = myPickers.length > 0 ? Math.round(totalBuckets / myPickers.length) : 0;
    const belowMin = myPickers.filter(p => {
        const rate = p.hours && p.hours > 0 ? ((p.total_buckets_today ?? 0) * pieceRate) / p.hours : 0;
        return rate < minWage && rate > 0;
    });

    // Horas efectivas del TL (check_in_time si no hay hours)
    const tlHours = leader.hours && leader.hours > 0
        ? leader.hours
        : leader.check_in_time
          ? Math.max(0, (Date.now() - new Date(leader.check_in_time).getTime()) / 3600000)
          : 0;

    return (
        <div className="space-y-4">
            {/* Stats del TL */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-sky-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-black text-sky-700">{tlHours.toFixed(1)}h</p>
                    <p className="text-[10px] text-sky-600 font-bold">HOURS TODAY</p>
                </div>
                <div className="bg-indigo-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-black text-indigo-700">{myPickers.length}</p>
                    <p className="text-[10px] text-indigo-600 font-bold">TEAM SIZE</p>
                </div>
            </div>

            {/* Team Overview */}
            <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Team Overview</p>
                <div className="grid grid-cols-3 gap-2">
                    <div className="bg-emerald-50 rounded-lg p-2 text-center">
                        <p className="text-xl font-black text-emerald-700">{activePickers.length}</p>
                        <p className="text-[9px] text-emerald-600 font-bold">ACTIVE</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2 text-center">
                        <p className="text-xl font-black text-slate-700">{totalBuckets}</p>
                        <p className="text-[9px] text-slate-500 font-bold">TEAM BINS</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2 text-center">
                        <p className="text-xl font-black text-slate-700">{avgBuckets}</p>
                        <p className="text-[9px] text-slate-500 font-bold">AVG/PICKER</p>
                    </div>
                </div>
            </div>

            {/* Compliance alerts */}
            {belowMin.length > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="material-symbols-outlined text-sm text-red-500">warning</span>
                        <p className="text-xs font-bold text-red-700">{belowMin.length} picker{belowMin.length > 1 ? 's' : ''} below minimum wage</p>
                    </div>
                    <p className="text-[10px] text-red-600">{belowMin.map(p => p.name).join(', ')}</p>
                </div>
            )}

            {/* Roster */}
            {myPickers.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pt-3 pb-2">Team Roster</p>
                    <div className="divide-y divide-border-light max-h-48 overflow-y-auto">
                        {myPickers.map(p => (
                            <div key={p.id} className="flex items-center px-3 py-2 gap-2">
                                <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700 shrink-0">
                                    {p.name?.charAt(0)}
                                </div>
                                <span className="text-xs font-medium text-text-main flex-1 truncate">{p.name}</span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${p.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {p.status === 'active' ? 'Active' : p.status === 'on_break' ? 'Break' : 'Away'}
                                </span>
                                <span className="text-[10px] text-slate-500 font-bold w-10 text-right">{p.total_buckets_today ?? 0} bins</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Acciones */}
            <div className="flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-indigo-50 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors shadow-sm">
                    <span className="material-symbols-outlined text-sm">chat</span>
                    Message Manager
                </button>
                <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-purple-50 text-xs font-bold text-purple-700 hover:bg-purple-100 transition-colors shadow-sm">
                    <span className="material-symbols-outlined text-sm">campaign</span>
                    Broadcast to Team
                </button>
            </div>
        </div>
    );
};

/* ══════════════════════════════════════════════
   PICKER PANEL (TODAY TAB) — métricas de picker con fix $0
   ══════════════════════════════════════════════ */
const PickerTodayPanel: React.FC<{
    history: PickerHistory;
    pickerInCrew: Picker | undefined;
    crew: Picker[];
    minWage: number;
    pieceRate: number;
}> = ({ history, pickerInCrew, crew, minWage, pieceRate }) => {
    // Fix: si bins > 0 y horas = 0, derivar earnings desde piece_rate
    const derivedEarnings = history.todayHours > 0
        ? history.todayEarnings
        : history.todayBuckets * pieceRate;
    const derivedEarningsDisplay = history.todayHours > 0
        ? history.todayEarnings
        : history.todayBuckets > 0 ? derivedEarnings : 0;

    // Effective rate — solo mostrar si hay horas reales
    const hourlyRate = history.todayHours > 0
        ? derivedEarningsDisplay / history.todayHours
        : null;
    const isAboveMinimum = hourlyRate !== null && hourlyRate >= minWage;

    return (
        <div className="space-y-4">
            {/* KPI Grid */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-black text-emerald-700">{history.todayBuckets}</p>
                    <p className="text-[10px] text-emerald-600 font-bold">BINS</p>
                </div>
                <div className="bg-sky-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-black text-sky-700">{history.todayHours.toFixed(1)}h</p>
                    <p className="text-[10px] text-sky-600 font-bold">HOURS</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-black text-amber-700">${derivedEarningsDisplay.toFixed(0)}</p>
                    <p className="text-[10px] text-amber-600 font-bold">EARNED</p>
                </div>
            </div>

            {/* Bucket Rate */}
            <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
                <div className="flex justify-between items-center">
                    <span className="text-xs text-text-muted">Bucket Rate</span>
                    <span className="text-lg font-black text-text-main">
                        {history.todayHours > 0 ? (history.todayBuckets / history.todayHours).toFixed(1) : '—'} /hr
                    </span>
                </div>
            </div>

            {/* Effective Rate — ocultar si horas = 0 */}
            {hourlyRate !== null ? (
                <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-text-muted">Effective Rate</span>
                        <span className={`text-base font-bold ${isAboveMinimum ? 'text-emerald-600' : 'text-red-500'}`}>
                            ${hourlyRate.toFixed(2)}/hr
                        </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-700 ${isAboveMinimum ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-red-300 to-red-400'}`}
                            style={{ width: `${Math.min(100, (hourlyRate / (minWage * 1.5)) * 100)}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-1">
                        <span className="text-[10px] text-slate-400">$0</span>
                        <span className={`text-[10px] font-medium ${isAboveMinimum ? 'text-slate-400' : 'text-red-500'}`}>
                            Min ${minWage}/hr{!isAboveMinimum && ' ⬇ Below'}
                        </span>
                    </div>
                </div>
            ) : history.todayBuckets > 0 ? (
                /* Bins escaneados pero aún no se registró check_in_time — estado neutral */
                <div className="bg-slate-50 rounded-xl border border-slate-100 p-3 shadow-sm text-center">
                    <span className="material-symbols-outlined text-slate-400 text-2xl block mb-1">schedule</span>
                    <p className="text-xs font-bold text-slate-500">Not started yet</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Effective rate shows after first hour is logged</p>
                </div>
            ) : null}

            {/* Details */}
            {pickerInCrew && (
                <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Details</p>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-50 rounded-lg p-2">
                            <p className="text-[10px] text-slate-400 mb-0.5">Current Row</p>
                            <p className="text-xs font-bold text-slate-900">
                                {pickerInCrew.current_row ? `Row ${pickerInCrew.current_row}` : 'Unassigned'}
                            </p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-2">
                            <p className="text-[10px] text-slate-400 mb-0.5">Harness</p>
                            <p className={`text-xs font-bold ${pickerInCrew.harness_id ? 'text-slate-900' : 'text-amber-600'}`}>
                                {pickerInCrew.harness_id || 'Not assigned'}
                            </p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-2">
                            <p className="text-[10px] text-slate-400 mb-0.5">Team</p>
                            <p className="text-xs font-bold text-slate-900">
                                {pickerInCrew.team_leader_id
                                    ? (crew.find(c => c.id === pickerInCrew.team_leader_id)?.name || 'Assigned')
                                    : 'No team'}
                            </p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-2">
                            <p className="text-[10px] text-slate-400 mb-0.5">Hours Today</p>
                            <p className="text-xs font-bold text-slate-900">{history.todayHours.toFixed(1)}h</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Acciones de picker */}
            <div className="flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/80 border border-slate-100 text-xs font-bold text-indigo-700 hover:bg-indigo-50 transition-colors shadow-sm">
                    <span className="material-symbols-outlined text-sm">chat</span>
                    Message TL
                </button>
                <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/80 border border-slate-100 text-xs font-bold text-amber-700 hover:bg-amber-50 transition-colors shadow-sm">
                    <span className="material-symbols-outlined text-sm">flag</span>
                    Flag for QC
                </button>
            </div>
        </div>
    );
};

/* ══════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════ */
const PickerProfileDrawer: React.FC = () => {
    const pickerId = useHarvestStore(s => s.pickerProfileId);
    const closeDrawer = useHarvestStore(s => s.closePickerProfile);
    const orchardId = useHarvestStore(s => s.orchard?.id);
    const settings = useHarvestStore(s => s.settings);
    const crew = useHarvestStore(s => s.crew);

    const [history, setHistory] = useState<PickerHistory | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'today' | 'history' | 'quality'>('today');

    // Fetch data when picker changes
    useEffect(() => {
        if (!pickerId || !orchardId) {
            setHistory(null);
            return;
        }
        setIsLoading(true);
        setActiveTab('today');
        pickerHistoryService.getPickerHistory(pickerId, orchardId)
            .then(data => setHistory(data))
            .catch(e => logger.error('[PickerDrawer]', e))
            .finally(() => setIsLoading(false));
    }, [pickerId, orchardId]);

    // Sparkline data
    const dailyBuckets = useMemo(() =>
        history?.dailyRecords.map(r => r.buckets) || [],
        [history]
    );

    const pickerInCrew = useMemo(() =>
        pickerId ? crew.find(c => c.id === pickerId) : undefined,
        [crew, pickerId]
    );

    const minWage = settings?.min_wage_rate ?? 23.95;
    const pieceRate = settings?.piece_rate ?? 6.5;

    // Detectar rol para dispatch
    const role: string = pickerInCrew?.role ?? 'picker';
    const isTL = role === 'team_leader';
    const isRunner = role === 'runner';

    if (!pickerId) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 transition-opacity"
                onClick={closeDrawer}
            />

            {/* Drawer */}
            <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto animate-slide-in-right">
                {/* Close button */}
                <button
                    onClick={closeDrawer}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors z-10"
                >
                    <span className="material-symbols-outlined text-lg">close</span>
                </button>

                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <div className="w-12 h-12 rounded-full border-3 border-primary-light border-t-primary animate-spin mx-auto mb-3" />
                            <p className="text-sm text-text-muted">Loading profile...</p>
                        </div>
                    </div>
                ) : !history && !pickerInCrew ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <span className="material-symbols-outlined text-5xl text-slate-300 mb-2 block">person_off</span>
                            <p className="text-sm text-text-muted">Member not found</p>
                        </div>
                    </div>
                ) : (
                    <div className="p-5 space-y-5">
                        {/* ── Profile Header ── */}
                        <div className={`rounded-2xl p-5 -mx-1 ${isTL ? 'bg-gradient-to-br from-indigo-50 to-blue-50' : isRunner ? 'bg-gradient-to-br from-amber-50 to-orange-50' : 'bg-gradient-to-br from-indigo-50 to-purple-50'}`}>
                            <div className="flex items-start gap-4">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg ${isTL ? 'bg-gradient-to-br from-indigo-500 to-blue-600' : isRunner ? 'bg-gradient-to-br from-amber-500 to-orange-500' : 'bg-gradient-to-br from-indigo-500 to-purple-500'}`}>
                                    {(history?.profile.name ?? pickerInCrew?.name ?? '?').charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-lg font-black text-text-main">
                                        {history?.profile.name ?? pickerInCrew?.name ?? 'Unknown'}
                                    </h2>
                                    <p className="text-xs text-text-muted">
                                        ID: {history?.profile.picker_id ?? pickerInCrew?.picker_id ?? pickerId}
                                    </p>
                                    <p className="text-xs font-bold mt-0.5 capitalize" style={{ color: isTL ? '#4f46e5' : isRunner ? '#d97706' : '#7c3aed' }}>
                                        {isTL ? 'Team Leader' : isRunner ? 'Bucket Runner' : 'Picker'}
                                    </p>
                                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${(pickerInCrew?.status ?? history?.profile.status) === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                        {((pickerInCrew?.status ?? history?.profile.status) ?? 'active').toUpperCase()}
                                    </span>
                                </div>
                                {history?.quality && history.quality.total > 0 && !isTL && !isRunner && (
                                    <QualityRing score={history.quality.score} />
                                )}
                            </div>
                        </div>

                        {/* ── Risk Badges (sólo pickers) ── */}
                        {!isTL && !isRunner && history?.riskBadges && history.riskBadges.length > 0 && (
                            <div className="space-y-2">
                                {history.riskBadges.map(badge => (
                                    <RiskBadgeComponent key={badge.type} badge={badge} />
                                ))}
                            </div>
                        )}

                        {/* ── TL: renderizar directo sin tabs históricos ── */}
                        {isTL && pickerInCrew && (
                            <TeamLeaderPanel
                                leader={pickerInCrew}
                                crew={crew}
                                pieceRate={pieceRate}
                                minWage={minWage}
                            />
                        )}

                        {/* ── Runner: renderizar directo ── */}
                        {isRunner && pickerInCrew && (
                            <RunnerPanel member={pickerInCrew} crew={crew} />
                        )}

                        {/* ── Picker: tabs completos ── */}
                        {!isTL && !isRunner && history && (
                            <>
                                {/* Tab Switcher */}
                                <div className="flex gap-1 bg-slate-100 rounded-full p-1">
                                    <TabBtn active={activeTab === 'today'} label="Today" onClick={() => setActiveTab('today')} />
                                    <TabBtn active={activeTab === 'history'} label="History" onClick={() => setActiveTab('history')} />
                                    <TabBtn active={activeTab === 'quality'} label="Quality" onClick={() => setActiveTab('quality')} />
                                </div>

                                {/* TODAY */}
                                {activeTab === 'today' && (
                                    <PickerTodayPanel
                                        history={history}
                                        pickerInCrew={pickerInCrew}
                                        crew={crew}
                                        minWage={minWage}
                                        pieceRate={pieceRate}
                                    />
                                )}

                                {/* HISTORY */}
                                {activeTab === 'history' && (
                                    <div className="space-y-4">
                                        {history.teamLeadersWorkedWith.length > 0 && (
                                            <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                                                <h4 className="text-xs font-bold text-text-main mb-2 flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-sm text-indigo-500">groups</span>
                                                    Team Leaders Worked With
                                                </h4>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {history.teamLeadersWorkedWith.map(tl => (
                                                        <span key={tl} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">{tl}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {history.varietiesPicked.length > 0 && (
                                            <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                                                <h4 className="text-xs font-bold text-text-main mb-2 flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-sm text-pink-500">eco</span>
                                                    Varieties Picked
                                                </h4>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {history.varietiesPicked.map(v => (
                                                        <span key={v} className="px-2.5 py-1 bg-pink-50 text-pink-700 rounded-full text-xs font-medium">{v}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                                            <h4 className="text-xs font-bold text-text-main p-4 pb-2 flex items-center gap-1">
                                                <span className="material-symbols-outlined text-sm text-emerald-500">calendar_month</span>
                                                Daily Records
                                            </h4>
                                            {history.dailyRecords.length === 0 ? (
                                                <p className="text-center text-text-muted text-xs py-6">No history yet</p>
                                            ) : (
                                                <div className="divide-y divide-border-light">
                                                    {[...history.dailyRecords].reverse().slice(0, 14).map(r => (
                                                        <div key={r.date} className="flex items-center px-4 py-2.5 hover:bg-slate-50 transition-colors">
                                                            <span className="text-xs text-text-muted w-20">
                                                                {new Date(r.date + 'T12:00:00').toLocaleDateString('en-NZ', { month: 'short', day: 'numeric' })}
                                                            </span>
                                                            <span className="text-xs font-bold text-emerald-600 w-16">{r.buckets} bins</span>
                                                            <span className="text-xs text-text-muted w-12">{r.hours.toFixed(1)}h</span>
                                                            <span className="text-xs font-medium text-text-main ml-auto">${r.earnings.toFixed(0)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        {dailyBuckets.length > 1 && (
                                            <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
                                                <p className="text-xs text-text-muted mb-2">Daily Output (last {dailyBuckets.length} days)</p>
                                                <Sparkline data={dailyBuckets} color="#6366f1" />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* QUALITY */}
                                {activeTab === 'quality' && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-4 gap-2">
                                            <div className="bg-emerald-50 rounded-xl p-3 text-center">
                                                <p className="text-xl font-black text-emerald-700">{history.quality.gradeA}</p>
                                                <p className="text-[10px] text-emerald-600 font-bold">Grade A</p>
                                            </div>
                                            <div className="bg-sky-50 rounded-xl p-3 text-center">
                                                <p className="text-xl font-black text-sky-700">{history.quality.gradeB}</p>
                                                <p className="text-[10px] text-sky-600 font-bold">Grade B</p>
                                            </div>
                                            <div className="bg-amber-50 rounded-xl p-3 text-center">
                                                <p className="text-xl font-black text-amber-700">{history.quality.gradeC}</p>
                                                <p className="text-[10px] text-amber-600 font-bold">Grade C</p>
                                            </div>
                                            <div className="bg-red-50 rounded-xl p-3 text-center">
                                                <p className="text-xl font-black text-red-700">{history.quality.reject}</p>
                                                <p className="text-[10px] text-red-600 font-bold">Rejected</p>
                                            </div>
                                        </div>
                                        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm text-center">
                                            <p className="text-xs text-text-muted mb-2">Overall Quality Score</p>
                                            <div className="flex items-center justify-center gap-4">
                                                <QualityRing score={history.quality.score} />
                                                <div className="text-left">
                                                    <p className="text-2xl font-black text-text-main">{history.quality.score}/100</p>
                                                    <p className="text-xs text-text-muted">from {history.quality.total} inspections</p>
                                                </div>
                                            </div>
                                        </div>
                                        {history.quality.total === 0 && (
                                            <div className="flex flex-col items-center py-6">
                                                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">search_off</span>
                                                <p className="text-sm text-text-muted">No quality inspections yet</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        {/* Fallback: pickerInCrew existe pero no hay history (datos aún cargando) */}
                        {!isTL && !isRunner && !history && pickerInCrew && (
                            <div className="text-center py-8 text-text-muted text-sm">No data available for today</div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};

export default PickerProfileDrawer;
