/**
 * RUNNER.TSX - Dashboard Corregido
 */
import React, { useState } from 'react';
import { useHarvest } from '../context/HarvestContext';
import { useAuth } from '../context/AuthContext';
import ScannerModal from '../components/modals/ScannerModal';
import ProfileModal from '../components/modals/ProfileModal';

// Iconos
import { QrCode, User, Truck } from 'lucide-react';

const Runner = () => {
    // 1. Usar el Contexto Actualizado
    const {
        inventory = [], // Usamos 'inventory' en lugar de 'binsOfBuckets'
        scanBucket,     // Usamos 'scanBucket' en lugar de 'addBucketWithValidation'
        currentUser,
        orchard
    } = useHarvest();

    const { signOut } = useAuth();

    // 2. Calcular Estadísticas al vuelo (derived state)
    const emptyBinsCount = inventory.filter(b => b.status === 'empty').length;
    const fullBinsCount = inventory.filter(b => b.status === 'full').length;
    const inProgressBinsCount = inventory.filter(b => b.status === 'in-progress').length;

    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'collect' | 'deliver'>('collect');

    // 3. Manejador de Escaneo Correcto
    const handleScan = async (data: string) => {
        // data = picker_id
        await scanBucket(data, 'A');
        setIsScannerOpen(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* HEADER */}
            <header className="bg-[#d91e36] text-white p-4 shadow-lg sticky top-0 z-10">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h1 className="text-2xl font-bold">Runner Dashboard</h1>
                        <p className="text-white/80 text-sm">
                            {currentUser?.name || 'Runner'} • {orchard?.id || 'Huerto'}
                        </p>
                    </div>
                    <button onClick={() => setIsProfileOpen(true)} className="bg-white/20 p-2 rounded-full">
                        <User size={24} />
                    </button>
                </div>

                {/* KPIs derivados de inventory */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white/10 p-3 rounded-lg text-center">
                        <div className="text-2xl font-bold">{inProgressBinsCount}</div>
                        <div className="text-xs opacity-80">Activos</div>
                    </div>
                    <div className="bg-white/10 p-3 rounded-lg text-center">
                        <div className="text-2xl font-bold">{emptyBinsCount}</div>
                        <div className="text-xs opacity-80">Vacíos</div>
                    </div>
                    <div className="bg-white/10 p-3 rounded-lg text-center">
                        <div className="text-2xl font-bold">{fullBinsCount}</div>
                        <div className="text-xs opacity-80">Llenos</div>
                    </div>
                </div>
            </header>

            <main className="p-4 space-y-4">
                {/* Botón de Acción Principal */}
                <button
                    onClick={() => setIsScannerOpen(true)}
                    className="w-full bg-[#d91e36] text-white py-4 rounded-xl shadow-lg flex items-center justify-center gap-3 text-lg font-bold"
                >
                    <QrCode size={28} />
                    {activeTab === 'collect' ? 'Escanear Cubeta' : 'Escanear Bin'}
                </button>

                {/* Lista de Bins (Renderizado condicional seguro) */}
                <div className="space-y-3">
                    <h3 className="font-semibold text-slate-700">Inventario de Bins</h3>
                    {inventory.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 border border-dashed rounded-xl">
                            <Truck size={48} className="mx-auto mb-2 opacity-50" />
                            <p>No hay bins activos</p>
                        </div>
                    ) : (
                        inventory.map(bin => (
                            <div key={bin.id} className="bg-white p-4 rounded-xl shadow-sm border flex justify-between">
                                <span className="font-bold">{bin.id}</span>
                                <span className={`px-2 py-1 rounded text-xs ${bin.status === 'full' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                    {bin.status.toUpperCase()}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </main>

            {/* Modales */}
            {isScannerOpen && (
                <ScannerModal
                    isOpen={isScannerOpen}
                    onClose={() => setIsScannerOpen(false)}
                    onScan={handleScan}
                />
            )}

            {isProfileOpen && (
                <ProfileModal
                    isOpen={isProfileOpen}
                    onClose={() => setIsProfileOpen(false)}
                    user={{ name: currentUser?.name || 'Runner', role: 'runner', email: '', avatar: '' }}
                    onLogout={signOut}
                />
            )}
        </div>
    );
};

export default Runner;