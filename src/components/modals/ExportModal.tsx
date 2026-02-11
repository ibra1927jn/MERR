/**
 * Export Modal Component
 * Allows selecting export format and options for payroll data
 */
import React, { useState } from 'react';
import { Picker } from '../../types';
import { exportService } from '../../services/export.service';
import { todayNZST } from '@/utils/nzst';

interface ExportModalProps {
    crew: Picker[];
    onClose: () => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ crew, onClose }) => {
    const [format, setFormat] = useState<'csv' | 'pdf'>('csv');
    const [isExporting, setIsExporting] = useState(false);
    const [selectedDate, setSelectedDate] = useState(
        todayNZST()
    );

    const handleExport = async () => {
        setIsExporting(true);
        try {
            if (format === 'csv') {
                exportService.exportToCSV(crew, selectedDate);
            } else {
                exportService.exportToPDF(crew, selectedDate);
            }
            // Small delay for UX feedback
            await new Promise(resolve => setTimeout(resolve, 500));
            onClose();
        } catch (error) {
            console.error('Export failed:', error);
        } finally {
            setIsExporting(false);
        }
    };

    // Calculate preview summary
    const summary = exportService.preparePayrollData(crew, selectedDate).summary;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-[#d91e36] to-[#ff1f3d] p-5 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-2xl">download</span>
                            <h2 className="text-xl font-bold">Export Payroll</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-full transition-colors"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-5">
                    {/* Date Selection */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Report Date
                        </label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={e => setSelectedDate(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#d91e36]/20 focus:border-[#d91e36] outline-none"
                        />
                    </div>

                    {/* Format Selection */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Export Format
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setFormat('csv')}
                                className={`p-4 rounded-xl border-2 transition-all ${format === 'csv'
                                    ? 'border-[#d91e36] bg-[#d91e36]/5'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-3xl text-green-600 mb-2 block">
                                    table_chart
                                </span>
                                <p className="font-bold text-gray-900">CSV</p>
                                <p className="text-xs text-gray-500">For Excel/Sheets</p>
                            </button>
                            <button
                                onClick={() => setFormat('pdf')}
                                className={`p-4 rounded-xl border-2 transition-all ${format === 'pdf'
                                    ? 'border-[#d91e36] bg-[#d91e36]/5'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-3xl text-red-600 mb-2 block">
                                    picture_as_pdf
                                </span>
                                <p className="font-bold text-gray-900">PDF</p>
                                <p className="text-xs text-gray-500">For printing</p>
                            </button>
                        </div>
                    </div>

                    {/* Preview Summary */}
                    <div className="bg-gray-50 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Preview Summary</h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <p className="text-gray-500">Pickers</p>
                                <p className="font-bold text-gray-900">{crew.length}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Total Buckets</p>
                                <p className="font-bold text-gray-900">{summary.totalBuckets}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Total Hours</p>
                                <p className="font-bold text-gray-900">{summary.totalHours.toFixed(1)}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Grand Total</p>
                                <p className="font-bold text-[#d91e36]">${summary.grandTotal.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-5 pt-0 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="flex-1 py-3 px-4 bg-[#d91e36] text-white rounded-xl font-semibold hover:bg-[#b91830] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isExporting ? (
                            <>
                                <span className="material-symbols-outlined animate-spin">refresh</span>
                                Exporting...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined">download</span>
                                Export {format.toUpperCase()}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExportModal;
