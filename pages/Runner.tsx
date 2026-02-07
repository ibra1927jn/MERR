// pages/Runner.tsx
import React, { useState } from 'react';
import LogisticsView from '../components/views/runner/LogisticsView';
import WarehouseView from '../components/views/runner/WarehouseView'; // ¡Recuperado!
import MessagingView from '../components/views/runner/MessagingView';
import ScannerModal from '../components/modals/ScannerModal';
import { useHarvest } from '../context/HarvestContext';
import { useAuth } from '../context/AuthContext';
import { feedbackService } from '../services/feedback.service';

const Runner = () => {
    // Restauramos la navegación por pestañas clásica
    const [activeTab, setActiveTab] = useState<'logistics' | 'warehouse' | 'messaging'>('logistics');
    const [showScanner, setShowScanner] = useState(false);
    // Use useHarvest to get inventory for WarehouseView and scanBucket for the modal
    const { inventory, scanBucket } = useHarvest();
    const { user } = useAuth(); // kept for header info

    // Función centralizada para abrir escáner con feedback
    const handleOpenScanner = () => {
        feedbackService.vibrate(50);
        setShowScanner(true);
    };

    return (
        <div className="flex flex-col h-screen bg-slate-50 dark:bg-[#121212] transition-colors duration-300">
            {/* Header Compacto (Más similar al del Manager pero para móvil) */}
            <header className="bg-white dark:bg-[#1e1e1e] border-b border-gray-200 dark:border-white/5 h-14 px-4 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#d91e36] rounded-lg flex items-center justify-center shadow-lg shadow-red-500/20">
                        <span className="material-symbols-outlined text-white text-lg">directions_run</span>
                    </div>
                    <div>
                        <h1 className="font-black text-sm text-slate-900 dark:text-white leading-none">Runner</h1>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">{user?.email?.split('@')[0]}</p>
                    </div>
                </div>
                {/* Botón de Escaneo Rápido en Header (Siempre disponible) */}
                <button
                    onClick={handleOpenScanner}
                    className="w-8 h-8 bg-slate-100 dark:bg-white/10 rounded-full flex items-center justify-center text-slate-700 dark:text-white"
                >
                    <span className="material-symbols-outlined text-lg">qr_code_scanner</span>
                </button>
            </header>

            {/* Contenido Principal (Con Scroll) */}
            <main className="flex-1 overflow-y-auto overflow-x-hidden relative pb-20">
                {activeTab === 'logistics' && (
                    <LogisticsView onScanRequest={handleOpenScanner} />
                )}
                {activeTab === 'warehouse' && (
                    <WarehouseView fullBinsCount={inventory?.length || 0} />
                )}
                {activeTab === 'messaging' && (
                    <MessagingView />
                )}
            </main>

            {/* Navegación Inferior (Restaurada) */}
            <nav className="bg-white dark:bg-[#1e1e1e] border-t border-gray-200 dark:border-white/5 h-16 fixed bottom-0 left-0 right-0 flex justify-around items-center z-50 safe-area-pb shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                <button
                    onClick={() => { feedbackService.vibrate(20); setActiveTab('logistics'); }}
                    className={`flex flex-col items-center gap-1 p-2 w-16 ${activeTab === 'logistics' ? 'text-[#d91e36]' : 'text-slate-400'}`}
                >
                    <span className="material-symbols-outlined text-2xl">local_shipping</span>
                    <span className="text-[10px] font-bold">Logistics</span>
                </button>

                {/* Botón Central Flotante para Escanear (El favorito) */}
                <div className="relative -top-5">
                    <button
                        onClick={handleOpenScanner}
                        className="w-14 h-14 bg-[#d91e36] rounded-full flex items-center justify-center shadow-lg shadow-red-500/30 border-4 border-white dark:border-[#121212] active:scale-95 transition-transform"
                    >
                        <span className="material-symbols-outlined text-white text-2xl">qr_code_2</span>
                    </button>
                </div>

                <button
                    onClick={() => { feedbackService.vibrate(20); setActiveTab('warehouse'); }}
                    className={`flex flex-col items-center gap-1 p-2 w-16 ${activeTab === 'warehouse' ? 'text-[#d91e36]' : 'text-slate-400'}`}
                >
                    <span className="material-symbols-outlined text-2xl">warehouse</span>
                    <span className="text-[10px] font-bold">Bins</span>
                </button>

                <button
                    onClick={() => { feedbackService.vibrate(20); setActiveTab('messaging'); }}
                    className={`flex flex-col items-center gap-1 p-2 w-16 ${activeTab === 'messaging' ? 'text-[#d91e36]' : 'text-slate-400'}`}
                >
                    <span className="material-symbols-outlined text-2xl">chat</span>
                    <span className="text-[10px] font-bold">Chat</span>
                </button>
            </nav>

            {/* Modales */}
            {showScanner && (
                <ScannerModal
                    onClose={() => setShowScanner(false)}
                    onScan={async (code) => {
                        console.log("Scanned:", code);
                        feedbackService.triggerSuccess();

                        try {
                            if (scanBucket) {
                                await scanBucket(code, 'A');
                            }
                        } catch (e) {
                            console.error("Scan failed", e);
                            feedbackService.triggerError();
                        }

                        setShowScanner(false);
                    }}
                    scanType="BUCKET"
                />
            )}
        </div>
    );
};

export default Runner;