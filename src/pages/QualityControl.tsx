/**
 * QualityControl.tsx — QC Inspector Dashboard (Router)
 *
 * Decomposed from 465-line monolith into tab components:
 *   - InspectTab  → Picker search, grade entry, notes
 *   - HistoryTab  → Recent inspections list
 *   - StatsTab    → Grade distribution analytics
 */
import { useState, useEffect, useCallback } from 'react';
import { ClipboardCheck, Apple, BarChart3 } from 'lucide-react';
import { qcService, QCInspection, GradeDistribution } from '@/services/qc.service';
import { useHarvestStore } from '@/stores/useHarvestStore';
import { useAuth } from '@/context/AuthContext';
import { Picker } from '@/types';
import InspectTab from '@/components/views/qc/InspectTab';
import HistoryTab from '@/components/views/qc/HistoryTab';
import StatsTab from '@/components/views/qc/StatsTab';

type QualityGrade = 'A' | 'B' | 'C' | 'reject';

export default function QualityControl() {
    const [activeTab, setActiveTab] = useState<'inspect' | 'history' | 'stats'>('inspect');
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
    const handleGrade = async (grade: QualityGrade) => {
        if (!selectedPicker || !orchardId || !appUser?.id) return;
        setIsSubmitting(true);

        const result = await qcService.logInspection({
            orchardId,
            pickerId: selectedPicker.id,
            inspectorId: appUser.id,
            grade,
            notes: notes.trim() || undefined,
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
        { key: 'inspect' as const, label: 'Inspect', icon: <Apple size={16} /> },
        { key: 'history' as const, label: 'History', icon: <ClipboardCheck size={16} /> },
        { key: 'stats' as const, label: 'Analytics', icon: <BarChart3 size={16} /> },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-4 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                            <ClipboardCheck size={20} className="text-indigo-600" />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold text-gray-900">Quality Inspection</h1>
                            <p className="text-xs text-gray-500">{orchard?.name || 'Orchard'}</p>
                        </div>
                    </div>
                    <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                        {distribution.total} today
                    </div>
                </div>
            </header>

            {/* Tabs */}
            <nav className="bg-white border-b border-gray-200 px-4">
                <div className="flex gap-1">
                    {TABS.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
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
                    />
                )}
                {activeTab === 'history' && (
                    <HistoryTab inspections={inspections} crew={crew} />
                )}
                {activeTab === 'stats' && (
                    <StatsTab distribution={distribution} />
                )}
            </main>
        </div>
    );
}
