/**
 * PickerProfileDrawer — Slide-in profile panel for any picker
 * 
 * Triggered globally via Zustand UISlice (openPickerProfile).
 * Shows: today's stats, risk badges, quality, work history, quick actions.
 */
import React, { useEffect, useState, useMemo } from 'react';
import { useHarvestStore } from '@/stores/useHarvestStore';
import { pickerHistoryService, PickerHistory } from '@/services/picker-history.service';
import { logger } from '@/utils/logger';

/* ── Mini Sparkline Chart (last 14 days) ── */
const Sparkline: React.FC<{ data: number[]; color: string; height?: number }> = ({ data, color, height = 40 }) => {
    if (data.length < 2) return null;
    const max = Math.max(...data, 1);
    const w = 200;
    const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${height - (v / max) * (height - 4)}`).join(' ');
    return (
        <svg viewBox={`0 0 ${w} ${height}`} className="w-full" preserveAspectRatio="none">
            <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
            <polyline fill={`${color}20`} stroke="none" points={`0,${height} ${points} ${w},${height}`} />
        </svg>
    );
};

/* ── Quality Ring ── */
const QualityRing: React.FC<{ score: number }> = ({ score }) => {
    const pct = Math.min(100, score);
    const circumference = 2 * Math.PI * 16;
    const strokeOffset = circumference - (pct / 100) * circumference;
    const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';

    return (
        <div className="relative w-14 h-14">
            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                <circle cx="18" cy="18" r="16" fill="none" stroke="#e2e8f0" strokeWidth="2.5" />
                <circle cx="18" cy="18" r="16" fill="none" stroke={color} strokeWidth="2.5"
                    strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeOffset}
                    className="transition-all duration-1000" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-black" style={{ color }}>{score}</span>
            </div>
        </div>
    );
};

/* ── Risk Badge ── */
const RiskBadgeComponent: React.FC<{ badge: { type: string; severity: string; label: string; detail: string } }> = ({ badge }) => {
    const icons: Record<string, string> = {
        fatigue: '🔋', chronic_topup: '💸', quality_drop: '📉', anomalous_scans: '🚨'
    };
    const bgColors: Record<string, string> = {
        warning: 'bg-amber-50 border-amber-200 text-amber-800',
        critical: 'bg-red-50 border-red-200 text-red-800',
    };
    return (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium ${bgColors[badge.severity] || bgColors.warning}`}>
            <span className="text-base">{icons[badge.type] || '⚠️'}</span>
            <div>
                <p className="font-bold">{badge.label}</p>
                <p className="opacity-70 text-[10px]">{badge.detail}</p>
            </div>
        </div>
    );
};

/* ── Tab Button ── */
const TabBtn: React.FC<{ active: boolean; label: string; onClick: () => void }> = ({ active, label, onClick }) => (
    <button
        onClick={onClick}
        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${active
            ? 'gradient-primary text-white shadow-md'
            : 'text-text-muted hover:bg-slate-100'}`}
    >
        {label}
    </button>
);

/* ══════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════ */
const PickerProfileDrawer: React.FC = () => {
    const pickerId = useHarvestStore(s => s.pickerProfileId);
    const closeDrawer = useHarvestStore(s => s.closePickerProfile);
    const orchardId = useHarvestStore(s => s.orchard?.id);

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
                ) : !history ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <span className="material-symbols-outlined text-5xl text-slate-300 mb-2 block">person_off</span>
                            <p className="text-sm text-text-muted">Picker not found</p>
                        </div>
                    </div>
                ) : (
                    <div className="p-5 space-y-5">
                        {/* ── Profile Header ── */}
                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-5 -mx-1">
                            <div className="flex items-start gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black text-xl shadow-lg">
                                    {history.profile.name.charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-lg font-black text-text-main">{history.profile.name}</h2>
                                    <p className="text-xs text-text-muted">ID: {history.profile.picker_id}</p>
                                    {history.profile.team_leader_name && (
                                        <p className="text-xs text-indigo-600 font-medium mt-0.5">
                                            Team: {history.profile.team_leader_name}
                                        </p>
                                    )}
                                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${history.profile.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                        {history.profile.status.toUpperCase()}
                                    </span>
                                </div>
                                <QualityRing score={history.quality.score} />
                            </div>

                            {/* Quick Actions */}
                            <div className="flex gap-2 mt-4">
                                <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/80 text-xs font-bold text-indigo-700 hover:bg-white transition-colors shadow-sm">
                                    <span className="material-symbols-outlined text-sm">chat</span>
                                    Message TL
                                </button>
                                <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/80 text-xs font-bold text-amber-700 hover:bg-white transition-colors shadow-sm">
                                    <span className="material-symbols-outlined text-sm">flag</span>
                                    Flag for QC
                                </button>
                            </div>
                        </div>

                        {/* ── Risk Badges ── */}
                        {history.riskBadges.length > 0 && (
                            <div className="space-y-2">
                                {history.riskBadges.map(badge => (
                                    <RiskBadgeComponent key={badge.type} badge={badge} />
                                ))}
                            </div>
                        )}

                        {/* ── Tab Switcher ── */}
                        <div className="flex gap-1 bg-slate-100 rounded-full p-1">
                            <TabBtn active={activeTab === 'today'} label="Today" onClick={() => setActiveTab('today')} />
                            <TabBtn active={activeTab === 'history'} label="History" onClick={() => setActiveTab('history')} />
                            <TabBtn active={activeTab === 'quality'} label="Quality" onClick={() => setActiveTab('quality')} />
                        </div>

                        {/* ── TODAY TAB ── */}
                        {activeTab === 'today' && (
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
                                        <p className="text-2xl font-black text-amber-700">${history.todayEarnings.toFixed(0)}</p>
                                        <p className="text-[10px] text-amber-600 font-bold">EARNED</p>
                                    </div>
                                </div>

                                {/* Rate */}
                                <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-text-muted">Bucket Rate</span>
                                        <span className="text-lg font-black text-text-main">
                                            {history.todayHours > 0 ? (history.todayBuckets / history.todayHours).toFixed(1) : '0'} /hr
                                        </span>
                                    </div>
                                </div>

                                {/* Sparkline */}
                                {dailyBuckets.length > 1 && (
                                    <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
                                        <p className="text-xs text-text-muted mb-2">Daily Output (last {dailyBuckets.length} days)</p>
                                        <Sparkline data={dailyBuckets} color="#6366f1" />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── HISTORY TAB ── */}
                        {activeTab === 'history' && (
                            <div className="space-y-4">
                                {/* Team Leaders */}
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

                                {/* Varieties */}
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

                                {/* Daily Records Table */}
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
                            </div>
                        )}

                        {/* ── QUALITY TAB ── */}
                        {activeTab === 'quality' && (
                            <div className="space-y-4">
                                {/* Grade Breakdown */}
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

                                {/* Quality Score */}
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
                    </div>
                )}
            </div>
        </>
    );
};

export default PickerProfileDrawer;
