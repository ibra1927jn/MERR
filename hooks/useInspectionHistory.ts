// =============================================
// useInspectionHistory Hook
// =============================================
// Manages inspection history for pickers

import { useState, useCallback } from 'react';
import { QualityInspection } from '../types';

interface InspectionStats {
    total: number;
    good: number;
    warning: number;
    bad: number;
    averageScore: number;
}

interface UseInspectionHistoryReturn {
    /** All inspections for the picker */
    inspections: QualityInspection[];
    /** Loading state */
    isLoading: boolean;
    /** Inspection statistics */
    stats: InspectionStats;
    /** Load inspections for a picker */
    loadInspections: (pickerId: string) => Promise<void>;
    /** Add a new inspection */
    addInspection: (inspection: Omit<QualityInspection, 'id' | 'created_at'>) => void;
    /** Get color for quality grade */
    getGradeColor: (grade: QualityInspection['quality_grade']) => string;
    /** Get label for quality grade */
    getGradeLabel: (grade: QualityInspection['quality_grade']) => string;
}

const GRADE_COLORS: Record<string, string> = {
    good: '#22c55e',  // green-500
    A: '#22c55e',
    warning: '#f59e0b', // amber-500
    B: '#f59e0b',
    bad: '#ef4444',  // red-500
    C: '#ef4444',
    reject: '#7f1d1d', // red-900
};

const GRADE_LABELS: Record<string, string> = {
    good: 'Good',
    A: 'Grade A',
    warning: 'Warning',
    B: 'Grade B',
    bad: 'Bad',
    C: 'Grade C',
    reject: 'Rejected',
};

export function useInspectionHistory(): UseInspectionHistoryReturn {
    const [inspections, setInspections] = useState<QualityInspection[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const calculateStats = useCallback((data: QualityInspection[]): InspectionStats => {
        const total = data.length;
        if (total === 0) {
            return { total: 0, good: 0, warning: 0, bad: 0, averageScore: 0 };
        }

        let good = 0, warning = 0, bad = 0;

        data.forEach(inspection => {
            const grade = inspection.quality_grade;
            if (grade === 'good' || grade === 'A') good++;
            else if (grade === 'warning' || grade === 'B') warning++;
            else bad++;
        });

        // Score: good=100, warning=50, bad=0
        const averageScore = Math.round((good * 100 + warning * 50) / total);

        return { total, good, warning, bad, averageScore };
    }, []);

    const loadInspections = useCallback(async (pickerId: string) => {
        setIsLoading(true);
        try {
            // In a real app, this would fetch from Supabase
            // For now, simulate with demo data if needed
            console.log(`[useInspectionHistory] Loading inspections for picker: ${pickerId}`);

            // Demo data for visualization
            const demoInspections: QualityInspection[] = [
                {
                    id: '1',
                    picker_id: pickerId,
                    inspector_id: 'inspector-1',
                    quality_grade: 'good',
                    notes: 'Excellent quality, good size and color',
                    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                },
                {
                    id: '2',
                    picker_id: pickerId,
                    inspector_id: 'inspector-1',
                    quality_grade: 'warning',
                    notes: 'Slightly underripe, acceptable',
                    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
                },
                {
                    id: '3',
                    picker_id: pickerId,
                    inspector_id: 'inspector-2',
                    quality_grade: 'good',
                    notes: 'Perfect export quality',
                    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                },
            ];

            setInspections(demoInspections);
        } catch (error) {
            console.error('[useInspectionHistory] Error loading inspections:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const addInspection = useCallback((inspection: Omit<QualityInspection, 'id' | 'created_at'>) => {
        const newInspection: QualityInspection = {
            ...inspection,
            id: Math.random().toString(36).substring(2, 11),
            created_at: new Date().toISOString(),
        };
        setInspections(prev => [newInspection, ...prev]);
    }, []);

    const getGradeColor = useCallback((grade: QualityInspection['quality_grade']): string => {
        return GRADE_COLORS[grade] || GRADE_COLORS.warning;
    }, []);

    const getGradeLabel = useCallback((grade: QualityInspection['quality_grade']): string => {
        return GRADE_LABELS[grade] || grade;
    }, []);

    return {
        inspections,
        isLoading,
        stats: calculateStats(inspections),
        loadInspections,
        addInspection,
        getGradeColor,
        getGradeLabel,
    };
}

export default useInspectionHistory;
