/**
 * InsightsView.tsx — Combined Analytics & Reports
 *
 * Merges CostAnalyticsView and WeeklyReportView behind a
 * clean inner toggle. Reduces Manager bottom-nav clutter.
 */
import React, { useState } from 'react';
import CostAnalyticsView from './CostAnalyticsView';
import WeeklyReportView from './WeeklyReportView';
import AnomalyDetectionView from './AnomalyDetectionView';
import ComponentErrorBoundary from '@/components/common/ComponentErrorBoundary';
import { useHarvestStore } from '@/stores/useHarvestStore';

type InsightsTab = 'analytics' | 'report' | 'fraud';

const InsightsView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<InsightsTab>('analytics');
    const orchard = useHarvestStore(s => s.orchard);
    const crew = useHarvestStore(s => s.crew);
    const pickerCount = crew.filter(c => c.role === 'picker').length;

    return (
        <div className="space-y-5 p-4 md:p-6 max-w-7xl mx-auto pb-24 animate-fade-in">
            {/* Page Header — matches Dashboard/Teams style */}
            <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
                <div>
                    <h1 className="text-2xl font-black text-text-main flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-3xl">insights</span>
                        Insights & Analytics
                    </h1>
                    <p className="text-sm text-text-muted font-medium mt-0.5">
                        Cost analysis & performance reports • {orchard?.name || 'Orchard'}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full">
                            <span className="material-symbols-outlined text-sm">groups</span>
                            {pickerCount} pickers
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                            <span className="material-symbols-outlined text-sm">monitoring</span>
                            Live data
                        </span>
                    </div>
                </div>

                {/* Tab Toggle — moved to header area */}
                <div className="flex items-center gap-1 bg-slate-100 border border-border-light rounded-xl p-1 w-fit">
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'analytics'
                            ? 'bg-primary text-white shadow-lg shadow-primary/25'
                            : 'text-text-sub hover:text-text-main'
                            }`}
                    >
                        <span className="material-symbols-outlined text-lg">bar_chart</span>
                        Analytics
                    </button>
                    <button
                        onClick={() => setActiveTab('report')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'report'
                            ? 'bg-primary text-white shadow-lg shadow-primary/25'
                            : 'text-text-sub hover:text-text-main'
                            }`}
                    >
                        <span className="material-symbols-outlined text-lg">summarize</span>
                        Weekly Report
                    </button>
                    <button
                        onClick={() => setActiveTab('fraud')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'fraud'
                            ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25'
                            : 'text-text-sub hover:text-text-main'
                            }`}
                    >
                        <span className="material-symbols-outlined text-lg">shield</span>
                        Fraud Shield
                    </button>
                </div>
            </div>

            {/* Content */}
            {activeTab === 'analytics' && (
                <div key="analytics" className="animate-fade-in">
                    <ComponentErrorBoundary componentName="Cost Analytics">
                        <CostAnalyticsView />
                    </ComponentErrorBoundary>
                </div>
            )}
            {activeTab === 'report' && (
                <div key="report" className="animate-fade-in">
                    <ComponentErrorBoundary componentName="Weekly Report">
                        <WeeklyReportView />
                    </ComponentErrorBoundary>
                </div>
            )}
            {activeTab === 'fraud' && (
                <div key="fraud" className="animate-fade-in">
                    <ComponentErrorBoundary componentName="Fraud Detection">
                        <AnomalyDetectionView />
                    </ComponentErrorBoundary>
                </div>
            )}
        </div>
    );
};

export default InsightsView;
