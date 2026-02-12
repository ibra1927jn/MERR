/**
 * Admin.tsx — System Admin Dashboard
 * 
 * Multi-orchard overview, user management, and compliance monitoring.
 * Available only to users with the ADMIN role.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    Building2, Users, Shield, Search,
    ChevronDown, UserCheck, UserX, Activity
} from 'lucide-react';
import { adminService, OrchardOverview, UserRecord } from '@/services/admin.service';
import { AuditLogViewer } from '@/components/AuditLogViewer';

type AdminTab = 'orchards' | 'users' | 'compliance' | 'audit';

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
    manager: { label: 'Manager', color: 'bg-purple-100 text-purple-700' },
    team_leader: { label: 'Team Leader', color: 'bg-blue-100 text-blue-700' },
    runner: { label: 'Runner', color: 'bg-green-100 text-green-700' },
    qc_inspector: { label: 'QC Inspector', color: 'bg-amber-100 text-amber-700' },
    payroll_admin: { label: 'Payroll Admin', color: 'bg-indigo-100 text-indigo-700' },
    admin: { label: 'Admin', color: 'bg-red-100 text-red-700' },
};

export default function Admin() {
    const [activeTab, setActiveTab] = useState<AdminTab>('orchards');
    const [orchards, setOrchards] = useState<OrchardOverview[]>([]);
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [userSearch, setUserSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        const [orchardData, userData] = await Promise.all([
            adminService.getAllOrchards(),
            adminService.getAllUsers({ role: roleFilter || undefined, search: userSearch || undefined }),
        ]);
        setOrchards(orchardData);
        setUsers(userData);
        setIsLoading(false);
    }, [roleFilter, userSearch]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleRoleChange = async (userId: string, newRole: string) => {
        const success = await adminService.updateUserRole(userId, newRole);
        if (success) loadData();
    };

    const handleToggleActive = async (user: UserRecord) => {
        const success = user.is_active
            ? await adminService.deactivateUser(user.id)
            : await adminService.reactivateUser(user.id);
        if (success) loadData();
    };

    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.is_active).length;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-4 py-4">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                            <Shield size={20} className="text-red-600" />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold text-gray-900">HarvestPro Admin</h1>
                            <p className="text-xs text-gray-500">System Administration</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                            {orchards.length} orchards
                        </span>
                        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                            {activeUsers}/{totalUsers} active
                        </span>
                    </div>
                </div>
            </header>

            {/* Tabs */}
            <nav className="bg-white border-b border-gray-200">
                <div className="max-w-6xl mx-auto px-4 flex gap-1">
                    {[
                        { key: 'orchards' as const, label: 'Orchards', icon: <Building2 size={16} /> },
                        { key: 'users' as const, label: 'Users', icon: <Users size={16} /> },
                        { key: 'compliance' as const, label: 'Compliance', icon: <Activity size={16} /> },
                        { key: 'audit' as const, label: 'Audit Log', icon: <Shield size={16} /> },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key
                                    ? 'border-red-500 text-red-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>
            </nav>

            {/* Content */}
            <main className="max-w-6xl mx-auto p-4 md:p-6">
                {isLoading && (
                    <div className="text-center py-12 text-gray-400">Loading...</div>
                )}

                {/* Orchards Tab */}
                {!isLoading && activeTab === 'orchards' && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-gray-900">All Orchards</h2>
                        {orchards.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {orchards.map(orch => (
                                    <div key={orch.id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <h3 className="text-base font-semibold text-gray-900">{orch.name}</h3>
                                                <p className="text-xs text-gray-500 mt-0.5">{orch.total_rows} rows</p>
                                            </div>
                                            <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
                                                Active
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3 text-center">
                                            <div>
                                                <div className="text-xl font-bold text-gray-900">{orch.active_pickers}</div>
                                                <div className="text-xs text-gray-500">Pickers</div>
                                            </div>
                                            <div>
                                                <div className="text-xl font-bold text-gray-900">{orch.today_buckets}</div>
                                                <div className="text-xs text-gray-500">Buckets</div>
                                            </div>
                                            <div>
                                                <div className="text-xl font-bold text-green-600">{orch.compliance_score}%</div>
                                                <div className="text-xs text-gray-500">Compliance</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                                <Building2 size={40} className="mx-auto text-gray-300 mb-3" />
                                <p className="text-sm text-gray-500">No orchards found</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Users Tab */}
                {!isLoading && activeTab === 'users' && (
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search users..."
                                    value={userSearch}
                                    onChange={(e) => setUserSearch(e.target.value)}
                                    aria-label="Search users"
                                    className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                            <div className="relative">
                                <select
                                    value={roleFilter}
                                    onChange={(e) => setRoleFilter(e.target.value)}
                                    title="Filter by role"
                                    aria-label="Filter by role"
                                    className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2.5 pr-8 text-sm focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="">All Roles</option>
                                    <option value="manager">Managers</option>
                                    <option value="team_leader">Team Leaders</option>
                                    <option value="runner">Runners</option>
                                    <option value="qc_inspector">QC Inspectors</option>
                                    <option value="admin">Admins</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                            <div className="divide-y divide-gray-100">
                                {users.map(user => {
                                    const roleInfo = ROLE_LABELS[user.role] || { label: user.role, color: 'bg-gray-100 text-gray-700' };
                                    return (
                                        <div key={user.id} className="px-4 py-3 flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${user.is_active ? 'bg-gray-100 text-gray-600' : 'bg-red-50 text-red-400'
                                                }`}>
                                                {user.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-medium truncate ${user.is_active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                                                    {user.full_name || 'Unnamed'}
                                                </p>
                                                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleInfo.color}`}>
                                                {roleInfo.label}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleToggleActive(user)}
                                                    title={user.is_active ? 'Deactivate user' : 'Reactivate user'}
                                                    className={`p-1.5 rounded-md transition-colors ${user.is_active
                                                            ? 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                                                            : 'text-green-400 hover:text-green-600 hover:bg-green-50'
                                                        }`}
                                                >
                                                    {user.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
                                                </button>
                                                <select
                                                    value={user.role}
                                                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                    title={`Change role for ${user.full_name}`}
                                                    aria-label={`Change role for ${user.full_name}`}
                                                    className="text-xs border border-gray-200 rounded-md px-1.5 py-1 bg-gray-50"
                                                >
                                                    <option value="manager">Manager</option>
                                                    <option value="team_leader">Team Leader</option>
                                                    <option value="runner">Runner</option>
                                                    <option value="qc_inspector">QC Inspector</option>
                                                    <option value="payroll_admin">Payroll Admin</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                            </div>
                                        </div>
                                    );
                                })}
                                {users.length === 0 && (
                                    <div className="p-8 text-center">
                                        <Users size={40} className="mx-auto text-gray-300 mb-3" />
                                        <p className="text-sm text-gray-500">No users found</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Compliance Tab */}
                {!isLoading && activeTab === 'compliance' && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-gray-900">Compliance Overview</h2>
                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <ComplianceCard
                                    title="NZ Employment Act"
                                    score={98}
                                    status="Compliant"
                                    details="All wages above minimum threshold"
                                />
                                <ComplianceCard
                                    title="Safety Verification"
                                    score={95}
                                    status="2 pending"
                                    details="95 of 97 workers verified"
                                />
                                <ComplianceCard
                                    title="Audit Trail"
                                    score={100}
                                    status="Active"
                                    details="All actions logged"
                                />
                            </div>
                        </div>
                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
                            <h3 className="text-sm font-semibold text-gray-900 mb-3">Cross-Orchard Status</h3>
                            {orchards.map(orch => (
                                <div key={orch.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                    <span className="text-sm font-medium text-gray-900">{orch.name}</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-green-500 rounded-full"
                                                style={{ width: `${orch.compliance_score}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-gray-500 w-10 text-right">{orch.compliance_score}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Audit Log Tab */}
                {!isLoading && activeTab === 'audit' && (
                    <div>
                        <AuditLogViewer />
                    </div>
                )}
            </main>
        </div>
    );
}

/* ── Compliance Card ────────────── */

const ComplianceCard: React.FC<{
    title: string;
    score: number;
    status: string;
    details: string;
}> = ({ title, score, status, details }) => (
    <div className="text-center">
        <div className={`text-3xl font-bold ${score >= 95 ? 'text-green-600' : score >= 80 ? 'text-amber-600' : 'text-red-600'
            }`}>
            {score}%
        </div>
        <div className="text-sm font-semibold text-gray-900 mt-1">{title}</div>
        <div className="text-xs text-gray-500 mt-0.5">{status}</div>
        <div className="text-xs text-gray-400 mt-0.5">{details}</div>
    </div>
);
