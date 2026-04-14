/**
 * PickupSlaCard — Tarjeta de tiempo promedio de pickup y ciclo completo.
 * Muestra métricas de SLA logístico formateadas como mm:ss.
 */
import React from 'react';
import { useTranslation } from '@/i18n';

interface PickupSlaCardProps {
  avgPickupSec: number;
  avgCycleSec: number;
}

function formatMMSS(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const PickupSlaCard: React.FC<PickupSlaCardProps> = ({ avgPickupSec, avgCycleSec }) => {
  const { t } = useTranslation();
  const noData = avgPickupSec === 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
      <p className="text-sm font-bold text-slate-700 mb-3">{t('logistics.sla.title')}</p>

      {noData ? (
        <p className="text-sm text-slate-400">{t('logistics.sla.no_data')}</p>
      ) : (
        <div className="flex items-end gap-4">
          {/* Pickup */}
          <div>
            <p className="text-3xl font-black text-indigo-600">{formatMMSS(avgPickupSec)}</p>
            <p className="text-xs text-slate-400 mt-0.5">{t('logistics.sla.title')}</p>
            <p className="text-[10px] text-slate-300 mt-0.5">
              {t('logistics.sla.vs_week')}: <span className="font-semibold">—</span>
            </p>
          </div>

          {/* Cycle */}
          <div className="border-l border-slate-100 pl-4">
            <p className="text-xl font-bold text-slate-600">{formatMMSS(avgCycleSec)}</p>
            <p className="text-xs text-slate-400 mt-0.5">{t('logistics.sla.cycle')}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PickupSlaCard;
