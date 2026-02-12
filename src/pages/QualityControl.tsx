/**
 * Quality Control Dashboard
 *
 * Entry page for QC Inspectors. Provides fruit quality auditing,
 * grade distribution overview, and inspection history.
 */

import React, { useState } from 'react';
import { ClipboardCheck, Apple, BarChart3, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

type QualityGrade = 'A' | 'B' | 'C' | 'reject';

interface GradeConfig {
    label: string;
    color: string;
    bg: string;
    icon: React.ReactNode;
}

const GRADE_CONFIG: Record<QualityGrade, GradeConfig> = {
    A: { label: 'Grade A — Export', color: 'text-green-700', bg: 'bg-green-100', icon: <CheckCircle2 size={18} className="text-green-600" /> },
    B: { label: 'Grade B — Domestic', color: 'text-blue-700', bg: 'bg-blue-100', icon: <CheckCircle2 size={18} className="text-blue-600" /> },
    C: { label: 'Grade C — Process', color: 'text-yellow-700', bg: 'bg-yellow-100', icon: <AlertTriangle size={18} className="text-yellow-600" /> },
    reject: { label: 'Reject', color: 'text-red-700', bg: 'bg-red-100', icon: <XCircle size={18} className="text-red-600" /> },
};

export default function QualityControl() {
    const [activeTab, setActiveTab] = useState<'inspect' | 'history' | 'stats'>('inspect');

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                        <ClipboardCheck size={22} className="text-emerald-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Quality Control</h1>
                        <p className="text-sm text-gray-500">Fruit Inspection Dashboard</p>
                    </div>
                </div>
            </header>

            {/* Navigation Tabs */}
            <nav className="bg-white border-b border-gray-200 px-4">
                <div className="flex gap-1">
                    {[
                        { key: 'inspect' as const, label: 'New Inspection', icon: <Apple size={16} /> },
                        { key: 'history' as const, label: 'History', icon: <ClipboardCheck size={16} /> },
                        { key: 'stats' as const, label: 'Statistics', icon: <BarChart3 size={16} /> },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key
                                    ? 'border-emerald-500 text-emerald-600'
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
                        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                            <h2 className="text-lg font-semibold mb-4">Quick Grade Entry</h2>
                            <p className="text-gray-500 text-sm mb-6">
                                Scan or select a picker, then tap a grade to log the inspection.
                            </p>

                            {/* Grade Buttons */}
                            <div className="grid grid-cols-2 gap-3">
                                {(Object.entries(GRADE_CONFIG) as [QualityGrade, GradeConfig][]).map(
                                    ([grade, config]) => (
                                        <button
                                            key={grade}
                                            className={`${config.bg} rounded-xl p-4 flex items-center gap-3 hover:opacity-80 transition-opacity border border-gray-200`}
                                        >
                                            {config.icon}
                                            <div className="text-left">
                                                <div className={`font-semibold ${config.color}`}>
                                                    {config.label}
                                                </div>
                                            </div>
                                        </button>
                                    )
                                )}
                            </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                            <div className="flex items-start gap-3">
                                <AlertTriangle size={20} className="text-amber-600 mt-0.5" />
                                <div>
                                    <p className="font-medium text-amber-800">Coming Soon</p>
                                    <p className="text-sm text-amber-700 mt-1">
                                        Full inspection workflow with photo capture, notes, and
                                        automatic picker notifications is under development.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
                        <ClipboardCheck size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500">No inspections recorded today</p>
                        <p className="text-sm text-gray-400 mt-1">Start a new inspection to see history here</p>
                    </div>
                )}

                {activeTab === 'stats' && (
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
                        <BarChart3 size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500">Grade distribution analytics</p>
                        <p className="text-sm text-gray-400 mt-1">Will show trends once inspections are logged</p>
                    </div>
                )}
            </main>
        </div>
    );
}
