import React, { useEffect, useState } from 'react';
import { syncService } from '@/services/sync.service';



interface DeadLetterItem {
    id: string;
    type: string;
    payload: Record<string, unknown>;
    timestamp: number;
    retryCount: number;
    failureReason?: string;
    error?: { message?: string; code?: string };
}

interface CategorizedErrors {
    critical: DeadLetterItem[];
    warnings: DeadLetterItem[];
    recent: DeadLetterItem[];
}

const DeadLetterQueueView: React.FC = () => {
    const [deadLetters, setDeadLetters] = useState<CategorizedErrors>({
        critical: [],
        warnings: [],
        recent: []
    });
    const [loading, setLoading] = useState(false);

    const loadDeadLetters = () => {
        try {
            // 🔴 FASE 9: Show ALL errors, not just retryCount >= 50
            const allQueue = syncService.getQueue();
            const failed = allQueue.filter((item: DeadLetterItem) =>
                item.retryCount > 0 || // Has failed at least once
                item.error // Has explicit error
            );

            // Classify by severity
            const critical = failed.filter((f: DeadLetterItem) => f.retryCount >= 50);
            const warnings = failed.filter((f: DeadLetterItem) => f.retryCount < 50 && f.retryCount > 10);
            const recent = failed.filter((f: DeadLetterItem) => f.retryCount <= 10);

            setDeadLetters({ critical, warnings, recent });
        } catch (e) {

            console.error('[DLQ] Failed to load dead letters:', e);
        }
    };

    useEffect(() => {
        loadDeadLetters();
    }, []);

    const handleRetry = async (item: DeadLetterItem) => {
        setLoading(true);
        try {
            const queue = syncService.getQueue();
            const updatedQueue = queue.map(q =>
                q.id === item.id ? { ...q, retryCount: 0, error: null } : q
            );
            syncService.saveQueue(updatedQueue);
            await syncService.processQueue();
            loadDeadLetters();
        } catch (e) {

            console.error('[DLQ] Retry failed:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleDiscard = (item: DeadLetterItem) => {
        const queue = syncService.getQueue();
        const filtered = queue.filter((q: DeadLetterItem) => q.id !== item.id);
        syncService.saveQueue(filtered);
        loadDeadLetters();
    };

    const handleDiscardAll = (severity: 'critical' | 'all') => {
        const message = severity === 'all'
            ? '⚠️ This will permanently delete ALL failed sync items. Are you sure?'
            : '⚠️ This will delete all critical errors (50+ retries). Are you sure?';

        if (!confirm(message)) return;

        const queue = syncService.getQueue();
        const filtered = severity === 'all'
            ? queue.filter((q: DeadLetterItem) => q.retryCount === 0 && !q.error)
            : queue.filter((q: DeadLetterItem) => q.retryCount < 50);

        syncService.saveQueue(filtered);
        loadDeadLetters();
    };

    const formatTimestamp = (ts: number) => {
        return new Date(ts).toLocaleString('en-NZ', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getErrorTooltip = (item: DeadLetterItem): string => {
        const errorCode = item.error?.code;
        const errorMsg = item.error?.message || item.failureReason;

        // Common error explanations
        if (errorCode === '23503') {
            return '❌ Foreign Key Violation: Picker or orchard no longer exists in database';
        }
        if (errorCode === '23505') {
            return '⚠️ Duplicate: This record already exists in the database';
        }
        if (errorCode === 'PGRST116') {
            return '🔒 RLS Policy Violation: Action blocked by database security rules (e.g., archived picker)';
        }
        if (errorMsg?.includes('archived')) {
            return '🚫 Picker Archived: Cannot sync buckets for removed/suspended workers';
        }
        if (errorMsg?.includes('Network')) {
            return '📡 Network Error: Connection lost during sync';
        }
        return errorMsg || 'Unknown error';
    };

    const renderErrorSection = (
        title: string,
        items: DeadLetterItem[],
        icon: React.ReactNode,
        borderColor: string,
        bgColor: string,
        textColor: string
    ) => {
        if (items.length === 0) return null;

        return (
            <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        {icon}
                        <h3 className={`text-lg font-bold ${textColor}`}>{title}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${bgColor} ${textColor}`}>
                            {items.length}
                        </span>
                    </div>
                    {title === 'Critical Errors' && (
                        <button
                            onClick={() => handleDiscardAll('critical')}
                            className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                        >
                            Discard Critical
                        </button>
                    )}
                </div>

                <div className="space-y-2">
                    {items.map((item) => (
                        <div
                            key={item.id}
                            className={`bg-white border ${borderColor} rounded-lg p-3 hover:shadow-sm transition-shadow`}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`px-2 py-0.5 ${bgColor} ${textColor} rounded text-xs font-bold uppercase`}>
                                            {item.type}
                                        </span>
                                        <span className="text-xs text-text-muted">
                                            {formatTimestamp(item.timestamp)}
                                        </span>
                                    </div>
                                    <div className="text-xs text-text-sub mb-1">
                                        Retries: <span className={`font-bold ${textColor}`}>{item.retryCount}</span>
                                    </div>

                                    {/* 🔴 FASE 9: Error tooltip */}
                                    {(item.error || item.failureReason) && (
                                        <div className="text-xs text-red-600 font-mono mt-1 bg-red-50 p-2 rounded border border-red-100">
                                            {getErrorTooltip(item)}
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => handleRetry(item)}
                                        disabled={loading}
                                        className="p-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
                                        title="Retry sync"
                                    >
                                        <span className="material-symbols-outlined text-sm">refresh</span>
                                    </button>
                                    <button
                                        onClick={() => handleDiscard(item)}
                                        className="p-1.5 bg-slate-200 text-text-sub rounded hover:bg-slate-300 transition-colors"
                                        title="Discard item"
                                    >
                                        <span className="material-symbols-outlined text-sm">cancel</span>
                                    </button>
                                </div>
                            </div>

                            <details className="text-xs mt-2">
                                <summary className="cursor-pointer text-text-muted hover:text-text-sub font-medium">
                                    View Payload
                                </summary>
                                <pre className="bg-slate-50 p-2 rounded overflow-auto max-h-32 border border-border-light mt-1">
                                    <code className="text-xs text-text-main">
                                        {JSON.stringify(item.payload, null, 2)}
                                    </code>
                                </pre>
                            </details>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const totalErrors = deadLetters.critical.length + deadLetters.warnings.length + deadLetters.recent.length;

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-2xl text-amber-600">warning</span>
                        <h2 className="text-2xl font-bold text-text-main">Dead Letter Queue</h2>
                    </div>
                    {totalErrors > 0 && (
                        <button
                            onClick={() => handleDiscardAll('all')}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                        >
                            <span className="material-symbols-outlined text-base">delete</span>
                            Discard All ({totalErrors})
                        </button>
                    )}
                </div>
                <p className="text-text-sub text-sm">
                    Monitor and manage failed sync items. Errors are classified by severity.
                </p>
            </div>

            {totalErrors === 0 ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">✓</span>
                    </div>
                    <h3 className="text-lg font-bold text-green-900 mb-2">All Clear!</h3>
                    <p className="text-green-700">No failed sync items.</p>
                </div>
            ) : (
                <>
                    {renderErrorSection(
                        'Critical Errors',
                        deadLetters.critical,
                        <span className="material-symbols-outlined text-xl text-red-600">error</span>,
                        'border-red-300',
                        'bg-red-100',
                        'text-red-700'
                    )}

                    {renderErrorSection(
                        'Warnings',
                        deadLetters.warnings,
                        <span className="material-symbols-outlined text-xl text-amber-600">warning</span>,
                        'border-amber-300',
                        'bg-amber-100',
                        'text-amber-700'
                    )}

                    {renderErrorSection(
                        'Recent Failures',
                        deadLetters.recent,
                        <span className="material-symbols-outlined text-xl text-blue-600">info</span>,
                        'border-blue-300',
                        'bg-blue-100',
                        'text-blue-700'
                    )}
                </>
            )}
        </div>
    );
};

export default DeadLetterQueueView;