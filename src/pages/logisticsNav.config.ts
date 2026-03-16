/**
 * Logistics Navigation Config
 * Extracted from LogisticsDept.tsx for modularity and testability.
 */
import type { NavItem } from '@/components/common/DesktopLayout';

export const LOG_NAV_ITEMS: NavItem[] = [
    { id: 'fleet', label: 'Fleet', icon: 'agriculture' },
    { id: 'bins', label: 'Bin Inventory', icon: 'grid_view' },
    { id: 'requests', label: 'Requests', icon: 'swap_horiz' },
    { id: 'routes', label: 'Routes', icon: 'map' },
    { id: 'history', label: 'History', icon: 'history' },
];
