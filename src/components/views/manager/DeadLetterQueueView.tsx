import React, { useEffect, useState } from 'react';
import { syncService } from '@/services/sync.service';
import { offlineService } from '@/services/offline.service';
import { XCircle, RefreshCw, Trash2, AlertTriangle } from 'lucide-react';

interface DeadLetterItem {
    id: string;
    type: string;
    payload: any;
    timestamp: number;
    retryCount: number;
    failureReason?: string;
}

const DeadLetterQueueView: React.FC = () => {
    const [deadLetters, setDeadLetters] = useState<DeadLetterItem[]>([]);
    const [loading, setLoading] = useState(false);

    const loadDeadLetters = () => {
        try {
            // Get items with retryCount >= 50 from syncService Queue
            const allQueue = syncService.getQueue();
            const failed = allQueue.filter((item: any) => item.retryCount >= 50);
            setDeadLetters(failed);
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
            // Reset retry count and add back to queue
            const queue = syncService.getQueue();
            const updatedQueue = queue.map((q: any) =>
                q.id === item.id ? { ...q, retryCount: 0 } : q
            );
            syncService.saveQueue(updatedQueue);

            // Trigger processing
            await syncService.processQueue();

            // Reload
            loadDeadLetters();
        } catch (e) {
            console.error('[DLQ] Retry failed:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleDiscard = (item: DeadLetterItem) => {
        const queue = syncService.getQueue();
        const filtered = queue.filter((q: any) => q.id !== item.id);
        syncService.saveQueue(filtered);
        loadDeadLetters();
    };

    const handleDiscardAll = () => {
        if (!confirm('⚠️ This will permanently delete all failed sync items. Are you sure?')) {
            return;
        }

        const queue = syncService.getQueue();
        const filtered = queue.filter((q: any) => q.retryCount < 50);
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

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <AlertTriangle className="w-6 h-6 text-amber-600" />
                    <h2 className="text-2xl font-bold text-gray-900">Dead Letter Queue</h2>
                </div>
                <p className="text-gray-600 text-sm">
                    Items that failed to sync after 50 retries. You can manually retry or discard them.
                </p>
            </div>

            {deadLetters.length === 0 ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">✓</span>
                    </div>
                    <h3 className="text-lg font-bold text-green-900 mb-2">All Clear!</h3>
                    <p className="text-green-700">No failed sync items.</p>
                </div>
            ) : (
                <>
                    <div className="flex justify-between items-center mb-4">
                        <div className="text-sm text-gray-600">
                            <span className="font-bold text-red-600">{deadLetters.length}</span> failed item(s)
                        </div>
                        <button
                            onClick={handleDiscardAll}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                        >
                            <Trash2 className="w-4 h-4" />
                            Discard All
                        </button>
                    </div>

                    <div className="space-y-3">
                        {deadLetters.map((item) => (
                            <div
                                key={item.id}
                                className="bg-white border border-red-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold uppercase">
                                                {item.type}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {formatTimestamp(item.timestamp)}
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-600 mb-2">
                                            Retried <span className="font-bold text-red-600">{item.retryCount}</span> times
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleRetry(item)}
                                            disabled={loading}
                                            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                                            title="Retry sync"
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDiscard(item)}
                                            className="p-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                                            title="Discard item"
                                        >
                                            <XCircle className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <details className="text-xs">
                                    <summary className="cursor-pointer text-gray-500 hover:text-gray-700 font-medium mb-2">
                                        View Payload
                                    </summary>
                                    <pre className="bg-gray-50 p-3 rounded-lg overflow-auto max-h-40 border border-gray-200">
                                        <code className="text-xs text-gray-800">
                                            {JSON.stringify(item.payload, null, 2)}
                                        </code>
                                    </pre>
                                </details>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default DeadLetterQueueView;
