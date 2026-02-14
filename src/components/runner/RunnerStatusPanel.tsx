import React from 'react';
import { RunnerData } from '@/components/modals/RunnerDetailsModal';

interface RunnerStatusPanelProps {
    runner: RunnerData;
    editedRunner: RunnerData;
    isEditing: boolean;
    setEditedRunner: React.Dispatch<React.SetStateAction<RunnerData>>;
    onStatusChange: (status: 'Active' | 'Break' | 'Off Duty') => void;
    onSave: () => void;
    onEdit: () => void;
    onCancelEdit: () => void;
    onDelete: () => void;
}

const RunnerStatusPanel: React.FC<RunnerStatusPanelProps> = ({
    runner, editedRunner, isEditing, setEditedRunner,
    onStatusChange, onSave, onEdit, onCancelEdit, onDelete,
}) => (
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
                        onClick={() => onStatusChange(status)}
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
                        setEditedRunner(prev => ({
                            ...prev,
                            currentRow: e.target.value
                                ? parseInt(e.target.value)
                                : undefined,
                        }))
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
                        onClick={onSave}
                        className="w-full py-3 bg-[#ec1325] text-white rounded-xl font-bold"
                    >
                        Save Changes
                    </button>
                    <button
                        onClick={onCancelEdit}
                        className="w-full py-3 bg-gray-200 text-gray-700 rounded-xl font-bold"
                    >
                        Cancel
                    </button>
                </>
            ) : (
                <>
                    <button
                        onClick={onEdit}
                        className="w-full py-3 bg-gray-200 text-gray-700 rounded-xl font-bold flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[20px]">
                            edit
                        </span>
                        Edit Details
                    </button>
                    <button
                        onClick={onDelete}
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
);

export default RunnerStatusPanel;
