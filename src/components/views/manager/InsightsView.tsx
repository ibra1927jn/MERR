/**
 * InsightsView.tsx — Combined Analytics & Reports
 *
 * Merges CostAnalyticsView and WeeklyReportView behind a
 * clean inner toggle. Reduces Manager bottom-nav clutter.
 */
import React, { useState } from 'react';
import CostAnalyticsView from './CostAnalyticsView';
import WeeklyReportView from './WeeklyReportView';
import ComponentErrorBoundary from '@/components/common/ComponentErrorBoundary';

type InsightsTab = 'analytics' | 'report';

const InsightsView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<InsightsTab>('analytics');

    return (
        <div className="space-y-4 p-4 md:p-6">
            {/* Inner Toggle */}
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
            </div>

            {/* Content */}
            {activeTab === 'analytics' ? (
                <ComponentErrorBoundary componentName="Cost Analytics">
                    <CostAnalyticsView />
                </ComponentErrorBoundary>
            ) : (
                <ComponentErrorBoundary componentName="Weekly Report">
                    <WeeklyReportView />
                </ComponentErrorBoundary>
            )}
        </div>
    );
};

export default InsightsView;
