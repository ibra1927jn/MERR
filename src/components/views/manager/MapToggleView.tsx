/**
 * MapToggleView — Consolidated map view with toggle.
 * Allows the manager to switch between:
 *   1. Visual Map (OrchardMapView)
 *   2. Heat Map (HeatMapView)
 *   3. Row List (RowListView)
 */
import React, { useState } from 'react';
import { Picker, BucketRecord, Tab } from '@/types';
import OrchardMapView from './OrchardMapView';
import { HeatMapView } from './HeatMapView';
import RowListView from './RowListView';
import ComponentErrorBoundary from '@/components/common/ComponentErrorBoundary';

type MapMode = 'visual' | 'heatmap' | 'list';

interface MapToggleViewProps {
    totalRows: number;
    crew: Picker[];
    bucketRecords: BucketRecord[];
    blockName: string;
    targetBucketsPerRow?: number;
    setActiveTab: (tab: Tab) => void;
    onRowClick?: (rowNum: number) => void;
}

const MODES: { id: MapMode; label: string; icon: string }[] = [
    { id: 'visual', label: 'Map', icon: 'map' },
    { id: 'heatmap', label: 'Heat Map', icon: 'local_fire_department' },
    { id: 'list', label: 'Row List', icon: 'list_alt' },
];

const MapToggleView: React.FC<MapToggleViewProps> = ({
    totalRows,
    crew,
    bucketRecords,
    blockName,
    targetBucketsPerRow = 50,
    setActiveTab,
    onRowClick,
}) => {
    const [mode, setMode] = useState<MapMode>('visual');

    const runners = crew.filter(p => p.role === 'runner');

    return (
        <div className="flex flex-col h-full">
            {/* Toggle Bar */}
            <div className="p-3 border-b border-border-light bg-white/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-fit mx-auto">
                    {MODES.map((m) => (
                        <button
                            key={m.id}
                            onClick={() => setMode(m.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${mode === m.id
                                    ? 'bg-white text-primary shadow-sm'
                                    : 'text-text-sub hover:text-text-main'
                                }`}
                        >
                            <span className="material-symbols-outlined text-base">{m.icon}</span>
                            {m.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {mode === 'visual' && (
                    <ComponentErrorBoundary componentName="Orchard Map">
                        <div className="p-4">
                            <OrchardMapView
                                totalRows={totalRows}
                                crew={crew}
                                bucketRecords={bucketRecords}
                                blockName={blockName}
                                targetBucketsPerRow={targetBucketsPerRow}
                            />
                        </div>
                    </ComponentErrorBoundary>
                )}

                {mode === 'heatmap' && (
                    <ComponentErrorBoundary componentName="Heat Map">
                        <HeatMapView />
                    </ComponentErrorBoundary>
                )}

                {mode === 'list' && (
                    <ComponentErrorBoundary componentName="Row List">
                        <RowListView
                            runners={runners}
                            setActiveTab={setActiveTab}
                            onRowClick={onRowClick}
                            blockName={blockName}
                            totalRows={totalRows}
                        />
                    </ComponentErrorBoundary>
                )}
            </div>
        </div>
    );
};

export default MapToggleView;
