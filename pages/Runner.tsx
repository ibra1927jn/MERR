import React, { useState, useEffect, useRef } from 'react';
import { useHarvest } from '../context/HarvestContext';
import { useAuth } from '../context/AuthContext';
import SimpleChat from '../components/SimpleChat';

type ViewState = 'LOGISTICS' | 'RUNNERS' | 'WAREHOUSE' | 'MESSAGING';

interface Runner {
    id: string;
    name: string;
    avatar: string;
    status: 'Active' | 'Break' | 'Off Duty';
    startTime: string;
    breakTime?: string;
    currentRow?: number;
    bucketsHandled: number;
    binsCompleted: number;
}

// ====================================
// MODAL: REAL CAMERA SCANNER
// ====================================
const RealScannerModal = ({
    onClose,
    onScan,
    scanType
}: {
    onClose: () => void,
    onScan: (code: string) => void,
    scanType: 'BIN' | 'BUCKET'
}) => {
    const [scanCode, setScanCode] = useState('');
    const [isScanning, setIsScanning] = useState(true);
    const [error, setError] = useState('');
    const scannerRef = useRef<any>(null);
    const hasStarted = useRef(false);

    useEffect(() => {
        if (!hasStarted.current) {
            hasStarted.current = true;
            startScanner();
        }

        return () => {
            stopScanner();
        };
    }, []);

    const startScanner = async () => {
        try {
            const Html5Qrcode = (window as any).Html5Qrcode;
            if (!Html5Qrcode) {
                setError("Scanner library not loaded. Please check internet connection.");
                setIsScanning(false);
                return;
            }

            if (!document.getElementById("qr-reader")) return;

            const scanner = new Html5Qrcode("qr-reader");
            scannerRef.current = scanner;

            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            };

            await scanner.start(
                { facingMode: "environment" },
                config,
                (decodedText: string) => {
                    setScanCode(decodedText);
                    setIsScanning(false);
                    stopScanner();
                },
                (errorMessage: string) => {
                    // Scanning in progress
                }
            );
        } catch (err) {
            console.error("Camera error:", err);
            setError("No se pudo acceder a la cámara. Verifica los permisos.");
            setIsScanning(false);
        }
    };

    const stopScanner = async () => {
        if (scannerRef.current) {
            try {
                if (scannerRef.current.isScanning) {
                    await scannerRef.current.stop();
                }
                scannerRef.current.clear();
                scannerRef.current = null;
            } catch (err) {
                console.error("Error stopping scanner:", err);
            }
        }
    };

    const handleConfirm = () => {
        if (scanCode) {
            onScan(scanCode);
            onClose();
        }
    };

    const handleManualInput = () => {
        stopScanner();
        setIsScanning(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-3xl p-8 w-[95%] max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-gray-900">
                        {scanType === 'BIN' ? 'Scan Bin QR' : 'Scan Bucket Sticker'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                        <p className="text-sm text-red-600 font-medium">{error}</p>
                    </div>
                )}

                <div className="bg-gray-900 rounded-2xl overflow-hidden mb-6 relative min-h-[300px] flex items-center justify-center">
                    {isScanning ? (
                        <>
                            <div id="qr-reader" className="w-full h-full"></div>
                            <div className="absolute inset-4 border-4 border-white/30 rounded-xl pointer-events-none z-10"></div>
                            <div className="absolute bottom-4 left-0 right-0 text-center z-20">
                                <p className="text-white/90 text-sm font-bold bg-black/50 inline-block px-4 py-2 rounded-full backdrop-blur-sm">
                                    {scanType === 'BIN' ? 'Apunta al código QR del bin' : 'Apunta al sticker del bucket'}
                                </p>
                            </div>
                        </>
                    ) : scanCode ? (
                        <div className="flex flex-col items-center justify-center p-8">
                            <span className="material-symbols-outlined text-green-400 text-6xl mb-2">check_circle</span>
                            <p className="text-green-400 text-sm font-bold">¡Código detectado!</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-8">
                            <span className="material-symbols-outlined text-white/50 text-6xl mb-2">qr_code_scanner</span>
                            <p className="text-white/70 text-sm font-bold">Escáner detenido</p>
                        </div>
                    )}
                </div>

                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Código detectado:</p>
                <input
                    type="text"
                    value={scanCode}
                    onChange={(e) => setScanCode(e.target.value)}
                    placeholder={scanType === 'BIN' ? "BIN-XXXX" : "BUCKET-XXX"}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 font-mono font-bold text-center mb-4 focus:border-[#ec1325] outline-none"
                />

                <div className="space-y-2">
                    <button
                        onClick={handleConfirm}
                        disabled={!scanCode}
                        className="w-full py-4 bg-[#ec1325] text-white rounded-xl font-bold uppercase tracking-widest active:scale-95 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                        {scanCode ? 'Confirmar Escaneo' : 'Esperando código...'}
                    </button>

                    {isScanning && (
                        <button
                            onClick={handleManualInput}
                            className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-bold"
                        >
                            Ingresar manualmente
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// ====================================
// MODAL: ADD RUNNER
// ====================================
const AddRunnerModal = ({ onClose, onAdd }: { onClose: () => void, onAdd: (runner: Runner) => void }) => {
    const [name, setName] = useState('');
    const [startTime, setStartTime] = useState('');
    const [currentRow, setCurrentRow] = useState('');

    const handleAdd = () => {
        if (name && startTime) {
            const newRunner: Runner = {
                id: `RUNNER-${Date.now()}`,
                name,
                avatar: name.charAt(0).toUpperCase(),
                status: 'Active',
                startTime,
                currentRow: currentRow ? parseInt(currentRow) : undefined,
                bucketsHandled: 0,
                binsCompleted: 0
            };
            onAdd(newRunner);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-3xl p-6 w-[90%] max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-gray-900">Add New Runner</h3>
                    <button onClick={onClose} className="text-gray-400">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Full Name *</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. John Smith"
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#ec1325] outline-none"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Start Time *</label>
                        <input
                            type="time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#ec1325] outline-none"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Assigned Row (Optional)</label>
                        <input
                            type="number"
                            value={currentRow}
                            onChange={(e) => setCurrentRow(e.target.value)}
                            placeholder="e.g. 12"
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#ec1325] outline-none"
                        />
                    </div>

                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                        <p className="text-xs font-bold text-blue-600 uppercase mb-1">📋 Initial Status</p>
                        <p className="text-sm text-blue-900">Will be set to <strong>Active</strong> upon creation</p>
                    </div>
                </div>

                <button
                    onClick={handleAdd}
                    disabled={!name || !startTime}
                    className="w-full mt-6 py-4 bg-[#ec1325] text-white rounded-xl font-bold uppercase tracking-widest disabled:bg-gray-300 active:scale-95 transition-all"
                >
                    Add Runner
                </button>
            </div>
        </div>
    );
};

// ====================================
// MODAL: RUNNER DETAILS
// ====================================
const RunnerDetailsModal = ({ runner, onClose, onUpdate, onDelete }: {
    runner: Runner,
    onClose: () => void,
    onUpdate: (updatedRunner: Runner) => void,
    onDelete: (runnerId: string) => void
}) => {
    const [activeTab, setActiveTab] = useState<'INFO' | 'SCHEDULE' | 'HISTORY'>('INFO');
    const [isEditing, setIsEditing] = useState(false);
    const [editedRunner, setEditedRunner] = useState({ ...runner });

    const handleSave = () => {
        onUpdate(editedRunner);
        setIsEditing(false);
    };

    const handleStatusChange = (newStatus: 'Active' | 'Break' | 'Off Duty') => {
        const updated = { ...editedRunner, status: newStatus };
        if (newStatus === 'Break' && !updated.breakTime) {
            updated.breakTime = new Date().toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' });
        }
        setEditedRunner(updated);
        onUpdate(updated);
    };

    const calculateWorkTime = () => {
        if (!runner.startTime) return '0h 0m';
        const [startHour, startMin] = runner.startTime.split(':').map(Number);
        const now = new Date();
        const totalMinutes = (now.getHours() * 60 + now.getMinutes()) - (startHour * 60 + startMin);
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        return `${hours}h ${mins}m`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-3xl p-6 w-[90%] max-w-md shadow-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="size-12 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-700 text-xl relative">
                            {runner.avatar}
                            <span className={`absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-white ${runner.status === 'Active' ? 'bg-green-500 animate-pulse' :
                                runner.status === 'Break' ? 'bg-orange-500' : 'bg-gray-400'
                                }`}></span>
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-gray-900">{runner.name}</h3>
                            <p className="text-sm text-gray-500">Bucket Runner</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex p-1 bg-gray-100 rounded-lg mb-6">
                    <button
                        onClick={() => setActiveTab('INFO')}
                        className={`flex-1 py-2 px-3 rounded-md text-xs font-bold transition-all ${activeTab === 'INFO' ? 'bg-white shadow-sm text-[#ec1325]' : 'text-gray-500'
                            }`}
                    >
                        Info
                    </button>
                    <button
                        onClick={() => setActiveTab('SCHEDULE')}
                        className={`flex-1 py-2 px-3 rounded-md text-xs font-bold transition-all ${activeTab === 'SCHEDULE' ? 'bg-white shadow-sm text-[#ec1325]' : 'text-gray-500'
                            }`}
                    >
                        Schedule
                    </button>
                    <button
                        onClick={() => setActiveTab('HISTORY')}
                        className={`flex-1 py-2 px-3 rounded-md text-xs font-bold transition-all ${activeTab === 'HISTORY' ? 'bg-white shadow-sm text-[#ec1325]' : 'text-gray-500'
                            }`}
                    >
                        History
                    </button>
                </div>

                {/* INFO TAB */}
                {activeTab === 'INFO' && (
                    <div className="space-y-4">
                        {/* Status Control */}
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                            <p className="text-xs font-bold text-gray-500 uppercase mb-3">Current Status</p>
                            <div className="grid grid-cols-3 gap-2">
                                {(['Active', 'Break', 'Off Duty'] as const).map(status => (
                                    <button
                                        key={status}
                                        onClick={() => handleStatusChange(status)}
                                        className={`py-2 px-3 rounded-lg text-xs font-bold uppercase transition-all ${editedRunner.status === status
                                            ? status === 'Active' ? 'bg-green-500 text-white' :
                                                status === 'Break' ? 'bg-orange-500 text-white' :
                                                    'bg-gray-500 text-white'
                                            : 'bg-gray-100 text-gray-500'
                                            }`}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Row Assignment */}
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Assigned Row</label>
                            {isEditing ? (
                                <input
                                    type="number"
                                    value={editedRunner.currentRow || ''}
                                    onChange={(e) => setEditedRunner({ ...editedRunner, currentRow: e.target.value ? parseInt(e.target.value) : undefined })}
                                    className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-[#ec1325] outline-none"
                                    placeholder="Row number"
                                />
                            ) : (
                                <p className="text-lg font-bold text-gray-900">
                                    {editedRunner.currentRow ? `Row ${editedRunner.currentRow}` : 'Not assigned'}
                                </p>
                            )}
                        </div>

                        {/* Stats */}
                        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                            <p className="text-xs font-bold text-blue-600 uppercase mb-3">Today's Performance</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-2xl font-black text-blue-900">{runner.bucketsHandled}</p>
                                    <p className="text-xs text-blue-700 font-medium">Buckets Handled</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-black text-blue-900">{runner.binsCompleted}</p>
                                    <p className="text-xs text-blue-700 font-medium">Bins Completed</p>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="space-y-2">
                            {isEditing ? (
                                <>
                                    <button
                                        onClick={handleSave}
                                        className="w-full py-3 bg-[#ec1325] text-white rounded-xl font-bold"
                                    >
                                        Save Changes
                                    </button>
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="w-full py-3 bg-gray-200 text-gray-700 rounded-xl font-bold"
                                    >
                                        Cancel
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="w-full py-3 bg-gray-200 text-gray-700 rounded-xl font-bold flex items-center justify-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">edit</span>
                                        Edit Details
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (confirm(`Remove ${runner.name} from active runners?`)) {
                                                onDelete(runner.id);
                                                onClose();
                                            }
                                        }}
                                        className="w-full py-3 bg-red-50 text-red-600 border-2 border-red-200 rounded-xl font-bold flex items-center justify-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">delete</span>
                                        Remove Runner
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* SCHEDULE TAB */}
                {activeTab === 'SCHEDULE' && (
                    <div className="space-y-4">
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Start Time</p>
                            <p className="text-2xl font-black text-gray-900">{runner.startTime}</p>
                            <p className="text-xs text-gray-500 mt-1">Total worked: {calculateWorkTime()}</p>
                        </div>

                        {runner.breakTime && (
                            <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                                <p className="text-xs font-bold text-orange-600 uppercase mb-2">Break Started</p>
                                <p className="text-2xl font-black text-orange-900">{runner.breakTime}</p>
                            </div>
                        )}

                        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                            <p className="text-xs font-bold text-blue-600 uppercase mb-3">Break Schedule</p>
                            <div className="space-y-2 text-sm text-blue-900">
                                <p>☕ Morning Break: 10:00 - 10:15</p>
                                <p>🍽️ Lunch Break: 12:30 - 13:00</p>
                                <p>☕ Afternoon Break: 15:00 - 15:15</p>
                            </div>
                        </div>

                        {runner.status === 'Active' && (
                            <button
                                onClick={() => handleStatusChange('Break')}
                                className="w-full py-4 bg-orange-500 text-white rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined">coffee</span>
                                Start Break Now
                            </button>
                        )}

                        {runner.status === 'Break' && (
                            <button
                                onClick={() => handleStatusChange('Active')}
                                className="w-full py-4 bg-green-500 text-white rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined">play_arrow</span>
                                Resume Work
                            </button>
                        )}
                    </div>
                )}

                {/* HISTORY TAB */}
                {activeTab === 'HISTORY' && (
                    <div className="space-y-3">
                        <p className="text-xs font-bold text-gray-500 uppercase">Recent Activity</p>
                        {runner.binsCompleted === 0 ? (
                            <div className="bg-gray-50 rounded-xl p-6 text-center border border-gray-200">
                                <span className="material-symbols-outlined text-gray-300 text-5xl mb-2">history</span>
                                <p className="text-sm text-gray-500">No activity recorded yet</p>
                            </div>
                        ) : (
                            [
                                { time: new Date().toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' }), action: 'Started shift', detail: runner.currentRow ? `Assigned to Row ${runner.currentRow}` : 'No row assigned' },
                            ].map((item, i) => (
                                <div key={i} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-sm font-bold text-gray-900">{item.action}</p>
                                        <span className="text-xs text-gray-500">{item.time}</span>
                                    </div>
                                    <p className="text-xs text-gray-600">{item.detail}</p>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// ====================================
// MODAL: PHOTO
// ====================================
const PhotoModal = ({ onClose }: { onClose: () => void }) => {
    const [photoTaken, setPhotoTaken] = useState(false);
    const [notes, setNotes] = useState('');

    const handleCapture = () => {
        setPhotoTaken(true);
        setTimeout(() => setPhotoTaken(false), 2000);
    };

    const handleSend = () => {
        if (photoTaken || notes) {
            alert(`📸 Photo Report Sent!\n\n${notes || 'No notes added'}\n\n✅ Manager and Team Leaders notified`);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-3xl p-8 w-80 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-gray-900">Photo Report</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div
                    onClick={handleCapture}
                    className={`rounded-2xl h-64 flex flex-col items-center justify-center mb-6 cursor-pointer transition-all ${photoTaken ? 'bg-green-100 border-2 border-green-500' : 'bg-gray-100 border-2 border-dashed border-gray-300'
                        }`}
                >
                    {photoTaken ? (
                        <>
                            <span className="material-symbols-outlined text-green-600 text-6xl mb-2">check_circle</span>
                            <p className="text-green-700 text-sm font-bold">Photo Captured!</p>
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-outlined text-gray-400 text-6xl mb-2">add_a_photo</span>
                            <p className="text-gray-500 text-sm font-bold">Tap to capture</p>
                        </>
                    )}
                </div>

                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes (optional): e.g. 'Damaged bin at Row 12'"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 mb-4 focus:border-[#ec1325] outline-none resize-none"
                    rows={3}
                />

                <button
                    onClick={handleSend}
                    disabled={!photoTaken && !notes}
                    className="w-full py-4 bg-[#ec1325] text-white rounded-xl font-bold uppercase tracking-widest active:scale-95 transition-all disabled:bg-gray-300"
                >
                    Send Report
                </button>
            </div>
        </div>
    );
};

// ====================================
// MODAL: PROFILE
// ====================================
const ProfileModal = ({ onClose, onLogout }: { onClose: () => void, onLogout: () => void }) => {
    const { appUser } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(appUser?.full_name || 'Runner User');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-3xl p-6 w-[90%] max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-gray-900">Profile Settings</h3>
                    <button onClick={onClose} className="text-gray-400">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="flex flex-col items-center mb-6">
                    <div className="size-20 rounded-full bg-[#ec1325] text-white flex items-center justify-center text-3xl font-bold mb-3">
                        {name.charAt(0)}
                    </div>
                    {isEditing ? (
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="text-center text-xl font-bold px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#ec1325] outline-none"
                        />
                    ) : (
                        <h4 className="text-xl font-black text-gray-900">{name}</h4>
                    )}
                    <p className="text-sm text-gray-500 mt-1">Bucket Runner</p>
                </div>

                <div className="space-y-3 mb-6">
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <p className="text-xs font-bold text-gray-500 uppercase mb-1">Email</p>
                        <p className="text-sm font-medium text-gray-900">{appUser?.email || 'runner@harvestpro.nz'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <p className="text-xs font-bold text-gray-500 uppercase mb-1">PIN</p>
                        <p className="text-sm font-medium text-gray-900">••••</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                        <p className="text-xs font-bold text-blue-600 uppercase mb-1">Today's Stats</p>
                        <div className="grid grid-cols-2 gap-3 mt-2">
                            <div>
                                <p className="text-2xl font-black text-blue-900">248</p>
                                <p className="text-xs text-blue-700">Buckets Moved</p>
                            </div>
                            <div>
                                <p className="text-2xl font-black text-blue-900">16</p>
                                <p className="text-xs text-blue-700">Bins Completed</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    {isEditing ? (
                        <>
                            <button
                                onClick={() => setIsEditing(false)}
                                className="w-full py-3 bg-[#ec1325] text-white rounded-xl font-bold"
                            >
                                Save Changes
                            </button>
                            <button
                                onClick={() => setIsEditing(false)}
                                className="w-full py-3 bg-gray-200 text-gray-700 rounded-xl font-bold"
                            >
                                Cancel
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="w-full py-3 bg-gray-200 text-gray-700 rounded-xl font-bold flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined">edit</span>
                                Edit Profile
                            </button>
                            <button
                                onClick={() => {
                                    if (confirm('Are you sure you want to logout?')) {
                                        onLogout();
                                    }
                                }}
                                className="w-full py-3 bg-red-50 text-red-600 border-2 border-red-200 rounded-xl font-bold flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined">logout</span>
                                Logout
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// ====================================
// HEADER
// ====================================
const Header = ({ title, onProfileClick }: { title: string, onProfileClick: () => void }) => (
    <header className="flex-none bg-white shadow-sm z-30">
        <div className="flex items-center px-4 py-3 justify-between">
            <h2 className="text-[#1b0d0f] text-xl font-bold leading-tight tracking-[-0.015em] flex-1">{title}</h2>
            <div className="flex items-center justify-end gap-3">
                <button className="flex items-center justify-center rounded-full size-10 bg-[#fdf2f3] text-[#ec1325] relative">
                    <span className="material-symbols-outlined text-[24px]">notifications</span>
                    <span className="absolute top-2 right-2.5 size-2 bg-[#ec1325] rounded-full border-2 border-white"></span>
                </button>
                <button
                    onClick={onProfileClick}
                    className="size-10 rounded-full bg-gray-200 overflow-hidden border border-gray-100 active:scale-95 transition-transform"
                >
                    <div className="w-full h-full bg-[#ec1325] text-white flex items-center justify-center font-bold">R</div>
                </button>
            </div>
        </div>
    </header>
);

// ====================================
// OFFLINE BANNER
// ====================================
const OfflineBanner = () => (
    <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 flex items-center gap-3">
        <span className="material-symbols-outlined text-amber-600 text-[20px]">cloud_off</span>
        <p className="text-amber-800 text-sm font-medium flex-1">Offline Sync Pending</p>
        <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-amber-600 animate-spin text-[18px]">sync</span>
            <span className="text-xs font-semibold text-amber-700">Updated 2m ago</span>
        </div>
    </div>
);

// ====================================
// LOGISTICS VIEW
// ====================================
const LogisticsView = ({
    onOpenScanner,
    onOpenSticker
}: {
    onOpenScanner: () => void,
    onOpenSticker: () => void
}) => {
    const { inventory, bins, addBucket, updateInventory } = useHarvest();
    const [sunMinutes, setSunMinutes] = useState(75);
    const [showCriticalAlert, setShowCriticalAlert] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => {
            setSunMinutes(prev => {
                const newVal = prev + 1;
                if (newVal === 60) setShowCriticalAlert(true);
                return newVal;
            });
        }, 60000);
        return () => clearInterval(timer);
    }, []);

    const currentBin = bins[0] || { id: 'BIN-TEMP', fillPercentage: 63 };
    const binProgress = currentBin.fillPercentage || 63;
    const bucketsCollected = Math.floor((binProgress / 100) * 72);
    const isAtLimit = bucketsCollected >= 72;
    const isNearLimit = bucketsCollected >= 65;

    const radius = 15.9155;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = `${(binProgress / 100) * circumference}, 100`;

    const formatTime = (mins: number) => {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
    };

    const sunWarning = sunMinutes >= 60;

    const handleRequestRefill = () => {
        updateInventory('emptyBins', 10);
        alert("📦 Refill requested!\n\n✅ 10 empty bins en route\n🚛 ETA: 15 minutes from depot");
    };

    return (
        <main className="flex-1 overflow-y-auto pb-44 px-4 pt-4 space-y-4">
            {showCriticalAlert && (
                <div className="bg-red-600 text-white rounded-2xl p-5 shadow-lg border-4 border-red-700 animate-pulse">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="material-symbols-outlined text-4xl">warning</span>
                        <div>
                            <h3 className="text-lg font-black uppercase">CRITICAL: MOVE BIN NOW!</h3>
                            <p className="text-sm font-bold">Fruit quality deteriorating</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowCriticalAlert(false)}
                        className="w-full mt-3 py-3 bg-white text-red-600 rounded-xl font-black uppercase"
                    >
                        Acknowledge & Transport
                    </button>
                </div>
            )}

            <div className={`bg-white rounded-2xl p-5 shadow-sm border-2 transition-all ${isAtLimit ? 'border-red-500' : isNearLimit ? 'border-orange-500' : 'border-gray-100'
                }`}>
                <div className="flex items-start justify-between mb-2">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 leading-none">{currentBin.id}</h2>
                        <p className="text-sm font-medium text-gray-500 mt-1">Stella Cherries</p>
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest border-2 ${isAtLimit ? 'bg-red-100 text-red-700 border-red-300' :
                        binProgress >= 90 ? 'bg-green-50 text-green-700 border-green-200' :
                            'bg-yellow-50 text-yellow-700 border-yellow-200'
                        }`}>
                        {isAtLimit ? '⚠️ FULL' : binProgress >= 90 ? 'Ready' : 'Active'}
                    </span>
                </div>

                {isNearLimit && !isAtLimit && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
                        <p className="text-xs font-bold text-orange-700 uppercase">⚠️ Approaching 72-bucket limit</p>
                        <p className="text-orange-600 text-xs mt-1">Prepare for bin swap</p>
                    </div>
                )}

                {isAtLimit && (
                    <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3 mb-3 animate-pulse">
                        <p className="text-sm font-black text-red-700 uppercase">🚫 LIMIT REACHED - DO NOT ADD MORE</p>
                        <p className="text-red-600 text-xs mt-1">Close bin immediately to prevent fruit damage</p>
                    </div>
                )}

                <div className="flex items-center justify-center py-4 relative">
                    <div className="w-48 h-48 relative">
                        <svg className="w-full h-full" viewBox="0 0 36 36">
                            <path className="stroke-[#f1f1f1] fill-none stroke-[3]" strokeLinecap="round" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"></path>
                            <path className={`fill-none stroke-[3] ${isAtLimit ? 'stroke-red-500' :
                                binProgress >= 90 ? 'stroke-green-500' :
                                    'stroke-[#ec1325]'
                                }`} strokeLinecap="round" strokeDasharray={strokeDasharray} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"></path>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-black text-gray-900">{binProgress}%</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Full</span>
                        </div>
                    </div>
                </div>

                <div className="text-center">
                    <p className="text-gray-900 text-xl font-black">
                        {bucketsCollected}
                        <span className="text-gray-400 font-bold mx-1">/</span>
                        <span className={isAtLimit ? 'text-red-600' : ''}>72</span>
                    </p>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-0.5">Buckets Collected</p>
                </div>
            </div>

            <div className={`bg-white rounded-2xl p-4 shadow-sm border-2 transition-all ${sunWarning ? 'border-red-500 bg-red-50 shadow-red-200' : 'border-gray-100'
                } flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                    <div className={`size-12 rounded-xl flex items-center justify-center ${sunWarning ? 'bg-red-200 text-red-700 animate-pulse' : 'bg-orange-100 text-orange-600'
                        }`}>
                        <span className="material-symbols-outlined filled text-[28px]">wb_sunny</span>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-tight">Sun Exposure</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`size-2.5 rounded-full ${sunWarning ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></span>
                            <p className={`text-sm font-black uppercase tracking-wide ${sunWarning ? 'text-red-600' : 'text-green-600'
                                }`}>
                                {sunWarning ? '🚨 CRITICAL!' : 'Safe Level'}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <p className={`text-2xl font-mono font-black tabular-nums ${sunWarning ? 'text-red-600' : 'text-gray-900'
                        }`}>
                        {formatTime(sunMinutes)}
                    </p>
                    {sunWarning && (
                        <p className="text-[10px] font-bold text-red-600 uppercase mt-1">Move to shade!</p>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4">Supply Management</h3>
                <div className="grid grid-cols-2 gap-4 mb-5">
                    <div className={`bg-gray-50 rounded-xl p-3 border-2 transition-all ${inventory.emptyBins < 10 ? 'border-orange-300 bg-orange-50' : 'border-gray-100'
                        }`}>
                        <p className="text-[11px] font-bold text-gray-500 uppercase">Empty Bins</p>
                        <div className="flex items-baseline justify-between mt-1">
                            <span className="text-2xl font-black text-gray-900">{inventory.emptyBins}</span>
                            <span className={`text-[10px] font-black uppercase ${inventory.emptyBins < 10 ? 'text-[#ec1325]' : 'text-green-600'
                                }`}>
                                {inventory.emptyBins < 10 ? '⚠️ Low' : 'OK'}
                            </span>
                        </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <p className="text-[11px] font-bold text-gray-500 uppercase">Full Bins</p>
                        <div className="flex items-baseline justify-between mt-1">
                            <span className="text-2xl font-black text-gray-900">{inventory.binsOfBuckets}</span>
                            <span className="text-[10px] font-black text-green-600 uppercase">Ready</span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={handleRequestRefill}
                    className="w-full bg-gray-900 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                    <span className="material-symbols-outlined text-[20px]">local_shipping</span>
                    Request Refill
                </button>
            </div>
        </main>
    );
};

// ====================================
// RUNNERS VIEW (MEJORADO CON ESTADO REAL)
// ====================================
const RunnersView = ({
    runners,
    onViewRunner,
    onAddRunner
}: {
    runners: Runner[],
    onViewRunner: (runner: Runner) => void,
    onAddRunner: () => void
}) => {
    return (
        <main className="flex-1 overflow-y-auto bg-[#f8f6f6] pb-24 px-4 pt-4">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Team Coordination</h2>
                    <p className="text-xs text-gray-500">{runners.length} active runners</p>
                </div>
                <button
                    onClick={onAddRunner}
                    className="px-4 py-2 bg-[#ec1325] text-white rounded-lg font-bold text-sm flex items-center gap-2 active:scale-95 transition-transform"
                >
                    <span className="material-symbols-outlined text-[20px]">add</span>
                    Add Runner
                </button>
            </div>

            {runners.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
                    <span className="material-symbols-outlined text-gray-300 text-6xl mb-3">person_add</span>
                    <p className="text-gray-500 font-medium mb-2">No runners added yet</p>
                    <p className="text-xs text-gray-400 mb-4">Add your first bucket runner to start tracking</p>
                    <button
                        onClick={onAddRunner}
                        className="px-6 py-3 bg-[#ec1325] text-white rounded-lg font-bold"
                    >
                        Add First Runner
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {runners.map((runner, idx) => (
                        <div key={runner.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-700 relative">
                                        {runner.avatar}
                                        <span className={`absolute bottom-0 right-0 size-3 rounded-full border-2 border-white ${runner.status === 'Active' ? 'bg-green-500 animate-pulse' :
                                            runner.status === 'Break' ? 'bg-orange-500' : 'bg-gray-400'
                                            }`}></span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">{runner.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="material-symbols-outlined text-[14px] text-gray-400">schedule</span>
                                            <p className="text-xs text-gray-500">Started {runner.startTime}</p>
                                        </div>
                                    </div>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${runner.status === 'Active' ? 'bg-green-100 text-green-700' :
                                    runner.status === 'Break' ? 'bg-orange-100 text-orange-700' :
                                        'bg-gray-100 text-gray-500'
                                    }`}>
                                    {runner.status}
                                </span>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-3 text-sm mb-3">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-bold text-gray-500 uppercase">Assignment</p>
                                    <span className="material-symbols-outlined text-blue-500 text-[16px]">location_on</span>
                                </div>
                                <p className="text-gray-900 font-medium">
                                    {runner.currentRow ? `Row ${runner.currentRow} • Block B` : 'No assignment'}
                                </p>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <div>
                                        <p className="text-xs text-gray-500">Buckets</p>
                                        <p className="font-bold text-gray-900">{runner.bucketsHandled}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Bins</p>
                                        <p className="font-bold text-gray-900">{runner.binsCompleted}</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => onViewRunner(runner)}
                                className="w-full py-2 bg-[#ec1325] text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
                            >
                                Manage Runner
                                <span className="material-symbols-outlined text-lg">arrow_forward</span>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-5 bg-white rounded-xl p-4 border border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 uppercase mb-3">Orchard Map</h3>
                <div className="bg-green-50 rounded-lg h-48 border-2 border-dashed border-green-200 flex items-center justify-center">
                    <div className="text-center">
                        <span className="material-symbols-outlined text-green-300 text-5xl mb-2">map</span>
                        <p className="text-sm font-bold text-green-600">Real-time positions coming soon</p>
                        <p className="text-xs text-green-500 mt-1">GPS tracking integration in progress</p>
                    </div>
                </div>
            </div>
        </main>
    );
};

// ====================================
// WAREHOUSE VIEW
// ====================================
const WarehouseView = () => {
    const { inventory, updateInventory, sendBroadcast } = useHarvest();

    const handleTransport = () => {
        const timestamp = new Date().toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' });
        sendBroadcast('Transport Request', `🚛 TRANSPORT REQUEST [${timestamp}]: ${inventory.binsOfBuckets} full bins ready for pickup`, 'high');
        alert(`✅ Transport request sent!\n\n📦 ${inventory.binsOfBuckets} bins marked\n🚛 Manager notified\n⏰ ${timestamp}`);
    };

    const stockLevel = inventory.emptyBins < 10 ? 'CRITICAL' : inventory.emptyBins < 20 ? 'LOW' : 'OK';

    const adjustEmptyBins = (amount: number) => {
        const newValue = Math.max(0, inventory.emptyBins + amount);
        updateInventory('emptyBins', newValue - inventory.emptyBins);
    };

    const adjustFullBins = (amount: number) => {
        const newValue = Math.max(0, inventory.binsOfBuckets + amount);
        updateInventory('binsOfBuckets', newValue - inventory.binsOfBuckets);
    };

    return (
        <main className="flex-1 overflow-y-auto bg-[#f8f6f6] pb-36">
            <div className="p-4 space-y-5">
                {stockLevel !== 'OK' && (
                    <div className={`rounded-2xl p-4 border-2 ${stockLevel === 'CRITICAL' ? 'bg-red-50 border-red-500' : 'bg-orange-50 border-orange-500'
                        }`}>
                        <div className="flex items-center gap-3">
                            <span className={`material-symbols-outlined text-3xl ${stockLevel === 'CRITICAL' ? 'text-red-600 animate-pulse' : 'text-orange-600'
                                }`}>
                                warning
                            </span>
                            <div>
                                <p className={`text-sm font-black uppercase ${stockLevel === 'CRITICAL' ? 'text-red-700' : 'text-orange-700'
                                    }`}>
                                    {stockLevel === 'CRITICAL' ? '🚨 CRITICAL: Empty bins depleted!' : '⚠️ Low stock alert'}
                                </p>
                                <p className={`text-xs font-medium mt-1 ${stockLevel === 'CRITICAL' ? 'text-red-600' : 'text-orange-600'
                                    }`}>
                                    Request immediate resupply from depot
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-2 h-full bg-[#ec1325] group-hover:w-3 transition-all"></div>
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">Harvested Stock</h3>
                            <h2 className="text-2xl font-bold text-gray-900">Full Cherry Bins</h2>
                        </div>
                        <div className="size-14 rounded-xl bg-red-50 flex items-center justify-center text-[#ec1325] border border-red-100">
                            <span className="material-symbols-outlined text-3xl">inventory_2</span>
                        </div>
                    </div>
                    <div className="mt-6 flex items-baseline gap-3">
                        <span className="text-6xl font-black text-gray-900 tracking-tighter">{inventory.binsOfBuckets}</span>
                        <span className="text-lg font-medium text-gray-500">filled</span>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                        <p className="text-sm font-bold text-gray-600">Manual Adjustment:</p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => adjustFullBins(-1)}
                                className="size-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center font-black active:scale-95 transition-transform"
                            >
                                -
                            </button>
                            <button
                                onClick={() => adjustFullBins(1)}
                                className="size-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center font-black active:scale-95 transition-transform"
                            >
                                +
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className={`bg-white rounded-2xl p-5 shadow-sm border-2 flex flex-col h-full transition-all ${stockLevel === 'CRITICAL' ? 'border-red-300' :
                        stockLevel === 'LOW' ? 'border-orange-200' :
                            'border-gray-200'
                        }`}>
                        <div className="flex items-start justify-between mb-4">
                            <div className={`size-10 rounded-lg flex items-center justify-center border ${stockLevel === 'CRITICAL' ? 'bg-red-100 text-red-600 border-red-200' :
                                stockLevel === 'LOW' ? 'bg-orange-100 text-orange-600 border-orange-200' :
                                    'bg-orange-50 text-orange-600 border-orange-100'
                                }`}>
                                <span className="material-symbols-outlined">grid_view</span>
                            </div>
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${stockLevel === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                                stockLevel === 'LOW' ? 'bg-orange-100 text-orange-700' :
                                    'bg-green-100 text-green-700'
                                }`}>
                                {stockLevel}
                            </span>
                        </div>
                        <div className="flex-1 flex flex-col justify-end">
                            <span className="text-5xl font-bold text-gray-900 block mb-1 tracking-tight">{inventory.emptyBins}</span>
                            <span className="text-sm font-bold text-gray-600 leading-tight block mb-3">Empty Bins Available</span>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => adjustEmptyBins(-5)}
                                    className="flex-1 py-2 rounded-lg bg-red-100 text-red-600 font-black active:scale-95 transition-transform"
                                >
                                    -5
                                </button>
                                <button
                                    onClick={() => adjustEmptyBins(5)}
                                    className="flex-1 py-2 rounded-lg bg-green-100 text-green-600 font-black active:scale-95 transition-transform"
                                >
                                    +5
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 shadow-sm border-2 border-gray-200 flex flex-col h-full">
                        <div className="flex items-start justify-between mb-4">
                            <div className="size-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
                                <span className="material-symbols-outlined">shopping_basket</span>
                            </div>
                            <span className="px-2 py-1 rounded text-[10px] font-bold bg-blue-100 text-blue-700 uppercase">Ready</span>
                        </div>
                        <div className="flex-1 flex flex-col justify-end">
                            <span className="text-5xl font-bold text-gray-900 block mb-1 tracking-tight">{inventory.binsOfBuckets}</span>
                            <span className="text-sm font-bold text-gray-600 leading-tight block">Waiting Transport</span>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-100 rounded-xl p-4 flex gap-3 border border-gray-200">
                    <span className="material-symbols-outlined text-gray-500">local_shipping</span>
                    <div className="text-sm text-gray-600 flex-1">
                        <p className="font-bold">Next Resupply Truck</p>
                        <p className="text-xs mt-0.5">Scheduled arrival in 45 mins from Depot A</p>
                        <div className="mt-2 flex items-center gap-2">
                            <div className="h-1 flex-1 bg-gray-300 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                            </div>
                            <span className="text-xs font-bold text-blue-600">60%</span>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
};

// ====================================
// MAIN COMPONENT
// ====================================
const Runner = () => {
    const { bins, addBucketWithValidation, inventory, sendBroadcast } = useHarvest();
    const { signOut, appUser, userName } = useAuth();

    const [currentView, setCurrentView] = useState<ViewState>('LOGISTICS');
    const [showScanner, setShowScanner] = useState(false);
    const [showSticker, setShowSticker] = useState(false);
    const [showPhoto, setShowPhoto] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [showAddRunner, setShowAddRunner] = useState(false);
    const [showRunnerDetails, setShowRunnerDetails] = useState<Runner | null>(null);

    // ✅ ESTADO REAL DE RUNNERS
    const [runners, setRunners] = useState<Runner[]>([]);

    const currentBin = bins[0] || { id: 'BIN-TEMP', fillPercentage: 63 };
    const bucketsCollected = Math.floor((currentBin.fillPercentage / 100) * 72);

    const getTitle = () => {
        switch (currentView) {
            case 'LOGISTICS': return 'Logistics Hub';
            case 'RUNNERS': return 'Orchard Runners';
            case 'WAREHOUSE': return 'Warehouse Inventory';
            case 'MESSAGING': return 'Messaging Hub';
        }
    };

    const handleScan = (code: string) => {
        alert(`✅ Bin Scanned: ${code}\n\n🏷️ QR validated\n📊 Tracking started\n⏰ Timer reset`);
    };

    // ✅ NUEVO: Usa validación de duplicados
    const handleStickerComplete = async (code?: string) => {
        if (!code) {
            alert('❌ Error: No se recibió código del sticker');
            return;
        }

        const result = await addBucketWithValidation(currentBin.id, code);

        if (result.success) {
            alert(`✅ Bucket registrado!\n\n📦 Bin: ${currentBin.id}\n🔢 Total: ${bucketsCollected + 1}/72\n🏷️ Sticker: ${code}\n👤 Picker: ${result.pickerId || 'N/A'}`);
        } else {
            alert(result.error || '❌ Error al escanear sticker');
        }
    };

    const handleAddRunner = (runner: Runner) => {
        setRunners([...runners, runner]);
        alert(`✅ Runner added!\n\n👤 ${runner.name}\n⏰ Started at ${runner.startTime}\n📍 ${runner.currentRow ? `Row ${runner.currentRow}` : 'No assignment'}`);
    };

    const handleUpdateRunner = (updatedRunner: Runner) => {
        setRunners(runners.map(r => r.id === updatedRunner.id ? updatedRunner : r));
        alert(`✅ Runner updated!\n\n👤 ${updatedRunner.name}\n📊 Status: ${updatedRunner.status}`);
    };

    const handleDeleteRunner = (runnerId: string) => {
        setRunners(runners.filter(r => r.id !== runnerId));
        alert(`✅ Runner removed from active list`);
    };

    return (
        <div className="h-screen flex flex-col overflow-hidden bg-[#f8f6f6]">
            <Header title={getTitle()} onProfileClick={() => setShowProfile(true)} />
            <OfflineBanner />

            {currentView === 'LOGISTICS' && (
                <LogisticsView
                    onOpenScanner={() => setShowScanner(true)}
                    onOpenSticker={() => setShowSticker(true)}
                />
            )}
            {currentView === 'MESSAGING' && appUser?.id && (
                <main className="flex-1 overflow-hidden px-4 py-2 pb-32">
                    <div className="h-full">
                        <SimpleChat
                            userId={appUser.id}
                            userName={userName || appUser.full_name || 'Runner'}
                        />
                    </div>
                </main>
            )}
            {currentView === 'WAREHOUSE' && <WarehouseView />}
            {currentView === 'RUNNERS' && (
                <RunnersView
                    runners={runners}
                    onViewRunner={(runner) => setShowRunnerDetails(runner)}
                    onAddRunner={() => setShowAddRunner(true)}
                />
            )}

            {/* ✅ TODOS LOS MODALES */}
            {showScanner && (
                <RealScannerModal
                    onClose={() => setShowScanner(false)}
                    onScan={handleScan}
                    scanType="BIN"
                />
            )}
            {showSticker && (
                <RealScannerModal
                    onClose={() => setShowSticker(false)}
                    onScan={handleStickerComplete}
                    scanType="BUCKET"
                />
            )}
            {showPhoto && <PhotoModal onClose={() => setShowPhoto(false)} />}
            {showProfile && <ProfileModal onClose={() => setShowProfile(false)} onLogout={signOut} />}
            {showAddRunner && <AddRunnerModal onClose={() => setShowAddRunner(false)} onAdd={handleAddRunner} />}
            {showRunnerDetails && (
                <RunnerDetailsModal
                    runner={showRunnerDetails}
                    onClose={() => setShowRunnerDetails(null)}
                    onUpdate={handleUpdateRunner}
                    onDelete={handleDeleteRunner}
                />
            )}


            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 w-full z-40 bg-white border-t border-gray-100 shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
                {currentView === 'LOGISTICS' && (
                    <div className="flex gap-4 p-4">
                        <button
                            onClick={() => setShowScanner(true)}
                            className="flex-1 flex flex-col items-center justify-center py-4 bg-white border-2 border-[#ec1325] text-[#ec1325] rounded-2xl font-black text-xs uppercase tracking-widest active:bg-gray-50"
                        >
                            <span className="material-symbols-outlined mb-1 text-[28px]">crop_free</span>
                            Scan Bin
                        </button>
                        <button
                            onClick={() => setShowSticker(true)}
                            disabled={bucketsCollected >= 72}
                            className="flex-1 flex flex-col items-center justify-center py-4 bg-[#ec1325] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-200 active:bg-[#c00f1e] disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                            <span className="material-symbols-outlined mb-1 text-[28px]">label</span>
                            {bucketsCollected >= 72 ? 'Bin Full' : 'Scan Sticker'}
                        </button>
                    </div>
                )}

                {currentView === 'WAREHOUSE' && (
                    <div className="p-4 pb-2">
                        <button
                            onClick={() => {
                                const timestamp = new Date().toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' });
                                sendBroadcast('Transport Request', `🚛 TRANSPORT REQUEST [${timestamp}]: ${inventory.binsOfBuckets} full bins ready`, 'high');
                                alert("✅ Transport request sent!");
                            }}
                            className="w-full h-16 bg-[#ec1325] hover:bg-[#c00f1e] text-white rounded-xl shadow-lg shadow-[#ec1325]/30 flex items-center justify-center gap-3 active:scale-[0.98] transition-all group"
                        >
                            <span className="material-symbols-outlined text-3xl group-active:scale-90 transition-transform">local_shipping</span>
                            <span className="text-lg font-extrabold uppercase tracking-wide">Request Transport</span>
                        </button>
                    </div>
                )}

                <nav className="flex items-center justify-around px-2 pb-8 pt-2">
                    {[
                        { id: 'LOGISTICS', icon: 'local_shipping', label: 'Logistics' },
                        { id: 'RUNNERS', icon: 'groups', label: 'Runners' },
                        { id: 'WAREHOUSE', icon: 'inventory_2', label: 'Warehouse' },
                        { id: 'MESSAGING', icon: 'chat', label: 'Messaging' }
                    ].map(item => {
                        const isActive = currentView === item.id;
                        return (
                            <button key={item.id} onClick={() => setCurrentView(item.id as ViewState)} className={`flex flex-col items-center gap-1 min-w-[64px] ${isActive ? 'text-[#ec1325]' : 'text-gray-400'}`}>
                                <div className="relative">
                                    <span className="material-symbols-outlined" style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>{item.icon}</span>
                                </div>
                                <span className={`text-[10px] ${isActive ? 'font-black uppercase' : 'font-black uppercase'}`}>{item.label}</span>
                            </button>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
};

export default Runner;
