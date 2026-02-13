/**
 * InspectTab — QC Inspection entry tab
 * Extracted from QualityControl.tsx monolith
 *
 * Contains: Picker search, grade buttons, notes input, today's distribution
 */
import React, { useMemo } from 'react';
import { GradeDistribution } from '@/services/qc.service';
import { Picker } from '@/types';
import DistributionBar from './DistributionBar';

type QualityGrade = 'A' | 'B' | 'C' | 'reject';

interface GradeConfig {
    label: string;
    sublabel: string;
    color: string;
    bg: string;
    border: string;
    icon: React.ReactNode;
}

const GRADE_CONFIG: Record<QualityGrade, GradeConfig> = {
    A: {
        label: 'Grade A', sublabel: 'Export',
        color: 'text-green-700', bg: 'bg-white hover:bg-green-50',
        border: 'border-l-4 border-l-green-500',
        icon: <span className="material-symbols-outlined text-xl text-green-600">check_circle</span>,
    },
    B: {
        label: 'Grade B', sublabel: 'Domestic',
        color: 'text-blue-700', bg: 'bg-white hover:bg-blue-50',
        border: 'border-l-4 border-l-blue-500',
        icon: <span className="material-symbols-outlined text-xl text-blue-600">check_circle</span>,
    },
    C: {
        label: 'Grade C', sublabel: 'Process',
        color: 'text-amber-700', bg: 'bg-white hover:bg-amber-50',
        border: 'border-l-4 border-l-amber-500',
        icon: <span className="material-symbols-outlined text-xl text-amber-600">warning</span>,
    },
    reject: {
        label: 'Reject', sublabel: 'Discard',
        color: 'text-red-700', bg: 'bg-white hover:bg-red-50',
        border: 'border-l-4 border-l-red-500',
        icon: <span className="material-symbols-outlined text-xl text-red-600">cancel</span>,
    },
};

interface InspectTabProps {
    crew: Picker[];
    distribution: GradeDistribution;
    selectedPicker: Picker | null;
    setSelectedPicker: (p: Picker | null) => void;
    notes: string;
    setNotes: (n: string) => void;
    isSubmitting: boolean;
    lastGrade: { grade: QualityGrade; picker: string } | null;
    onGrade: (grade: QualityGrade) => void;
}

export default function InspectTab({
    crew, distribution, selectedPicker, setSelectedPicker,
    notes, setNotes, isSubmitting, lastGrade, onGrade,
}: InspectTabProps) {
    const [searchQuery, setSearchQuery] = React.useState('');

    const filteredPickers = useMemo(() => {
        if (!searchQuery.trim()) return crew.slice(0, 5);
        const q = searchQuery.toLowerCase();
        return crew.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.picker_id.toLowerCase().includes(q)
        );
    }, [crew, searchQuery]);

    return (
        <div className="space-y-4">
            {/* Success Toast */}
            {lastGrade && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-green-600">check_circle</span>
                    <span className="text-sm text-green-800">
                        Logged <strong>Grade {lastGrade.grade}</strong> for {lastGrade.picker}
                    </span>
                </div>
            )}

            {/* Step 1: Picker Selection */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="px-4 py-3 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-gray-900">Select Picker</h2>
                </div>
                <div className="p-4 space-y-3">
                    <div className="relative">
                        <span className="material-symbols-outlined text-base text-gray-400 absolute left-3 top-1/2 -translate-y-1/2">search</span>
                        <input
                            type="text"
                            placeholder="Search by name or ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            aria-label="Search pickers"
                            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                    <div className="space-y-1 max-h-40 overflow-y-auto">
                        {filteredPickers.map(picker => (
                            <button
                                key={picker.id}
                                onClick={() => setSelectedPicker(picker)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${selectedPicker?.id === picker.id
                                    ? 'bg-indigo-50 border border-indigo-200'
                                    : 'hover:bg-gray-50'
                                    }`}
                            >
                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                                    {picker.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{picker.name}</p>
                                    <p className="text-xs text-gray-500">Row {picker.current_row} · {picker.total_buckets_today} buckets</p>
                                </div>
                                {selectedPicker?.id === picker.id && (
                                    <span className="material-symbols-outlined text-base text-indigo-600">check_circle</span>
                                )}
                            </button>
                        ))}
                        {filteredPickers.length === 0 && (
                            <p className="text-sm text-gray-400 text-center py-4">No pickers found</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Step 2: Grade Entry */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="px-4 py-3 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-gray-900">
                        Assign Grade
                        {selectedPicker && (
                            <span className="ml-2 text-xs text-gray-500 font-normal">
                                for {selectedPicker.name}
                            </span>
                        )}
                    </h2>
                </div>
                <div className="p-4">
                    <div className="grid grid-cols-2 gap-3">
                        {(Object.entries(GRADE_CONFIG) as [QualityGrade, GradeConfig][]).map(
                            ([grade, config]) => (
                                <button
                                    key={grade}
                                    onClick={() => onGrade(grade)}
                                    disabled={!selectedPicker || isSubmitting}
                                    className={`${config.bg} ${config.border} rounded-lg p-4 flex items-center gap-3 
                                        transition-all border border-gray-200 shadow-sm
                                        ${!selectedPicker ? 'opacity-40 cursor-not-allowed' : 'active:scale-95'}
                                        ${isSubmitting ? 'pointer-events-none' : ''}`}
                                >
                                    {config.icon}
                                    <div className="text-left">
                                        <div className={`font-semibold text-sm ${config.color}`}>
                                            {config.label}
                                        </div>
                                        <div className="text-xs text-gray-500">{config.sublabel}</div>
                                        <div className="text-xs text-gray-400 mt-0.5">
                                            {distribution[grade as keyof Omit<GradeDistribution, 'total'>]} today
                                        </div>
                                    </div>
                                </button>
                            )
                        )}
                    </div>
                </div>
            </div>

            {/* Step 3: Notes (optional) */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="px-4 py-3 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-gray-900">Add Details (optional)</h2>
                </div>
                <div className="p-4 space-y-3">
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Inspection notes..."
                        aria-label="Inspection notes"
                        rows={2}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <button className="flex items-center gap-2 px-3 py-2 text-sm text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors">
                        <span className="material-symbols-outlined text-base">photo_camera</span>
                        Attach Photo
                    </button>
                </div>
            </div>

            {/* Today's Stats */}
            {distribution.total > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Today&apos;s Distribution</h3>
                    <DistributionBar distribution={distribution} />
                    <div className="flex justify-between mt-2 text-xs text-gray-500">
                        <span>A: {distribution.A} ({distribution.total ? Math.round(distribution.A / distribution.total * 100) : 0}%)</span>
                        <span>B: {distribution.B} ({distribution.total ? Math.round(distribution.B / distribution.total * 100) : 0}%)</span>
                        <span>C: {distribution.C} ({distribution.total ? Math.round(distribution.C / distribution.total * 100) : 0}%)</span>
                        <span>Rej: {distribution.reject} ({distribution.total ? Math.round(distribution.reject / distribution.total * 100) : 0}%)</span>
                    </div>
                </div>
            )}
        </div>
    );
}
