import React, { useState } from 'react';
import { Picker } from '../../../../types';

interface RunnersSectionProps {
    runners: Picker[];
    onSelectUser: (user: Picker) => void;
    onRemoveUser?: (userId: string) => Promise<void>;
}

const RunnersSection: React.FC<RunnersSectionProps> = ({ runners, onSelectUser, onRemoveUser }) => {
    const [unlinking, setUnlinking] = useState<string | null>(null);
    const [confirmId, setConfirmId] = useState<string | null>(null);

    const handleUnlink = async (e: React.MouseEvent, userId: string) => {
        e.stopPropagation();
        if (!onRemoveUser) return;

        // Two-click pattern: first click shows confirm, second click executes
        if (confirmId !== userId) {
            setConfirmId(userId);
            setTimeout(() => setConfirmId(prev => prev === userId ? null : prev), 3000);
            return;
        }

        setConfirmId(null);
        setUnlinking(userId);
        try {
            await onRemoveUser(userId);
        } catch (err) {
            console.error('Unlink runner failed:', err);
        } finally {
            setUnlinking(null);
        }
    };

    return (
        <section className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-text-main flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-500">local_shipping</span>
                    Active Runners
                </h3>
                <span className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-bold">
                    {runners.length} active
                </span>
            </div>

            {runners.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {runners.map((runner, i) => (
                        <div
                            key={runner.id}
                            onClick={() => onSelectUser(runner)}
                            className={`p-4 rounded-xl border border-border-light bg-slate-50 flex items-center justify-between group card-hover cursor-pointer list-item-enter stagger-${Math.min(i + 1, 8)}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                                    {runner.avatar || runner.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <h4 className="font-bold text-text-main text-sm">{runner.name}</h4>
                                    <p className="text-xs text-slate-400 font-medium">Logistics Team</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1">
                                {/* Unlink button — two-click confirmation */}
                                {onRemoveUser && (
                                    <button
                                        onClick={(e) => handleUnlink(e, runner.id)}
                                        disabled={unlinking === runner.id}
                                        className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all duration-200 active:scale-90 ${confirmId === runner.id
                                            ? 'bg-red-500 text-white shadow-sm opacity-100'
                                            : 'text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100'
                                            }`}
                                        title={confirmId === runner.id ? 'Click again to confirm' : 'Unlink from orchard'}
                                    >
                                        <span className="material-symbols-outlined text-sm">
                                            {unlinking === runner.id ? 'hourglass_top' : 'link_off'}
                                        </span>
                                        {confirmId === runner.id && <span className="text-[10px]">Confirm?</span>}
                                    </button>
                                )}
                                <span className="material-symbols-outlined text-slate-300 group-hover:text-blue-500 transition-colors">
                                    chevron_right
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-border-light">
                    <span className="material-symbols-outlined text-3xl mb-2">person_off</span>
                    <p className="text-sm font-medium">No Bucket Runners assigned</p>
                </div>
            )}
        </section>
    );
};

export default RunnersSection;
