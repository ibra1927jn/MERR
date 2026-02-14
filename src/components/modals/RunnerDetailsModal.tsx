/**
 * RunnerDetailsModal - Modal for viewing/editing bucket runner details
 * Refactored: StatusPanel and ActivityLog extracted as sub-components
 */
import React, { useState } from 'react';
import RunnerStatusPanel from '@/components/runner/RunnerStatusPanel';
import RunnerActivityLog from '@/components/runner/RunnerActivityLog';

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
                    {(['INFO', 'SCHEDULE', 'HISTORY'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-2 px-3 rounded-md text-xs font-bold transition-all ${activeTab === tab
                                ? 'bg-white shadow-sm text-[#ec1325]'
                                : 'text-gray-500'
                                }`}
                        >
                            {tab === 'INFO' ? 'Info' : tab === 'SCHEDULE' ? 'Schedule' : 'History'}
                        </button>
                    ))}
                </div>

                {/* INFO TAB */}
                {activeTab === 'INFO' && (
                    <RunnerStatusPanel
                        runner={runner}
                        editedRunner={editedRunner}
                        isEditing={isEditing}
                        setEditedRunner={setEditedRunner}
                        onStatusChange={handleStatusChange}
                        onSave={handleSave}
                        onEdit={() => setIsEditing(true)}
                        onCancelEdit={() => setIsEditing(false)}
                        onDelete={() => {
                            if (confirm(`Remove ${runner.name} from active runners?`)) {
                                onDelete(runner.id);
                                onClose();
                            }
                        }}
                    />
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
                    <RunnerActivityLog runner={runner} />
                )}
            </div>
        </div>
    );
};

export default RunnerDetailsModal;
