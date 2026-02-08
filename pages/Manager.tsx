/**
 * MANAGER.TSX - Command Center Phase 2
 * Map-Centric Interface with FAB Navigation
 * Full-screen HeatMap as primary view, Bottom Sheets for other views
 */
import React, { useState, useMemo } from 'react';
import { useHarvest } from '../context/HarvestContext';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';

// View Components
import DashboardView from '../components/views/manager/DashboardView';
import TeamsView from '../components/views/manager/TeamsView';
import LogisticsView from '../components/views/manager/LogisticsView';
import MessagingView from '../components/views/manager/MessagingView';
import HeatMapView from '../components/views/manager/HeatMapView';
import RowAssignmentModal from '../components/views/manager/RowAssignmentModal';
import RowDetailDrawer from '../components/manager/RowDetailDrawer';
import Header from '../components/manager/Header';
import BroadcastModal from '../components/modals/BroadcastModal';

// Bottom Sheet View Type
type SheetView = 'dashboard' | 'teams' | 'messaging' | null;

// ==========================================
// SETTINGS MODAL (Preserved from original)
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
            <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl relative animate-in slide-in-from-bottom duration-300">
                <button onClick={onClose} className="absolute right-6 top-6 text-gray-400 hover:text-gray-900 transition-colors">
                    <span className="material-symbols-outlined">close</span>
                </button>
                <h2 className="text-2xl font-black text-gray-900 mb-1">Configurar Día</h2>
                <p className="text-sm text-gray-500 mb-6">Parámetros y objetivos diarios.</p>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 uppercase">Hora Inicio</label>
                            <input
                                type="time" name="startTime" value={formData.startTime} onChange={handleChange}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-bold outline-none focus:ring-2 focus:ring-emerald-500/50"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 uppercase">Variedad</label>
                            <select
                                name="variety" value={formData.variety} onChange={handleChange}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-bold outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none"
                            >
                                <option>Lapins</option>
                                <option>Stella</option>
                                <option>Sweetheart</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 uppercase">Precio Cubo ($)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                                <input
                                    type="number" name="pieceRate" value={formData.pieceRate} onChange={handleChange}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-4 py-3 text-gray-900 font-bold outline-none focus:ring-2 focus:ring-emerald-500/50"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 uppercase">Meta (Tons)</label>
                            <input
                                type="number" name="targetTons" value={formData.targetTons} onChange={handleChange}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-bold outline-none focus:ring-2 focus:ring-emerald-500/50"
                            />
                        </div>
                    </div>
                </div>
                <button onClick={handleSave} className="w-full mt-8 py-4 bg-emerald-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-emerald-500/30 active:scale-[0.98] transition-all">
                    Guardar Configuración
                </button>
            </div>
        </div>
    );
};

// ==========================================
// USER DETAIL MODAL (Preserved from original)
// ==========================================
const UserDetailModal = ({ user, onClose, onDelete }: any) => {
    if (!user) return null;
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative">
                <button onClick={onClose} className="absolute right-4 top-4 text-gray-400">
                    <span className="material-symbols-outlined">close</span>
                </button>
                <div className="flex flex-col items-center mb-6">
                    <div className="w-20 h-20 rounded-full border-4 border-gray-100 overflow-hidden mb-3">
                        <img src={`https://ui-avatars.com/api/?name=${user.name}&background=random`} alt={user.name} className="w-full h-full object-cover" />
                    </div>
                    <h2 className="text-xl font-black">{user.name}</h2>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{user.role || 'Picker'}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-gray-50 p-3 rounded-xl text-center">
                        <span className="block text-2xl font-black text-emerald-600">{user.total_buckets_today || 0}</span>
                        <span className="text-[10px] text-gray-500 uppercase font-bold">Cubos</span>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl text-center">
                        <span className="block text-2xl font-black text-blue-500">{user.current_row || '--'}</span>
                        <span className="text-[10px] text-gray-500 uppercase font-bold">Fila Actual</span>
                    </div>
                </div>
                <button
                    onClick={() => {
                        if (confirm('¿Eliminar trabajador?')) {
                            onDelete(user.id || user.picker_id);
                            onClose();
                        }
                    }}
                    className="w-full py-3 bg-red-50 text-red-600 border border-red-100 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
                >
                    <span className="material-symbols-outlined text-lg">delete</span>
                    Eliminar del Equipo
                </button>
            </div>
        </div>
    );
};

// ==========================================
// BOTTOM SHEET COMPONENT
// ==========================================
const BottomSheet = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) => {
    if (!isOpen) return null;
    return (
        <>
            <div className="fixed inset-0 bg-black/50 z-40 animate-in fade-in duration-200" onClick={onClose} />
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                    <h2 className="text-xl font-black text-slate-900">{title}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {children}
                </div>
            </div>
        </>
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
        bucketRecords,
        currentUser,
        sendBroadcast
    } = useHarvest();

    // Filter bucket records for today
    const filteredBucketRecords = useMemo(() => {
        if (!bucketRecords) return [];
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        return bucketRecords.filter(r => new Date(r.scanned_at).getTime() >= startOfDay.getTime());
    }, [bucketRecords]);

    // Modal States
    const [showSettings, setShowSettings] = useState(false);
    const [showBroadcast, setShowBroadcast] = useState(false);
    const [showAssignment, setShowAssignment] = useState<{ show: boolean, row: number }>({ show: false, row: 1 });
    const [selectedUser, setSelectedUser] = useState<any>(null);

    // Bottom Sheet State
    const [activeSheet, setActiveSheet] = useState<SheetView>(null);

    // Row Detail Drawer State
    const [selectedRow, setSelectedRow] = useState<{ rowNumber: number; buckets: number } | null>(null);

    // Derived Data
    const activeRunners = crew.filter(p => p.role === 'runner' || p.role === Role.RUNNER);
    const teamLeaders = crew.filter(p => p.role === 'team_leader' || p.role === Role.TEAM_LEADER);

    // Get workers for selected row
    const workersInSelectedRow = useMemo(() => {
        if (!selectedRow) return [];
        return crew.filter(p => p.current_row === selectedRow.rowNumber);
    }, [selectedRow, crew]);

    // Calculate row data for drawer
    const rowData = useMemo(() => {
        const counts: Record<number, number> = {};
        filteredBucketRecords.forEach(r => {
            const rowNum = r.row_number || 0;
            if (rowNum > 0) counts[rowNum] = (counts[rowNum] || 0) + 1;
        });
        return counts;
    }, [filteredBucketRecords]);

    // Handle row click from HeatMap
    const handleRowClick = (rowNumber: number) => {
        setSelectedRow({
            rowNumber,
            buckets: rowData[rowNumber] || 0
        });
    };

    // Handle broadcast
    const handleBroadcast = async (title: string, message: string, priority: 'normal' | 'high' | 'urgent') => {
        await sendBroadcast?.(title, message, priority);
        const activeCount = crew.filter(p => {
            return bucketRecords?.some(r =>
                (r.picker_id === p.id || r.picker_id === p.picker_id) &&
                new Date(r.created_at || r.scanned_at).getTime() > Date.now() - (4 * 60 * 60 * 1000)
            );
        }).length;
        console.log(`[Manager] Broadcast enviado a ${activeCount || crew.length} miembros: ${title}`);
        setShowBroadcast(false);
    };

    return (
        <div className="flex flex-col h-screen bg-slate-50 text-gray-900 overflow-hidden">
            {/* COMPACT HEADER */}
            <header className="shrink-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between z-30">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-black text-sm">
                        {currentUser?.name?.substring(0, 2).toUpperCase() || 'MG'}
                    </div>
                    <div>
                        <h1 className="font-black text-slate-900 text-sm">{orchard?.name || 'Central Block'}</h1>
                        <p className="text-xs text-slate-500 font-medium">
                            <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full mr-1 animate-pulse" />
                            En vivo • {filteredBucketRecords.length} scans
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowSettings(true)}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <span className="material-symbols-outlined">settings</span>
                </button>
            </header>

            {/* FULLSCREEN HEATMAP */}
            <main className="flex-1 relative overflow-hidden">
                <HeatMapView
                    bucketRecords={filteredBucketRecords}
                    crew={crew}
                    blockName={orchard?.name || 'Central Block'}
                    rows={orchard?.total_rows || 20}
                    onRowClick={handleRowClick}
                />
            </main>

            {/* FAB NAVIGATION (Bottom Right) */}
            <div className="fixed bottom-6 right-4 z-30 flex flex-col gap-3">
                {/* Broadcast FAB */}
                <button
                    onClick={() => setShowBroadcast(true)}
                    className="w-14 h-14 bg-red-500 text-white rounded-full shadow-lg shadow-red-500/40 flex items-center justify-center active:scale-95 transition-all"
                    title="Emitir Mensaje"
                >
                    <span className="material-symbols-outlined">campaign</span>
                </button>

                {/* Dashboard FAB */}
                <button
                    onClick={() => setActiveSheet('dashboard')}
                    className="w-14 h-14 bg-white text-slate-700 border border-slate-200 rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-all hover:bg-slate-50"
                    title="Dashboard"
                >
                    <span className="material-symbols-outlined">dashboard</span>
                </button>

                {/* Teams FAB */}
                <button
                    onClick={() => setActiveSheet('teams')}
                    className="w-14 h-14 bg-white text-slate-700 border border-slate-200 rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-all hover:bg-slate-50"
                    title="Equipos"
                >
                    <span className="material-symbols-outlined">groups</span>
                </button>

                {/* Messaging FAB */}
                <button
                    onClick={() => setActiveSheet('messaging')}
                    className="w-14 h-14 bg-white text-slate-700 border border-slate-200 rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-all hover:bg-slate-50 relative"
                    title="Mensajes"
                >
                    <span className="material-symbols-outlined">chat</span>
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
                </button>
            </div>

            {/* QUICK STATS (Bottom Left) */}
            <div className="fixed bottom-6 left-4 z-30 bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 p-3 flex gap-4">
                <div className="text-center">
                    <span className="block text-lg font-black text-emerald-600">{stats?.totalBuckets || 0}</span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Cubos</span>
                </div>
                <div className="w-px bg-slate-200" />
                <div className="text-center">
                    <span className="block text-lg font-black text-slate-700">{crew.length}</span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Equipo</span>
                </div>
                <div className="w-px bg-slate-200" />
                <div className="text-center">
                    <span className="block text-lg font-black text-blue-600">{stats?.velocity || 0}</span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Vel/H</span>
                </div>
            </div>

            {/* ROW DETAIL DRAWER */}
            <RowDetailDrawer
                isOpen={selectedRow !== null}
                rowNumber={selectedRow?.rowNumber || 0}
                buckets={selectedRow?.buckets || 0}
                workers={workersInSelectedRow}
                onClose={() => setSelectedRow(null)}
                onReassign={() => {
                    setShowAssignment({ show: true, row: selectedRow?.rowNumber || 1 });
                    setSelectedRow(null);
                }}
                onMessage={(leaderId) => {
                    console.log(`[Manager] Abrir chat con líder: ${leaderId}`);
                    setActiveSheet('messaging');
                    setSelectedRow(null);
                }}
            />

            {/* BOTTOM SHEETS */}
            <BottomSheet isOpen={activeSheet === 'dashboard'} onClose={() => setActiveSheet(null)} title="Dashboard">
                <DashboardView
                    stats={stats}
                    teamLeaders={teamLeaders}
                    crew={crew}
                    setActiveTab={() => { }}
                    bucketRecords={filteredBucketRecords}
                    onUserSelect={(user) => {
                        const fullUser = crew.find(p => p.id === user.id || p.picker_id === user.picker_id) || user;
                        setSelectedUser(fullUser);
                    }}
                />
            </BottomSheet>

            <BottomSheet isOpen={activeSheet === 'teams'} onClose={() => setActiveSheet(null)} title="Equipos">
                <TeamsView
                    crew={crew}
                    setShowAddUser={() => { }}
                    setSelectedUser={setSelectedUser}
                    settings={settings}
                />
            </BottomSheet>

            <BottomSheet isOpen={activeSheet === 'messaging'} onClose={() => setActiveSheet(null)} title="Mensajería">
                <MessagingView />
            </BottomSheet>

            {/* MODALS */}
            {showSettings && (
                <SettingsModal
                    onClose={() => setShowSettings(false)}
                    settings={settings || {}}
                    onUpdate={updateSettings}
                    currentOrchard={orchard}
                />
            )}

            {showBroadcast && (
                <BroadcastModal
                    onClose={() => setShowBroadcast(false)}
                    onSend={handleBroadcast}
                />
            )}

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
        </div>
    );
};

export default Manager;
