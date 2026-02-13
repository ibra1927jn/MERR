/**
 * StatsTab — QC Analytics
 * Extracted from QualityControl.tsx monolith
 */
import React from 'react';
import EmptyState from '@/components/common/EmptyState';
import { GradeDistribution } from '@/services/qc.service';
import DistributionBar from './DistributionBar';

const GRADE_COLORS: Record<string, string> = {
    A: 'text-green-700',
    B: 'text-blue-700',
    C: 'text-amber-700',
    reject: 'text-red-700',
};

interface StatsTabProps {
    distribution: GradeDistribution;
}

export default function StatsTab({ distribution }: StatsTabProps) {
    if (distribution.total === 0) {
        return (
            <EmptyState
                icon="bar_chart"
                title="Grade distribution analytics"
                subtitle="Will show trends once inspections are logged"
                compact
            />
        );
    }

    const pct = (grade: keyof Omit<GradeDistribution, 'total'>) =>
        Math.round((distribution[grade] / distribution.total) * 100);

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Grade Distribution</h3>
                <DistributionBar distribution={distribution} large />
                <div className="grid grid-cols-4 gap-3 mt-4">
                    {(['A', 'B', 'C', 'reject'] as const).map(grade => (
                        <div key={grade} className="text-center">
                            <div className={`text-2xl font-bold ${GRADE_COLORS[grade]}`}>
                                {distribution[grade]}
                            </div>
                            <div className="text-xs text-gray-500">
                                {grade === 'reject' ? 'Reject' : `Grade ${grade}`}
                            </div>
                            <div className="text-xs text-gray-400">
                                {pct(grade)}%
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Summary</h3>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-600">Total Inspections</span>
                        <span className="font-medium text-gray-900">{distribution.total}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Export Quality (A)</span>
                        <span className="font-medium text-green-600">{pct('A')}%</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Rejection Rate</span>
                        <span className="font-medium text-red-600">{pct('reject')}%</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
