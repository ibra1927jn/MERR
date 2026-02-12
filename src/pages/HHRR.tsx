/**
 * HHRR.TSX — Human Resources Department Dashboard
 * Matches Stitch "HarvestPro HR Dashboard" design
 * Professional light theme with indigo accents
 */
import React, { useState, useEffect } from 'react';
import {
    fetchHRSummary, fetchEmployees, fetchPayroll, fetchComplianceAlerts,
    type HRSummary, type Employee, type PayrollEntry, type ComplianceAlert
} from '@/services/hhrr.service';

type HRTab = 'employees' | 'contracts' | 'payroll' | 'documents' | 'calendar';

const HHRR: React.FC = () => {
    const [activeTab, setActiveTab] = useState<HRTab>('employees');
    const [summary, setSummary] = useState<HRSummary>({ activeWorkers: 0, pendingContracts: 0, payrollThisWeek: 0, complianceAlerts: 0 });
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [payroll, setPayroll] = useState<PayrollEntry[]>([]);
    const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
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

    const filteredEmployees = employees.filter(emp =>
        emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.role.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getRoleBadge = (role: string) => {
        const badges: Record<string, string> = {
            team_leader: 'bg-indigo-50 text-indigo-700',
            runner: 'bg-sky-50 text-sky-700',
            manager: 'bg-purple-50 text-purple-700',
            qc_inspector: 'bg-amber-50 text-amber-700',
        };
        return badges[role] || 'bg-gray-100 text-gray-600';
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            active: 'bg-emerald-100 text-emerald-700',
            on_leave: 'bg-amber-100 text-amber-700',
            terminated: 'bg-red-100 text-red-700',
            pending: 'bg-gray-100 text-gray-600',
        };
        return colors[status] || 'bg-gray-100 text-gray-600';
    };

    const getVisaBadge = (visa: string) => {
        const badges: Record<string, string> = {
            citizen: 'text-emerald-600',
            resident: 'text-blue-600',
            work_visa: 'text-amber-600',
            expired: 'text-red-600',
        };
        return badges[visa] || 'text-gray-500';
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">Loading HR data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
                <div className="flex items-center px-4 py-3 justify-between">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-primary shadow-md shadow-primary/20 flex items-center justify-center">
                            <span className="material-symbols-outlined text-white text-[22px]">badge</span>
                        </div>
                        <div>
                            <h1 className="text-gray-900 text-lg font-bold tracking-tight">Human Resources</h1>
                            <p className="text-xs text-gray-500">HarvestPro • New Zealand</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="size-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors relative">
                            <span className="material-symbols-outlined text-[20px]">notifications</span>
                            {summary.complianceAlerts > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 size-5 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                                    {summary.complianceAlerts}
                                </span>
                            )}
                        </button>
                        <button className="size-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-sm shadow-md shadow-primary/20">HR</button>
                    </div>
                </div>
            </header>

            <div className="px-4 py-5 space-y-5 pb-24">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-3">
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
                            <span className="material-symbols-outlined text-primary text-lg">payments</span>
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

                {/* Tab Bar */}
                <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
                    {([
                        { key: 'employees', label: 'Employees', icon: 'group' },
                        { key: 'contracts', label: 'Contracts', icon: 'description' },
                        { key: 'payroll', label: 'Payroll', icon: 'payments' },
                        { key: 'documents', label: 'Documents', icon: 'folder' },
                        { key: 'calendar', label: 'Calendar', icon: 'calendar_month' },
                    ] as { key: HRTab; label: string; icon: string }[]).map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${activeTab === tab.key
                                    ? 'bg-white text-primary shadow-sm'
                                    : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ── Employees Tab ─────────────────── */}
                {activeTab === 'employees' && (
                    <div className="space-y-3">
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
                            <input
                                type="text"
                                placeholder="Search employees..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-900 placeholder-gray-400 text-sm font-medium focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
                            />
                        </div>

                        {filteredEmployees.map(emp => (
                            <div key={emp.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                <div className="flex items-start gap-3">
                                    <div className="size-11 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-sm flex-shrink-0">
                                        {emp.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-gray-900 text-sm truncate">{emp.full_name}</h3>
                                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${getRoleBadge(emp.role)}`}>
                                                {emp.role.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-gray-500">
                                            <span className={`flex items-center gap-1 ${getStatusColor(emp.status)} px-2 py-0.5 rounded-full text-[10px] font-bold`}>
                                                {emp.status}
                                            </span>
                                            <span className={`flex items-center gap-1 ${getVisaBadge(emp.visa_status)}`}>
                                                <span className="material-symbols-outlined text-xs">public</span>
                                                {emp.visa_status.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-400">
                                            <span className="material-symbols-outlined text-xs">calendar_today</span>
                                            Hired {new Date(emp.hire_date).toLocaleDateString('en-NZ', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </div>
                                    </div>
                                    <button className="text-gray-300 hover:text-gray-500 transition-colors">
                                        <span className="material-symbols-outlined text-lg">chevron_right</span>
                                    </button>
                                </div>
                            </div>
                        ))}

                        {filteredEmployees.length === 0 && (
                            <div className="text-center py-12 text-gray-400">
                                <span className="material-symbols-outlined text-4xl mb-2 block">person_search</span>
                                <p className="font-medium">No employees found</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Contracts Tab ─────────────────── */}
                {activeTab === 'contracts' && (
                    <div className="space-y-3">
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                            <span className="material-symbols-outlined text-amber-600">info</span>
                            <p className="text-sm text-amber-800 font-medium">{summary.pendingContracts} contracts need renewal within 30 days</p>
                        </div>
                        {employees.slice(0, 6).map(emp => (
                            <div key={emp.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-bold text-gray-900 text-sm">{emp.full_name}</h3>
                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${emp.contract_type === 'permanent' ? 'bg-emerald-50 text-emerald-700' :
                                            emp.contract_type === 'seasonal' ? 'bg-sky-50 text-sky-700' :
                                                'bg-gray-100 text-gray-600'
                                        }`}>{emp.contract_type}</span>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                        <span className="material-symbols-outlined text-xs">event</span>
                                        {new Date(emp.contract_start).toLocaleDateString('en-NZ', { month: 'short', year: 'numeric' })}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <span className="material-symbols-outlined text-xs">attach_money</span>
                                        ${emp.hourly_rate}/hr
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Payroll Tab ───────────────────── */}
                {activeTab === 'payroll' && (
                    <div className="space-y-3">
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-bold text-gray-900">Weekly Payroll Summary</h3>
                                <span className="text-xs text-gray-500">{new Date().toLocaleDateString('en-NZ', { month: 'short', day: 'numeric' })}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-3 text-center">
                                <div>
                                    <p className="text-lg font-black text-gray-900">${(summary.payrollThisWeek / 1000).toFixed(1)}k</p>
                                    <p className="text-[10px] text-gray-500 uppercase font-bold">Total</p>
                                </div>
                                <div>
                                    <p className="text-lg font-black text-emerald-600">{payroll.filter(p => !p.wage_shield_applied).length}</p>
                                    <p className="text-[10px] text-gray-500 uppercase font-bold">Above Min</p>
                                </div>
                                <div>
                                    <p className="text-lg font-black text-amber-600">{payroll.filter(p => p.wage_shield_applied).length}</p>
                                    <p className="text-[10px] text-gray-500 uppercase font-bold">Wage Shield</p>
                                </div>
                            </div>
                        </div>

                        {payroll.map(entry => (
                            <div key={entry.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                                <div className="flex items-center justify-between mb-1">
                                    <h4 className="font-bold text-gray-900 text-sm">{entry.employee_name}</h4>
                                    <span className="font-black text-gray-900">${entry.total_pay.toFixed(0)}</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                    <span>{entry.hours_worked}h worked</span>
                                    <span>•</span>
                                    <span>{entry.buckets_picked} buckets</span>
                                    {entry.wage_shield_applied && (
                                        <span className="flex items-center gap-0.5 text-amber-600">
                                            <span className="material-symbols-outlined text-xs">shield</span>
                                            Wage Shield
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Documents Tab ─────────────────── */}
                {activeTab === 'documents' && (
                    <div className="space-y-3">
                        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
                            <span className="material-symbols-outlined text-gray-300 text-5xl mb-3 block">cloud_upload</span>
                            <h3 className="font-bold text-gray-900 mb-1">Document Management</h3>
                            <p className="text-sm text-gray-500 mb-4">Upload and manage employment documents, visa copies, and certificates</p>
                            <button className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-dim transition-colors">
                                Upload Document
                            </button>
                        </div>
                        {['Employment Agreement', 'Work Visa', 'Health & Safety Certificate', 'Tax Declaration'].map((doc, i) => (
                            <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
                                <div className="size-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-gray-500">description</span>
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-gray-900 text-sm">{doc}</h4>
                                    <p className="text-xs text-gray-500">Template • Required for all employees</p>
                                </div>
                                <span className="material-symbols-outlined text-gray-300">download</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Calendar Tab ──────────────────── */}
                {activeTab === 'calendar' && (
                    <div className="space-y-3">
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-900 mb-3">Today's Schedule</h3>
                            <div className="space-y-2">
                                {[
                                    { time: '07:00', event: 'Shift Start — All Teams', icon: 'alarm', color: 'text-emerald-600' },
                                    { time: '10:00', event: 'New Employee Induction', icon: 'school', color: 'text-primary' },
                                    { time: '12:00', event: 'Lunch Break (30min)', icon: 'restaurant', color: 'text-amber-600' },
                                    { time: '15:00', event: 'Safety Briefing — Zone B', icon: 'health_and_safety', color: 'text-red-600' },
                                    { time: '17:00', event: 'Shift End — Day Closure', icon: 'logout', color: 'text-gray-600' },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                                        <span className="text-xs font-mono text-gray-400 w-12">{item.time}</span>
                                        <span className={`material-symbols-outlined text-lg ${item.color}`}>{item.icon}</span>
                                        <span className="text-sm text-gray-700 font-medium">{item.event}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-900 mb-3">Upcoming Leave</h3>
                            {[
                                { name: 'Aroha W.', type: 'Annual Leave', dates: 'Feb 17-21', status: 'approved' },
                                { name: 'Mateo S.', type: 'Sick Leave', dates: 'Feb 14', status: 'pending' },
                            ].map((leave, i) => (
                                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">{leave.name}</p>
                                        <p className="text-xs text-gray-500">{leave.type} • {leave.dates}</p>
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${leave.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                                        }`}>{leave.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Compliance Alerts */}
                {alerts.length > 0 && activeTab === 'employees' && (
                    <div className="space-y-2">
                        <h3 className="font-bold text-gray-900 text-sm">Compliance Alerts</h3>
                        {alerts.map(alert => (
                            <div key={alert.id} className={`rounded-xl p-3 flex items-center gap-3 ${alert.severity === 'critical' ? 'bg-red-50 border border-red-200' :
                                    alert.severity === 'high' ? 'bg-amber-50 border border-amber-200' :
                                        'bg-gray-50 border border-gray-200'
                                }`}>
                                <span className={`material-symbols-outlined text-lg ${alert.severity === 'critical' ? 'text-red-600' : 'text-amber-600'
                                    }`}>warning</span>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">{alert.employee_name}</p>
                                    <p className="text-xs text-gray-600">{alert.message}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* FAB */}
            <button className="fixed bottom-20 right-4 z-40 size-14 rounded-2xl bg-primary text-white shadow-lg shadow-primary/30 flex items-center justify-center hover:bg-primary-dim transition-colors active:scale-95">
                <span className="material-symbols-outlined text-2xl">person_add</span>
            </button>

            {/* Bottom Nav */}
            <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 pb-6 pt-3 px-6 z-50">
                <ul className="flex justify-between items-center">
                    {([
                        { key: 'employees', icon: 'dashboard', label: 'Dashboard' },
                        { key: 'employees', icon: 'group', label: 'Employees' },
                        { key: 'payroll', icon: 'payments', label: 'Payroll' },
                        { key: 'documents', icon: 'folder', label: 'Documents' },
                        { key: 'calendar', icon: 'settings', label: 'Settings' },
                    ] as { key: HRTab; icon: string; label: string }[]).map((nav, i) => (
                        <li key={i}>
                            <button
                                onClick={() => setActiveTab(nav.key)}
                                className={`flex flex-col items-center gap-1 transition-all ${(i === 0 && activeTab === 'employees') ? 'text-primary' : 'text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-xl">{nav.icon}</span>
                                <span className="text-[10px] font-medium">{nav.label}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>
        </div>
    );
};

export default HHRR;
