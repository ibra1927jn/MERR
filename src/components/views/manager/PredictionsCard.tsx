/**
 * PredictionsCard — Yield + Labour + Quality forecast widget
 *
 * Displays 7-day predictions for yield, recommended crew size,
 * and quality grade trajectory in the Manager dashboard.
 *
 * @module components/views/manager/PredictionsCard
 */
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { predictionsService, type PredictionDashboard } from '@/services/predictions.service';
import { useCropProfile } from '@/hooks/useCropProfile';

export default function PredictionsCard() {
  const { orchardId } = useAuth();
  const { units } = useCropProfile();
  const [dashboard, setDashboard] = useState<PredictionDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orchardId) return;
    setLoading(true);
    predictionsService
      .getDashboard(orchardId)
      .then(setDashboard)
      .catch(() => setDashboard(null))
      .finally(() => setLoading(false));
  }, [orchardId]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-5 border border-border-light shadow-sm animate-pulse">
        <div className="h-5 bg-slate-200 rounded w-40 mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-slate-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!dashboard) return null;

  const { summary, yield_predictions } = dashboard;
  const trendIcon =
    summary.quality_trajectory === 'improving'
      ? 'trending_up'
      : summary.quality_trajectory === 'declining'
        ? 'trending_down'
        : 'trending_flat';
  const trendColor =
    summary.quality_trajectory === 'improving'
      ? 'text-emerald-500'
      : summary.quality_trajectory === 'declining'
        ? 'text-red-500'
        : 'text-amber-500';

  return (
    <div className="bg-white rounded-2xl p-5 border border-border-light shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-text-main flex items-center gap-2">
          <span className="material-symbols-outlined text-indigo-500">analytics</span>
          7-Day Predictions
        </h3>
        <span className={`material-symbols-outlined ${trendColor}`}>{trendIcon}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-indigo-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-indigo-700">{summary.predicted_total_7d}</p>
          <p className="text-xs text-indigo-500">{units} (7d)</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-emerald-700">{summary.avg_daily_yield}</p>
          <p className="text-xs text-emerald-500">Avg/day</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-blue-700">{summary.recommended_crew_size}</p>
          <p className="text-xs text-blue-500">Crew needed</p>
        </div>
        <div
          className={`${summary.quality_trajectory === 'improving' ? 'bg-emerald-50' : summary.quality_trajectory === 'declining' ? 'bg-red-50' : 'bg-amber-50'} rounded-xl p-3 text-center`}
        >
          <p className={`text-lg font-bold capitalize ${trendColor}`}>
            {summary.quality_trajectory}
          </p>
          <p className="text-xs text-slate-500">Quality trend</p>
        </div>
      </div>

      {/* Mini sparkline of daily predictions */}
      <div className="flex items-end gap-1 h-12">
        {yield_predictions.map((yp, i) => {
          const maxBuckets = Math.max(...yield_predictions.map(p => p.predicted_buckets), 1);
          const height = Math.max(4, (yp.predicted_buckets / maxBuckets) * 48);
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div
                className="w-full rounded-t bg-indigo-400"
                style={{ height: `${height}px`, opacity: yp.confidence }}
              />
              <span className="text-[9px] text-slate-400">{yp.date.slice(5)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
