/**
 * BroadcastModal - Modal para enviar broadcasts al equipo
 * Phase 2: Con selector de roles y tema claro
 */

import React, { useState } from 'react';

type TargetRole = 'all' | 'team_leaders' | 'runners';

interface BroadcastModalProps {
    onClose: () => void;
    onSend: (title: string, message: string, priority: 'normal' | 'high' | 'urgent', targetRole?: TargetRole) => void | Promise<void>;
}

const BroadcastModal: React.FC<BroadcastModalProps> = ({ onClose, onSend }) => {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
    const [targetRole, setTargetRole] = useState<TargetRole>('all');
    const [isSending, setIsSending] = useState(false);

    const handleSend = async () => {
        if (!title.trim() || !message.trim()) return;
        setIsSending(true);

        // Haptic feedback on send
        if (navigator.vibrate) navigator.vibrate(100);

        try {
            await onSend(title, message, priority, targetRole);
            onClose();
        } finally {
            setIsSending(false);
        }
    };

    const roleLabels: Record<TargetRole, { label: string; count: string }> = {
        all: { label: 'Todos', count: '~25' },
        team_leaders: { label: 'Team Leaders', count: '~5' },
        runners: { label: 'Runners', count: '~20' }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="size-12 rounded-xl bg-red-100 flex items-center justify-center">
                            <span className="material-symbols-outlined text-red-600 text-2xl">campaign</span>
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900">Nuevo Broadcast</h3>
                            <p className="text-xs text-slate-500">Enviar mensaje al equipo</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Target Role Selector */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Destinatarios</label>
                        <div className="grid grid-cols-3 gap-2">
                            {(['all', 'team_leaders', 'runners'] as TargetRole[]).map((role) => (
                                <button
                                    key={role}
                                    onClick={() => setTargetRole(role)}
                                    className={`py-2 px-2 rounded-xl text-xs font-bold transition-all ${targetRole === role
                                            ? 'bg-slate-900 text-white'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    <span className="block">{roleLabels[role].label}</span>
                                    <span className="text-[10px] opacity-60">{roleLabels[role].count}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Título</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="ej. Alerta de Clima"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                        />
                    </div>

                    {/* Message */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Mensaje</label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Escribe tu mensaje..."
                            rows={3}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none resize-none"
                        />
                    </div>

                    {/* Priority */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Prioridad</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { value: 'normal', label: 'Normal', color: 'bg-slate-500', ring: 'ring-slate-500' },
                                { value: 'high', label: 'Alta', color: 'bg-orange-500', ring: 'ring-orange-500' },
                                { value: 'urgent', label: 'Urgente', color: 'bg-red-500', ring: 'ring-red-500' },
                            ].map((p) => (
                                <button
                                    key={p.value}
                                    onClick={() => setPriority(p.value as 'normal' | 'high' | 'urgent')}
                                    className={`py-2.5 px-3 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 ${priority === p.value
                                            ? `${p.color} text-white ring-2 ${p.ring} ring-offset-2`
                                            : 'bg-slate-100 text-slate-600'
                                        }`}
                                >
                                    <span className={`size-2 rounded-full ${priority === p.value ? 'bg-white' : p.color}`} />
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Urgent Warning */}
                    {priority === 'urgent' && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                            <p className="text-xs text-red-700 font-medium">
                                ⚠️ Los mensajes urgentes activarán vibración y alerta sonora en todos los dispositivos.
                            </p>
                        </div>
                    )}
                </div>

                <button
                    onClick={handleSend}
                    disabled={!title.trim() || !message.trim() || isSending}
                    className="w-full mt-6 py-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold uppercase tracking-wide disabled:bg-slate-300 disabled:text-slate-500 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                    <span className="material-symbols-outlined">send</span>
                    {isSending ? 'Enviando...' : 'Enviar Broadcast'}
                </button>
            </div>
        </div>
    );
};

export default BroadcastModal;

