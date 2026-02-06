/**
 * MANAGER.TSX - High Fidelity Command Center
 * Integrates Dashboard, Teams, Logistics, Messaging, and Management Modals.
 */
import React, { useState } from 'react';
import { useHarvest } from '../context/HarvestContext';
import { useAuth } from '../context/AuthContext';
import { Role, Picker } from '../types';

// Navegación interna
type Tab = 'dashboard' | 'teams' | 'logistics' | 'messaging';

// ==========================================
// MODALS & SUB-COMPONENTS
// ==========================================

const SettingsModal = ({ onClose, settings, onUpdate, currentOrchard }: any) => {
    const [formData, setFormData] = useState({
        startTime: '06:00', // Local state for visual
        variety: 'Lapins', // Local state for visual
        orchardName: currentOrchard?.id || 'Central Block',
        targetTons: settings?.target_tons || 40,
        pieceRate: settings?.piece_rate || 6.50
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        // Save to Context
        onUpdate({
            ...settings,
            target_tons: parseFloat(formData.targetTons.toString()),
            piece_rate: parseFloat(formData.pieceRate.toString())
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-card-dark w-full max-w-lg rounded-3xl p-6 shadow-2xl relative animate-in slide-in-from-bottom duration-300">
                <button onClick={onClose} className="absolute right-6 top-6 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                    <span className="material-symbols-outlined">close</span>
                </button>

                <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-1">Manage Day</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Setup daily parameters and goals.</p>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 uppercase">Start Time</label>
                            <input
                                type="time" name="startTime" value={formData.startTime} onChange={handleChange}
                                className="w-full bg-gray-50 dark:bg-card-lighter border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 uppercase">Variety</label>
                            <select
                                name="variety" value={formData.variety} onChange={handleChange}
                                className="w-full bg-gray-50 dark:bg-card-lighter border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
                            >
                                <option>Lapins</option>
                                <option>Stella</option>
                                <option>Sweetheart</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase">Orchard Block</label>
                        <input
                            type="text" name="orchardName" value={formData.orchardName} onChange={handleChange}
                            className="w-full bg-gray-50 dark:bg-card-lighter border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 uppercase">Bucket Price ($)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                                <input
                                    type="number" name="pieceRate" value={formData.pieceRate} onChange={handleChange}
                                    className="w-full bg-gray-50 dark:bg-card-lighter border border-gray-200 dark:border-white/10 rounded-xl pl-8 pr-4 py-3 text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 uppercase">Target (Tons)</label>
                            <div className="relative">
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">TONS</span>
                                <input
                                    type="number" name="targetTons" value={formData.targetTons} onChange={handleChange}
                                    className="w-full bg-gray-50 dark:bg-card-lighter border border-gray-200 dark:border-white/10 rounded-xl pl-4 pr-12 py-3 text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8">
                    <button onClick={handleSave} className="w-full py-4 bg-primary text-white rounded-xl font-bold text-lg shadow-lg shadow-primary/30 active:scale-[0.98] transition-all">
                        Update Settings
                    </button>
                </div>
            </div>
        </div>
    );
};

const AddUserModal = ({ onClose, onAdd }: any) => {
    const [role, setRole] = useState<Role>(Role.TEAM_LEADER);
    const [name, setName] = useState('');
    const [idCode, setIdCode] = useState('');

    const handleSubmit = () => {
        if (!name || !idCode) return;
        onAdd({
            picker_id: idCode,
            full_name: name,
            role: role,
            safety_verified: true
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-card-dark w-full max-w-sm rounded-3xl p-6 shadow-2xl relative">
                <button onClick={onClose} className="absolute right-4 top-4 text-gray-400">
                    <span className="material-symbols-outlined">close</span>
                </button>
                <h2 className="text-xl font-black mb-6 dark:text-white">Add New Member</h2>

                <div className="flex gap-2 mb-4 bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
                    <button
                        onClick={() => setRole(Role.TEAM_LEADER)}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${role === Role.TEAM_LEADER ? 'bg-white dark:bg-primary shadow text-primary dark:text-white' : 'text-gray-500'}`}
                    >Team Leader</button>
                    <button
                        onClick={() => setRole(Role.RUNNER)}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${role === Role.RUNNER ? 'bg-white dark:bg-primary shadow text-primary dark:text-white' : 'text-gray-500'}`}
                    >Bucket Runner</button>
                </div>

                <div className="space-y-3">
                    <input
                        placeholder="Full Name"
                        value={name} onChange={e => setName(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-card-lighter border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 font-bold outline-none dark:text-white"
                    />
                    <input
                        placeholder="ID / Badge Code"
                        value={idCode} onChange={e => setIdCode(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-card-lighter border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 font-bold outline-none dark:text-white"
                    />
                </div>

                <button onClick={handleSubmit} className="w-full mt-6 py-3 bg-gray-900 dark:bg-white dark:text-black text-white rounded-xl font-bold">
                    Add Member
                </button>
            </div>
        </div>
    );
};

const UserDetailModal = ({ user, onClose, onDelete }: any) => {
    if (!user) return null;
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-card-dark w-full max-w-sm rounded-3xl p-6 shadow-2xl relative">
                <button onClick={onClose} className="absolute right-4 top-4 text-gray-400">
                    <span className="material-symbols-outlined">close</span>
                </button>

                <div className="flex flex-col items-center mb-6">
                    <div className="w-20 h-20 rounded-full border-4 border-gray-100 dark:border-white/5 overflow-hidden mb-3">
                        <img src={`https://ui-avatars.com/api/?name=${user.name}&background=random`} alt={user.name} className="w-full h-full object-cover" />
                    </div>
                    <h2 className="text-xl font-black dark:text-white">{user.name}</h2>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{user.role || 'Picker'}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-xl text-center">
                        <span className="block text-2xl font-black text-primary">{user.total_buckets_today || 0}</span>
                        <span className="text-[10px] text-gray-500 uppercase font-bold">Buckets</span>
                    </div>
                    <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-xl text-center">
                        <span className="block text-2xl font-black text-blue-500">{user.row || '--'}</span>
                        <span className="text-[10px] text-gray-500 uppercase font-bold">Current Row</span>
                    </div>
                </div>

                <button
                    onClick={() => {
                        if (confirm('Delete user?')) {
                            onDelete(user.id || user.picker_id);
                            onClose();
                        }
                    }}
                    className="w-full py-3 bg-red-50 text-red-600 border border-red-100 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
                >
                    <span className="material-symbols-outlined text-lg">delete</span>
                    Remove from Crew
                </button>
            </div>
        </div>
    );
};

// ==========================================
// MAIN COMPONENT
// ==========================================

const Manager = () => {
    const {
        stats,
        crew = [],
        inventory = [],
        orchard,
        settings,
        updateSettings,
        addPicker,
        removePicker
    } = useHarvest();

    const { userName } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('dashboard');

    // Modal States
    const [showSettings, setShowSettings] = useState(false);
    const [showAddUser, setShowAddUser] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);

    // Derived Data
    const activeRunners = crew.filter(p => p.role === 'runner' || p.role === Role.RUNNER);
    const activePickers = crew.filter(p => !p.role || p.role === 'picker');
    const teamLeaders = crew.filter(p => p.role === 'team_leader' || p.role === Role.TEAM_LEADER);

    const fullBins = inventory.filter(b => b.status === 'full').length;
    const emptyBins = inventory.filter(b => b.status === 'empty').length;
    const topPerformers = [...activePickers].sort((a, b) => (b.total_buckets_today || 0) - (a.total_buckets_today || 0));

    // Views
    const DashboardView = () => (
        <div className="flex flex-col gap-6 p-4">
            {/* Velocity Monitor */}
            <div className="bg-white dark:bg-card-dark rounded-xl p-5 shadow-sm border border-gray-100 dark:border-white/5">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Picking vs Collection</p>
                        <h3 className="text-2xl font-bold tracking-tight">Bottleneck Warning</h3>
                    </div>
                    <div className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-2.5 py-1 rounded-full text-xs font-bold border border-yellow-500/20 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">warning</span>
                        +30 Surplus
                    </div>
                </div>
                <div className="flex items-center gap-6 mb-6">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="w-2 h-2 rounded-full bg-primary"></span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Picking</span>
                        </div>
                        <p className="text-2xl font-bold">{Math.round(stats.velocity)} <span className="text-sm font-normal text-gray-500">bkt/hr</span></p>
                    </div>
                </div>
                {/* SVG Graph Placeholder */}
                <div className="h-[100px] w-full relative">
                    <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 50">
                        <path d="M0,40 Q10,38 20,35 T40,30 T60,32 T80,38 T100,42" fill="none" stroke="#3b82f6" strokeWidth="2"></path>
                        <path d="M0,35 Q10,30 20,25 T40,15 T60,18 T80,12 T100,10" fill="none" stroke="#ec1337" strokeLinecap="round" strokeWidth="2"></path>
                    </svg>
                </div>
            </div>

            {/* Orchard Forecast */}
            <div className="bg-white dark:bg-card-dark rounded-xl p-5 shadow-sm border border-gray-100 dark:border-white/5 flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Daily Target (Tons)</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold dark:text-white">{stats.tons.toFixed(1)}</span>
                        <span className="text-sm text-gray-500">/ {settings?.target_tons || 40}</span>
                    </div>
                </div>
                <div className="relative w-24 h-24 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <path className="text-gray-200 dark:text-white/10" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3"></path>
                        <path className="text-primary" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${Math.min(100, (stats.tons / (settings?.target_tons || 40)) * 100)}, 100`} strokeLinecap="round" strokeWidth="3"></path>
                    </svg>
                    <span className="absolute text-sm font-bold dark:text-white">{Math.round((stats.tons / (settings?.target_tons || 40)) * 100)}%</span>
                </div>
            </div>
        </div>
    );

    const TeamsView = () => (
        <div className="flex flex-col gap-6 p-4">

            {/* ADD BUTTONS */}
            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={() => setShowAddUser(true)}
                    className="flex flex-col items-center justify-center p-4 bg-white dark:bg-card-dark border-2 border-dashed border-gray-300 dark:border-white/20 rounded-2xl active:scale-[0.98] transition-all hover:border-primary hover:text-primary dark:text-white"
                >
                    <span className="material-symbols-outlined text-3xl mb-1">group_add</span>
                    <span className="text-xs font-bold uppercase">Add Team Lead</span>
                </button>
                <button
                    onClick={() => setShowAddUser(true)}
                    className="flex flex-col items-center justify-center p-4 bg-white dark:bg-card-dark border-2 border-dashed border-gray-300 dark:border-white/20 rounded-2xl active:scale-[0.98] transition-all hover:border-primary hover:text-primary dark:text-white"
                >
                    <span className="material-symbols-outlined text-3xl mb-1">local_shipping</span>
                    <span className="text-xs font-bold uppercase">Add Runner</span>
                </button>
            </div>

            <section className="flex flex-col gap-4">
                <h2 className="text-lg font-bold tracking-tight dark:text-white">Active Crew</h2>
                <div className="flex flex-col gap-3">
                    {[...teamLeaders, ...activeRunners, ...topPerformers.slice(0, 5)].map((member, idx) => (
                        <div
                            key={member.id || idx}
                            onClick={() => setSelectedUser(member)}
                            className="bg-white dark:bg-card-dark rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-white/5 active:scale-[0.99] transition-transform cursor-pointer"
                        >
                            <div className="flex items-center gap-4">
                                <div className="size-12 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-xl font-bold dark:text-white">
                                    {member.name?.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">{member.name}</h3>
                                    <p className="text-xs font-medium text-primary uppercase">{member.role?.replace('_', ' ') || 'Picker'}</p>
                                </div>
                                <div className="text-right">
                                    <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {crew.length === 0 && (
                        <div className="text-center py-10 text-gray-400">No crew members active.</div>
                    )}
                </div>
            </section>
        </div>
    );

    const LogisticsView = () => (
        <div className="flex flex-col gap-6 p-4">
            <section className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-card-dark rounded-xl p-4 shadow-sm relative overflow-hidden">
                    <p className="text-xs text-gray-500 font-medium uppercase mb-1">Awaiting Pickup</p>
                    <h3 className="text-3xl font-bold dark:text-white">{fullBins}</h3>
                    <div className="mt-2 text-xs text-primary font-bold">Full Bins</div>
                </div>
                <div className="bg-white dark:bg-card-dark rounded-xl p-4 shadow-sm relative overflow-hidden">
                    <p className="text-xs text-gray-500 font-medium uppercase mb-1">Empty Supply</p>
                    <h3 className="text-3xl font-bold dark:text-white">{emptyBins}</h3>
                    <div className="mt-2 text-xs text-green-500 font-bold">Available</div>
                </div>
            </section>
        </div>
    );

    const MessagingView = () => (
        <div className="p-4 text-center text-gray-500">Messaging Hub Placeholder</div>
    );

    return (
        <div className="bg-background-light dark:bg-background-dark min-h-screen text-gray-900 dark:text-white pb-24 font-sans">
            {/* HEADER */}
            <div className="sticky top-0 z-40 bg-background-light dark:bg-background-dark/95 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b dark:border-white/10">
                <h1 className="text-xl font-black">{activeTab === 'dashboard' ? 'Command Center' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1>

                <div
                    onClick={() => setShowSettings(true)}
                    className="flex items-center gap-2 bg-white dark:bg-white/10 px-3 py-1.5 rounded-full shadow-sm cursor-pointer active:scale-95 transition-transform"
                >
                    <img
                        src={`https://ui-avatars.com/api/?name=${userName || 'Manager'}&background=random`}
                        className="w-6 h-6 rounded-full"
                    />
                    <span className="text-xs font-bold pr-1">Settings</span>
                </div>
            </div>

            {/* MAIN */}
            <main>
                {activeTab === 'dashboard' && <DashboardView />}
                {activeTab === 'teams' && <TeamsView />}
                {activeTab === 'logistics' && <LogisticsView />}
                {activeTab === 'messaging' && <MessagingView />}
            </main>

            {/* MODALS */}
            {showSettings && (
                <SettingsModal
                    onClose={() => setShowSettings(false)}
                    settings={settings}
                    onUpdate={updateSettings}
                    currentOrchard={orchard}
                />
            )}
            {showAddUser && (
                <AddUserModal
                    onClose={() => setShowAddUser(false)}
                    onAdd={addPicker}
                />
            )}
            {selectedUser && (
                <UserDetailModal
                    user={selectedUser}
                    onClose={() => setSelectedUser(null)}
                    onDelete={removePicker}
                />
            )}

            {/* NAV */}
            <nav className="fixed bottom-0 left-0 w-full bg-white dark:bg-card-dark border-t border-gray-200 dark:border-white/10 pb-6 pt-3 px-6 z-50">
                <ul className="flex justify-between items-center">
                    {(['dashboard', 'teams', 'logistics', 'messaging'] as Tab[]).map(tab => (
                        <li key={tab}>
                            <button
                                onClick={() => setActiveTab(tab)}
                                className={`flex flex-col items-center gap-1 transition-colors ${activeTab === tab ? 'text-primary' : 'text-gray-400'}`}
                            >
                                <span className={`material-symbols-outlined ${activeTab === tab ? 'filled' : ''}`}>
                                    {tab === 'dashboard' ? 'dashboard' : tab === 'teams' ? 'groups' : tab === 'logistics' ? 'local_shipping' : 'chat'}
                                </span>
                                <span className="text-[10px] font-medium capitalize">{tab}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>
        </div>
    );
};

export default Manager;
