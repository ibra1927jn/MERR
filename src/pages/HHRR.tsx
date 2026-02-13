/**
 * HHRR.TSX — Human Resources Department
 * Uses DesktopLayout sidebar + modular tab views
 */
import React, { useState, useEffect } from 'react';
import DesktopLayout, { NavItem } from '@/components/common/DesktopLayout';
import EmployeesTab from '@/components/views/hhrr/EmployeesTab';
import ContractsTab from '@/components/views/hhrr/ContractsTab';
import PayrollTab from '@/components/views/hhrr/PayrollTab';
import DocumentsTab from '@/components/views/hhrr/DocumentsTab';
import CalendarTab from '@/components/views/hhrr/CalendarTab';
import {
    fetchHRSummary, fetchEmployees, fetchPayroll, fetchComplianceAlerts,
    type HRSummary, type Employee, type PayrollEntry, type ComplianceAlert
} from '@/services/hhrr.service';

const HR_NAV_ITEMS: NavItem[] = [
    { id: 'employees', label: 'Employees', icon: 'group' },
    { id: 'contracts', label: 'Contracts', icon: 'description' },
    { id: 'payroll', label: 'Payroll', icon: 'payments' },
    { id: 'documents', label: 'Documents', icon: 'folder' },
    { id: 'calendar', label: 'Calendar', icon: 'calendar_month' },
];

const HHRR: React.FC = () => {
    const [activeTab, setActiveTab] = useState('employees');
    const [summary, setSummary] = useState<HRSummary>({ activeWorkers: 0, pendingContracts: 0, payrollThisWeek: 0, complianceAlerts: 0 });
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [payroll, setPayroll] = useState<PayrollEntry[]>([]);
    const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            const [sum, emps, pay, alts] = await Promise.all([
                fetchHRSummary(),
                fetchEmployees(),
                fetchPayroll(),
                fetchComplianceAlerts(),
            ]);
            setSummary(sum);
            setEmployees(emps);
            setPayroll(pay);
            setAlerts(alts);
            setIsLoading(false);
        };
        loadData();
    }, []);

    // Update nav badges dynamically
    const navItems = HR_NAV_ITEMS.map(item => ({
        ...item,
        badge: item.id === 'employees' ? summary.complianceAlerts : undefined,
    }));

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">Loading HR data...</p>
                </div>
            </div>
        );
    }

    const renderContent = () => {
        switch (activeTab) {
            case 'employees': return <EmployeesTab employees={employees} alerts={alerts} />;
            case 'contracts': return <ContractsTab employees={employees} summary={summary} />;
            case 'payroll': return <PayrollTab payroll={payroll} summary={summary} />;
            case 'documents': return <DocumentsTab />;
            case 'calendar': return <CalendarTab />;
            default: return <EmployeesTab employees={employees} alerts={alerts} />;
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
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="material-symbols-outlined text-emerald-500 text-lg">group</span>
                        <span className="text-xs text-gray-500 font-medium">Active Workers</span>
                    </div>
                    <p className="text-2xl font-black text-gray-900">{summary.activeWorkers}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="material-symbols-outlined text-amber-500 text-lg">description</span>
                        <span className="text-xs text-gray-500 font-medium">Pending Contracts</span>
                    </div>
                    <p className="text-2xl font-black text-gray-900">{summary.pendingContracts}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="material-symbols-outlined text-indigo-500 text-lg">payments</span>
                        <span className="text-xs text-gray-500 font-medium">Payroll This Week</span>
                    </div>
                    <p className="text-2xl font-black text-gray-900">${(summary.payrollThisWeek / 1000).toFixed(1)}k</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="material-symbols-outlined text-red-500 text-lg">warning</span>
                        <span className="text-xs text-gray-500 font-medium">Compliance Alerts</span>
                    </div>
                    <p className="text-2xl font-black text-gray-900">{summary.complianceAlerts}</p>
                </div>
            </div>

            {/* Tab Content */}
            {renderContent()}
        </DesktopLayout>
    );
};

export default HHRR;
