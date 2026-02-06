/**
 * MANAGER.TSX - High Fidelity Command Center
 * Integrates Dashboard, Teams, Logistics, Messaging, Map, and Management Modals.
 * Updated with rich UI/UX from user design.
 */
import React, { useState } from 'react';
import { useHarvest } from '../context/HarvestContext';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';

// Internal Navigation
type Tab = 'dashboard' | 'teams' | 'logistics' | 'messaging' | 'map';

// ==========================================
// MODALS & SUB-COMPONENTS
// ==========================================

const SettingsModal = ({ onClose, settings, onUpdate, currentOrchard }: any) => {
    const [formData, setFormData] = useState({
        startTime: '06:00',
        variety: 'Lapins',
        orchardName: currentOrchard?.id || 'Central Block',
        targetTons: settings?.target_tons || 40,
        pieceRate: settings?.piece_rate || 6.50
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
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

    // Sort logic for leaderboard
    const topPerformers = [...activePickers].sort((a, b) => (b.total_buckets_today || 0) - (a.total_buckets_today || 0));

    // Stats calculations
    const targetTons = settings?.target_tons || 16.0;
    const currentTons = stats.tons || 0;
    const progressPercent = Math.min(100, Math.round((currentTons / targetTons) * 100));

    // View: Dashboard
    const DashboardView = () => (
        <div className="flex flex-col gap-6 p-4">
            {/* Velocity Monitor */}
            <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold tracking-tight">Velocity Monitor</h2>
                    <button className="text-xs text-primary font-medium hover:text-primary/80 transition-colors">View Report</button>
                </div>
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
                            <p className="text-xs text-green-500 font-medium mt-1 flex items-center">
                                <span className="material-symbols-outlined text-[14px] mr-0.5">trending_up</span>
                                +5% Last hr
                            </p>
                        </div>
                        <div className="w-px h-12 bg-gray-200 dark:bg-white/10"></div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">Collection</span>
                            </div>
                            <p className="text-2xl font-bold">{Math.round(stats.velocity * 0.9)} <span className="text-sm font-normal text-gray-500">bkt/hr</span></p>
                            <p className="text-xs text-primary font-medium mt-1 flex items-center">
                                <span className="material-symbols-outlined text-[14px] mr-0.5">trending_down</span>
                                -2% Last hr
                            </p>
                        </div>
                    </div>
                    <div className="h-[140px] w-full relative">
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                            <div className="border-t border-dashed border-gray-200 dark:border-white/10 w-full h-0"></div>
                            <div className="border-t border-dashed border-gray-200 dark:border-white/10 w-full h-0"></div>
                            <div className="border-t border-dashed border-gray-200 dark:border-white/10 w-full h-0"></div>
                        </div>
                        <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 50">
                            <defs>
                                <linearGradient id="gradientPick" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor="#ec1337" stopOpacity="0.3"></stop>
                                    <stop offset="100%" stopColor="#ec1337" stopOpacity="0"></stop>
                                </linearGradient>
                                <linearGradient id="gradientCollect" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3"></stop>
                                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"></stop>
                                </linearGradient>
                            </defs>
                            <path d="M0,40 Q10,38 20,35 T40,30 T60,32 T80,38 T100,42" fill="url(#gradientCollect)" stroke="none"></path>
                            <path d="M0,40 Q10,38 20,35 T40,30 T60,32 T80,38 T100,42" fill="none" stroke="#3b82f6" strokeLinecap="round" strokeWidth="2" vectorEffect="non-scaling-stroke"></path>
                            <path d="M0,35 Q10,30 20,25 T40,15 T60,18 T80,12 T100,10" fill="url(#gradientPick)" stroke="none"></path>
                            <path d="M0,35 Q10,30 20,25 T40,15 T60,18 T80,12 T100,10" fill="none" stroke="#ec1337" strokeLinecap="round" strokeWidth="2" vectorEffect="non-scaling-stroke"></path>
                        </svg>
                    </div>
                    <div className="flex justify-between mt-2 text-[10px] text-gray-400 uppercase font-semibold tracking-wider">
                        <span>10am</span>
                        <span>11am</span>
                        <span>12pm</span>
                        <span>1pm</span>
                        <span>Now</span>
                    </div>
                </div>
            </section>

            {/* Orchard Forecast */}
            <section className="flex flex-col gap-3">
                <h2 className="text-lg font-bold tracking-tight">Orchard Forecast</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 bg-white dark:bg-card-dark rounded-xl p-5 shadow-sm border border-gray-100 dark:border-white/5 flex items-center justify-between relative overflow-hidden">
                        <div className="z-10 flex flex-col gap-1">
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Daily Target (Tons)</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold dark:text-white text-gray-900">{currentTons.toFixed(1)}</span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">/ {targetTons.toFixed(1)}</span>
                            </div>
                            <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-bold w-fit">
                                {progressPercent}% Complete
                            </div>
                        </div>
                        <div className="relative w-24 h-24 flex items-center justify-center">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                <path className="text-gray-200 dark:text-white/10" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3"></path>
                                <path className="text-primary" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${progressPercent}, 100`} strokeLinecap="round" strokeWidth="3"></path>
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-[10px] text-gray-400 font-semibold uppercase">Rem</span>
                                <span className="text-sm font-bold">3h</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Teams Overview */}
            <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold tracking-tight">Teams Overview</h2>
                    <div className="flex gap-2 items-center">
                        <button onClick={() => setActiveTab('teams')} className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors mr-1">
                            View All Teams
                        </button>
                    </div>
                </div>
                <div className="-mx-4 px-4 overflow-x-auto hide-scrollbar pb-2">
                    <div className="flex gap-4 w-max">
                        {teamLeaders.length > 0 ? teamLeaders.map((tl, i) => (
                            <div key={tl.id || i} className="min-w-[200px] w-[200px] bg-white dark:bg-card-dark rounded-xl p-4 shadow-sm border border-gray-100 dark:border-white/5 flex flex-col gap-3 relative group">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-cover bg-center border-2 border-green-500" style={{ backgroundImage: `url('https://ui-avatars.com/api/?name=${tl.name}&background=random')` }}></div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{tl.name}</span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">Team {String.fromCharCode(65 + i)}</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-gray-500 dark:text-gray-400">Location</span>
                                        <span className="font-medium dark:text-gray-200">Block {i + 1}B</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-gray-500 dark:text-gray-400">Yield</span>
                                        <span className="font-medium dark:text-gray-200">{(Math.random() * 2).toFixed(1)} Tons</span>
                                    </div>
                                    <div className="pt-2 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Quality</span>
                                        <span className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded">95% (A)</span>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="p-4 text-sm text-gray-400">No active teams found.</div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );

    // View: Teams
    const TeamsView = () => {
        const [filterRole, setFilterRole] = useState<'all' | 'team_leader' | 'runner'>('all');
        const [searchQuery, setSearchQuery] = useState('');

        const filteredMembers = crew.filter(member => {
            const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                member.picker_id?.toLowerCase().includes(searchQuery.toLowerCase());

            if (!matchesSearch) return false;

            if (filterRole === 'team_leader') return member.role === 'team_leader' || member.role === Role.TEAM_LEADER;
            if (filterRole === 'runner') return member.role === 'runner' || member.role === Role.RUNNER;
            return true;
        });

        const sortedMembers = [...filteredMembers].sort((a, b) => (b.total_buckets_today || 0) - (a.total_buckets_today || 0));

        return (
            <div className="flex flex-col gap-6 p-4">
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-500 dark:text-gray-400">search</span>
                    <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white dark:bg-card-dark border border-gray-200 dark:border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder-gray-500 dark:placeholder-gray-500 dark:text-white shadow-sm transition-all"
                        placeholder="Search team or leader..."
                        type="text"
                    />
                </div>

                <div className="flex gap-2 mb-2 overflow-x-auto hide-scrollbar">
                    <button
                        onClick={() => setFilterRole('all')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${filterRole === 'all' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-white dark:bg-card-dark text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-white/5'}`}
                    >
                        All Members
                    </button>
                    <button
                        onClick={() => setFilterRole('team_leader')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${filterRole === 'team_leader' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-white dark:bg-card-dark text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-white/5'}`}
                    >
                        Team Leaders
                    </button>
                    <button
                        onClick={() => setFilterRole('runner')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${filterRole === 'runner' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-white dark:bg-card-dark text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-white/5'}`}
                    >
                        Bucket Runners
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-2">
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
                        <span className="material-symbols-outlined text-3xl mb-1">person_add</span>
                        <span className="text-xs font-bold uppercase">Add Runner</span>
                    </button>
                </div>

                <section className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold tracking-tight">Team Members</h2>
                        <span className="text-xs font-bold bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded text-gray-500 dark:text-gray-300">
                            {filteredMembers.length} Found
                        </span>
                    </div>
                    <div className="flex flex-col gap-3">
                        {sortedMembers.map((member, i) => (
                            <div
                                key={member.id || i}
                                onClick={() => setSelectedUser(member)}
                                className="bg-white dark:bg-card-dark rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-white/5 active:scale-[0.99] transition-transform cursor-pointer"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <div className="w-14 h-14 rounded-full bg-cover bg-center border-2 border-green-500 shadow-sm" style={{ backgroundImage: `url('https://ui-avatars.com/api/?name=${member.name}&background=random')` }}></div>
                                        <div className="absolute -bottom-1 -right-1 bg-gray-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-gray-700">
                                            {member.role === 'team_leader' || member.role === Role.TEAM_LEADER ? 'TL' : 'BR'}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">{member.name}</h3>
                                                <p className="text-xs font-medium text-primary mb-1 capitalize">{member.role?.replace('_', ' ') || 'Picker'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold leading-none dark:text-white">{member.total_buckets_today || 0} <span className="text-xs font-normal text-gray-500">bkts</span></p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between mt-1">
                                            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 gap-1">
                                                <span className="material-symbols-outlined text-[14px]">location_on</span>
                                                Row {member.row || '?'}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className={`w-2 h-2 rounded-full ${member.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                                                <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase">{member.status || 'Active'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {sortedMembers.length === 0 && (
                            <div className="text-center py-12 text-gray-400">
                                <span className="material-symbols-outlined text-4xl mb-2 opacity-50">search_off</span>
                                <p>No members found matching your filter.</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        );
    };

    // View: Logistics
    const LogisticsView = () => (
        <div className="flex flex-col gap-6 p-4">
            <section className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-card-dark rounded-xl p-4 shadow-sm border border-gray-100 dark:border-white/5 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <span className="material-symbols-outlined text-6xl text-primary">inventory_2</span>
                    </div>
                    <div className="relative z-10">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-1">Awaiting Pickup</p>
                        <div className="flex items-end gap-2">
                            <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{fullBins}</h3>
                            <span className="text-xs font-bold text-primary mb-1.5">Full Bins</span>
                        </div>
                        <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                            High Priority
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-card-dark rounded-xl p-4 shadow-sm border border-gray-100 dark:border-white/5 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <span className="material-symbols-outlined text-6xl text-green-500">check_box_outline_blank</span>
                    </div>
                    <div className="relative z-10">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-1">Empty Supply</p>
                        <div className="flex items-end gap-2">
                            <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{emptyBins}</h3>
                            <span className="text-xs font-bold text-green-500 mb-1.5">Bins</span>
                        </div>
                        <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                            Sufficient
                        </div>
                    </div>
                </div>
                <div className="col-span-2 bg-white dark:bg-card-dark rounded-xl p-4 shadow-sm border border-gray-100 dark:border-white/5">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-bold tracking-tight flex items-center gap-2">
                            <span className="material-symbols-outlined text-gray-400 text-lg">agriculture</span>
                            Tractor Fleet Status
                        </h2>
                        <span className="text-xs bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded text-gray-500 dark:text-gray-300">5 Total</span>
                    </div>
                    <div className="flex gap-2">
                        <div className="flex-1 bg-green-500/10 border border-green-500/20 rounded-lg p-2 flex flex-col items-center justify-center text-center">
                            <span className="text-xl font-bold text-green-600 dark:text-green-400">3</span>
                            <span className="text-[10px] uppercase font-bold text-green-600/70 dark:text-green-400/70">Active</span>
                        </div>
                        <div className="flex-1 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2 flex flex-col items-center justify-center text-center">
                            <span className="text-xl font-bold text-yellow-600 dark:text-yellow-400">1</span>
                            <span className="text-[10px] uppercase font-bold text-yellow-600/70 dark:text-yellow-400/70">Idle</span>
                        </div>
                        <div className="flex-1 bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 flex flex-col items-center justify-center text-center">
                            <span className="text-xl font-bold text-blue-600 dark:text-blue-400">1</span>
                            <span className="text-[10px] uppercase font-bold text-blue-600/70 dark:text-blue-400/70">Empty</span>
                        </div>
                    </div>
                </div>
            </section>

            <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold tracking-tight">Active Bucket Runners</h2>
                    <div className="flex gap-1">
                        <span className="text-xs font-semibold bg-primary text-white px-2 py-0.5 rounded-full">{activeRunners.length} Active</span>
                    </div>
                </div>
                <div className="flex flex-col gap-3">
                    {activeRunners.map((runner, i) => (
                        <div key={runner.id || i} className="bg-white dark:bg-card-dark rounded-xl p-3 shadow-sm border border-gray-100 dark:border-white/5 flex items-center gap-3">
                            <div className="relative">
                                <div className="w-12 h-12 rounded-full bg-cover bg-center border-2 border-green-500" style={{ backgroundImage: `url('https://ui-avatars.com/api/?name=${runner.name}&background=random')` }}></div>
                                <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-card-dark">100%</div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">{runner.name}</h3>
                                    <span className="text-xs font-mono text-gray-500 dark:text-gray-400">#{runner.picker_id}</span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Row {runner.row || '?'}</p>
                                <div className="mt-1.5 w-full bg-gray-200 dark:bg-white/10 rounded-full h-1.5">
                                    <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '85%' }}></div>
                                </div>
                            </div>
                            <button className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-500 hover:text-primary transition-colors">
                                <span className="material-symbols-outlined text-lg">chat</span>
                            </button>
                        </div>
                    ))}
                    {activeRunners.length === 0 && (
                        <div className="text-center text-sm text-gray-400 py-4">No active runners.</div>
                    )}
                </div>
            </section>

            <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold tracking-tight">Live Geo-Tracking</h2>
                    <button onClick={() => setActiveTab('map')} className="text-xs text-primary font-medium hover:text-primary/80 transition-colors">Expand Map</button>
                </div>
                <div className="w-full h-48 bg-card-dark rounded-xl overflow-hidden relative border border-white/5">
                    <div className="absolute inset-0 bg-[#2b2b2b]">
                        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#444 1px, transparent 1px)', backgroundSize: '20px 20px', opacity: 0.5 }}></div>
                        <div className="absolute top-[20%] left-0 right-0 h-px bg-white/5"></div>
                        <div className="absolute top-[40%] left-0 right-0 h-px bg-white/5"></div>
                        <div className="absolute top-[60%] left-0 right-0 h-px bg-white/5"></div>
                        <div className="absolute top-[80%] left-0 right-0 h-px bg-white/5"></div>
                        <div className="absolute top-[10%] left-[10%] w-[80%] h-[80%] border-2 border-dashed border-white/10 rounded-lg"></div>
                    </div>
                    {/* Mock map markers */}
                    <div className="absolute top-[35%] left-[45%] flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2">
                        <div className="w-6 h-6 bg-blue-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center z-10">
                            <span className="material-symbols-outlined text-[12px] text-white">agriculture</span>
                        </div>
                        <span className="text-[9px] font-bold text-white bg-black/50 px-1 rounded mt-0.5 backdrop-blur-sm">T-01</span>
                    </div>
                    <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] text-gray-300 border border-white/10">
                        Block 4 • Sector C
                    </div>
                </div>
            </section>
        </div>
    );

    // View: Messaging
    const MessagingView = () => (
        <div className="flex flex-col gap-4 p-4">
            <div className="bg-gray-200 dark:bg-card-dark p-1 rounded-xl flex items-center text-sm font-medium">
                <button className="flex-1 py-2 rounded-lg bg-white dark:bg-primary text-gray-900 dark:text-white shadow-sm transition-all text-center">
                    Groups
                </button>
                <button className="flex-1 py-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-all text-center">
                    Direct
                </button>
            </div>
            <section>
                <div className="bg-gradient-to-r from-cherry-dark to-card-dark rounded-2xl p-0.5 shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl rounded-full -mr-10 -mt-10"></div>
                    <div className="bg-card-dark rounded-[14px] p-4 relative z-10">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shadow-lg shadow-red-900/50">
                                    <span className="material-symbols-outlined filled">campaign</span>
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white leading-none">Manager Broadcast</h3>
                                    <span className="text-xs text-primary font-medium">Official Channel • All Teams</span>
                                </div>
                            </div>
                            <span className="text-[10px] text-gray-400 font-medium bg-white/5 px-2 py-1 rounded-full">12m ago</span>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                            <p className="text-sm text-gray-200 leading-snug">
                                <span className="text-primary font-bold">@All</span> Weather alert: Heavy rain expected at 15:00. Please ensure all picked buckets are covered and runners are prioritized for Block 4.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="flex flex-col gap-2">
                <h2 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1 mt-2">Active Conversations</h2>
                {/* Static placeholders for visual fidelity */}
                <div className="bg-white dark:bg-card-dark active:scale-[0.98] transition-transform rounded-xl p-4 shadow-sm border border-gray-100 dark:border-white/5 flex gap-4 relative">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-lg font-bold text-white border-2 border-transparent group-hover:border-primary transition-colors">
                            TA
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 bg-green-500 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-card-dark"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">Team Alpha</h3>
                            <span className="text-xs text-gray-400 font-medium whitespace-nowrap">2m ago</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                            <span className="material-symbols-outlined text-[16px] text-primary">image</span>
                            <span className="text-xs truncate font-medium dark:text-gray-300">Sarah: Found split fruit in Row 12...</span>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );

    // View: Map
    const MapView = () => {
        // Prepare mock rows 1-20
        const rows = Array.from({ length: 20 }, (_, i) => i + 1);

        // Group active runners by row
        const runnersByRow = activeRunners.reduce((acc, runner) => {
            const r = parseInt(runner.row?.toString() || '0');
            if (r > 0) {
                if (!acc[r]) acc[r] = [];
                acc[r].push(runner);
            }
            return acc;
        }, {} as Record<number, typeof activeRunners>);

        // Calculate buckets per row (mocked somewhat based on runners present + randomness for fidelity)
        // In real app, this would come from a `row_stats` endpoint
        const getBucketsForRow = (r: number) => {
            const runners = runnersByRow[r] || [];
            if (runners.length === 0) return 0;
            return runners.reduce((sum, runner) => sum + (runner.total_buckets_today || 0), 0);
        }

        return (
            <div className="flex flex-col h-full bg-[#1e1e1e] relative min-h-screen">
                {/* Map Header */}
                <div className="sticky top-0 z-50 bg-[#2b2b2b]/90 backdrop-blur-md p-4 border-b border-white/10 flex items-center justify-between shadow-xl">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2 rounded-lg">
                            <span className="material-symbols-outlined text-white">map</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white leading-none">Orchard Overview</h2>
                            <p className="text-xs text-gray-400">Block 4 • 20 Rows</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setActiveTab('logistics')}
                        className="bg-white/10 hover:bg-white/20 p-2 rounded-lg text-white transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Map Grid */}
                <div className="flex-1 overflow-y-auto p-4 pb-32">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {rows.map(rowNum => {
                            const runnersInRow = runnersByRow[rowNum] || [];
                            const bucketCount = getBucketsForRow(rowNum);
                            const hasActivity = runnersInRow.length > 0;

                            return (
                                <div
                                    key={rowNum}
                                    className={`relative rounded-xl p-3 border transition-all ${hasActivity
                                        ? 'bg-[#2a2a2a] border-primary/50 shadow-[0_0_15px_rgba(236,19,55,0.15)]'
                                        : 'bg-[#252525] border-white/5 opacity-80'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${hasActivity ? 'bg-primary text-white' : 'bg-white/10 text-gray-400'}`}>
                                                R{rowNum}
                                            </span>
                                            {hasActivity && <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>}
                                        </div>
                                        <div className="text-right">
                                            <span className={`block text-lg font-bold leading-none ${hasActivity ? 'text-white' : 'text-gray-500'}`}>
                                                {bucketCount}
                                            </span>
                                            <span className="text-[9px] uppercase text-gray-500 font-bold">Buckets</span>
                                        </div>
                                    </div>

                                    {/* Runners in this row */}
                                    <div className="space-y-1.5 min-h-[40px]">
                                        {runnersInRow.length > 0 ? (
                                            runnersInRow.map((r, idx) => (
                                                <div key={idx} className="flex items-center gap-2 bg-black/40 rounded-lg p-1.5 border border-white/5">
                                                    <div className="w-5 h-5 rounded-full bg-cover bg-center border border-white/20" style={{ backgroundImage: `url('https://ui-avatars.com/api/?name=${r.name}&background=random')` }}></div>
                                                    <span className="text-[10px] text-gray-300 font-bold truncate max-w-[80px]">{r.name}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="h-full flex items-center justify-center opacity-20">
                                                <span className="material-symbols-outlined text-2xl text-gray-500">nature</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Map Legend/Controls */}
                <div className="fixed bottom-6 left-4 right-4 bg-[#1e1e1e]/95 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-2xl z-40">
                    <div className="flex justify-between items-center text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                        <span>Map Legend</span>
                        <span>{activeRunners.length} Runners Active</span>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded bg-primary"></span>
                            <span className="text-white">Active Row</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded bg-[#252525] border border-white/20"></span>
                            <span className="text-gray-400">Empty Row</span>
                        </div>
                        <div className="flex items-center gap-2 ml-auto">
                            <span className="material-symbols-outlined text-green-500 text-sm">circle</span>
                            <span className="text-white">User</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };


    return (
        <div className="bg-background-light dark:bg-background-dark min-h-screen text-gray-900 dark:text-white pb-24 font-sans flex flex-col">
            {/* HEADER */}
            <div className={`sticky top-0 z-40 bg-background-light dark:bg-background-dark/95 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b dark:border-white/10 ${activeTab === 'map' ? 'hidden' : ''}`}>
                <div className="flex items-center gap-3">
                    <div className="bg-primary/20 p-2 rounded-lg text-primary">
                        <span className="material-symbols-outlined">
                            {activeTab === 'dashboard' ? 'agriculture' : activeTab === 'teams' ? 'groups' : activeTab === 'logistics' ? 'local_shipping' : 'forum'}
                        </span>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold leading-tight capitalize">{activeTab === 'dashboard' ? 'Command Center' : activeTab}</h1>
                        <div className="flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Live Sync • Central Otago</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                        <span className="text-sm font-bold">24°C</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Sunny</span>
                    </div>
                    <button
                        onClick={() => setShowSettings(true)}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors"
                    >
                        <span className="material-symbols-outlined">settings</span>
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <main className="flex-1 relative">
                {activeTab === 'dashboard' && <DashboardView />}
                {activeTab === 'teams' && <TeamsView />}
                {activeTab === 'logistics' && <LogisticsView />}
                {activeTab === 'messaging' && <MessagingView />}
                {activeTab === 'map' && <MapView />}
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

            {/* NAVIGATION BAR */}
            <nav className={`fixed bottom-0 left-0 w-full bg-white dark:bg-card-dark border-t border-gray-200 dark:border-white/10 pb-6 pt-3 px-6 z-50 ${activeTab === 'map' ? 'hidden' : ''}`}>
                <ul className="flex justify-between items-center">
                    {(['dashboard', 'teams', 'logistics', 'messaging'] as Tab[]).map(tab => (
                        <li key={tab}>
                            <button
                                onClick={() => setActiveTab(tab)}
                                className={`flex flex-col items-center gap-1 transition-all group ${activeTab === tab ? 'text-primary' : 'text-gray-400 hover:text-gray-200'}`}
                            >
                                <div className="relative">
                                    <span className={`material-symbols-outlined group-active:scale-95 transition-transform ${activeTab === tab ? 'filled' : ''}`}>
                                        {tab === 'dashboard' ? 'dashboard' : tab === 'teams' ? 'groups' : tab === 'logistics' ? 'local_shipping' : 'chat'}
                                    </span>
                                    {tab === 'messaging' && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full border-2 border-white dark:border-card-dark"></span>}
                                </div>
                                <span className="text-[10px] font-medium capitalize">{tab}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* BROADCAST FLOATING BUTTON (Visible on all tabs except map) */}
            {activeTab !== 'map' && (
                <div className="fixed bottom-24 right-4 z-40">
                    <button className="bg-primary hover:bg-red-600 text-white shadow-lg shadow-red-900/40 rounded-full h-14 px-6 flex items-center justify-center gap-2 transition-all active:scale-95">
                        <span className="material-symbols-outlined">campaign</span>
                        <span className="font-bold tracking-wide">Broadcast</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default Manager;
