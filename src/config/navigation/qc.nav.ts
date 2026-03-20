/**
 * QualityControl Navigation Config
 * Extracted from QualityControl.tsx for modularity and testability.
 */
import type { NavTab } from '@/components/common/BottomNav';

export type QCTab = 'inspect' | 'history' | 'stats' | 'trends';

export const QC_NAV_TABS: NavTab[] = [
    { id: 'inspect', label: 'Inspect', icon: 'nutrition' },
    { id: 'history', label: 'History', icon: 'assignment_turned_in' },
    { id: 'stats', label: 'Analytics', icon: 'bar_chart' },
    { id: 'trends', label: 'Trends', icon: 'trending_up' },
];
