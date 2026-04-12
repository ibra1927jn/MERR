/**
 * TeamLeader.tsx — Team Leader Dashboard
 *
 * Refactored architecture:
 *   TeamLeader.tsx              — Thin orchestrator
 *   teamLeaderNav.config.ts    — Navigation tabs
 *   team-leader/               — View components (lazy-loaded)
 */
import React, { useState, useEffect, Suspense } from 'react';
import { useHarvestStore } from '@/stores/useHarvestStore';
import BottomNav from '@/components/common/BottomNav';
import Header from '@/components/common/Header';
import ComponentErrorBoundary from '@/components/ui/ComponentErrorBoundary';
import { TEAM_LEADER_NAV_TABS, type TeamLeaderTab } from '@/config/navigation/team-leader.nav';

// Lazy-loaded views (code-split for performance)
const HomeView = React.lazy(() => import('@/components/views/team-leader/HomeView'));
const TeamView = React.lazy(() => import('@/components/views/team-leader/TeamView'));
const TasksView = React.lazy(() => import('@/components/views/team-leader/TasksView'));
const ProfileView = React.lazy(() => import('@/components/views/team-leader/ProfileView'));
const MessagingView = React.lazy(() => import('@/components/views/team-leader/MessagingView'));
const AttendanceView = React.lazy(() => import('@/components/views/team-leader/AttendanceView'));
const TimesheetEditor = React.lazy(() => import('@/components/views/manager/TimesheetEditor'));

const TabLoader = () => (
    <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
);

const TeamLeader = () => {
    const fetchGlobalData = useHarvestStore((state) => state.fetchGlobalData);
    const orchard = useHarvestStore((state) => state.orchard);

    useEffect(() => {
        fetchGlobalData();
    }, [fetchGlobalData]);

    const [activeTab, setActiveTab] = useState<TeamLeaderTab>('home');

    return (
        <div className="bg-slate-50 font-display min-h-screen flex flex-col pb-20 relative overflow-hidden">
            {/* OmniCore Ambient Background */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[80px] pointer-events-none"></div>
            <div className="absolute bottom-[-5%] right-[-10%] w-[50%] h-[40%] rounded-full bg-blue-500/10 blur-[80px] pointer-events-none"></div>
            
            <Header
                title="Team Leader"
                subtitle={`Crew Management`}
                onProfileClick={() => setActiveTab('profile')}
            />
            {/* Full-width layout */}
            <main className="flex-1 w-full relative z-10">
                <div key={activeTab} className="animate-fade-in">
                    <Suspense fallback={<TabLoader />}>
                        {activeTab === 'home' && <ComponentErrorBoundary componentName="Home"><HomeView onNavigate={(tab) => setActiveTab(tab as TeamLeaderTab)} /></ComponentErrorBoundary>}
                        {activeTab === 'attendance' && <ComponentErrorBoundary componentName="Attendance"><AttendanceView /></ComponentErrorBoundary>}
                        {activeTab === 'team' && <ComponentErrorBoundary componentName="Team"><TeamView /></ComponentErrorBoundary>}
                        {activeTab === 'tasks' && <ComponentErrorBoundary componentName="Tasks"><TasksView /></ComponentErrorBoundary>}
                        {activeTab === 'timesheet' && (
                            <ComponentErrorBoundary componentName="Timesheet">
                                <div className="p-4">
                                    <TimesheetEditor orchardId={orchard?.id || ''} />
                                </div>
                            </ComponentErrorBoundary>
                        )}
                        {activeTab === 'profile' && <ComponentErrorBoundary componentName="Profile"><ProfileView /></ComponentErrorBoundary>}
                        {activeTab === 'chat' && <ComponentErrorBoundary componentName="Chat"><MessagingView /></ComponentErrorBoundary>}
                    </Suspense>
                </div>
            </main>

            {/* Unified Bottom Navigation */}
            <BottomNav
                tabs={TEAM_LEADER_NAV_TABS}
                activeTab={activeTab === 'team' || activeTab === 'profile' ? 'home' : activeTab}
                onTabChange={(id) => setActiveTab(id as TeamLeaderTab)}
            />
        </div>
    );
};

export default TeamLeader;
