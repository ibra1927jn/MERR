/**
 * SettingsView.tsx — Orchard Settings (Manager)
 * 
 * Professional enterprise settings form for configuring harvest rates,
 * orchard details, work schedule, and compliance toggles.
 * Replaces the AuditLogViewer that was incorrectly placed in the settings tab.
 */
import React, { useState, useEffect, useCallback } from 'react';

import { settingsService } from '@/services/settings.service';
import { useHarvestStore } from '@/stores/useHarvestStore';

interface SettingsFormData {
    piece_rate: number;
    min_wage_rate: number;
    min_buckets_per_hour: number;
    target_tons: number;
    variety: string;
}

interface ComplianceToggles {
    nz_employment_standards: boolean;
    auto_wage_alerts: boolean;
    safety_verification: boolean;
    audit_trail: boolean; // always ON, locked
}

const SettingsView: React.FC = () => {
    const { orchard, settings, updateSettings } = useHarvestStore();
    const orchardId = orchard?.id;

    const [formData, setFormData] = useState<SettingsFormData>({
        piece_rate: settings?.piece_rate ?? 6.5,
        min_wage_rate: settings?.min_wage_rate ?? 23.15,
        min_buckets_per_hour: settings?.min_buckets_per_hour ?? 8,
        target_tons: settings?.target_tons ?? 40,
        variety: settings?.variety ?? 'Cherry',
    });

    const [compliance, setCompliance] = useState<ComplianceToggles>({
        nz_employment_standards: true,
        auto_wage_alerts: true,
        safety_verification: true,
        audit_trail: true,
    });

    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
    const [hasChanges, setHasChanges] = useState(false);

    // Sync form when settings change from store
    useEffect(() => {
        if (settings) {
            setFormData({
                piece_rate: settings.piece_rate,
                min_wage_rate: settings.min_wage_rate,
                min_buckets_per_hour: settings.min_buckets_per_hour,
                target_tons: settings.target_tons,
                variety: settings.variety ?? 'Cherry',
            });
        }
    }, [settings]);

    const handleChange = useCallback((field: keyof SettingsFormData, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setHasChanges(true);
        setSaveStatus('idle');
    }, []);

    const handleSave = async () => {
        if (!orchardId) return;
        setIsSaving(true);
        setSaveStatus('idle');

        try {
            await settingsService.updateHarvestSettings(orchardId, {
                piece_rate: Number(formData.piece_rate),
                min_wage_rate: Number(formData.min_wage_rate),
                min_buckets_per_hour: Number(formData.min_buckets_per_hour),
                target_tons: Number(formData.target_tons),
                variety: formData.variety,
            });

            // Update global store so Dashboard reflects changes immediately
            updateSettings({
                piece_rate: Number(formData.piece_rate),
                min_wage_rate: Number(formData.min_wage_rate),
                min_buckets_per_hour: Number(formData.min_buckets_per_hour),
                target_tons: Number(formData.target_tons),
                variety: formData.variety,
            });

            setSaveStatus('saved');
            setHasChanges(false);
        } catch {
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
            {/* Page Title */}
            <div>
                <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
                <p className="text-sm text-gray-500 mt-1">
                    {orchard?.name || 'Orchard'} configuration
                </p>
            </div>

            {/* Section 1: Harvest Configuration */}
            <section className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="px-5 py-4 border-b border-gray-100">
                    <h3 className="text-base font-semibold text-gray-900">Harvest Configuration</h3>
                </div>
                <div className="px-5 py-4 space-y-4">
                    <FormField
                        label="Piece Rate (per bucket)"
                        value={formData.piece_rate}
                        onChange={(v) => handleChange('piece_rate', v)}
                        prefix="$"
                        type="number"
                        step="0.50"
                    />
                    <FormField
                        label="Minimum Wage (per hour)"
                        value={formData.min_wage_rate}
                        onChange={(v) => handleChange('min_wage_rate', v)}
                        prefix="$"
                        suffix="NZD"
                        type="number"
                        step="0.05"
                    />
                    <FormField
                        label="Target Buckets / Hour"
                        value={formData.min_buckets_per_hour}
                        onChange={(v) => handleChange('min_buckets_per_hour', v)}
                        type="number"
                        step="1"
                    />
                    <FormField
                        label="Daily Target (tons)"
                        value={formData.target_tons}
                        onChange={(v) => handleChange('target_tons', v)}
                        type="number"
                        step="1"
                    />
                </div>
            </section>

            {/* Section 2: Orchard Info (read-only from DB) */}
            <section className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="px-5 py-4 border-b border-gray-100">
                    <h3 className="text-base font-semibold text-gray-900">Orchard Details</h3>
                </div>
                <div className="px-5 py-4 space-y-4">
                    <ReadonlyField label="Orchard Name" value={orchard?.name || '—'} />
                    <ReadonlyField label="Total Rows" value={String(orchard?.total_rows ?? '—')} />
                    <FormField
                        label="Fruit Variety"
                        value={formData.variety}
                        onChange={(v) => handleChange('variety', v)}
                        type="select"
                        options={['Cherry', 'Apple', 'Kiwifruit', 'Pear', 'Mix']}
                    />
                </div>
            </section>

            {/* Section 3: Compliance */}
            <section className="bg-white rounded-lg border border-gray-200 shadow-sm border-l-4 border-l-green-500">
                <div className="px-5 py-4 border-b border-gray-100">
                    <h3 className="text-base font-semibold text-gray-900">Compliance Settings</h3>
                </div>
                <div className="px-5 py-4 space-y-3">
                    <ToggleRow
                        label="NZ Employment Standards"
                        checked={compliance.nz_employment_standards}
                        onChange={(v) => setCompliance(prev => ({ ...prev, nz_employment_standards: v }))}
                    />
                    <ToggleRow
                        label="Automatic Wage Alerts"
                        checked={compliance.auto_wage_alerts}
                        onChange={(v) => setCompliance(prev => ({ ...prev, auto_wage_alerts: v }))}
                    />
                    <ToggleRow
                        label="Safety Verification Required"
                        checked={compliance.safety_verification}
                        onChange={(v) => setCompliance(prev => ({ ...prev, safety_verification: v }))}
                    />
                    <ToggleRow
                        label="Audit Trail Logging"
                        checked={compliance.audit_trail}
                        onChange={() => {/* locked */ }}
                        locked
                    />
                </div>
            </section>

            {/* Save Button */}
            <div className="space-y-3">
                <button
                    onClick={handleSave}
                    disabled={isSaving || !hasChanges}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-colors ${hasChanges
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                >
                    {isSaving ? (
                        <span className="material-symbols-outlined text-base animate-spin">refresh</span>
                    ) : (
                        <span className="material-symbols-outlined text-base">save</span>
                    )}
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
                {saveStatus === 'saved' && (
                    <p className="text-center text-sm text-green-600">Settings saved successfully</p>
                )}
                {saveStatus === 'error' && (
                    <p className="text-center text-sm text-red-600">Failed to save. Please try again.</p>
                )}
            </div>

            {/* Danger Zone */}
            <section className="bg-white rounded-lg border border-gray-200 shadow-sm border-l-4 border-l-red-400">
                <div className="px-5 py-4 border-b border-gray-100">
                    <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                        <span className="material-symbols-outlined text-base text-red-500">warning</span>
                        Danger Zone
                    </h3>
                </div>
                <div className="px-5 py-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-900">Reset Today&apos;s Data</p>
                            <p className="text-xs text-gray-500">Clear all bucket records for today</p>
                        </div>
                        <button className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition-colors">
                            Reset
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
};

/* ── Sub-components ───────────────────────────────────── */

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

const FormField: React.FC<FormFieldProps> = ({
    label, value, onChange, type = 'text', prefix, suffix, step, options,
}) => (
    <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <div className="flex items-center gap-1.5">
            {prefix && <span className="text-sm text-gray-400">{prefix}</span>}
            {type === 'select' && options ? (
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    title={label}
                    aria-label={label}
                    className="w-32 text-right bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                    {options.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            ) : (
                <input
                    type={type}
                    value={value}
                    step={step}
                    title={label}
                    aria-label={label}
                    onChange={(e) => onChange(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                    className="w-24 text-right bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
            )}
            {suffix && <span className="text-xs text-gray-400">{suffix}</span>}
        </div>
    </div>
);

const ReadonlyField: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm text-gray-500">{value}</span>
    </div>
);

interface ToggleRowProps {
    label: string;
    checked: boolean;
    onChange: (value: boolean) => void;
    locked?: boolean;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ label, checked, onChange, locked }) => (
    <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
            {label}
            {locked && <span className="material-symbols-outlined text-xs text-gray-400">lock</span>}
        </span>
        <button
            onClick={() => !locked && onChange(!checked)}
            aria-label={`Toggle ${label}`}
            role="switch"
            aria-checked={checked}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${locked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                } ${checked ? 'bg-green-500' : 'bg-gray-200'}`}
        >
            <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${checked ? 'translate-x-6' : 'translate-x-1'
                    }`}
            />
        </button>
    </div>
);

export default SettingsView;
