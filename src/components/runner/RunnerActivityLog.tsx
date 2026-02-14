import React from 'react';
import { RunnerData } from '@/components/modals/RunnerDetailsModal';

interface RunnerActivityLogProps {
    runner: RunnerData;
}

const RunnerActivityLog: React.FC<RunnerActivityLogProps> = ({ runner }) => (
    <div className="space-y-3">
        <p className="text-xs font-bold text-gray-500 uppercase">Recent Activity</p>
        {runner.binsCompleted === 0 ? (
            <div className="bg-gray-50 rounded-xl p-6 text-center border border-gray-200">
                <span className="material-symbols-outlined text-gray-300 text-5xl mb-2">
                    history
                </span>
                <p className="text-sm text-gray-500">No activity recorded yet</p>
            </div>
        ) : (
            [
                {
                    time: new Date().toLocaleTimeString('en-NZ', {
                        hour: '2-digit',
                        minute: '2-digit',
                    }),
                    action: 'Started shift',
                    detail: runner.currentRow
                        ? `Assigned to Row ${runner.currentRow}`
                        : 'No row assigned',
                },
            ].map((item, i) => (
                <div
                    key={i}
                    className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                >
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-bold text-gray-900">
                            {item.action}
                        </p>
                        <span className="text-xs text-gray-500">{item.time}</span>
                    </div>
                    <p className="text-xs text-gray-600">{item.detail}</p>
                </div>
            ))
        )}
    </div>
);

export default RunnerActivityLog;
