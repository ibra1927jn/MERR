import React from 'react';
import { useHarvestStore } from '@/stores/useHarvestStore';
import { AlertTriangle } from 'lucide-react';

/**
 * SimulationBanner
 * Displayed at the top of Dashboard when drill simulator is active
 * Prevents managers from mistaking test alerts for real incidents
 */
export function SimulationBanner() {
    const simulationMode = useHarvestStore((state) => state.simulationMode);

    if (!simulationMode) return null;

    return (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 shadow-lg border-b-2 border-amber-600">
            <div className="flex items-center justify-center gap-3 text-white">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
                <div className="flex flex-col sm:flex-row items-center gap-2">
                    <span className="text-lg font-bold">🧪 SIMULATION MODE ACTIVE</span>
                    <span className="text-sm opacity-90">Test Data Only - Not Real Production Data</span>
                </div>
                <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
        </div>
    );
}
