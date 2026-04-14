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
import { useTranslation } from '@/i18n';
import {
    QualityRing,
    RiskBadge as RiskBadgeComponent,
    TabButton as TabBtn,
    RunnerPanel,
    TeamLeaderPanel,
    PickerPanel,
    HistoryTab,
    QualityTab,
} from './picker-profile';

const PickerProfileDrawer: React.FC = () => {
    const { t } = useTranslation();
    const pickerId = useHarvestStore(s => s.pickerProfileId);
    const closeDrawer = useHarvestStore(s => s.closePickerProfile);
    const orchardId = useHarvestStore(s => s.orchard?.id);
    const settings = useHarvestStore(s => s.settings);
    const crew = useHarvestStore(s => s.crew);

    const [history, setHistory] = useState<PickerHistory | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'today' | 'history' | 'quality'>('today');

    // Fetch data cuando cambia el picker seleccionado
    useEffect(() => {
        if (!pickerId || !orchardId) { setHistory(null); return; }
        setIsLoading(true);
        setActiveTab('today');
        pickerHistoryService.getPickerHistory(pickerId, orchardId)
            .then(data => setHistory(data))
            .catch(e => logger.error('[PickerDrawer]', e))
            .finally(() => setIsLoading(false));
    }, [pickerId, orchardId]);

    const dailyBuckets = useMemo(() => history?.dailyRecords.map(r => r.buckets) || [], [history]);
    const pickerInCrew = useMemo(() => pickerId ? crew.find(c => c.id === pickerId) : undefined, [crew, pickerId]);

    const minWage = settings?.min_wage_rate ?? 23.95;
    const pieceRate = settings?.piece_rate ?? 6.5;
    const role: string = pickerInCrew?.role ?? 'picker';
    const isTL = role === 'team_leader';
    const isRunner = role === 'runner';

    if (!pickerId) return null;

    // Color scheme según rol
    const headerBg = isTL ? 'bg-gradient-to-br from-indigo-50 to-blue-50'
        : isRunner ? 'bg-gradient-to-br from-amber-50 to-orange-50'
        : 'bg-gradient-to-br from-indigo-50 to-purple-50';
    const avatarBg = isTL ? 'bg-gradient-to-br from-indigo-500 to-blue-600'
        : isRunner ? 'bg-gradient-to-br from-amber-500 to-orange-500'
        : 'bg-gradient-to-br from-indigo-500 to-purple-500';
    const roleColor = isTL ? '#4f46e5' : isRunner ? '#d97706' : '#7c3aed';
    const roleLabel = isTL ? t('panel.role.team_leader') : isRunner ? t('panel.role.runner') : t('panel.role.picker');
    const currentStatus = pickerInCrew?.status ?? history?.profile.status ?? 'active';
    const statusLabel = currentStatus === 'active' ? t('panel.status.active')
        : currentStatus === 'on_break' ? t('panel.status.break')
        : t('panel.status.away');

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 transition-opacity" onClick={closeDrawer} />

            {/* Drawer */}
            <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto animate-slide-in-right">
                {/* Botón de cierre */}
                <button onClick={closeDrawer} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors z-10">
                    <span className="material-symbols-outlined text-lg">close</span>
                </button>

                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <div className="w-12 h-12 rounded-full border-3 border-primary-light border-t-primary animate-spin mx-auto mb-3" />
                            <p className="text-sm text-text-muted">{t('panel.loading')}</p>
                        </div>
                    </div>
                ) : !history && !pickerInCrew ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <span className="material-symbols-outlined text-5xl text-slate-300 mb-2 block">person_off</span>
                            <p className="text-sm text-text-muted">{t('panel.not_found')}</p>
                        </div>
                    </div>
                ) : (
                    <div className="p-5 space-y-5">
                        {/* ── Profile Header ── */}
                        <div className={`rounded-2xl p-5 -mx-1 ${headerBg}`}>
                            <div className="flex items-start gap-4">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg ${avatarBg}`}>
                                    {(history?.profile.name ?? pickerInCrew?.name ?? '?').charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-lg font-black text-text-main">
                                        {history?.profile.name ?? pickerInCrew?.name ?? 'Unknown'}
                                    </h2>
                                    <p className="text-xs text-text-muted">
                                        ID: {history?.profile.picker_id ?? pickerInCrew?.picker_id ?? pickerId}
                                    </p>
                                    <p className="text-xs font-bold mt-0.5 capitalize" style={{ color: roleColor }}>{roleLabel}</p>
                                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${currentStatus === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                        {statusLabel.toUpperCase()}
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
                            <TeamLeaderPanel leader={pickerInCrew} crew={crew} pieceRate={pieceRate} minWage={minWage} />
                        )}

                        {/* ── Runner: renderizar directo ── */}
                        {isRunner && pickerInCrew && (
                            <RunnerPanel member={pickerInCrew} crew={crew} />
                        )}

                        {/* ── Picker: tabs completos ── */}
                        {!isTL && !isRunner && history && (
                            <>
                                <div className="flex gap-1 bg-slate-100 rounded-full p-1">
                                    <TabBtn active={activeTab === 'today'} label={t('panel.tabs.today')} onClick={() => setActiveTab('today')} />
                                    <TabBtn active={activeTab === 'history'} label={t('panel.tabs.history')} onClick={() => setActiveTab('history')} />
                                    <TabBtn active={activeTab === 'quality'} label={t('panel.tabs.quality')} onClick={() => setActiveTab('quality')} />
                                </div>
                                {activeTab === 'today' && (
                                    <PickerPanel history={history} pickerInCrew={pickerInCrew} crew={crew} minWage={minWage} pieceRate={pieceRate} />
                                )}
                                {activeTab === 'history' && (
                                    <HistoryTab history={history} dailyBuckets={dailyBuckets} />
                                )}
                                {activeTab === 'quality' && (
                                    <QualityTab quality={history.quality} />
                                )}
                            </>
                        )}

                        {/* Fallback: pickerInCrew existe pero no hay history (datos aún cargando) */}
                        {!isTL && !isRunner && !history && pickerInCrew && (
                            <div className="text-center py-8 text-text-muted text-sm">{t('panel.no_data')}</div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};

export default PickerProfileDrawer;
