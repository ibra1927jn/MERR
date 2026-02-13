/**
 * Import CSV Modal
 *
 * 3-step wizard: Upload → Preview → Confirm
 * Imports pickers in bulk from a CSV file.
 */

import React, { useState, useCallback, useRef } from 'react';

import { parseCSV, generateCSVTemplate, type CSVPickerRow, type ParseResult } from '@/utils/csvParser';
import { pickerService } from '@/services/picker.service';

interface ImportCSVModalProps {
    isOpen: boolean;
    onClose: () => void;
    orchardId: string;
    existingPickers: Array<{ picker_id: string; name: string }>;
    onImportComplete: (count: number) => void;
}

type Step = 'upload' | 'preview' | 'importing' | 'done';

export default function ImportCSVModal({
    isOpen,
    onClose,
    orchardId,
    existingPickers,
    onImportComplete,
}: ImportCSVModalProps) {
    const [step, setStep] = useState<Step>('upload');
    const [parseResult, setParseResult] = useState<ParseResult | null>(null);
    const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [fileName, setFileName] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const reset = useCallback(() => {
        setStep('upload');
        setParseResult(null);
        setImportResult(null);
        setDragActive(false);
        setFileName('');
    }, []);

    const handleClose = useCallback(() => {
        reset();
        onClose();
    }, [reset, onClose]);

    // ========================================
    // FILE HANDLING
    // ========================================

    const processFile = useCallback(async (file: File) => {
        if (!file.name.endsWith('.csv')) {
            alert('Please select a CSV file (.csv)');
            return;
        }

        setFileName(file.name);

        try {
            const result = await parseCSV(file, existingPickers);
            setParseResult(result);
            setStep('preview');
        } catch (err) {
            alert(`Error parsing CSV: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    }, [existingPickers]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    }, [processFile]);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    }, [processFile]);

    // ========================================
    // IMPORT
    // ========================================

    const handleImport = useCallback(async () => {
        if (!parseResult?.valid.length) return;

        setStep('importing');

        try {
            const result = await pickerService.addPickersBulk(parseResult.valid, orchardId);
            setImportResult(result);
            setStep('done');
            onImportComplete(result.created);
        } catch (err) {
            setImportResult({
                created: 0,
                skipped: parseResult.valid.length,
                errors: [err instanceof Error ? err.message : 'Unknown error'],
            });
            setStep('done');
        }
    }, [parseResult, orchardId, onImportComplete]);

    // ========================================
    // TEMPLATE DOWNLOAD
    // ========================================

    const downloadTemplate = useCallback(() => {
        const csv = generateCSVTemplate();
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'picker_import_template.csv';
        a.click();
        URL.revokeObjectURL(url);
    }, []);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-xl text-blue-600">group</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Import Pickers</h2>
                            <p className="text-sm text-gray-500">
                                {step === 'upload' && 'Upload a CSV file'}
                                {step === 'preview' && `Preview: ${fileName}`}
                                {step === 'importing' && 'Importing...'}
                                {step === 'done' && 'Import Complete'}
                            </p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Close import modal">
                        <span className="material-symbols-outlined text-xl text-gray-400">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* STEP 1: Upload */}
                    {step === 'upload' && (
                        <div className="space-y-4">
                            {/* Drop Zone */}
                            <div
                                className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${dragActive
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-300 hover:border-gray-400'
                                    }`}
                                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                                onDragLeave={() => setDragActive(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <span className="material-symbols-outlined text-5xl mx-auto text-gray-400 mb-4">upload</span>
                                <p className="text-gray-700 font-medium">
                                    Drag & drop your CSV file here
                                </p>
                                <p className="text-sm text-gray-500 mt-1">
                                    or click to browse
                                </p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    title="Select CSV file"
                                />
                            </div>

                            {/* Template Download */}
                            <button
                                onClick={downloadTemplate}
                                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                                <span className="material-symbols-outlined text-base">download</span>
                                Download CSV Template
                            </button>

                            {/* Format Help */}
                            <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-sm font-medium text-gray-700 mb-2">Expected columns:</p>
                                <div className="flex flex-wrap gap-2">
                                    {['Name *', 'Email', 'Phone', 'PickerID'].map(col => (
                                        <span key={col} className={`px-3 py-1 rounded-full text-xs font-medium ${col.includes('*') ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
                                            }`}>
                                            {col}
                                        </span>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    Column headers are flexible — &quot;Nombre&quot;, &quot;Worker Name&quot;, &quot;Full Name&quot; all work.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Preview */}
                    {step === 'preview' && parseResult && (
                        <div className="space-y-4">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-3 gap-3">
                                <SummaryCard
                                    icon={<span className="material-symbols-outlined text-xl text-green-600">check_circle</span>}
                                    label="Ready to import"
                                    value={parseResult.valid.length}
                                    color="green"
                                />
                                <SummaryCard
                                    icon={<span className="material-symbols-outlined text-xl text-yellow-600">warning</span>}
                                    label="Duplicates"
                                    value={parseResult.duplicates.length}
                                    color="yellow"
                                />
                                <SummaryCard
                                    icon={<span className="material-symbols-outlined text-xl text-red-600">cancel</span>}
                                    label="Errors"
                                    value={parseResult.errors.length}
                                    color="red"
                                />
                            </div>

                            {/* Valid Rows Table */}
                            {parseResult.valid.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 mb-2">
                                        Pickers to Import ({parseResult.valid.length})
                                    </h3>
                                    <div className="border border-gray-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50 sticky top-0">
                                                <tr>
                                                    <th className="text-left px-4 py-2 text-gray-600">#</th>
                                                    <th className="text-left px-4 py-2 text-gray-600">Name</th>
                                                    <th className="text-left px-4 py-2 text-gray-600">ID</th>
                                                    <th className="text-left px-4 py-2 text-gray-600">Email</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {parseResult.valid.map((row: CSVPickerRow, i: number) => (
                                                    <tr key={i} className="border-t border-gray-100">
                                                        <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                                                        <td className="px-4 py-2 font-medium">{row.name}</td>
                                                        <td className="px-4 py-2 text-gray-500">{row.picker_id || '—'}</td>
                                                        <td className="px-4 py-2 text-gray-500">{row.email || '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Errors */}
                            {parseResult.errors.length > 0 && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                    <h3 className="text-sm font-semibold text-red-700 mb-2">
                                        Validation Errors ({parseResult.errors.length})
                                    </h3>
                                    <ul className="space-y-1">
                                        {parseResult.errors.slice(0, 10).map((err, i) => (
                                            <li key={i} className="text-sm text-red-600">
                                                Row {err.row}: {err.message}
                                            </li>
                                        ))}
                                        {parseResult.errors.length > 10 && (
                                            <li className="text-sm text-red-500 italic">
                                                ...and {parseResult.errors.length - 10} more
                                            </li>
                                        )}
                                    </ul>
                                </div>
                            )}

                            {/* Duplicates */}
                            {parseResult.duplicates.length > 0 && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                                    <h3 className="text-sm font-semibold text-yellow-700 mb-2">
                                        Skipped Duplicates ({parseResult.duplicates.length})
                                    </h3>
                                    <ul className="space-y-1">
                                        {parseResult.duplicates.map((dup, i) => (
                                            <li key={i} className="text-sm text-yellow-600">
                                                ID &quot;{dup.picker_id}&quot; already assigned to {dup.existingName}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 3: Importing */}
                    {step === 'importing' && (
                        <div className="flex flex-col items-center justify-center py-16">
                            <span className="material-symbols-outlined text-5xl text-blue-500 animate-spin mb-4">progress_activity</span>
                            <p className="text-gray-700 font-medium">Importing {parseResult?.valid.length || 0} pickers...</p>
                            <p className="text-sm text-gray-500 mt-1">This may take a moment</p>
                        </div>
                    )}

                    {/* STEP 4: Done */}
                    {step === 'done' && importResult && (
                        <div className="space-y-4">
                            <div className="flex flex-col items-center py-8">
                                {importResult.created > 0 ? (
                                    <span className="material-symbols-outlined text-6xl text-green-500 mb-4">check_circle</span>
                                ) : (
                                    <span className="material-symbols-outlined text-6xl text-red-500 mb-4">cancel</span>
                                )}
                                <h3 className="text-xl font-bold text-gray-900">
                                    {importResult.created > 0 ? 'Import Successful!' : 'Import Failed'}
                                </h3>
                                <p className="text-gray-500 mt-1">
                                    {importResult.created} created, {importResult.skipped} skipped
                                </p>
                            </div>

                            {importResult.errors.length > 0 && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                    <h3 className="text-sm font-semibold text-red-700 mb-2">Errors</h3>
                                    <ul className="space-y-1">
                                        {importResult.errors.map((err, i) => (
                                            <li key={i} className="text-sm text-red-600">{err}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={step === 'done' ? handleClose : reset}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium text-sm"
                    >
                        {step === 'done' ? 'Close' : 'Cancel'}
                    </button>

                    {step === 'preview' && parseResult && parseResult.valid.length > 0 && (
                        <button
                            onClick={handleImport}
                            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-base">description</span>
                            Import {parseResult.valid.length} Pickers
                        </button>
                    )}

                    {step === 'done' && importResult && importResult.created > 0 && (
                        <button
                            onClick={handleClose}
                            className="px-6 py-2.5 bg-green-600 text-white rounded-xl font-medium text-sm hover:bg-green-700 transition-colors"
                        >
                            Done
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ========================================
// HELPER COMPONENTS
// ========================================

function SummaryCard({ icon, label, value, color }: {
    icon: React.ReactNode;
    label: string;
    value: number;
    color: 'green' | 'yellow' | 'red';
}) {
    const bgColors = { green: 'bg-green-50', yellow: 'bg-yellow-50', red: 'bg-red-50' };

    return (
        <div className={`${bgColors[color]} rounded-xl p-4 text-center`}>
            <div className="flex justify-center mb-2">{icon}</div>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            <div className="text-xs text-gray-600">{label}</div>
        </div>
    );
}
