/**
 * QualityControl.tsx — QC Inspector Dashboard
 *
 * Refactored architecture:
 *   QualityControl.tsx     — Thin orchestrator
 *   useQC.ts               — Data hook (inspections, grading, photos)
 *   qcNav.config.ts        — Navigation tabs
 *   qc/                    — Tab view components (lazy-loaded)
 */
import React, { useState, useEffect, Suspense } from 'react';
import BottomNav from '@/components/common/BottomNav';
import ComponentErrorBoundary from '@/components/ui/ComponentErrorBoundary';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import Header from '@/components/common/Header';
import { useQC } from '@/hooks/useQC';
import { QC_NAV_TABS, type QCTab } from '@/config/navigation/qc.nav';

// Lazy-loaded views (code-split for performance)
const InspectTab = React.lazy(() => import('@/components/views/qc/InspectTab'));
const HistoryTab = React.lazy(() => import('@/components/views/qc/HistoryTab'));
const StatsTab = React.lazy(() => import('@/components/views/qc/StatsTab'));
const TrendsTab = React.lazy(() => import('@/components/views/qc/TrendsTab'));

const TabLoader = () => (
    <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
    </div>
);

export default function QualityControl() {
    const [activeTab, setActiveTab] = useState<QCTab>('inspect');
    const qc = useQC();

    useEffect(() => {
        qc.loadInspections();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [qc.orchardId]);

    if (qc.isLoading) {
        return (
            <div className="min-h-screen bg-background-light p-6">
                <div className="max-w-2xl mx-auto space-y-4">
                    <LoadingSkeleton type="metric" count={4} />
                    <LoadingSkeleton type="list" count={3} />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background-light font-display flex flex-col pb-20">
            <Header
                title="Quality Control"
                subtitle="Inspection Dashboard"
            />
            <main className="flex-1 w-full relative">
                <div key={activeTab} className="animate-fade-in">
                    <Suspense fallback={<TabLoader />}>
                        {activeTab === 'inspect' && (
                            <ComponentErrorBoundary componentName="Inspect">
                                <InspectTab
                                    crew={qc.crew}
                                    distribution={qc.distribution}
                                    selectedPicker={qc.selectedPicker}
                                    setSelectedPicker={qc.setSelectedPicker}
                                    notes={qc.notes}
                                    setNotes={qc.setNotes}
                                    isSubmitting={qc.isSubmitting}
                                    lastGrade={qc.lastGrade}
                                    onGrade={qc.handleGrade}
                                    onAutoAdvance={() => {
                                        if (qc.selectedPicker && qc.crew.length > 0) {
                                            const currentIndex = qc.crew.findIndex(p => p.id === qc.selectedPicker!.id);
                                            const nextIndex = (currentIndex + 1) % qc.crew.length;
                                            qc.setSelectedPicker(qc.crew[nextIndex]);
                                        }
                                    }}
                                />
                            </ComponentErrorBoundary>
                        )}
                        {activeTab === 'history' && (
                            <ComponentErrorBoundary componentName="Inspection History">
                                <HistoryTab inspections={qc.inspections} crew={qc.crew} />
                            </ComponentErrorBoundary>
                        )}
                        {activeTab === 'stats' && (
                            <ComponentErrorBoundary componentName="Quality Stats">
                                <StatsTab distribution={qc.distribution} />
                            </ComponentErrorBoundary>
                        )}
                        {activeTab === 'trends' && qc.orchardId && (
                            <ComponentErrorBoundary componentName="Quality Trends">
                                <TrendsTab orchardId={qc.orchardId} />
                            </ComponentErrorBoundary>
                        )}
                    </Suspense>
                </div>
            </main>

            <BottomNav
                tabs={QC_NAV_TABS}
                activeTab={activeTab}
                onTabChange={(id) => setActiveTab(id as QCTab)}
            />
        </div>
    );
}

