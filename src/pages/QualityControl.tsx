/**
 * QualityControl.tsx — QC Inspector Dashboard
 * 
 * Fully functional quality control page with:
 * - Picker selection (search + recent)
 * - Grade entry (A/B/C/Reject) with click handlers
 * - Today's distribution stats
 * - Inspection history
 * - Notes input
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    ClipboardCheck, Apple, BarChart3, Search,
    CheckCircle2, AlertTriangle, XCircle, Camera
} from 'lucide-react';
import { qcService, QCInspection, GradeDistribution } from '@/services/qc.service';
import { useHarvestStore } from '@/stores/useHarvestStore';
import { useAuth } from '@/context/AuthContext';
import { Picker } from '@/types';

type QualityGrade = 'A' | 'B' | 'C' | 'reject';

interface GradeConfig {
    label: string;
    sublabel: string;
    color: string;
    bg: string;
    border: string;
    icon: React.ReactNode;
}

const GRADE_CONFIG: Record<QualityGrade, GradeConfig> = {
    A: {
        label: 'Grade A',
        sublabel: 'Export',
        color: 'text-green-700',
        bg: 'bg-white hover:bg-green-50',
        border: 'border-l-4 border-l-green-500',
        icon: <CheckCircle2 size={20} className="text-green-600" />,
    },
    B: {
        label: 'Grade B',
        sublabel: 'Domestic',
        color: 'text-blue-700',
        bg: 'bg-white hover:bg-blue-50',
        border: 'border-l-4 border-l-blue-500',
        icon: <CheckCircle2 size={20} className="text-blue-600" />,
    },
    C: {
        label: 'Grade C',
        sublabel: 'Process',
        color: 'text-amber-700',
        bg: 'bg-white hover:bg-amber-50',
        border: 'border-l-4 border-l-amber-500',
        icon: <AlertTriangle size={20} className="text-amber-600" />,
    },
    reject: {
        label: 'Reject',
        sublabel: 'Discard',
        color: 'text-red-700',
        bg: 'bg-white hover:bg-red-50',
        border: 'border-l-4 border-l-red-500',
        icon: <XCircle size={20} className="text-red-600" />,
    },
};

const GRADE_PILL_COLORS: Record<string, string> = {
    A: 'bg-green-100 text-green-700',
    B: 'bg-blue-100 text-blue-700',
    C: 'bg-amber-100 text-amber-700',
    reject: 'bg-red-100 text-red-700',
};

export default function QualityControl() {
    const [activeTab, setActiveTab] = useState<'inspect' | 'history' | 'stats'>('inspect');
    const [searchQuery, setSearchQuery] = useState('');
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

    // Filter crew for search
    const filteredPickers = useMemo(() => {
        if (!searchQuery.trim()) return crew.slice(0, 5);
        const q = searchQuery.toLowerCase();
        return crew.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.picker_id.toLowerCase().includes(q)
        );
    }, [crew, searchQuery]);

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
            // Refresh data
            await loadInspections();
            // Auto-clear success after 3s
            setTimeout(() => setLastGrade(null), 3000);
        }

        setIsSubmitting(false);
    };

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
                    {[
                        { key: 'inspect' as const, label: 'Inspect', icon: <Apple size={16} /> },
                        { key: 'history' as const, label: 'History', icon: <ClipboardCheck size={16} /> },
                        { key: 'stats' as const, label: 'Analytics', icon: <BarChart3 size={16} /> },
                    ].map((tab) => (
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

            {/* Content */}
            <main className="p-4 max-w-2xl mx-auto">
                {activeTab === 'inspect' && (
                    <div className="space-y-4">
                        {/* Success Toast */}
                        {lastGrade && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                                <CheckCircle2 size={16} className="text-green-600" />
                                <span className="text-sm text-green-800">
                                    Logged <strong>Grade {lastGrade.grade}</strong> for {lastGrade.picker}
                                </span>
                            </div>
                        )}

                        {/* Step 1: Picker Selection */}
                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                            <div className="px-4 py-3 border-b border-gray-100">
                                <h2 className="text-sm font-semibold text-gray-900">Select Picker</h2>
                            </div>
                            <div className="p-4 space-y-3">
                                <div className="relative">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search by name or ID..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        aria-label="Search pickers"
                                        className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>

                                {/* Picker List */}
                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                    {filteredPickers.map(picker => (
                                        <button
                                            key={picker.id}
                                            onClick={() => setSelectedPicker(picker)}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${selectedPicker?.id === picker.id
                                                    ? 'bg-indigo-50 border border-indigo-200'
                                                    : 'hover:bg-gray-50'
                                                }`}
                                        >
                                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                                                {picker.name.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">{picker.name}</p>
                                                <p className="text-xs text-gray-500">Row {picker.current_row} · {picker.total_buckets_today} buckets</p>
                                            </div>
                                            {selectedPicker?.id === picker.id && (
                                                <CheckCircle2 size={16} className="text-indigo-600" />
                                            )}
                                        </button>
                                    ))}
                                    {filteredPickers.length === 0 && (
                                        <p className="text-sm text-gray-400 text-center py-4">No pickers found</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Step 2: Grade Entry */}
                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                            <div className="px-4 py-3 border-b border-gray-100">
                                <h2 className="text-sm font-semibold text-gray-900">
                                    Assign Grade
                                    {selectedPicker && (
                                        <span className="ml-2 text-xs text-gray-500 font-normal">
                                            for {selectedPicker.name}
                                        </span>
                                    )}
                                </h2>
                            </div>
                            <div className="p-4">
                                <div className="grid grid-cols-2 gap-3">
                                    {(Object.entries(GRADE_CONFIG) as [QualityGrade, GradeConfig][]).map(
                                        ([grade, config]) => (
                                            <button
                                                key={grade}
                                                onClick={() => handleGrade(grade)}
                                                disabled={!selectedPicker || isSubmitting}
                                                className={`${config.bg} ${config.border} rounded-lg p-4 flex items-center gap-3 
                                                    transition-all border border-gray-200 shadow-sm
                                                    ${!selectedPicker ? 'opacity-40 cursor-not-allowed' : 'active:scale-95'}
                                                    ${isSubmitting ? 'pointer-events-none' : ''}`}
                                            >
                                                {config.icon}
                                                <div className="text-left">
                                                    <div className={`font-semibold text-sm ${config.color}`}>
                                                        {config.label}
                                                    </div>
                                                    <div className="text-xs text-gray-500">{config.sublabel}</div>
                                                    <div className="text-xs text-gray-400 mt-0.5">
                                                        {distribution[grade as keyof Omit<GradeDistribution, 'total'>]} today
                                                    </div>
                                                </div>
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Step 3: Notes (optional) */}
                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                            <div className="px-4 py-3 border-b border-gray-100">
                                <h2 className="text-sm font-semibold text-gray-900">Add Details (optional)</h2>
                            </div>
                            <div className="p-4 space-y-3">
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Inspection notes..."
                                    aria-label="Inspection notes"
                                    rows={2}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                                <button className="flex items-center gap-2 px-3 py-2 text-sm text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors">
                                    <Camera size={16} />
                                    Attach Photo
                                </button>
                            </div>
                        </div>

                        {/* Today's Stats */}
                        {distribution.total > 0 && (
                            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                                <h3 className="text-sm font-semibold text-gray-900 mb-3">Today&apos;s Distribution</h3>
                                <DistributionBar distribution={distribution} />
                                <div className="flex justify-between mt-2 text-xs text-gray-500">
                                    <span>A: {distribution.A} ({distribution.total ? Math.round(distribution.A / distribution.total * 100) : 0}%)</span>
                                    <span>B: {distribution.B} ({distribution.total ? Math.round(distribution.B / distribution.total * 100) : 0}%)</span>
                                    <span>C: {distribution.C} ({distribution.total ? Math.round(distribution.C / distribution.total * 100) : 0}%)</span>
                                    <span>Rej: {distribution.reject} ({distribution.total ? Math.round(distribution.reject / distribution.total * 100) : 0}%)</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                        <div className="px-4 py-3 border-b border-gray-100">
                            <h2 className="text-sm font-semibold text-gray-900">
                                Recent Inspections ({inspections.length})
                            </h2>
                        </div>
                        {inspections.length > 0 ? (
                            <div className="divide-y divide-gray-100">
                                {inspections.map((insp) => {
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
                            <div className="p-8 text-center">
                                <ClipboardCheck size={40} className="mx-auto text-gray-300 mb-3" />
                                <p className="text-sm text-gray-500">No inspections recorded today</p>
                                <p className="text-xs text-gray-400 mt-1">Start inspecting to see history here</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'stats' && (
                    <div className="space-y-4">
                        {distribution.total > 0 ? (
                            <>
                                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Grade Distribution</h3>
                                    <DistributionBar distribution={distribution} large />
                                    <div className="grid grid-cols-4 gap-3 mt-4">
                                        {(['A', 'B', 'C', 'reject'] as const).map(grade => (
                                            <div key={grade} className="text-center">
                                                <div className={`text-2xl font-bold ${GRADE_CONFIG[grade].color}`}>
                                                    {distribution[grade as keyof Omit<GradeDistribution, 'total'>]}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {grade === 'reject' ? 'Reject' : `Grade ${grade}`}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {distribution.total ? Math.round(distribution[grade as keyof Omit<GradeDistribution, 'total'>] / distribution.total * 100) : 0}%
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
                                            <span className="font-medium text-green-600">
                                                {distribution.total ? Math.round(distribution.A / distribution.total * 100) : 0}%
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Rejection Rate</span>
                                            <span className="font-medium text-red-600">
                                                {distribution.total ? Math.round(distribution.reject / distribution.total * 100) : 0}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
                                <BarChart3 size={40} className="mx-auto text-gray-300 mb-3" />
                                <p className="text-sm text-gray-500">Grade distribution analytics</p>
                                <p className="text-xs text-gray-400 mt-1">Will show trends once inspections are logged</p>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

/* ── Distribution Bar Component ────────────── */

const DistributionBar: React.FC<{ distribution: GradeDistribution; large?: boolean }> = ({ distribution, large }) => {
    if (distribution.total === 0) return null;
    const h = large ? 'h-6' : 'h-3';

    return (
        <div className={`w-full ${h} rounded-full overflow-hidden flex`}>
            {distribution.A > 0 && (
                <div
                    className="bg-green-500 transition-all"
                    style={{ width: `${(distribution.A / distribution.total) * 100}%` }}
                    title={`Grade A: ${distribution.A}`}
                />
            )}
            {distribution.B > 0 && (
                <div
                    className="bg-blue-500 transition-all"
                    style={{ width: `${(distribution.B / distribution.total) * 100}%` }}
                    title={`Grade B: ${distribution.B}`}
                />
            )}
            {distribution.C > 0 && (
                <div
                    className="bg-amber-500 transition-all"
                    style={{ width: `${(distribution.C / distribution.total) * 100}%` }}
                    title={`Grade C: ${distribution.C}`}
                />
            )}
            {distribution.reject > 0 && (
                <div
                    className="bg-red-500 transition-all"
                    style={{ width: `${(distribution.reject / distribution.total) * 100}%` }}
                    title={`Reject: ${distribution.reject}`}
                />
            )}
        </div>
    );
};
