/**
 * TeamLeader Navigation Config
 * Extracted from TeamLeader.tsx for modularity and testability.
 */
import type { NavTab } from '@/components/common/BottomNav';

export type TeamLeaderTab = 'home' | 'team' | 'tasks' | 'profile' | 'chat' | 'attendance' | 'timesheet';

export const TEAM_LEADER_NAV_TABS: NavTab[] = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'attendance', label: 'Roll Call', icon: 'fact_check' },
    { id: 'team', label: 'Team', icon: 'groups' },
    { id: 'timesheet', label: 'Timesheet', icon: 'schedule' },
    { id: 'chat', label: 'Chat', icon: 'forum' },
];
