/**
 * useRunnerManagement Hook
 * Custom hook for managing bucket runners locally (not persisted to DB yet)
 */
import { useState, useCallback, useMemo } from 'react';

export interface RunnerData {
    id: string;
    name: string;
    avatar: string;
    startTime: string;
    status: 'Active' | 'Break' | 'Off Duty';
    bucketsHandled: number;
    binsCompleted: number;
    currentRow?: number;
}

interface UseRunnerManagementReturn {
    runners: RunnerData[];
    isLoading: boolean;
    addRunner: (runner: Omit<RunnerData, 'id'>) => void;
    updateRunner: (runner: RunnerData) => void;
    deleteRunner: (id: string) => void;
    getRunnerById: (id: string) => RunnerData | undefined;
    activeRunners: number;
    totalBucketsHandled: number;
    totalBinsCompleted: number;
}

export const useRunnerManagement = (): UseRunnerManagementReturn => {
    const [runners, setRunners] = useState<RunnerData[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Add new runner
    const addRunner = useCallback((runnerData: Omit<RunnerData, 'id'>) => {
        const newRunner: RunnerData = {
            ...runnerData,
            id: Math.random().toString(36).substring(2, 11)
        };
        setRunners(prev => [...prev, newRunner]);
    }, []);

    // Update runner
    const updateRunner = useCallback((updatedRunner: RunnerData) => {
        setRunners(prev => prev.map(r => r.id === updatedRunner.id ? updatedRunner : r));
    }, []);

    // Delete runner
    const deleteRunner = useCallback((id: string) => {
        setRunners(prev => prev.filter(r => r.id !== id));
    }, []);

    // Get single runner by ID
    const getRunnerById = useCallback((id: string): RunnerData | undefined => {
        return runners.find(r => r.id === id);
    }, [runners]);

    // Computed statistics
    const activeRunners = useMemo(() => runners.filter(r => r.status === 'Active').length, [runners]);
    const totalBucketsHandled = useMemo(() => runners.reduce((sum, r) => sum + r.bucketsHandled, 0), [runners]);
    const totalBinsCompleted = useMemo(() => runners.reduce((sum, r) => sum + r.binsCompleted, 0), [runners]);

    return {
        runners,
        isLoading,
        addRunner,
        updateRunner,
        deleteRunner,
        getRunnerById,
        activeRunners,
        totalBucketsHandled,
        totalBinsCompleted
    };
};

export default useRunnerManagement;
