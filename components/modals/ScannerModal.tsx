import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface ScannerModalProps {
    onClose: () => void;
    onScan: (code: string) => void;
    scanType: 'BIN' | 'BUCKET';
}

const ScannerModal: React.FC<ScannerModalProps> = ({ onClose, onScan, scanType }) => {
    const [manualCode, setManualCode] = useState('');
    const [showManual, setShowManual] = useState(false);

    useEffect(() => {
        if (showManual) return;

        // Configuración del escáner real
        const scanner = new Html5QrcodeScanner(
            "reader",
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
                showTorchButtonIfSupported: true
            },
            /* verbose= */ false
        );

        scanner.render(
            (decodedText) => {
                // Éxito: Código leído
                scanner.clear();
                onScan(decodedText);
            },
            (errorMessage) => {
                // Error de lectura (ignoramos para no saturar consola)
            }
        );

        return () => {
            scanner.clear().catch(error => console.error("Failed to clear scanner", error));
        };
    }, [showManual, onScan]);

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (manualCode.trim()) {
            onScan(manualCode.trim().toUpperCase());
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col justify-center animate-in fade-in duration-200">
            {/* Header */}
            <div className={`absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 ${document.body.classList.contains('sunlight-mode') ? 'bg-white border-b border-black' : 'bg-gradient-to-b from-black/80 to-transparent'}`}>
                <div className={document.body.classList.contains('sunlight-mode') ? 'text-black' : 'text-white'}>
                    <h2 className="text-lg font-bold">Scan {scanType}</h2>
                    <p className={`text-xs ${document.body.classList.contains('sunlight-mode') ? 'text-gray-600' : 'text-gray-300'}`}>Align QR code within frame</p>
                </div>
                <button
                    onClick={onClose}
                    className={`size-10 rounded-full flex items-center justify-center ${document.body.classList.contains('sunlight-mode') ? 'bg-black text-white' : 'bg-white/10 backdrop-blur-md text-white'}`}
                >
                    <span className="material-symbols-outlined">close</span>
                </button>
            </div>

            {/* Scanner Area */}
            <div className="w-full max-w-md mx-auto relative px-4">
                {!showManual ? (
                    <div className="rounded-2xl overflow-hidden bg-black border border-white/20 shadow-2xl relative">
                        <div id="reader" className="w-full h-full"></div>
                    </div>
                ) : (
                    <form onSubmit={handleManualSubmit} className="bg-[#1e1e1e] p-6 rounded-2xl border border-white/10">
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Enter {scanType} Code
                        </label>
                        <input
                            type="text"
                            value={manualCode}
                            onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                            className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white font-mono text-lg focus:border-primary outline-none mb-4"
                            placeholder="e.g. BKT-1024"
                            autoFocus
                        />
                        <button
                            type="submit"
                            className="w-full bg-primary text-white font-bold py-3 rounded-xl active:scale-95 transition-transform"
                        >
                            Submit Code
                        </button>
                    </form>
                )}
            </div>

            {/* Footer Actions */}
            <div className="absolute bottom-10 left-0 right-0 px-6 text-center">
                <button
                    onClick={() => setShowManual(!showManual)}
                    className="text-sm font-medium text-white/80 underline decoration-white/30 underline-offset-4"
                >
                    {showManual ? "Switch to Camera" : "Problem scanning? Enter code manually"}
                </button>
            </div>

            <style>{`
                #reader__scan_region { background: transparent !important; }
                #reader__dashboard_section_csr button { 
                    background: white; color: black; border: none; padding: 8px 16px; border-radius: 8px; font-weight: bold; margin-top: 10px;
                }
                #reader__dashboard_section_swaplink { display: none !important; }
            `}</style>
        </div>
    );
};

export default ScannerModal;
