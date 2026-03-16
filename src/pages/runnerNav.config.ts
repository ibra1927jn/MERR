/**
 * Runner Navigation Config
 * Extracted from Runner.tsx for modularity and testability.
 */
import type { NavTab } from '@/components/common/BottomNav';

export type RunnerTab = 'logistics' | 'runners' | 'warehouse' | 'messaging' | 'timesheet';

export const RUNNER_NAV_TABS: NavTab[] = [
    { id: 'logistics', label: 'Logistics', icon: 'local_shipping' },
    { id: 'runners', label: 'Runners', icon: 'groups' },
    { id: 'warehouse', label: 'Warehouse', icon: 'warehouse' },
    { id: 'timesheet', label: 'Timesheet', icon: 'schedule' },
    { id: 'messaging', label: 'Chat', icon: 'forum' },
];
