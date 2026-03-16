/**
 * HHRR Navigation Config
 * Extracted from HHRR.tsx for modularity and testability.
 */
import type { NavItem } from '@/components/common/DesktopLayout';

export const HR_NAV_ITEMS: NavItem[] = [
    { id: 'employees', label: 'Employees', icon: 'group' },
    { id: 'contracts', label: 'Contracts', icon: 'description' },
    { id: 'payroll', label: 'Payroll', icon: 'payments' },
    { id: 'documents', label: 'Documents', icon: 'folder' },
    { id: 'calendar', label: 'Calendar', icon: 'calendar_month' },
    { id: 'planning', label: 'Planning', icon: 'analytics' },
];
