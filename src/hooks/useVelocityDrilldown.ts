/**
 * hooks/useVelocityDrilldown.ts — Estado del drill-down del gráfico de velocidad.
 *
 * Gestiona apertura/cierre y el slot seleccionado.
 * Delega el cálculo a drilldownForHour (puro, testeable).
 */
import { useState, useCallback, useMemo } from 'react';
import { drilldownForHour, type DrilldownData } from '@/services/harvestMetrics/drilldown';
import type { BucketRecord, Picker } from '@/types';

interface DrilldownSlot {
    slotStartMs: number;
    slotEndMs: number;
    hourLabel: string;
}

export interface VelocityDrilldownHook {
    isOpen: boolean;
    drilldownData: DrilldownData | null;
    open: (slotStartMs: number, slotEndMs: number, hourLabel: string) => void;
    close: () => void;
}

export function useVelocityDrilldown(
    bucketRecords: BucketRecord[],
    crew: Picker[]
): VelocityDrilldownHook {
    const [isOpen, setIsOpen] = useState(false);
    const [slot, setSlot] = useState<DrilldownSlot | null>(null);

    const open = useCallback((slotStartMs: number, slotEndMs: number, hourLabel: string) => {
        setSlot({ slotStartMs, slotEndMs, hourLabel });
        setIsOpen(true);
    }, []);

    const close = useCallback(() => {
        setIsOpen(false);
    }, []);

    const drilldownData = useMemo<DrilldownData | null>(() => {
        if (!slot) return null;
        return drilldownForHour(bucketRecords, crew, slot.slotStartMs, slot.slotEndMs, slot.hourLabel);
    }, [bucketRecords, crew, slot]);

    return { isOpen, drilldownData, open, close };
}
