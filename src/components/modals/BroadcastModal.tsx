/**
 * BroadcastModal - Modal para enviar broadcasts a todo el equipo
 * Extraído de Manager.tsx para reutilización
 */

import React, { useState } from 'react';

interface BroadcastModalProps {
    onClose: () => void;
    onSend: (title: string, message: string, priority: 'normal' | 'high' | 'urgent') => void | Promise<void>;
}

const BroadcastModal: React.FC<BroadcastModalProps> = ({ onClose, onSend }) => {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
    const [isSending, setIsSending] = useState(false);

    const handleSend = async () => {
        if (!title.trim() || !message.trim()) return;
        setIsSending(true);
        try {
            await onSend(title, message, priority);
            onClose();
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[#1e1e1e] rounded-3xl p-6 w-[90%] max-w-md shadow-2xl border border-[#333]" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="size-12 rounded-xl bg-primary/20 flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary text-2xl">campaign</span>
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white">New Broadcast</h3>
                            <p className="text-xs text-[#a1a1aa]">Send to all field staff</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-[#a1a1aa] hover:text-white">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-[#a1a1aa] uppercase mb-2 block">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Weather Alert"
                            className="w-full bg-[#121212] border border-[#333] rounded-xl px-4 py-3 text-white focus:border-primary outline-none"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-[#a1a1aa] uppercase mb-2 block">Message</label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Type your broadcast message..."
                            rows={4}
                            className="w-full bg-[#121212] border border-[#333] rounded-xl px-4 py-3 text-white focus:border-primary outline-none resize-none"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-[#a1a1aa] uppercase mb-2 block">Priority</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { value: 'normal', label: 'Normal', color: 'bg-gray-500' },
                                { value: 'high', label: 'High', color: 'bg-orange-500' },
                                { value: 'urgent', label: 'Urgent', color: 'bg-red-500' },
                            ].map((p) => (
                                <button
                                    key={p.value}
                                    onClick={() => setPriority(p.value as 'normal' | 'high' | 'urgent')}
                                    className={`py-2 px-3 rounded-lg text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 ${priority === p.value
                                            ? `${p.color} text-white`
                                            : 'bg-[#121212] text-[#a1a1aa] border border-[#333]'
                                        }`}
                                >
                                    <span className={`size-2 rounded-full ${p.color}`}></span>
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {priority === 'urgent' && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                            <p className="text-xs text-red-400">
                                ⚠️ Urgent broadcasts will trigger push notifications and audio alerts on all devices.
                            </p>
                        </div>
                    )}
                </div>

                <button
                    onClick={handleSend}
                    disabled={!title.trim() || !message.trim() || isSending}
                    className="w-full mt-6 py-4 bg-primary text-white rounded-xl font-bold uppercase tracking-widest disabled:bg-gray-600 active:scale-[0.98] transition-all"
                >
                    {isSending ? 'Sending...' : 'Send Broadcast'}
                </button>
            </div>
        </div>
    );
};

export default BroadcastModal;
