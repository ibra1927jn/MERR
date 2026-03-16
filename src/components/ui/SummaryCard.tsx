/**
 * SummaryCard — Reusable metric card for page dashboards.
 *
 * Used by: HHRR, Logistics, Admin, Payroll, QC pages.
 * Supports optional highlight color and progress bar.
 */
import React from 'react';

export interface SummaryCardProps {
    /** Material Symbols icon name */
    icon: string;
    /** Tailwind text-color class for the icon, e.g. 'text-emerald-500' */
    iconColor: string;
    /** Short label displayed above the value */
    label: string;
    /** The metric value (pre-formatted string) */
    value: string | number;
    /** Optional: highlight the card (colored background + border) */
    highlight?: boolean;
    /** Optional: Tailwind highlight color theme, defaults to 'orange' */
    highlightColor?: 'orange' | 'red' | 'emerald' | 'amber' | 'indigo';
    /** Optional: progress bar (0–100) */
    progress?: number;
    /** Optional: Tailwind class for progress bar color */
    progressColor?: string;
}

const HIGHLIGHT_STYLES: Record<string, string> = {
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
};

const SummaryCard: React.FC<SummaryCardProps> = ({
    icon,
    iconColor,
    label,
    value,
    highlight,
    highlightColor = 'orange',
    progress,
    progressColor = 'bg-primary',
}) => {
    const hlStyle = highlight ? HIGHLIGHT_STYLES[highlightColor] : '';
    const baseStyle = highlight
        ? `rounded-xl p-4 shadow-sm border ${hlStyle}`
        : 'bg-white rounded-xl p-4 shadow-sm border border-border-light';

    return (
        <div className={baseStyle}>
            <div className="flex items-center gap-2 mb-1.5">
                <span className={`material-symbols-outlined text-lg ${iconColor}`}>{icon}</span>
                <span className="text-xs text-text-secondary font-medium">{label}</span>
            </div>
            <p className={`text-2xl font-black ${highlight ? '' : 'text-text-primary'}`}>
                {value}
            </p>
            {progress !== undefined && (
                <div className="mt-2 h-1.5 bg-surface-secondary rounded-full overflow-hidden">
                    <div
                        className={`h-full ${progressColor} rounded-full transition-all duration-300`}
                        style={{ width: `${Math.min(100, progress)}%` }}
                    />
                </div>
            )}
        </div>
    );
};

export default SummaryCard;
