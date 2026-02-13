/**
 * EmployeesTab.tsx — HR Employee Directory
 * Lists all employees with search, role badges, status, and visa info
 */
import React, { useState, useMemo } from 'react';
import EmptyState from '@/components/common/EmptyState';
import FilterBar from '@/components/common/FilterBar';
import InlineSelect from '@/components/common/InlineSelect';
import InlineEdit from '@/components/common/InlineEdit';
import { Employee, ComplianceAlert } from '@/services/hhrr.service';

const ROLE_BADGES: Record<string, string> = {
    team_leader: 'bg-indigo-50 text-indigo-700',
    runner: 'bg-sky-50 text-sky-700',
    manager: 'bg-purple-50 text-purple-700',
    qc_inspector: 'bg-amber-50 text-amber-700',
};

const STATUS_COLORS: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    on_leave: 'bg-amber-100 text-amber-700',
    terminated: 'bg-red-100 text-red-700',
    pending: 'bg-gray-100 text-gray-600',
};

const VISA_COLORS: Record<string, string> = {
    citizen: 'text-emerald-600',
    resident: 'text-blue-600',
    work_visa: 'text-amber-600',
    expired: 'text-red-600',
};

interface EmployeesTabProps {
    employees: Employee[];
    alerts: ComplianceAlert[];
    onUpdateEmployee?: (id: string, changes: Partial<Employee>) => void;
}

const EmployeesTab: React.FC<EmployeesTabProps> = ({ employees, alerts, onUpdateEmployee }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

    // Extract unique values for filter options
    const filterOptions = useMemo(() => ({
        roles: [...new Set(employees.map(e => e.role))].sort(),
        statuses: [...new Set(employees.map(e => e.status))].sort(),
        visas: [...new Set(employees.map(e => e.visa_status))].sort(),
    }), [employees]);

    const filtered = employees.filter(emp => {
        const matchesSearch = !searchQuery ||
            emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            emp.role.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = !activeFilters.role || emp.role === activeFilters.role;
        const matchesStatus = !activeFilters.status || emp.status === activeFilters.status;
        const matchesVisa = !activeFilters.visa_status || emp.visa_status === activeFilters.visa_status;
        return matchesSearch && matchesRole && matchesStatus && matchesVisa;
    });

    return (
        <div className="space-y-4">
            <FilterBar
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search employees..."
                filters={[
                    { key: 'role', label: 'Role', options: filterOptions.roles, icon: 'badge' },
                    { key: 'status', label: 'Status', options: filterOptions.statuses, icon: 'toggle_on' },
                    { key: 'visa_status', label: 'Visa', options: filterOptions.visas, icon: 'public' },
                ]}
                activeFilters={activeFilters}
                onFilterChange={(key, value) => setActiveFilters(prev => ({ ...prev, [key]: value }))}
                onClearAll={() => { setSearchQuery(''); setActiveFilters({}); }}
            />

            {/* Employee Grid — responsive */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                {filtered.map(emp => (
                    <div key={emp.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex items-start gap-3">
                            <div className="size-11 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-sm flex-shrink-0">
                                {emp.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-bold text-gray-900 text-sm truncate">{emp.full_name}</h3>
                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${ROLE_BADGES[emp.role] || 'bg-gray-100 text-gray-600'}`}>
                                        {emp.role.replace('_', ' ')}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                    <InlineSelect
                                        value={emp.status}
                                        options={['active', 'on_leave', 'terminated', 'pending']}
                                        colorMap={STATUS_COLORS}
                                        onSave={(val) => onUpdateEmployee?.(emp.id, { status: val as Employee['status'] })}
                                    />
                                    <span className={`flex items-center gap-1 ${VISA_COLORS[emp.visa_status] || 'text-gray-500'}`}>
                                        <span className="material-symbols-outlined text-xs">public</span>
                                        {emp.visa_status.replace('_', ' ')}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 mt-1.5">
                                    <span className="flex items-center gap-1 text-xs text-gray-400">
                                        <span className="material-symbols-outlined text-xs">phone</span>
                                        <InlineEdit
                                            value={emp.phone ?? ''}
                                            onSave={(val) => onUpdateEmployee?.(emp.id, { phone: val })}
                                            placeholder="Add phone..."
                                            type="text"
                                        />
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
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
            </div>

            {filtered.length === 0 && (
                <EmptyState
                    icon="person_search"
                    title="No employees found"
                    subtitle="Try adjusting your search or filters"
                    compact
                />
            )}

            {/* Compliance Alerts */}
            {alerts.length > 0 && (
                <div className="space-y-2 mt-6">
                    <h3 className="font-bold text-gray-900 text-sm">Compliance Alerts</h3>
                    {alerts.map(alert => (
                        <div key={alert.id} className={`rounded-xl p-3 flex items-center gap-3 ${alert.severity === 'critical' ? 'bg-red-50 border border-red-200' :
                            alert.severity === 'high' ? 'bg-amber-50 border border-amber-200' :
                                'bg-gray-50 border border-gray-200'
                            }`}>
                            <span className={`material-symbols-outlined text-lg ${alert.severity === 'critical' ? 'text-red-600' : 'text-amber-600'}`}>warning</span>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{alert.employee_name}</p>
                                <p className="text-xs text-gray-600">{alert.message}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default EmployeesTab;
