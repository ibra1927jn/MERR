/**
 * MANAGER.TSX — Adaptive Command Center
 *
 * Desktop (md+): DesktopLayout sidebar with all navigation items.
 * Mobile: BottomNav with 5 essential tabs + "More" menu for secondary views.
 *
 * Business logic extracted to useManagerActions hook.
 * Modals extracted to components/manager/modals/
 */
import React, { useState, Suspense, useEffect } from 'react';
import { Tab, Picker } from '@/types';
import BottomNav from '@/components/common/BottomNav';
import DesktopLayout from '@/components/common/DesktopLayout';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { MOBILE_TABS, DESKTOP_NAV } from '@/config/navigation/manager.nav';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { useManagerActions } from '@/hooks/useManagerActions';
import { notificationService } from '@/services/notification.service';
import { analytics } from '@/config/analytics';
import OnboardingWizard, { isOnboardingCompleted } from '@/components/manager/OnboardingWizard';

// Modular Views — eager (lightweight or always visible)
import DashboardView from '@/components/views/manager/DashboardView';
import TeamsView from '@/components/views/manager/TeamsView';
import MoreMenuView from '@/components/views/manager/MoreMenuView';

// Lazy-loaded views (code-split for mobile performance)
const LogisticsView = React.lazy(() => import('@/components/views/manager/LogisticsView'));
const MessagingView = React.lazy(() => import('@/components/views/manager/MessagingView'));
const MapToggleView = React.lazy(() => import('@/components/views/manager/MapToggleView'));
const InsightsView = React.lazy(() => import('@/components/views/manager/InsightsView'));
const SettingsView = React.lazy(() => import('@/components/views/manager/SettingsView'));
// 🔜 HHRR-only: MPI Export & API Keys standby for HHRR page
// const MPIExportView = React.lazy(() => import('@/components/views/manager/MPIExportView'));
// const APIKeysView = React.lazy(() => import('@/components/views/manager/APIKeysView'));

import PickerProfileDrawer from '@/components/common/PickerProfileDrawer';
import ComponentErrorBoundary from '@/components/ui/ComponentErrorBoundary';
import Header from '@/components/common/Header';

// Modals
import DaySettingsModal from '@/components/modals/DaySettingsModal';
import AddPickerModal from '@/components/modals/AddPickerModal';
import BroadcastModal from '@/components/views/manager/BroadcastModal';
import RowAssignmentModal from '@/components/views/manager/RowAssignmentModal';
import PickerDetailsModal from '@/components/modals/PickerDetailsModal';

/* ── Lazy loading fallback ─────────────────────────── */
const TabLoader = () => (
  <div className="flex items-center justify-center py-32">
    <div className="text-center">
      <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
      <p className="text-sm text-text-sub font-medium">Loading…</p>
    </div>
  </div>
);

const Manager = () => {
  const {
    crew,
    orchard,
    settings,
    updateSettings,
    addPicker,
    removePicker,
    updatePicker,
    assignRow,
    fetchGlobalData,
    stats,
    presentCount,
    activeRunners,
    teamLeaders,
    fullBins,
    emptyBins,
    filteredBucketRecords,
    handleRemoveUser,
    handleBroadcast,
    handleSendMessage,
  } = useManagerActions();

  const isDesktop = useMediaQuery('(min-width: 768px)');
  useOfflineQueue(fetchGlobalData);

  // Onboarding: mostrar wizard si no hay crew, no hay settings y no fue completado
  const [onboardingDone, setOnboardingDone] = useState(() => isOnboardingCompleted());

  // Trigger data fetch on mount
  useEffect(() => {
    fetchGlobalData();
    analytics.trackPageView('manager_dashboard');
  }, [fetchGlobalData]);

  // Notification checking
  useEffect(() => {
    const prefs = notificationService.getPrefs();
    if (prefs.enabled) notificationService.startChecking();
    return () => notificationService.stopChecking();
  }, []);

  // Tab State
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  // Persist selected orchard ID
  const [selectedOrchardId, setSelectedOrchardId] = useState<string | undefined>(
    () => localStorage.getItem('active_orchard_id') || undefined
  );

  React.useEffect(() => {
    if (orchard?.id) {
      setSelectedOrchardId(orchard.id);
      localStorage.setItem('active_orchard_id', orchard.id);
    }
  }, [orchard?.id]);

  // Modal States
  const [showSettings, setShowSettings] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [showAssignment, setShowAssignment] = useState<{ show: boolean; row: number }>({
    show: false,
    row: 1,
  });
  const [selectedUser, setSelectedUser] = useState<Picker | null>(null);

  // Content Renderer
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <ComponentErrorBoundary componentName="Dashboard">
            <DashboardView
              stats={stats}
              teamLeaders={teamLeaders}
              crew={crew}
              presentCount={presentCount}
              setActiveTab={setActiveTab}
              bucketRecords={filteredBucketRecords}
              onUserSelect={user => {
                const fullUser =
                  crew.find(p => p.id === user.id || p.picker_id === user.picker_id) ||
                  (user as Picker);
                setSelectedUser(fullUser);
              }}
            />
          </ComponentErrorBoundary>
        );
      case 'teams':
        return (
          <ComponentErrorBoundary componentName="Teams">
            <TeamsView
              crew={crew}
              setShowAddUser={setShowAddUser}
              setSelectedUser={setSelectedUser}
              settings={settings}
              orchardId={selectedOrchardId || orchard?.id}
              onRefresh={fetchGlobalData}
              onRemoveUser={handleRemoveUser}
            />
          </ComponentErrorBoundary>
        );
      case 'logistics':
        return (
          <ComponentErrorBoundary componentName="Logistics">
            <Suspense fallback={<TabLoader />}>
              <LogisticsView
                fullBins={fullBins}
                emptyBins={emptyBins}
                activeRunners={activeRunners}
                onRequestPickup={() =>
                  handleBroadcast(
                    '🚜 Pickup Requested',
                    'A logistics pickup has been requested at the loading zone.',
                    'urgent'
                  )
                }
                onRunnerClick={runner => {
                  const fullUser = crew.find(p => p.id === runner.id) || (runner as Picker);
                  setSelectedUser(fullUser);
                }}
              />
            </Suspense>
          </ComponentErrorBoundary>
        );
      case 'messaging':
        return (
          <ComponentErrorBoundary componentName="Messaging">
            <Suspense fallback={<TabLoader />}>
              <MessagingView />
            </Suspense>
          </ComponentErrorBoundary>
        );
      case 'map':
        return (
          <ComponentErrorBoundary componentName="Map">
            <Suspense fallback={<TabLoader />}>
              <MapToggleView
                totalRows={orchard?.total_rows || 20}
                crew={crew}
                bucketRecords={filteredBucketRecords}
                blockName={orchard?.name || 'Block A'}
                targetBucketsPerRow={50}
                setActiveTab={setActiveTab}
                onRowClick={rowNum => setShowAssignment({ show: true, row: rowNum })}
              />
            </Suspense>
          </ComponentErrorBoundary>
        );
      case 'settings':
        return (
          <ComponentErrorBoundary componentName="Settings">
            <Suspense fallback={<TabLoader />}>
              <SettingsView />
            </Suspense>
          </ComponentErrorBoundary>
        );

      case 'insights':
      case 'analytics':
      case 'reports':
        return (
          <ComponentErrorBoundary componentName="Insights">
            <Suspense fallback={<TabLoader />}>
              <InsightsView />
            </Suspense>
          </ComponentErrorBoundary>
        );
      // 🔜 HHRR-only: MPI Export & API Keys — standby for HHRR page
      // case 'mpi':
      //   return (
      //     <ComponentErrorBoundary componentName="MPI Export">
      //       <Suspense fallback={<TabLoader />}><MPIExportView /></Suspense>
      //     </ComponentErrorBoundary>
      //   );
      // case 'api-keys':
      //   return (
      //     <ComponentErrorBoundary componentName="API Keys">
      //       <Suspense fallback={<TabLoader />}><APIKeysView /></Suspense>
      //     </ComponentErrorBoundary>
      //   );
      case 'more':
        return <MoreMenuView onNavigate={tab => setActiveTab(tab)} />;
      default:
        return (
          <ComponentErrorBoundary componentName="Dashboard">
            <DashboardView
              stats={stats}
              teamLeaders={teamLeaders}
              crew={crew}
              presentCount={presentCount}
              setActiveTab={setActiveTab}
            />
          </ComponentErrorBoundary>
        );
    }
  };

  /* ── Shared Modals ──────────────────────────────────── */
  const renderModals = () => (
    <>
      {showSettings && (
        <DaySettingsModal
          onClose={() => setShowSettings(false)}
          settings={{
            bucketRate: settings?.piece_rate,
            targetTons: settings?.target_tons,
          }}
          onSave={newSettings =>
            updateSettings({
              piece_rate: newSettings.bucketRate,
              target_tons: newSettings.targetTons,
            })
          }
        />
      )}
      {showAddUser && <AddPickerModal onClose={() => setShowAddUser(false)} onAdd={addPicker} />}
      {showBroadcast && <BroadcastModal onClose={() => setShowBroadcast(false)} />}
      {showAssignment.show && (
        <RowAssignmentModal
          initialRow={showAssignment.row}
          onClose={() => setShowAssignment({ show: false, row: 1 })}
          onViewPicker={picker => {
            setShowAssignment({ show: false, row: 1 });
            setSelectedUser(picker);
          }}
        />
      )}
      {selectedUser && (
        <PickerDetailsModal
          picker={selectedUser}
          onClose={() => setSelectedUser(null)}
          onDelete={removePicker}
          onUpdate={updatePicker}
          allCrew={crew}
          onSendMessage={handleSendMessage}
          onAssignRow={assignRow}
        />
      )}
    </>
  );

  /* ── Broadcast FAB ──────────────────────────────────── */
  const renderBroadcastFAB = () => {
    if (activeTab === 'map' || activeTab === 'messaging') return null;
    return (
      <div className="fixed bottom-28 md:bottom-8 right-4 z-40">
        <button
          onClick={() => setShowBroadcast(true)}
          className="gradient-primary glow-primary text-white rounded-full h-14 px-6 flex items-center justify-center gap-2 transition-all active:scale-95 hover:scale-105 shadow-2xl dash-fab-pulse"
        >
          <span className="material-symbols-outlined">campaign</span>
          <span className="font-bold tracking-wide">Broadcast</span>
        </button>
      </div>
    );
  };

  /* ── Onboarding: mostrar wizard si es primera vez ──── */
  const needsOnboarding = !onboardingDone && crew.length === 0 && !settings?.piece_rate;
  if (needsOnboarding) {
    return (
      <OnboardingWizard
        onComplete={() => {
          setOnboardingDone(true);
          fetchGlobalData();
        }}
      />
    );
  }

  /* ── Desktop Layout ─────────────────────────────────── */
  if (isDesktop) {
    return (
      <>
        <DesktopLayout
          navItems={DESKTOP_NAV}
          activeTab={activeTab}
          onTabChange={id => setActiveTab(id as Tab)}
          title="Harvest Manager"
          titleIcon="agriculture"
          accentColor="#16a34a"
        >
          <div key={activeTab} className="animate-scale-in">
            {renderContent()}
          </div>
        </DesktopLayout>
        {renderModals()}
        {renderBroadcastFAB()}
        <PickerProfileDrawer />
      </>
    );
  }

  /* ── Mobile Layout ──────────────────────────────────── */
  return (
    <div className="flex flex-col h-full bg-background-light min-h-screen text-slate-900 pb-20">
      <Header
        title="Harvest Manager"
        subtitle={`${orchard?.name || 'No Orchard'} • Live`}
        onProfileClick={() => setShowSettings(true)}
        onNavigateToMessaging={() => setActiveTab('messaging' as Tab)}
      />

      {/* Content — animate on tab switch */}
      <main className="flex-1 overflow-y-auto">
        <div key={activeTab} className="animate-scale-in">
          {renderContent()}
        </div>
      </main>

      {renderModals()}

      {/* Navigation Bar — 5 essential tabs */}
      <BottomNav
        tabs={MOBILE_TABS}
        activeTab={
          activeTab === 'insights' || activeTab === 'messaging' || activeTab === 'settings'
            ? 'more'
            : activeTab
        }
        onTabChange={id => setActiveTab(id as Tab)}
      />

      {renderBroadcastFAB()}
      <PickerProfileDrawer />
    </div>
  );
};

export default Manager;
