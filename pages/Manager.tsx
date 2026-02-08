/**
 * MANAGER.TSX - High Fidelity Command Center
 * Integrates Dashboard, Teams, Logistics, Messaging, Map, and Management Modals.
 * Refactored to use modular components in components/views/manager/.
 */
import React, { useState } from 'react';
import { useHarvest } from '../context/HarvestContext';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';

// New Modular Views
import DashboardView from '../components/views/manager/DashboardView';
import TeamsView from '../components/views/manager/TeamsView';
import LogisticsView from '../components/views/manager/LogisticsView';
import MessagingView from '../components/views/manager/MessagingView';
import RowListView from '../components/views/manager/RowListView';
import HeatMapView from '../components/views/manager/HeatMapView';
import RowAssignmentModal from '../components/views/manager/RowAssignmentModal';
import Header from '../components/manager/Header';
import BroadcastModal from '../components/modals/BroadcastModal';

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
        removePicker,
        bucketRecords, // Real-time data for HeatMap
        currentUser // <--- Added currentUser
    } = useHarvest();

    // Optimize Heatmap Performance: Filter for today only
    const filteredBucketRecords = React.useMemo(() => {
        if (!bucketRecords) return [];
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        return bucketRecords.filter(r => new Date(r.scanned_at).getTime() >= startOfDay.getTime());
    }, [bucketRecords]);

    const [activeTab, setActiveTab] = useState<Tab>('dashboard');

    // Modal States
    const [showSettings, setShowSettings] = useState(false);
    const [showAddUser, setShowAddUser] = useState(false);
    const [showAssignment, setShowAssignment] = useState<{ show: boolean, row: number }>({ show: false, row: 1 });
    const [selectedUser, setSelectedUser] = useState<any>(null);

    // Derived Data
    const activeRunners = crew.filter(p => p.role === 'runner' || p.role === Role.RUNNER);
    const teamLeaders = crew.filter(p => p.role === 'team_leader' || p.role === Role.TEAM_LEADER);
    const fullBins = inventory.filter(b => b.status === 'full').length;
    const emptyBins = inventory.filter(b => b.status === 'empty').length;


    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return (
                    <DashboardView
                        stats={stats}
                        teamLeaders={teamLeaders}
                        crew={crew} // Passed for real count
                        setActiveTab={setActiveTab}
                        bucketRecords={filteredBucketRecords} // Now passing real data
                        onUserSelect={(user) => {
                            const fullUser = crew.find(p => p.id === user.id || p.picker_id === user.picker_id) || user;
                            setSelectedUser(fullUser);
                        }}
                    />
                );
            case 'teams':
                return (
                    <TeamsView
                        crew={crew}
                        setShowAddUser={setShowAddUser}
                        setSelectedUser={setSelectedUser}
                        settings={settings}
                    />
                );
            case 'logistics':
                return (
                    <LogisticsView
                        fullBins={fullBins}
                        emptyBins={emptyBins}
                        activeRunners={activeRunners}
                        setActiveTab={setActiveTab}
                        onRequestPickup={() => handleBroadcast(
                            '🚜 Pickup Requested',
                            'A logistics pickup has been requested at the loading zone.',
                            'urgent'
                        )}
                    />
                );
            case 'messaging':
                return <MessagingView />;
            case 'map':
                return (
                    <div className="flex flex-col h-full bg-[#050505] tech-grid">
                        {/* 1. SPATIAL VISUALIZATION (HeatMap) - Blueprint Tech Style */}
                        <div className="w-full shrink-0 h-[40vh] min-h-[300px] border-b border-[#00f0ff]/20 relative z-10 bg-[#050505]">
                            <HeatMapView
                                bucketRecords={filteredBucketRecords || []}
                                crew={crew}
                                blockName={orchard?.id ? 'LIVE.OVERVIEW' : 'BLOCK.CENTRAL'}
                                rows={orchard?.total_rows || 20}
                                onRowClick={(row) => setShowAssignment({ show: true, row })}
                            />
                        </div>

                        {/* 2. DETAILED CONTROL (Row List) - System Listing Style */}
                        <div className="flex-1 overflow-y-auto bg-[#050505]">
                            <RowListView
                                runners={activeRunners}
                                setActiveTab={setActiveTab}
                                onRowClick={(row) => setShowAssignment({ show: true, row })}
                            />
                        </div>
                    </div>
                );
            default:
                return <DashboardView stats={stats} teamLeaders={teamLeaders} crew={crew} setActiveTab={setActiveTab} />;
        }
    };


    // Messaging Integration
    const [showBroadcast, setShowBroadcast] = useState(false);

    const handleBroadcast = async (title: string, message: string, priority: 'normal' | 'high' | 'urgent') => {
        await useHarvest().sendBroadcast?.(title, message, priority);

        // Toast Logic: Count active users in last 4 hours
        const fourHoursAgo = Date.now() - (4 * 60 * 60 * 1000);
        const activeCount = crew.filter(p => {
            // Check if user has logs in local bucketRecords or implicitly via last_active if available
            // For now, using bucketRecords which we have in context
            return bucketRecords?.some(r =>
                (r.picker_id === p.id || r.picker_id === p.picker_id) &&
                new Date(r.created_at || r.scanned_at).getTime() > fourHoursAgo
            );
        }).length;

        // Fallback if no records found (e.g. just started day), show total crew
        const recipientCount = activeCount > 0 ? activeCount : crew.length;

        console.log(`[Manager] Broadcast sent to ${recipientCount} active members: ${title}`);
        setShowBroadcast(false);
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-black min-h-screen text-gray-900 pb-20">
            {/* HEADER */}
            {activeTab !== 'map' && (
                <Header
                    user={currentUser}
                    toggleSettings={() => setShowSettings(true)}
                    activeTab={activeTab}
                />
            )}

            {/* DYNAMIC CONTENT */}
            <main className="flex-1 overflow-y-auto">
                {renderContent()}
            </main>

            {/* MODALS */}
            {showSettings && (
                <SettingsModal
                    onClose={() => setShowSettings(false)}
                    settings={settings || {}}
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
            {showBroadcast && (
                <BroadcastModal
                    onClose={() => setShowBroadcast(false)}
                    onSend={handleBroadcast}
                />
            )}

            {/* Assignment Modal */}
            {showAssignment.show && (
                <RowAssignmentModal
                    initialRow={showAssignment.row}
                    onClose={() => setShowAssignment({ show: false, row: 1 })}
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
            <nav className="fixed bottom-0 left-0 w-full bg-white dark:bg-card-dark border-t border-gray-200 dark:border-white/10 pb-6 pt-3 px-6 z-50">
                <ul className="flex justify-between items-center">
                    {(['dashboard', 'teams', 'logistics', 'messaging', 'map'] as Tab[]).map(tab => (
                        <li key={tab}>
                            <button
                                onClick={() => setActiveTab(tab)}
                                className={`flex flex-col items-center gap-1 transition-all group ${activeTab === tab ? 'text-primary' : 'text-gray-400 hover:text-gray-200'}`}
                            >
                                <div className="relative">
                                    <span className={`material-symbols-outlined group-active:scale-95 transition-transform ${activeTab === tab ? 'filled' : ''}`}>
                                        {tab === 'dashboard' ? 'dashboard' : tab === 'teams' ? 'groups' : tab === 'logistics' ? 'local_shipping' : tab === 'map' ? 'list_alt' : 'chat'}
                                    </span>
                                    {tab === 'messaging' && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full border-2 border-white dark:border-card-dark"></span>}
                                </div>
                                <span className="text-[10px] font-medium capitalize">{tab === 'map' ? 'Rows' : tab}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* BROADCAST FLOATING BUTTON (Visible on all tabs except map, assuming mostly wanted elsewhere) */}
            {activeTab !== 'map' && activeTab !== 'messaging' && (
                <div className="fixed bottom-24 right-4 z-40">
                    <button
                        onClick={() => setShowBroadcast(true)}
                        className="bg-primary hover:bg-red-600 text-white shadow-lg shadow-red-900/40 rounded-full h-14 px-6 flex items-center justify-center gap-2 transition-all active:scale-95">
                        <span className="material-symbols-outlined">campaign</span>
                        <span className="font-bold tracking-wide">Broadcast</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default Manager;
