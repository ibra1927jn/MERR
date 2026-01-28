/**
 * Photo Report Modal - For capturing and sending photo reports
 */
import React, { useState } from 'react';

interface PhotoModalProps {
    onClose: () => void;
    onSend?: (notes: string, hasPhoto: boolean) => void;
}

const PhotoModal: React.FC<PhotoModalProps> = ({ onClose, onSend }) => {
    const [photoTaken, setPhotoTaken] = useState(false);
    const [notes, setNotes] = useState('');

    const handleCapture = () => {
        setPhotoTaken(true);
        setTimeout(() => setPhotoTaken(false), 2000);
    };

    const handleSend = () => {
        if (photoTaken || notes) {
            onSend?.(notes, photoTaken);
            alert(
                `📸 Photo Report Sent!\n\n${notes || 'No notes added'}\n\n✅ Manager and Team Leaders notified`
            );
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div className="bg-white rounded-3xl p-8 w-80 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-gray-900">Photo Report</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div
                    onClick={handleCapture}
                    className={`rounded-2xl h-64 flex flex-col items-center justify-center mb-6 cursor-pointer transition-all ${photoTaken
                            ? 'bg-green-100 border-2 border-green-500'
                            : 'bg-gray-100 border-2 border-dashed border-gray-300'
                        }`}
                >
                    {photoTaken ? (
                        <>
                            <span className="material-symbols-outlined text-green-600 text-6xl mb-2">
                                check_circle
                            </span>
                            <p className="text-green-700 text-sm font-bold">Photo Captured!</p>
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-outlined text-gray-400 text-6xl mb-2">
                                add_a_photo
                            </span>
                            <p className="text-gray-500 text-sm font-bold">Tap to capture</p>
                        </>
                    )}
                </div>

                <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Add notes (optional): e.g. 'Damaged bin at Row 12'"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 mb-4 focus:border-[#d91e36] outline-none resize-none"
                    rows={3}
                />

                <button
                    onClick={handleSend}
                    disabled={!photoTaken && !notes}
                    className="w-full py-4 bg-[#d91e36] text-white rounded-xl font-bold uppercase tracking-widest active:scale-95 transition-all disabled:bg-gray-300"
                >
                    Send Report
                </button>
            </div>
        </div>
    );
};

export default PhotoModal;
