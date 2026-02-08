/**
 * MANAGER.TSX - Blueprint Command Center
 * Cyber Blueprint aesthetic with HUD elements
 * Data visualization optimized for field conditions
 */
import React, { useState, useMemo, useEffect } from 'react';
import { useHarvest } from '../context/HarvestContext';
import { Role } from '../types';

// View Components
import DashboardView from '../components/views/manager/DashboardView';
import TeamsView from '../components/views/manager/TeamsView';
import MessagingView from '../components/views/manager/MessagingView';
import HeatMapView from '../components/views/manager/HeatMapView';
import RowAssignmentModal from '../components/views/manager/RowAssignmentModal';
import RowDetailDrawer from '../components/manager/RowDetailDrawer';
import BroadcastModal from '../components/modals/BroadcastModal';

type SheetView = 'dashboard' | 'teams' | 'messaging' | null;

// ==========================================
// HUD HEADER COMPONENT
// ==========================================
const HudHeader = ({
    orchardName,
    scanCount,
    efficiency,
    targetProgress,
    onSettings
}: {
    orchardName: string;
    scanCount: number;
    efficiency: number;
    targetProgress: number;
    onSettings: () => void;
}) => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <header className="shrink-0 blueprint-bg border-b border-[var(--blueprint-accent)]/20 px-4 py-3 z-30">
            {/* Top Row: Time & Coordinates */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                    <span className="blueprint-mono text-[var(--blueprint-accent)] text-xs font-bold">
                        {time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <span className="blueprint-mono text-[var(--blueprint-muted)] text-xs">
                        LAT -39.4853 | LON 176.9120
                    </span>
                </div>
                <button onClick={onSettings} className="text-[var(--blueprint-muted)] hover:text-[var(--blueprint-accent)] transition-colors">
                    <span className="material-symbols-outlined text-xl">settings</span>
                </button>
            </div>

            {/* Main Row: Block Name & Stats */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="blueprint-mono text-[var(--blueprint-text)] font-bold text-lg tracking-wider uppercase">
                        {orchardName}
                    </h1>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="w-2 h-2 rounded-full bg-[var(--blueprint-accent)] neon-pulse" />
                        <span className="blueprint-mono text-[var(--blueprint-accent)] text-xs">
                            LIVE • {scanCount} SCANS
                        </span>
                    </div>
                </div>

                {/* Efficiency Gauge */}
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <span className="blueprint-mono text-[var(--blueprint-warning)] text-xl font-bold neon-text">
                            {efficiency}%
                        </span>
                        <span className="block blueprint-mono text-[var(--blueprint-muted)] text-[10px] uppercase">
                            Eficiencia
                        </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-24 h-2 bg-[var(--blueprint-grid)] rounded-full overflow-hidden">
                        <div
                            className="h-full bg-[var(--blueprint-accent)] neon-glow transition-all duration-500"
                            style={{ width: `${Math.min(targetProgress, 100)}%` }}
                        />
                    </div>
                </div>
            </div>
        </header>
    );
};

// ==========================================
// SETTINGS MODAL (Blueprint Theme)
// ==========================================
const SettingsModal = ({ onClose, settings, onUpdate, currentOrchard }: any) => {
    const [formData, setFormData] = useState({
        targetTons: settings?.target_tons || 40,
        pieceRate: settings?.piece_rate || 6.50
    });

    const handleSave = () => {
        onUpdate({
            ...settings,
            target_tons: parseFloat(formData.targetTons.toString()),
            piece_rate: parseFloat(formData.pieceRate.toString())
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="blueprint-bg border border-[var(--blueprint-accent)]/30 w-full max-w-sm rounded-xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="blueprint-mono text-[var(--blueprint-text)] font-bold text-lg uppercase tracking-wider">
                        Configuración
                    </h2>
                    <button onClick={onClose} className="text-[var(--blueprint-muted)] hover:text-[var(--blueprint-accent)]">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="blueprint-mono text-[var(--blueprint-muted)] text-xs uppercase block mb-2">
                            Precio Cubo ($)
                        </label>
                        <input
                            type="number"
                            value={formData.pieceRate}
                            onChange={(e) => setFormData(p => ({ ...p, pieceRate: e.target.value }))}
                            className="w-full bg-[var(--blueprint-grid)] border border-[var(--blueprint-accent)]/20 rounded-lg px-4 py-3 text-[var(--blueprint-text)] blueprint-mono focus:border-[var(--blueprint-accent)] outline-none"
                        />
                    </div>
                    <div>
                        <label className="blueprint-mono text-[var(--blueprint-muted)] text-xs uppercase block mb-2">
                            Meta (Tons)
                        </label>
                        <input
                            type="number"
                            value={formData.targetTons}
                            onChange={(e) => setFormData(p => ({ ...p, targetTons: e.target.value }))}
                            className="w-full bg-[var(--blueprint-grid)] border border-[var(--blueprint-accent)]/20 rounded-lg px-4 py-3 text-[var(--blueprint-text)] blueprint-mono focus:border-[var(--blueprint-accent)] outline-none"
                        />
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    className="w-full mt-6 py-3 bg-[var(--blueprint-accent)] text-black rounded-lg font-bold uppercase tracking-wide neon-glow active:scale-[0.98] transition-all"
                >
                    Guardar
                </button>
            </div>
        </div>
    );
};

// ==========================================
// BOTTOM SHEET (Blueprint Theme)
// ==========================================
const BottomSheet = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) => {
    if (!isOpen) return null;
    return (
        <>
            <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
            <div className="fixed bottom-0 left-0 right-0 z-50 blueprint-bg border-t border-[var(--blueprint-accent)]/30 rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--blueprint-accent)]/20 shrink-0">
                    <h2 className="blueprint-mono text-[var(--blueprint-text)] font-bold uppercase tracking-wider">{title}</h2>
                    <button onClick={onClose} className="text-[var(--blueprint-muted)] hover:text-[var(--blueprint-accent)]">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto bg-[var(--blueprint-bg)]">
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
        orchard,
        settings,
        updateSettings,
        removePicker,
        bucketRecords,
        sendBroadcast
    } = useHarvest();

    // Low Power Mode detection
    const [lowPower, setLowPower] = useState(false);
    useEffect(() => {
        if ('getBattery' in navigator) {
            (navigator as any).getBattery().then((battery: any) => {
                setLowPower(!battery.charging && battery.level < 0.2);
                battery.addEventListener('chargingchange', () => {
                    setLowPower(!battery.charging && battery.level < 0.2);
                });
            });
        }
    }, []);

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
    const [activeSheet, setActiveSheet] = useState<SheetView>(null);
    const [selectedRow, setSelectedRow] = useState<{ rowNumber: number; buckets: number } | null>(null);

    // Derived Data
    const teamLeaders = crew.filter(p => p.role === 'team_leader' || p.role === Role.TEAM_LEADER);

    // Calculate metrics
    const efficiency = stats?.velocity ? Math.round((stats.velocity / 50) * 100) : 78;
    const targetProgress = stats?.totalBuckets && settings?.target_tons
        ? Math.round((stats.totalBuckets * 12 / 1000) / settings.target_tons * 100)
        : 45;

    // Row data for drawer
    const rowData = useMemo(() => {
        const counts: Record<number, number> = {};
        filteredBucketRecords.forEach(r => {
            const rowNum = r.row_number || 0;
            if (rowNum > 0) counts[rowNum] = (counts[rowNum] || 0) + 1;
        });
        return counts;
    }, [filteredBucketRecords]);

    const workersInSelectedRow = useMemo(() => {
        if (!selectedRow) return [];
        return crew.filter(p => p.current_row === selectedRow.rowNumber);
    }, [selectedRow, crew]);

    const handleRowClick = (rowNumber: number) => {
        setSelectedRow({
            rowNumber,
            buckets: rowData[rowNumber] || 0
        });
    };

    const handleBroadcast = async (title: string, message: string, priority: 'normal' | 'high' | 'urgent') => {
        await sendBroadcast?.(title, message, priority);
        setShowBroadcast(false);
    };

    return (
        <div className={`flex flex-col h-screen blueprint-bg text-[var(--blueprint-text)] overflow-hidden ${lowPower ? 'low-power' : ''}`}>
            {/* Scan Line Effect */}
            {!lowPower && <div className="scan-line z-50" />}

            {/* HUD HEADER */}
            <HudHeader
                orchardName={orchard?.name || 'CENTRAL BLOCK'}
                scanCount={filteredBucketRecords.length}
                efficiency={efficiency}
                targetProgress={targetProgress}
                onSettings={() => setShowSettings(true)}
            />

            {/* FULLSCREEN DATALINES MAP */}
            <main className="flex-1 relative overflow-hidden">
                <HeatMapView
                    bucketRecords={filteredBucketRecords}
                    crew={crew}
                    blockName={orchard?.name || 'Central Block'}
                    rows={orchard?.total_rows || 20}
                    onRowClick={handleRowClick}
                />
            </main>

            {/* FAB NAVIGATION (Cyan Neon) */}
            <div className="fixed bottom-6 right-4 z-30 flex flex-col gap-3">
                <button
                    onClick={() => setShowBroadcast(true)}
                    className="w-14 h-14 bg-[var(--blueprint-danger)] text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-all"
                    style={{ boxShadow: '0 0 15px var(--blueprint-danger)' }}
                >
                    <span className="material-symbols-outlined">campaign</span>
                </button>

                <button
                    onClick={() => setActiveSheet('dashboard')}
                    className="w-14 h-14 bg-[var(--blueprint-grid)] border border-[var(--blueprint-accent)]/30 text-[var(--blueprint-accent)] rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-all hover:neon-glow"
                >
                    <span className="material-symbols-outlined">dashboard</span>
                </button>

                <button
                    onClick={() => setActiveSheet('teams')}
                    className="w-14 h-14 bg-[var(--blueprint-grid)] border border-[var(--blueprint-accent)]/30 text-[var(--blueprint-accent)] rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-all hover:neon-glow"
                >
                    <span className="material-symbols-outlined">groups</span>
                </button>

                <button
                    onClick={() => setActiveSheet('messaging')}
                    className="w-14 h-14 bg-[var(--blueprint-grid)] border border-[var(--blueprint-accent)]/30 text-[var(--blueprint-accent)] rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-all hover:neon-glow relative"
                >
                    <span className="material-symbols-outlined">chat</span>
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-[var(--blueprint-danger)] rounded-full border-2 border-[var(--blueprint-bg)]" />
                </button>
            </div>

            {/* QUICK STATS (Bottom Left) */}
            <div className="fixed bottom-6 left-4 z-30 blueprint-bg border border-[var(--blueprint-accent)]/20 rounded-xl p-3 flex gap-4">
                <div className="text-center">
                    <span className="block blueprint-mono text-lg font-bold text-[var(--blueprint-accent)] neon-text">{stats?.totalBuckets || 0}</span>
                    <span className="blueprint-mono text-[10px] text-[var(--blueprint-muted)] uppercase">Cubos</span>
                </div>
                <div className="w-px bg-[var(--blueprint-accent)]/20" />
                <div className="text-center">
                    <span className="block blueprint-mono text-lg font-bold text-[var(--blueprint-text)]">{crew.length}</span>
                    <span className="blueprint-mono text-[10px] text-[var(--blueprint-muted)] uppercase">Equipo</span>
                </div>
                <div className="w-px bg-[var(--blueprint-accent)]/20" />
                <div className="text-center">
                    <span className="block blueprint-mono text-lg font-bold text-[var(--blueprint-warning)]">{stats?.velocity || 0}</span>
                    <span className="blueprint-mono text-[10px] text-[var(--blueprint-muted)] uppercase">Vel/H</span>
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
                    onUserSelect={setSelectedUser}
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
        </div>
    );
};

export default Manager;
