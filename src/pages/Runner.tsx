/**
 * Runner.tsx — Field Runner Dashboard
 *
 * Refactored architecture:
 *   Runner.tsx              — Thin orchestrator
 *   useRunnerData.ts        — Data hook (store, scan, quality, polling)
 *   runnerNav.config.ts     — Navigation tabs
 *   runner/                 — View components (lazy-loaded)
 */
import React, { useState, Suspense } from 'react';
import BottomNav from '@/components/common/BottomNav';
import ComponentErrorBoundary from '@/components/ui/ComponentErrorBoundary';
import Toast from '@/components/ui/Toast';
import SyncStatusMonitor from '@/components/common/SyncStatusMonitor';
import Header from '@/components/common/Header';
import { useRunnerData } from '@/hooks/useRunnerData';
import { RUNNER_NAV_TABS, type RunnerTab } from '@/config/navigation/runner.nav';

// Lazy-loaded views (code-split for performance)
const LogisticsView = React.lazy(() => import('@/components/views/runner/LogisticsView'));
const RunnersView = React.lazy(() => import('@/components/views/runner/RunnersView'));
const WarehouseView = React.lazy(() => import('@/components/views/runner/WarehouseView'));
const MessagingView = React.lazy(() => import('@/components/views/runner/MessagingView'));
const TimesheetEditor = React.lazy(() => import('@/components/views/manager/TimesheetEditor'));
const ScannerModal = React.lazy(() => import('@/components/modals/ScannerModal'));
const QualityRatingModal = React.lazy(() => import('@/components/modals/QualityRatingModal'));

const TabLoader = () => (
  <div className="flex items-center justify-center py-12">
    <div className="w-8 h-8 border-3 border-sky-200 border-t-sky-600 rounded-full animate-spin" />
  </div>
);

const Runner = () => {
  const [activeTab, setActiveTab] = useState<RunnerTab>('logistics');
  const runner = useRunnerData();

  return (
    <div className="bg-slate-50 min-h-screen font-display text-slate-800 flex flex-col relative overflow-hidden pb-20">
      {/* OmniCore Ambient Background */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[80px] pointer-events-none"></div>
      <div className="absolute bottom-[-5%] right-[-10%] w-[50%] h-[40%] rounded-full bg-sky-500/10 blur-[80px] pointer-events-none"></div>
      
      <Header title="Runner" subtitle={`Logistics - ${runner.orchard?.name || 'No Orchard'}`} />

      {/* Global Toast Container */}
      {runner.toast && (
        <Toast
          message={runner.toast.message}
          type={runner.toast.type}
          onClose={() => runner.setToast(null)}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden flex flex-col relative z-0">
        {/* Global Offline Sync Banner */}
        <SyncStatusMonitor />

        <div key={activeTab} className="animate-fade-in flex-1 overflow-hidden flex flex-col">
          <Suspense fallback={<TabLoader />}>
            {activeTab === 'logistics' && (
              <ComponentErrorBoundary componentName="Logistics">
                <LogisticsView
                  onScan={runner.handleScanClick}
                  pendingUploads={runner.pendingUploads}
                  inventory={runner.inventory}
                  onBroadcast={runner.handleBroadcast}
                  selectedBinId={runner.selectedBinId}
                />
              </ComponentErrorBoundary>
            )}
            {activeTab === 'runners' && (
              <ComponentErrorBoundary componentName="Runners">
                <RunnersView onBack={() => setActiveTab('logistics')} />
              </ComponentErrorBoundary>
            )}
            {activeTab === 'warehouse' && (
              <ComponentErrorBoundary componentName="Warehouse">
                <WarehouseView
                  inventory={runner.inventory}
                  onTransportRequest={() =>
                    runner.handleBroadcast('Warehouse is full. Pickup needed.')
                  }
                />
              </ComponentErrorBoundary>
            )}
            {activeTab === 'messaging' && (
              <ComponentErrorBoundary componentName="Messaging">
                <MessagingView />
              </ComponentErrorBoundary>
            )}
            {activeTab === 'timesheet' && (
              <ComponentErrorBoundary componentName="Timesheet">
                <div className="p-4">
                  <TimesheetEditor orchardId={runner.orchard?.id || ''} />
                </div>
              </ComponentErrorBoundary>
            )}
          </Suspense>
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav
        tabs={RUNNER_NAV_TABS}
        activeTab={activeTab}
        onTabChange={id => setActiveTab(id as RunnerTab)}
      />

      {/* Modals */}
      {runner.showScanner && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          }
        >
          <ScannerModal
            onClose={() => runner.setShowScanner(false)}
            onScan={code => runner.handleScanComplete(code)}
            onBatchScan={codes => runner.handleScanComplete(codes)}
            scanType={runner.scanType || 'BUCKET'}
            batchMode={runner.scanType === 'BUCKET'}
          />
        </Suspense>
      )}
      {runner.qualityScan?.step === 'QUALITY' && (
        <Suspense fallback={<TabLoader />}>
          <QualityRatingModal
            scannedCode={runner.qualityScan.code}
            onRate={runner.submitQuality}
            onCancel={() => runner.setQualityScan(null)}
          />
        </Suspense>
      )}
    </div>
  );
};

export default Runner;
