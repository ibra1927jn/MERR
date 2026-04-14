/**
 * LogisticsView — Panel de salud logística para el manager (solo lectura).
 * Llama a useLogisticsHealth() internamente — no recibe props del padre.
 */
import React from 'react';
import { useLogisticsHealth } from '@/hooks/useLogisticsHealth';
import CardSkeleton from '@/components/ui/CardSkeleton';
import LogisticsHealthBanner from './logistics/LogisticsHealthBanner';
import BinBacklogChart from './logistics/BinBacklogChart';
import PickupSlaCard from './logistics/PickupSlaCard';
import RunnerLeaderboard from './logistics/RunnerLeaderboard';
import LogisticsEventFeed from './logistics/LogisticsEventFeed';
import OpenFullLogisticsLink from './logistics/OpenFullLogisticsLink';

const LogisticsView: React.FC = () => {
  const {
    health,
    backlogSeries,
    avgPickup,
    avgCycle,
    runnerLeaderboard,
    recentEvents,
    isLoading,
  } = useLogisticsHealth();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4 md:p-6 max-w-2xl mx-auto pb-24">
        <CardSkeleton lines={2} />
        <CardSkeleton lines={4} />
        <CardSkeleton lines={3} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 max-w-2xl mx-auto pb-24 animate-fade-in">
      <LogisticsHealthBanner health={health} />
      <BinBacklogChart series={backlogSeries} />
      <PickupSlaCard avgPickupSec={avgPickup} avgCycleSec={avgCycle} />
      <RunnerLeaderboard runners={runnerLeaderboard} />
      <LogisticsEventFeed events={recentEvents} />
      <OpenFullLogisticsLink />
    </div>
  );
};

export default LogisticsView;
