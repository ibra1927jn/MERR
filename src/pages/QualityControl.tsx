/**
 * QualityControl.tsx — QC Inspector Dashboard (Router)
 *
 * Decomposed from 465-line monolith into tab components:
 *   - InspectTab  → Picker search, grade entry, notes
 *   - HistoryTab  → Recent inspections list
 *   - StatsTab    → Grade distribution analytics
 */
import { logger } from '@/utils/logger';
import { useState, useEffect, useCallback } from 'react';
import { qcService, QCInspection, GradeDistribution } from '@/services/qc.service';
import { useHarvestStore } from '@/stores/useHarvestStore';
import { useAuth } from '@/context/AuthContext';
import { Picker } from '@/types';
import InspectTab from '@/components/views/qc/InspectTab';
import HistoryTab from '@/components/views/qc/HistoryTab';
import StatsTab from '@/components/views/qc/StatsTab';
import TrendsTab from '@/components/views/qc/TrendsTab';
import ComponentErrorBoundary from '@/components/common/ComponentErrorBoundary';

type QualityGrade = 'A' | 'B' | 'C' | 'reject';

export default function QualityControl() {
    const [activeTab, setActiveTab] = useState<'inspect' | 'history' | 'stats' | 'trends'>('inspect');
    const [selectedPicker, setSelectedPicker] = useState<Picker | null>(null);
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [lastGrade, setLastGrade] = useState<{ grade: QualityGrade; picker: string } | null>(null);

    // Data state
    const [inspections, setInspections] = useState<QCInspection[]>([]);
    const [distribution, setDistribution] = useState<GradeDistribution>({ A: 0, B: 0, C: 0, reject: 0, total: 0 });

    const { crew, orchard } = useHarvestStore();
    const { appUser } = useAuth();
    const orchardId = orchard?.id;

    // Load inspections
    const loadInspections = useCallback(async () => {
        if (!orchardId) return;
        const data = await qcService.getInspections(orchardId);
        setInspections(data);
        const dist = await qcService.getGradeDistribution(orchardId);
        setDistribution(dist);
    }, [orchardId]);

    useEffect(() => {
        loadInspections();
    }, [loadInspections]);

    // Handle grade submission
    const handleGrade = async (grade: QualityGrade, photoBlob?: Blob | null) => {
        if (!selectedPicker || !orchardId || !appUser?.id) return;
        setIsSubmitting(true);

        let photoUrl: string | undefined;

        // Upload photo if provided
        if (photoBlob) {
            try {
                const dateStr = new Date().toISOString().slice(0, 10);
                const fileName = `${orchardId}/${dateStr}/${crypto.randomUUID()}.webp`;
                const { data: uploadData, error: uploadError } = await (await import('@/services/supabase')).supabase.storage
                    .from('qc-photos')
                    .upload(fileName, photoBlob, {
                        contentType: 'image/webp',
                        cacheControl: '31536000',
                    });

                if (uploadError) {
                    logger.error('[QC] Photo upload failed:', uploadError.message);
                } else if (uploadData?.path) {
                    const { data: urlData } = (await import('@/services/supabase')).supabase.storage
                        .from('qc-photos')
                        .getPublicUrl(uploadData.path);
                    photoUrl = urlData.publicUrl;
                }
            } catch (err) {
                logger.error('[QC] Photo upload error:', err);
            }
        }

        const result = await qcService.logInspection({
            orchardId,
            pickerId: selectedPicker.id,
            inspectorId: appUser.id,
            grade,
            notes: notes.trim() || undefined,
            photoUrl,
        });

        if (result) {
            setLastGrade({ grade, picker: selectedPicker.name });
            setNotes('');
            await loadInspections();
            setTimeout(() => setLastGrade(null), 3000);
        }

        setIsSubmitting(false);
    };

    const TABS = [
        { key: 'inspect' as const, label: 'Inspect', icon: <span className="material-symbols-outlined text-base">nutrition</span> },
        { key: 'history' as const, label: 'History', icon: <span className="material-symbols-outlined text-base">assignment_turned_in</span> },
        { key: 'stats' as const, label: 'Analytics', icon: <span className="material-symbols-outlined text-base">bar_chart</span> },
        { key: 'trends' as const, label: 'Trends', icon: <span className="material-symbols-outlined text-base">trending_up</span> },
    ];

    return (
        <div className="min-h-screen bg-background-light">
            {/* Header */}
            <header className="bg-white border-b border-border-light px-4 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                            <span className="material-symbols-outlined text-xl text-indigo-600">assignment_turned_in</span>
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold text-text-main">Quality Inspection</h1>
                            <p className="text-xs text-text-muted">{orchard?.name || 'Orchard'}</p>
                        </div>
                    </div>
                    <div className="text-sm text-text-muted bg-slate-100 px-3 py-1 rounded-full">
                        {distribution.total} today
                    </div>
                </div>
            </header>

            {/* Tabs */}
            <nav className="bg-white border-b border-border-light px-4">
                <div className="flex gap-1">
                    {TABS.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-text-muted hover:text-text-sub'
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>
            </nav>

            {/* Content — delegated to extracted components */}
            <main className="p-4 max-w-2xl mx-auto">
                <div key={activeTab} className="animate-fade-in">
                    {activeTab === 'inspect' && (
                        <InspectTab
                            crew={crew}
                            distribution={distribution}
                            selectedPicker={selectedPicker}
                            setSelectedPicker={setSelectedPicker}
                            notes={notes}
                            setNotes={setNotes}
                            isSubmitting={isSubmitting}
                            lastGrade={lastGrade}
                            onGrade={handleGrade}
                            onAutoAdvance={() => {
                                // Move to next picker in crew list
                                if (selectedPicker && crew.length > 0) {
                                    const currentIndex = crew.findIndex(p => p.id === selectedPicker.id);
                                    const nextIndex = (currentIndex + 1) % crew.length;
                                    setSelectedPicker(crew[nextIndex]);
                                }
                            }}
                        />
                    )}
                    {activeTab === 'history' && (
                        <HistoryTab inspections={inspections} crew={crew} />
                    )}
                    {activeTab === 'stats' && (
                        <StatsTab distribution={distribution} />
                    )}
                    {activeTab === 'trends' && orchardId && (
                        <ComponentErrorBoundary componentName="Quality Trends">
                            <TrendsTab orchardId={orchardId} />
                        </ComponentErrorBoundary>
                    )}
                </div>
            </main>
        </div>
    );
}
