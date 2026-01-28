/**
 * ScannerModal - Modal para escanear códigos QR/barras con cámara
 * Extraído de Runner.tsx
 */

import React, { useState, useRef, useEffect } from 'react';

interface ScannerModalProps {
    onClose: () => void;
    onScan: (code: string) => void;
    scanType: 'BIN' | 'BUCKET';
}

const ScannerModal: React.FC<ScannerModalProps> = ({ onClose, onScan, scanType }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isScanning, setIsScanning] = useState(true);
    const [scannedCode, setScannedCode] = useState<string | null>(null);
    const [manualCode, setManualCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [showManualInput, setShowManualInput] = useState(false);
    const streamRef = useRef<MediaStream | null>(null);

    const startScanner = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
            setIsScanning(true);
            setError(null);

            // Simulated scan after 2 seconds for demo
            setTimeout(() => {
                if (isScanning && !scannedCode) {
                    const prefix = scanType === 'BIN' ? 'BIN' : 'BKT';
                    const simulatedCode = `${prefix}-${Date.now().toString(36).toUpperCase()}`;
                    setScannedCode(simulatedCode);
                    setIsScanning(false);
                }
            }, 2000);
        } catch (err: any) {
            console.error('Camera error:', err);
            setError('Could not access camera. Please use manual entry.');
            setShowManualInput(true);
        }
    };

    const stopScanner = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };

    useEffect(() => {
        startScanner();
        return () => stopScanner();
    }, []);

    const handleConfirm = () => {
        if (scannedCode) {
            onScan(scannedCode);
            onClose();
        }
    };

    const handleManualInput = () => {
        if (manualCode.trim()) {
            onScan(manualCode.trim().toUpperCase());
            onClose();
        }
    };

    const handleRescan = () => {
        setScannedCode(null);
        setIsScanning(true);
        startScanner();
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-[#1e1e1e]/90 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined text-2xl ${scanType === 'BIN' ? 'text-blue-500' : 'text-primary'}`}>
                        {scanType === 'BIN' ? 'inventory_2' : 'shopping_basket'}
                    </span>
                    <div>
                        <h3 className="text-white font-bold">Scan {scanType}</h3>
                        <p className="text-xs text-[#a1a1aa]">Point camera at QR code</p>
                    </div>
                </div>
                <button onClick={onClose} className="size-10 rounded-full bg-[#333] flex items-center justify-center text-white">
                    <span className="material-symbols-outlined">close</span>
                </button>
            </div>

            {/* Camera View */}
            <div className="flex-1 relative overflow-hidden">
                {!showManualInput ? (
                    <>
                        <video
                            ref={videoRef}
                            className="w-full h-full object-cover"
                            playsInline
                            muted
                        />
                        <canvas ref={canvasRef} className="hidden" />

                        {/* Scanning Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className={`w-64 h-64 border-4 rounded-2xl ${scannedCode
                                    ? 'border-green-500 bg-green-500/10'
                                    : 'border-white/50 animate-pulse'
                                }`}>
                                {isScanning && !scannedCode && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-full h-1 bg-primary/50 animate-scan"></div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Scanned Result */}
                        {scannedCode && (
                            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black to-transparent">
                                <div className="bg-green-500/20 border border-green-500/50 rounded-2xl p-4 mb-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="material-symbols-outlined text-green-500 text-2xl">check_circle</span>
                                        <p className="text-green-500 font-bold">Code Detected</p>
                                    </div>
                                    <p className="text-white font-mono text-2xl font-bold">{scannedCode}</p>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleRescan}
                                        className="flex-1 py-4 bg-[#333] text-white rounded-xl font-bold"
                                    >
                                        Rescan
                                    </button>
                                    <button
                                        onClick={handleConfirm}
                                        className="flex-1 py-4 bg-green-500 text-white rounded-xl font-bold"
                                    >
                                        Confirm
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    /* Manual Input Mode */
                    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#121212]">
                        <span className="material-symbols-outlined text-6xl text-[#333] mb-4">keyboard</span>
                        <p className="text-white font-bold text-lg mb-6">Manual Entry</p>
                        <input
                            type="text"
                            value={manualCode}
                            onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                            placeholder={`Enter ${scanType} code...`}
                            className="w-full max-w-xs bg-[#1e1e1e] border border-[#333] rounded-xl px-4 py-3 text-white text-center font-mono text-lg focus:border-primary outline-none mb-4"
                            autoFocus
                        />
                        <button
                            onClick={handleManualInput}
                            disabled={!manualCode.trim()}
                            className="w-full max-w-xs py-4 bg-primary text-white rounded-xl font-bold disabled:bg-gray-600"
                        >
                            Submit Code
                        </button>
                    </div>
                )}
            </div>

            {/* Bottom Actions */}
            {!scannedCode && !showManualInput && (
                <div className="p-4 bg-[#1e1e1e]/90 backdrop-blur-sm">
                    {error && (
                        <p className="text-red-400 text-sm text-center mb-3">{error}</p>
                    )}
                    <button
                        onClick={() => setShowManualInput(true)}
                        className="w-full py-3 bg-[#333] text-white rounded-xl font-bold flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[20px]">keyboard</span>
                        Enter Code Manually
                    </button>
                </div>
            )}

            <style>{`
                @keyframes scan {
                    0%, 100% { transform: translateY(-100px); }
                    50% { transform: translateY(100px); }
                }
                .animate-scan {
                    animation: scan 2s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default ScannerModal;
