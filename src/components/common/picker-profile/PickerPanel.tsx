/**
 * PickerPanel — Métricas de hoy para pickers: bins, horas, earned, effective rate
 * Extraído de PickerProfileDrawer.tsx
 * Fix: si bins > 0 y horas = 0, derivar earnings desde piece_rate
 */
import React from 'react';
import { useTranslation } from '@/i18n';
import { PickerHistory } from '@/services/picker-history.service';
import { Picker } from '@/types';

interface PickerPanelProps {
    history: PickerHistory;
    pickerInCrew: Picker | undefined;
    crew: Picker[];
    minWage: number;
    pieceRate: number;
}

const PickerPanel: React.FC<PickerPanelProps> = ({ history, pickerInCrew, crew, minWage, pieceRate }) => {
    const { t } = useTranslation();

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

    const minWageLabel = t('panel.picker.min_wage_label').replace('{n}', String(minWage));

    return (
        <div className="space-y-4">
            {/* KPI Grid */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-black text-emerald-700">{history.todayBuckets}</p>
                    <p className="text-[10px] text-emerald-600 font-bold">{t('panel.picker.bins')}</p>
                </div>
                <div className="bg-sky-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-black text-sky-700">{history.todayHours.toFixed(1)}h</p>
                    <p className="text-[10px] text-sky-600 font-bold">{t('panel.picker.hours')}</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-black text-amber-700">${derivedEarningsDisplay.toFixed(0)}</p>
                    <p className="text-[10px] text-amber-600 font-bold">{t('panel.picker.earned')}</p>
                </div>
            </div>

            {/* Bucket Rate */}
            <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
                <div className="flex justify-between items-center">
                    <span className="text-xs text-text-muted">{t('panel.picker.bucket_rate')}</span>
                    <span className="text-lg font-black text-text-main">
                        {history.todayHours > 0 ? (history.todayBuckets / history.todayHours).toFixed(1) : '—'} {t('common.per_hour')}
                    </span>
                </div>
            </div>

            {/* Effective Rate — ocultar si horas = 0 */}
            {hourlyRate !== null ? (
                <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-text-muted">{t('panel.picker.effective_rate')}</span>
                        <span className={`text-base font-bold ${isAboveMinimum ? 'text-emerald-600' : 'text-red-500'}`}>
                            ${hourlyRate.toFixed(2)}{t('common.per_hour')}
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
                            {minWageLabel}{!isAboveMinimum && ` ${t('panel.picker.below_min')}`}
                        </span>
                    </div>
                </div>
            ) : history.todayBuckets > 0 ? (
                /* Bins escaneados pero aún no se registró check_in — estado neutral */
                <div className="bg-slate-50 rounded-xl border border-slate-100 p-3 shadow-sm text-center">
                    <span className="material-symbols-outlined text-slate-400 text-2xl block mb-1">schedule</span>
                    <p className="text-xs font-bold text-slate-500">{t('panel.picker.not_started')}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{t('panel.picker.not_started_desc')}</p>
                </div>
            ) : null}

            {/* Details */}
            {pickerInCrew && (
                <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Details</p>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-50 rounded-lg p-2">
                            <p className="text-[10px] text-slate-400 mb-0.5">{t('panel.picker.current_row')}</p>
                            <p className="text-xs font-bold text-slate-900">
                                {pickerInCrew.current_row ? `Row ${pickerInCrew.current_row}` : t('panel.picker.unassigned')}
                            </p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-2">
                            <p className="text-[10px] text-slate-400 mb-0.5">{t('panel.picker.harness')}</p>
                            <p className={`text-xs font-bold ${pickerInCrew.harness_id ? 'text-slate-900' : 'text-amber-600'}`}>
                                {pickerInCrew.harness_id || t('panel.picker.not_assigned')}
                            </p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-2">
                            <p className="text-[10px] text-slate-400 mb-0.5">{t('panel.picker.team')}</p>
                            <p className="text-xs font-bold text-slate-900">
                                {pickerInCrew.team_leader_id
                                    ? (crew.find(c => c.id === pickerInCrew.team_leader_id)?.name || 'Assigned')
                                    : t('panel.picker.no_team')}
                            </p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-2">
                            <p className="text-[10px] text-slate-400 mb-0.5">{t('panel.picker.hours_today')}</p>
                            <p className="text-xs font-bold text-slate-900">{history.todayHours.toFixed(1)}h</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Acciones de picker */}
            <div className="flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/80 border border-slate-100 text-xs font-bold text-indigo-700 hover:bg-indigo-50 transition-colors shadow-sm">
                    <span className="material-symbols-outlined text-sm">chat</span>
                    {t('panel.picker.message_tl')}
                </button>
                <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/80 border border-slate-100 text-xs font-bold text-amber-700 hover:bg-amber-50 transition-colors shadow-sm">
                    <span className="material-symbols-outlined text-sm">flag</span>
                    {t('panel.picker.flag_qc')}
                </button>
            </div>
        </div>
    );
};

export default PickerPanel;
