/**
 * LogisticsHealthBanner — Semáforo de salud logística para el panel del manager.
 * Muestra una banda coloreada con estado actual de la operación logística.
 */
import React from 'react';
import { useTranslation } from '@/i18n';

interface LogisticsHealthBannerProps {
  health: 'green' | 'amber' | 'red';
}

const HEALTH_STYLES: Record<
  LogisticsHealthBannerProps['health'],
  { banner: string; dot: string; pill: string }
> = {
  green: {
    banner: 'border-l-4 border-emerald-500 bg-emerald-50',
    dot: 'bg-emerald-500',
    pill: 'bg-emerald-100 text-emerald-700',
  },
  amber: {
    banner: 'border-l-4 border-amber-500 bg-amber-50',
    dot: 'bg-amber-500',
    pill: 'bg-amber-100 text-amber-700',
  },
  red: {
    banner: 'border-l-4 border-red-500 bg-red-50',
    dot: 'bg-red-500',
    pill: 'bg-red-100 text-red-700',
  },
};

const LogisticsHealthBanner: React.FC<LogisticsHealthBannerProps> = ({ health }) => {
  const { t } = useTranslation();
  const styles = HEALTH_STYLES[health];

  return (
    <div
      className={`flex items-center gap-3 p-4 rounded-xl shadow-sm ${styles.banner}`}
      role="status"
      aria-live="polite"
    >
      {/* Semáforo */}
      <div className={`w-5 h-5 rounded-full flex-shrink-0 ${styles.dot}`} aria-hidden="true" />

      {/* Titular */}
      <p className="flex-1 text-sm font-semibold text-slate-800">
        {t(`logistics.health.headline.${health}`)}
      </p>

      {/* Pill de estado */}
      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${styles.pill}`}>
        {t(`logistics.health.status.${health}`)}
      </span>
    </div>
  );
};

export default LogisticsHealthBanner;
