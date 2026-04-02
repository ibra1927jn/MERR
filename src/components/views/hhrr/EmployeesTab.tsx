/**
 * EmployeesTab.tsx — HR Employee Directory
 * Lists all employees with search, role badges, status, and visa info
 */
import React, { useState, useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';
import EmptyState from '@/components/ui/EmptyState';
import FilterBar from '@/components/ui/FilterBar';
import InlineSelect from '@/components/ui/InlineSelect';
import InlineEdit from '@/components/ui/InlineEdit';
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
    pending: 'bg-surface-secondary text-text-secondary',
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

            {/* Employee List — virtualized for 450+ employees */}
            <div style={{ height: Math.min(filtered.length * 110, 600) }}>
                <Virtuoso
                    data={filtered}
                    itemContent={(_index, emp) => (
                        <div className="bg-white/70 backdrop-blur-md rounded-2xl p-5 shadow-[0_4px_24px_rgb(0,0,0,0.02)] border border-white/60 hover:shadow-[0_8px_32px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 cursor-pointer mb-3 relative overflow-hidden group">
                            
                            {/* Decorative background gradient on hover */}
                            <div className="absolute inset-0 bg-gradient-to-r from-sky-50/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                            <div className="flex items-start gap-4 relative z-10">
                                <div className="size-12 rounded-full bg-slate-100/80 border border-white shadow-sm flex items-center justify-center text-slate-500 font-bold text-sm flex-shrink-0 group-hover:scale-105 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all duration-300">
                                    {emp.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1.5">
                                        <h3 className="font-bold text-slate-800 text-sm truncate">{emp.full_name}</h3>
                                        <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full shadow-sm ${ROLE_BADGES[emp.role] || 'bg-surface-secondary text-text-secondary'}`}>
                                            {emp.role.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                                        <InlineSelect
                                            value={emp.status}
                                            options={['active', 'on_leave', 'terminated', 'pending']}
                                            colorMap={STATUS_COLORS}
                                            onSave={(val) => onUpdateEmployee?.(emp.id, { status: val as Employee['status'] })}
                                        />
                                        <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/50 border border-slate-100 ${VISA_COLORS[emp.visa_status] || 'text-slate-500'}`}>
                                            <span className="material-symbols-outlined text-[14px]">public</span>
                                            {emp.visa_status.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100/60">
                                        <span className="flex items-center gap-1.5 text-xs text-slate-400 font-medium group-hover:text-slate-500 transition-colors">
                                            <span className="material-symbols-outlined text-[14px]">phone</span>
                                            <InlineEdit
                                                value={emp.phone ?? ''}
                                                onSave={(val) => onUpdateEmployee?.(emp.id, { phone: val })}
                                                placeholder="Add phone..."
                                                type="text"
                                            />
                                        </span>
                                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                                            <span className="material-symbols-outlined text-[14px]">event</span>
                                            Hired {new Date(emp.hire_date).toLocaleDateString('en-NZ', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </div>
                                    </div>
                                </div>
                                <button className="size-8 rounded-full border border-slate-200 bg-white/50 text-slate-400 flex items-center justify-center hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 transition-all opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0">
                                    <span className="material-symbols-outlined text-lg">chevron_right</span>
                                </button>
                            </div>
                        </div>
                    )}
                />
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
                    <h3 className="font-bold text-text-primary text-sm">Compliance Alerts</h3>
                    {alerts.map(alert => (
                        <div key={alert.id} className={`rounded-xl p-3 flex items-center gap-3 ${alert.severity === 'critical' ? 'bg-red-50 border border-red-200' :
                            alert.severity === 'high' ? 'bg-amber-50 border border-amber-200' :
                                'bg-background-light border border-border-light'
                            }`}>
                            <span className={`material-symbols-outlined text-lg ${alert.severity === 'critical' ? 'text-red-600' : 'text-amber-600'}`}>warning</span>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-text-primary">{alert.employee_name}</p>
                                <p className="text-xs text-text-secondary">{alert.message}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default EmployeesTab;
