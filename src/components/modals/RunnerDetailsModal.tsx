/**
 * RunnerDetailsModal - Modal for viewing/editing bucket runner details
 * Extracted from Runner.tsx for reusability
 */
import React, { useState } from 'react';

export interface RunnerData {
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

interface RunnerDetailsModalProps {
    runner: RunnerData;
    onClose: () => void;
    onUpdate: (updatedRunner: RunnerData) => void;
    onDelete: (runnerId: string) => void;
}

const RunnerDetailsModal: React.FC<RunnerDetailsModalProps> = ({
    runner,
    onClose,
    onUpdate,
    onDelete,
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
            updated.breakTime = new Date().toLocaleTimeString('en-NZ', {
                hour: '2-digit',
                minute: '2-digit',
            });
        }
        setEditedRunner(updated);
        onUpdate(updated);
    };

    const calculateWorkTime = () => {
        if (!runner.startTime) return '0h 0m';
        const [startHour, startMin] = runner.startTime.split(':').map(Number);
        const now = new Date();
        const totalMinutes =
            now.getHours() * 60 + now.getMinutes() - (startHour * 60 + startMin);
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        return `${hours}h ${mins}m`;
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-3xl p-6 w-[90%] max-w-md shadow-2xl max-h-[85vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="size-12 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-700 text-xl relative">
                            {runner.avatar}
                            <span
                                className={`absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-white ${runner.status === 'Active'
                                        ? 'bg-green-500 animate-pulse'
                                        : runner.status === 'Break'
                                            ? 'bg-orange-500'
                                            : 'bg-gray-400'
                                    }`}
                            ></span>
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
                        className={`flex-1 py-2 px-3 rounded-md text-xs font-bold transition-all ${activeTab === 'INFO'
                                ? 'bg-white shadow-sm text-[#ec1325]'
                                : 'text-gray-500'
                            }`}
                    >
                        Info
                    </button>
                    <button
                        onClick={() => setActiveTab('SCHEDULE')}
                        className={`flex-1 py-2 px-3 rounded-md text-xs font-bold transition-all ${activeTab === 'SCHEDULE'
                                ? 'bg-white shadow-sm text-[#ec1325]'
                                : 'text-gray-500'
                            }`}
                    >
                        Schedule
                    </button>
                    <button
                        onClick={() => setActiveTab('HISTORY')}
                        className={`flex-1 py-2 px-3 rounded-md text-xs font-bold transition-all ${activeTab === 'HISTORY'
                                ? 'bg-white shadow-sm text-[#ec1325]'
                                : 'text-gray-500'
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
                            <p className="text-xs font-bold text-gray-500 uppercase mb-3">
                                Current Status
                            </p>
                            <div className="grid grid-cols-3 gap-2">
                                {(['Active', 'Break', 'Off Duty'] as const).map(status => (
                                    <button
                                        key={status}
                                        onClick={() => handleStatusChange(status)}
                                        className={`py-2 px-3 rounded-lg text-xs font-bold uppercase transition-all ${editedRunner.status === status
                                                ? status === 'Active'
                                                    ? 'bg-green-500 text-white'
                                                    : status === 'Break'
                                                        ? 'bg-orange-500 text-white'
                                                        : 'bg-gray-500 text-white'
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
                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">
                                Assigned Row
                            </label>
                            {isEditing ? (
                                <input
                                    type="number"
                                    value={editedRunner.currentRow || ''}
                                    onChange={e =>
                                        setEditedRunner({
                                            ...editedRunner,
                                            currentRow: e.target.value
                                                ? parseInt(e.target.value)
                                                : undefined,
                                        })
                                    }
                                    className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-[#ec1325] outline-none"
                                    placeholder="Row number"
                                />
                            ) : (
                                <p className="text-lg font-bold text-gray-900">
                                    {editedRunner.currentRow
                                        ? `Row ${editedRunner.currentRow}`
                                        : 'Not assigned'}
                                </p>
                            )}
                        </div>

                        {/* Stats */}
                        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                            <p className="text-xs font-bold text-blue-600 uppercase mb-3">
                                Today's Performance
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-2xl font-black text-blue-900">
                                        {runner.bucketsHandled}
                                    </p>
                                    <p className="text-xs text-blue-700 font-medium">
                                        Buckets Handled
                                    </p>
                                </div>
                                <div>
                                    <p className="text-2xl font-black text-blue-900">
                                        {runner.binsCompleted}
                                    </p>
                                    <p className="text-xs text-blue-700 font-medium">
                                        Bins Completed
                                    </p>
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
                                        <span className="material-symbols-outlined text-[20px]">
                                            edit
                                        </span>
                                        Edit Details
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (
                                                confirm(
                                                    `Remove ${runner.name} from active runners?`
                                                )
                                            ) {
                                                onDelete(runner.id);
                                                onClose();
                                            }
                                        }}
                                        className="w-full py-3 bg-red-50 text-red-600 border-2 border-red-200 rounded-xl font-bold flex items-center justify-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">
                                            delete
                                        </span>
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
                            <p className="text-xs font-bold text-gray-500 uppercase mb-2">
                                Start Time
                            </p>
                            <p className="text-2xl font-black text-gray-900">{runner.startTime}</p>
                            <p className="text-xs text-gray-500 mt-1">
                                Total worked: {calculateWorkTime()}
                            </p>
                        </div>

                        {runner.breakTime && (
                            <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                                <p className="text-xs font-bold text-orange-600 uppercase mb-2">
                                    Break Started
                                </p>
                                <p className="text-2xl font-black text-orange-900">
                                    {runner.breakTime}
                                </p>
                            </div>
                        )}

                        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                            <p className="text-xs font-bold text-blue-600 uppercase mb-3">
                                Break Schedule
                            </p>
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
                )}
            </div>
        </div>
    );
};

export default RunnerDetailsModal;
