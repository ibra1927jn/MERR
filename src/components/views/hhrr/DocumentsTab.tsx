/**
 * DocumentsTab.tsx — HR Document Management
 * Upload area + document templates list
 */
import React from 'react';

const DOCUMENT_TEMPLATES = [
    'Employment Agreement',
    'Work Visa',
    'Health & Safety Certificate',
    'Tax Declaration',
    'RSE Worker Induction',
    'Pastoral Care Plan',
];

const DocumentsTab: React.FC = () => (
    <div className="space-y-4">
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
            <span className="material-symbols-outlined text-gray-300 text-5xl mb-3 block">cloud_upload</span>
            <h3 className="font-bold text-gray-900 mb-1">Document Management</h3>
            <p className="text-sm text-gray-500 mb-4">Upload and manage employment documents, visa copies, and certificates</p>
            <button className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors">
                Upload Document
            </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {DOCUMENT_TEMPLATES.map((doc, i) => (
                <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="size-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <span className="material-symbols-outlined text-gray-500">description</span>
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-gray-900 text-sm">{doc}</h4>
                        <p className="text-xs text-gray-500">Template • Required for all employees</p>
                    </div>
                    <span className="material-symbols-outlined text-gray-300 hover:text-gray-500 transition-colors">download</span>
                </div>
            ))}
        </div>
    </div>
);

export default DocumentsTab;
