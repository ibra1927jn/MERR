/**
 * PickerDrawerHours — Tarjeta presentacional de horas trabajadas hoy.
 * Reutilizable en cualquier contexto que tenga hoursWorked y binsPerHour.
 */
import React from 'react';
import { useTranslation } from '@/i18n';

interface PickerDrawerHoursProps {
    hoursWorked: number;
    /** null cuando no hay datos de horas suficientes */
    binsPerHour: number | null;
}

const PickerDrawerHours: React.FC<PickerDrawerHoursProps> = ({ hoursWorked, binsPerHour }) => {
    const { t } = useTranslation();

    return (
        <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
            <div className="grid grid-cols-2 gap-3">
                {/* Horas */}
                <div className="bg-sky-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-black text-sky-700">{hoursWorked.toFixed(1)}h</p>
                    <p className="text-[10px] text-sky-600 font-bold">{t('panel.picker.hours')}</p>
                </div>

                {/* Bins/hora */}
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-black text-slate-700">
                        {binsPerHour !== null ? binsPerHour.toFixed(1) : '—'}
                    </p>
                    <p className="text-[10px] text-slate-500 font-bold">
                        {t('panel.picker.bucket_rate')} {t('common.per_hour')}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PickerDrawerHours;
