/**
 * RunnerLeaderboard — Tabla de rendimiento de runners logísticos.
 * Muestra ciclos hoy y tiempo promedio por runner, ordenados desc.
 */
import React from 'react';
import { useTranslation } from '@/i18n';

interface RunnerLeaderboardProps {
  runners: Array<{
    runnerId: string;
    name: string;
    cyclesToday: number;
    avgCycleSec: number;
  }>;
}

const AVATAR_PALETTE = [
  'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-rose-500',
  'bg-amber-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-fuchsia-500',
  'bg-teal-500', 'bg-orange-500',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function formatMMSS(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const RunnerLeaderboard: React.FC<RunnerLeaderboardProps> = ({ runners }) => {
  const { t } = useTranslation();

  // Ordenar defensivamente por ciclos desc
  const sorted = [...runners].sort((a, b) => b.cyclesToday - a.cyclesToday);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
      <p className="text-sm font-bold text-slate-700 mb-3">{t('logistics.leaderboard.title')}</p>

      {sorted.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">{t('logistics.leaderboard.empty')}</p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-400 text-left">
              <th className="pb-2 font-semibold">{t('logistics.leaderboard.col.runner')}</th>
              <th className="pb-2 font-semibold text-right">{t('logistics.leaderboard.col.cycles')}</th>
              <th className="pb-2 font-semibold text-right">{t('logistics.leaderboard.col.avg_cycle')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map(runner => {
              const avatarBg = getAvatarColor(runner.name);
              const initials = runner.name
                .split(' ')
                .map(n => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();

              return (
                <tr key={runner.runnerId}>
                  <td className="py-2 flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-full ${avatarBg} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}
                    >
                      {initials}
                    </div>
                    <span className="truncate max-w-[100px] text-slate-700">{runner.name}</span>
                  </td>
                  <td className="py-2 text-right font-bold text-emerald-600">{runner.cyclesToday}</td>
                  <td className="py-2 text-right text-slate-500">{formatMMSS(runner.avgCycleSec)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default RunnerLeaderboard;
