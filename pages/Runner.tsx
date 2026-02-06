// pages/Runner.tsx
import React, { useState } from 'react';
import LogisticsView from '../components/views/runner/LogisticsView';
import MessagingView from '../components/views/runner/MessagingView';
import ScannerModal from '../components/modals/ScannerModal';
import { useHarvest } from '../context/HarvestContext';
import { useAuth } from '../context/AuthContext';
import { feedbackService } from '../services/feedback.service';

const Runner = () => {
    const [activeTab, setActiveTab] = useState<'scan' | 'messages' | 'profile'>('scan');
    const [showScanner, setShowScanner] = useState(false);
    const { currentUser, signOut } = useHarvest();

    // Función para abrir el escáner con feedback
    const handleOpenScanner = () => {
        feedbackService.vibrate(50); // Feedback táctil al pulsar
        setShowScanner(true);
    };

    return (
        <div className="flex flex-col h-screen bg-slate-900 text-white overflow-hidden">
            {/* 1. Industrial Header */}
            <header className="flex items-center justify-between px-6 py-4 bg-slate-800 border-b border-white/10 shadow-lg z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#d91e36] rounded-lg flex items-center justify-center font-black text-xl shadow-lg shadow-red-900/50">
                        R
                    </div>
                    <div>
                        <h1 className="font-black text-xl tracking-tight leading-none">RUNNER</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Unit: {currentUser?.name || 'Unknown'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Indicador de Conexión (Simulado por ahora) */}
                    <div className="flex items-center gap-1.5 bg-black/30 px-3 py-1.5 rounded-full border border-white/5">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs font-bold text-green-500">ONLINE</span>
                    </div>
                </div>
            </header>

            {/* 2. Main Workspace */}
            <main className="flex-1 overflow-hidden relative bg-[#121212]">
                {activeTab === 'scan' && <LogisticsView onScanRequest={handleOpenScanner} />}
                {activeTab === 'messages' && <MessagingView />}
                {/* Perfil simple para logout */}
                {activeTab === 'profile' && (
                    <div className="p-6 flex flex-col items-center justify-center h-full space-y-8">
                        <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center text-4xl">👤</div>
                        <button
                            onClick={signOut}
                            className="w-full max-w-sm py-5 bg-slate-800 border-2 border-red-500/50 text-red-500 font-black text-xl rounded-2xl active:scale-95 transition-transform"
                        >
                            SIGN OUT
                        </button>
                    </div>
                )}
            </main>

            {/* 3. Massive Bottom Nav (Thumb Friendly) */}
            <nav className="h-24 bg-slate-800 border-t border-white/10 flex items-stretch pb-4 safe-area-pb">
                <button
                    onClick={() => { feedbackService.vibrate(20); setActiveTab('scan'); }}
                    className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'scan' ? 'text-[#d91e36]' : 'text-slate-500'}`}
                >
                    <span className="material-symbols-outlined text-4xl">qr_code_scanner</span>
                    <span className="text-xs font-black uppercase">Scan</span>
                </button>

                {/* Botón Central Flotante (Acción Rápida) */}
                <div className="relative -top-6">
                    <button
                        onClick={handleOpenScanner}
                        className="w-20 h-20 bg-[#d91e36] rounded-full flex items-center justify-center shadow-2xl shadow-red-900/50 border-4 border-slate-900 active:scale-90 transition-transform"
                    >
                        <span className="material-symbols-outlined text-white text-4xl">add</span>
                    </button>
                </div>

                <button
                    onClick={() => { feedbackService.vibrate(20); setActiveTab('messages'); }}
                    className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'messages' ? 'text-blue-500' : 'text-slate-500'}`}
                >
                    <span className="material-symbols-outlined text-4xl">chat</span>
                    <span className="text-xs font-black uppercase">Chat</span>
                </button>
            </nav>

            {/* Modales */}
            {showScanner && (
                <ScannerModal
                    onClose={() => setShowScanner(false)}
                    onScan={async (code) => {
                        console.log("Scanned:", code);
                        // Using feedback service here would complement the visual feedback
                        feedbackService.triggerSuccess();
                        setShowScanner(false);
                        // Actual implementation of scanBucket would be triggered here in a real scenario
                    }}
                    scanType="BUCKET"
                />
            )}
        </div>
    );
};

export default Runner;