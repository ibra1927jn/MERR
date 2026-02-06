/**
 * RUNNER.TSX - High Fidelity UI
 * Implementación del diseño "Logistics Hub" con lógica de negocio preservada.
 */
import React, { useState } from 'react';
import { useHarvest } from '../context/HarvestContext';
import { useAuth } from '../context/AuthContext';
import ScannerModal from '../components/modals/ScannerModal';
import ProfileModal from '../components/modals/ProfileModal';

// Navegación interna
type Tab = 'logistics' | 'runners' | 'warehouse' | 'messaging';

const Runner = () => {
    // --------------------------------------------------------
    // 1. LÓGICA DE NEGOCIO (NO TOCAR)
    // --------------------------------------------------------
    const { inventory = [], scanBucket, currentUser, orchard } = useHarvest();
    const { signOut } = useAuth();

    // Estado UI
    const [activeTab, setActiveTab] = useState<Tab>('logistics');
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [scanType, setScanType] = useState<'BUCKET' | 'BIN'>('BUCKET');

    // Datos Derivados (Conectando el diseño a los datos reales)
    // Encontramos el primer bin activo o usamos uno placeholder para que se vea el diseño
    const activeBin = inventory.find(b => b.status === 'in-progress') || {
        id: '#4092', fillPercentage: 63, type: 'Stella Cherries'
    };

    // Contadores reales
    const emptyBinsCount = inventory.filter(b => b.status === 'empty').length;
    const fullBinsCount = inventory.filter(b => b.status === 'full').length;

    // Handlers
    const handleScanClick = (type: 'BUCKET' | 'BIN') => {
        setScanType(type);
        setIsScannerOpen(true);
    };

    const handleScan = async (code: string) => {
        // Aquí conectamos con la lógica real de Supabase
        if (scanType === 'BUCKET') {
            await scanBucket(code, 'A'); // Calidad 'A' por defecto al escanear rápido
        } else {
            console.log("Bin escaneado:", code);
            // Aquí iría la lógica de escanear Bin si fuera distinta
        }
        setIsScannerOpen(false);
    };

    // --------------------------------------------------------
    // 2. COMPONENTES VISUALES (TU DISEÑO HTML)
    // --------------------------------------------------------

    const Header = () => (
        <header className="flex-none bg-white shadow-sm z-30 relative">
            <div className="flex items-center px-4 py-3 justify-between">
                <div>
                    <h1 className="text-[#1b0d0f] text-xl font-extrabold tracking-tight">
                        {activeTab === 'logistics' && 'Logistics Hub'}
                        {activeTab === 'runners' && 'Orchard Runners'}
                        {activeTab === 'warehouse' && 'Warehouse Inventory'}
                        {activeTab === 'messaging' && 'Messaging Hub'}
                    </h1>
                    <p className="text-[10px] text-primary font-bold tracking-widest uppercase">
                        {orchard?.id || 'Central Pac'} • {currentUser?.name}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="relative flex items-center justify-center rounded-full size-10 bg-gray-50 text-gray-700">
                        <span className="material-symbols-outlined">notifications</span>
                        <span className="absolute top-2 right-2.5 size-2 bg-primary rounded-full border-2 border-white"></span>
                    </button>
                    <div onClick={() => setIsProfileOpen(true)} className="size-10 rounded-full bg-gray-200 overflow-hidden border border-gray-100 cursor-pointer">
                        <img
                            src={`https://ui-avatars.com/api/?name=${currentUser?.name || 'User'}&background=ec1325&color=fff`}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>
            </div>

            {/* Banner Offline (Solo visible si hay cola, lógica placeholder por ahora) */}
            <div className="bg-orange-50 border-y border-orange-100 px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-orange-600" style={{ fontSize: '20px' }}>cloud_off</span>
                    <p className="text-orange-800 text-sm font-bold">System Status</p>
                </div>
                <div className="flex items-center gap-1.5 bg-green-100 px-2 py-0.5 rounded-full">
                    <span className="material-symbols-outlined text-green-700" style={{ fontSize: '16px' }}>wifi</span>
                    <span className="text-xs font-black text-green-800 uppercase">Online</span>
                </div>
            </div>
        </header>
    );

    return (
        <div className="flex flex-col h-screen bg-background-light overflow-hidden font-display text-slate-800">
            <Header />

            <main className="flex-1 overflow-y-auto pb-32">

                {/* --- VISTA: LOGISTICS --- */}
                {activeTab === 'logistics' && (
                    <div className="p-4 space-y-4">
                        {/* Tarjeta de Bin Activo */}
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 leading-none">Bin {activeBin.id}</h2>
                                    <p className="text-sm font-medium text-gray-500 mt-1">{activeBin.type || 'Standard'}</p>
                                </div>
                                <span className="px-2 py-1 rounded bg-green-50 text-green-700 text-[10px] font-black uppercase tracking-widest border border-green-100">Active</span>
                            </div>

                            {/* Gráfico Circular SVG */}
                            <div className="flex items-center justify-center py-4 relative">
                                <div className="w-48 h-48 relative">
                                    <svg className="circular-chart" viewBox="0 0 36 36">
                                        <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"></path>
                                        <path
                                            className="circle stroke-primary"
                                            strokeDasharray={`${activeBin.fillPercentage || 0}, 100`}
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        ></path>
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-4xl font-black text-gray-900">{activeBin.fillPercentage || 0}%</span>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Full</span>
                                    </div>
                                </div>
                            </div>

                            <div className="text-center">
                                <p className="text-gray-900 text-xl font-black">
                                    {Math.floor(((activeBin.fillPercentage || 0) / 100) * 48)}<span className="text-gray-400 font-bold mx-1">/</span>48
                                </p>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-0.5">Buckets Collected</p>
                            </div>
                        </div>

                        {/* Supply Management */}
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4">Supply Management</h3>
                            <div className="grid grid-cols-2 gap-4 mb-5">
                                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                    <p className="text-[11px] font-bold text-gray-500 uppercase">Empty Bins</p>
                                    <div className="flex items-baseline justify-between mt-1">
                                        <span className="text-2xl font-black text-gray-900">{emptyBinsCount}</span>
                                        <span className="text-[10px] font-black text-primary uppercase">Low</span>
                                    </div>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                    <p className="text-[11px] font-bold text-gray-500 uppercase">Full Bins</p>
                                    <div className="flex items-baseline justify-between mt-1">
                                        <span className="text-2xl font-black text-gray-900">{fullBinsCount}</span>
                                        <span className="text-[10px] font-black text-green-600 uppercase">Ready</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- VISTA: WAREHOUSE --- */}
                {activeTab === 'warehouse' && (
                    <div className="p-4 space-y-5">
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-2 h-full bg-primary"></div>
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">Harvested Stock</h3>
                                    <h2 className="text-2xl font-bold text-gray-900">Full Cherry Bins</h2>
                                </div>
                                <div className="size-14 rounded-xl bg-red-50 flex items-center justify-center text-primary border border-red-100">
                                    <span className="material-symbols-outlined text-3xl">inventory_2</span>
                                </div>
                            </div>
                            <div className="mt-6 flex items-baseline gap-3">
                                <span className="text-6xl font-black text-gray-900 tracking-tighter">{fullBinsCount}</span>
                                <span className="text-lg font-medium text-gray-500">filled</span>
                            </div>
                        </div>
                        <div className="bg-gray-100 rounded-xl p-4 flex gap-3 border border-gray-200">
                            <span className="material-symbols-outlined text-gray-500">local_shipping</span>
                            <div className="text-sm text-gray-600">
                                <p className="font-bold">Next Resupply Truck</p>
                                <p className="text-xs mt-0.5">Scheduled arrival in 45 mins.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- VISTA: MESSAGING (Placeholder) --- */}
                {activeTab === 'messaging' && (
                    <div className="p-4 flex flex-col items-center justify-center h-full text-center text-gray-400">
                        <span className="material-symbols-outlined text-5xl mb-2">forum</span>
                        <p className="font-bold">No new messages</p>
                    </div>
                )}

                {/* --- VISTA: RUNNERS (Placeholder) --- */}
                {activeTab === 'runners' && (
                    <div className="p-4 flex flex-col items-center justify-center h-full text-center text-gray-400">
                        <span className="material-symbols-outlined text-5xl mb-2">groups</span>
                        <p className="font-bold">Team Active</p>
                    </div>
                )}

            </main>

            {/* FIXED BOTTOM: Actions & Nav */}
            <div className="fixed bottom-0 left-0 w-full z-40 bg-white border-t border-gray-100 shadow-[0_-10px_20px_rgba(0,0,0,0.03)] pb-safe">

                {/* Botones de Acción (Solo en Logistics) */}
                {activeTab === 'logistics' && (
                    <div className="flex gap-4 p-4 pb-2">
                        <button
                            onClick={() => handleScanClick('BIN')}
                            className="flex-1 flex flex-col items-center justify-center py-4 bg-white border-2 border-primary text-primary rounded-2xl font-black text-xs uppercase tracking-widest active:bg-gray-50"
                        >
                            <span className="material-symbols-outlined mb-1" style={{ fontSize: '28px' }}>crop_free</span>
                            Scan Bin
                        </button>
                        <button
                            onClick={() => handleScanClick('BUCKET')}
                            className="flex-1 flex flex-col items-center justify-center py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-200 active:bg-primary-dark"
                        >
                            <span className="material-symbols-outlined mb-1" style={{ fontSize: '28px' }}>label</span>
                            Scan Sticker
                        </button>
                    </div>
                )}

                {/* Barra de Navegación */}
                <nav className="flex items-center justify-around px-2 pb-6 pt-2">
                    <button onClick={() => setActiveTab('logistics')} className={`flex flex-col items-center gap-1 min-w-[64px] ${activeTab === 'logistics' ? 'text-primary' : 'text-gray-400'}`}>
                        <span className="material-symbols-outlined" style={activeTab === 'logistics' ? { fontVariationSettings: "'FILL' 1" } : {}}>local_shipping</span>
                        <span className="text-[10px] font-black uppercase">Logistics</span>
                    </button>

                    <button onClick={() => setActiveTab('runners')} className={`flex flex-col items-center gap-1 min-w-[64px] ${activeTab === 'runners' ? 'text-primary' : 'text-gray-400'}`}>
                        <span className="material-symbols-outlined" style={activeTab === 'runners' ? { fontVariationSettings: "'FILL' 1" } : {}}>groups</span>
                        <span className="text-[10px] font-black uppercase">Runners</span>
                    </button>

                    <button onClick={() => setActiveTab('warehouse')} className={`flex flex-col items-center gap-1 min-w-[64px] ${activeTab === 'warehouse' ? 'text-primary' : 'text-gray-400'}`}>
                        <span className="material-symbols-outlined" style={activeTab === 'warehouse' ? { fontVariationSettings: "'FILL' 1" } : {}}>warehouse</span>
                        <span className="text-[10px] font-black uppercase">Warehouse</span>
                    </button>

                    <button onClick={() => setActiveTab('messaging')} className={`flex flex-col items-center gap-1 min-w-[64px] ${activeTab === 'messaging' ? 'text-primary' : 'text-gray-400'}`}>
                        <div className="relative">
                            <span className="material-symbols-outlined" style={activeTab === 'messaging' ? { fontVariationSettings: "'FILL' 1" } : {}}>forum</span>
                            {/* Dot Indicador */}
                            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                            </span>
                        </div>
                        <span className="text-[10px] font-black uppercase">Messaging</span>
                    </button>
                </nav>
            </div>

            {/* Modales (Fuera del flujo visual pero dentro del DOM) */}
            <ScannerModal
                onClose={() => setIsScannerOpen(false)}
                onScan={handleScan}
                scanType={scanType}
            />

            {isProfileOpen && (
                <ProfileModal
                    onClose={() => setIsProfileOpen(false)}
                    onLogout={signOut}
                />
            )}
        </div>
    );
};

export default Runner;