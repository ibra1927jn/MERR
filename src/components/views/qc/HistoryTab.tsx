/**
 * HistoryTab — QC Inspection History
 * Extracted from QualityControl.tsx monolith
 */
import React, { useState, useMemo } from 'react';
import EmptyState from '@/components/common/EmptyState';
import FilterBar from '@/components/common/FilterBar';
import { QCInspection } from '@/services/qc.service';
import { Picker } from '@/types';

const GRADE_PILL_COLORS: Record<string, string> = {
    A: 'bg-green-100 text-green-700',
    B: 'bg-blue-100 text-blue-700',
    C: 'bg-amber-100 text-amber-700',
    reject: 'bg-red-100 text-red-700',
};

interface HistoryTabProps {
    inspections: QCInspection[];
    crew: Picker[];
}

export default function HistoryTab({ inspections, crew }: HistoryTabProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

    const gradeOptions = useMemo(() =>
        [...new Set(inspections.map(i => i.grade))].sort(),
        [inspections]
    );

    const filtered = useMemo(() => inspections.filter(insp => {
        const picker = crew.find(p => p.id === insp.picker_id);
        const matchesSearch = !searchQuery ||
            (picker?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesGrade = !activeFilters.grade || insp.grade === activeFilters.grade;
        return matchesSearch && matchesGrade;
    }), [inspections, crew, searchQuery, activeFilters]);

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-4 py-3 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900 mb-3">
                    Recent Inspections ({filtered.length})
                </h2>
                <FilterBar
                    searchValue={searchQuery}
                    onSearchChange={setSearchQuery}
                    searchPlaceholder="Search by picker..."
                    filters={[
                        { key: 'grade', label: 'Grade', options: gradeOptions, icon: 'grade' },
                    ]}
                    activeFilters={activeFilters}
                    onFilterChange={(key, value) => setActiveFilters(prev => ({ ...prev, [key]: value }))}
                    onClearAll={() => { setSearchQuery(''); setActiveFilters({}); }}
                />
            </div>
            {filtered.length > 0 ? (
                <div className="divide-y divide-gray-100">
                    {filtered.map((insp) => {
                        const picker = crew.find(p => p.id === insp.picker_id);
                        return (
                            <div key={insp.id} className="px-4 py-3 flex items-center gap-3">
                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                                    {picker?.name?.split(' ').map(n => n[0]).join('') || '?'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                        {picker?.name || 'Unknown'}
                                    </p>
                                    {insp.notes && (
                                        <p className="text-xs text-gray-500 truncate">{insp.notes}</p>
                                    )}
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${GRADE_PILL_COLORS[insp.grade] || ''}`}>
                                    {insp.grade === 'reject' ? 'REJ' : insp.grade}
                                </span>
                                <span className="text-xs text-gray-400">
                                    {new Date(insp.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <EmptyState
                    icon="assignment_turned_in"
                    title="No inspections found"
                    subtitle={searchQuery || Object.values(activeFilters).some(v => v) ? "Try adjusting your filters" : "Start inspecting to see history here"}
                    compact
                />
            )}
        </div>
    );
}
