/**
 * Shared Settings Form Components
 * 
 * Reusable form primitives extracted from SettingsView.tsx
 * for use across settings panels throughout the app.
 */
import React from 'react';

/* ── FormField ──────────────────────────── */

interface FormFieldProps {
    label: string;
    value: string | number;
    onChange: (value: string | number) => void;
    type?: 'text' | 'number' | 'select';
    prefix?: string;
    suffix?: string;
    step?: string;
    options?: string[];
}

export const FormField: React.FC<FormFieldProps> = ({
    label, value, onChange, type = 'text', prefix, suffix, step, options,
}) => (
    <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <div className="flex items-center gap-2">
            {prefix && <span className="text-sm text-gray-500 font-medium">{prefix}</span>}
            {type === 'select' ? (
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                >
                    {options?.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            ) : (
                <input
                    type={type}
                    value={value}
                    step={step}
                    onChange={(e) => onChange(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
            )}
            {suffix && <span className="text-xs text-gray-400 font-medium">{suffix}</span>}
        </div>
    </div>
);

/* ── ReadonlyField ──────────────────────── */

export const ReadonlyField: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <p className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-600">{value}</p>
    </div>
);

/* ── ToggleRow ──────────────────────────── */

interface ToggleRowProps {
    label: string;
    checked: boolean;
    onChange: (value: boolean) => void;
    locked?: boolean;
}

export const ToggleRow: React.FC<ToggleRowProps> = ({ label, checked, onChange, locked }) => (
    <div className="flex items-center justify-between py-1.5">
        <span className="text-sm text-gray-700 font-medium flex items-center gap-2">
            {label}
            {locked && (
                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-semibold">
                    REQUIRED
                </span>
            )}
        </span>
        <button
            onClick={() => !locked && onChange(!checked)}
            className={`
                relative w-10 h-6 rounded-full transition-colors duration-200
                ${locked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
                ${checked ? 'bg-green-500' : 'bg-gray-300'}
            `}
            disabled={locked}
            type="button"
        >
            <span
                className={`
                    absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200
                    ${checked ? 'translate-x-4' : 'translate-x-0'}
                `}
            />
        </button>
    </div>
);
