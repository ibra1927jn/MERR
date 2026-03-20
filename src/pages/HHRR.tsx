/**
 * HHRR.TSX — Human Resources Department
 *
 * Refactored architecture:
 *   HHRR.tsx             — Thin orchestrator
 *   useHHRR.ts           — Data hook (loading, summaries)
 *   hhrrNav.config.ts    — Navigation items
 *   SummaryCard          — Reusable metric card
 *   hhrr/                — Tab view components (lazy-loaded)
 */
import React, { useState, Suspense } from 'react';
import DesktopLayout from '@/components/common/DesktopLayout';
import SummaryCard from '@/components/ui/SummaryCard';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import ComponentErrorBoundary from '@/components/ui/ComponentErrorBoundary';
import { useHHRR } from '@/hooks/useHHRR';
import { HR_NAV_ITEMS } from '@/config/navigation/hhrr.nav';

// Lazy-loaded views (code-split for performance)
const EmployeesTab = React.lazy(() => import('@/components/views/hhrr/EmployeesTab'));
const ContractsTab = React.lazy(() => import('@/components/views/hhrr/ContractsTab'));
const PayrollTab = React.lazy(() => import('@/components/views/hhrr/PayrollTab'));
const DocumentsTab = React.lazy(() => import('@/components/views/hhrr/DocumentsTab'));
const CalendarTab = React.lazy(() => import('@/components/views/hhrr/CalendarTab'));
const SeasonalPlanningTab = React.lazy(() => import('@/components/views/hhrr/SeasonalPlanningTab'));

const TabLoader = () => (
    <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
    </div>
);

const HHRR: React.FC = () => {
    const [activeTab, setActiveTab] = useState('employees');
    const { summary, employees, payroll, alerts, isLoading, reload } = useHHRR();

    const navItems = HR_NAV_ITEMS.map(item => ({
        ...item,
        badge: item.id === 'employees' ? summary.complianceAlerts : undefined,
    }));

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background-light p-6">
                <div className="max-w-6xl mx-auto space-y-4">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <LoadingSkeleton type="metric" count={4} />
                    </div>
                    <LoadingSkeleton type="list" count={5} />
                </div>
            </div>
        );
    }

    const renderContent = () => {
        switch (activeTab) {
            case 'employees': return <ComponentErrorBoundary componentName="Employees"><EmployeesTab employees={employees} alerts={alerts} /></ComponentErrorBoundary>;
            case 'contracts': return <ComponentErrorBoundary componentName="Contracts"><ContractsTab employees={employees} summary={summary} onRefresh={reload} /></ComponentErrorBoundary>;
            case 'payroll': return <ComponentErrorBoundary componentName="Payroll"><PayrollTab payroll={payroll} summary={summary} /></ComponentErrorBoundary>;
            case 'documents': return <ComponentErrorBoundary componentName="Documents"><DocumentsTab /></ComponentErrorBoundary>;
            case 'calendar': return <ComponentErrorBoundary componentName="Calendar"><CalendarTab /></ComponentErrorBoundary>;
            case 'planning': return <ComponentErrorBoundary componentName="Seasonal Planning"><SeasonalPlanningTab employees={employees} /></ComponentErrorBoundary>;
            default: return <ComponentErrorBoundary componentName="Employees"><EmployeesTab employees={employees} alerts={alerts} /></ComponentErrorBoundary>;
        }
    };

    return (
        <DesktopLayout
            navItems={navItems}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            title="Human Resources"
            accentColor="purple"
            titleIcon="badge"
        >
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <SummaryCard icon="group" iconColor="text-emerald-500" label="Active Workers" value={summary.activeWorkers} />
                <SummaryCard icon="description" iconColor="text-amber-500" label="Pending Contracts" value={summary.pendingContracts} />
                <SummaryCard icon="payments" iconColor="text-indigo-500" label="Payroll This Week" value={`$${(summary.payrollThisWeek / 1000).toFixed(1)}k`} />
                <SummaryCard icon="warning" iconColor="text-red-500" label="Compliance Alerts" value={summary.complianceAlerts} />
            </div>

            {/* Tab Content */}
            <div key={activeTab} className="animate-fade-in">
                <Suspense fallback={<TabLoader />}>
                    {renderContent()}
                </Suspense>
            </div>
        </DesktopLayout>
    );
};

export default HHRR;

