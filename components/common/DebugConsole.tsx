import React, { useState, useEffect } from 'react';
import { db } from '../../services/db';

interface DebugConsoleProps {
    onClose: () => void;
}

const DebugConsole: React.FC<DebugConsoleProps> = ({ onClose }) => {
    const [logs, setLogs] = useState<any[]>([]);
    const [stats, setStats] = useState<any>({});

    useEffect(() => {
        const loadDebug = async () => {
            const telemetry = await db.telemetry_logs.orderBy('id').reverse().limit(50).toArray();
            setLogs(telemetry);

            const pendingBuckets = await db.bucket_queue.where('synced').equals(0).count();
            const errorBuckets = await db.bucket_queue.where('synced').equals(-1).count();
            setStats({ pendingBuckets, errorBuckets });
        };
        loadDebug();
        const interval = setInterval(loadDebug, 2000);
        return () => clearInterval(interval);
    }, []);

    const clearLogs = async () => {
        if (confirm('¿Limpiar logs de telemetría?')) {
            await db.telemetry_logs.clear();
            setLogs([]);
        }
    };

    return (
        <div className="fixed inset-0 z-[999] bg-slate-900 text-green-400 font-mono text-[10px] flex flex-col p-4 overflow-hidden">
            <div className="flex justify-between items-center border-b border-slate-700 pb-2 mb-2">
                <h2 className="font-bold uppercase tracking-widest text-[#00f0ff]">Día D: Debug Console</h2>
                <div className="flex gap-2">
                    <button onClick={clearLogs} className="bg-red-900/50 text-red-200 px-2 py-1 rounded text-[8px] uppercase">Clear</button>
                    <button onClick={onClose} className="bg-slate-700 text-white px-3 py-1 rounded">CLOSE</button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-slate-800 p-2 rounded">
                    <p className="text-[8px] text-slate-400 uppercase">Queue Pending</p>
                    <p className="text-xl font-bold">{stats.pendingBuckets || 0}</p>
                </div>
                <div className="bg-slate-800 p-2 rounded">
                    <p className="text-[8px] text-slate-400 uppercase">Queue Errors</p>
                    <p className="text-xl font-bold text-red-500">{stats.errorBuckets || 0}</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
                {logs.map((log) => (
                    <div key={log.id} className="border-l-2 border-slate-700 pl-2 py-1 bg-slate-800/30">
                        <div className="flex justify-between text-[8px] mb-1">
                            <span className={log.level === 'ERROR' ? 'text-red-500' : 'text-cyan-500'}>[{log.level}] {log.context}</span>
                            <span className="text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-slate-200 leading-tight">{log.message}</p>
                        {log.metadata && (
                            <pre className="text-[7px] text-slate-500 mt-1 max-h-20 overflow-hidden">
                                {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                        )}
                    </div>
                ))}
            </div>

            <div className="mt-2 text-[8px] text-slate-500 text-center">
                V3.0.0-PRO-PILOT | ENGINE: DEXIE | RLS: ACTIVE
            </div>
        </div>
    );
};

export default DebugConsole;
