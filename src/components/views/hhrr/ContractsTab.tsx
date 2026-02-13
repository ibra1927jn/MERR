/**
 * ContractsTab.tsx — HR Contract Management
 * Shows contract list with type badges and renewal warnings
 */
import React from 'react';
import { Employee, HRSummary } from '@/services/hhrr.service';

interface ContractsTabProps {
    employees: Employee[];
    summary: HRSummary;
}

const ContractsTab: React.FC<ContractsTabProps> = ({ employees, summary }) => (
    <div className="space-y-4">
        {summary.pendingContracts > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                <span className="material-symbols-outlined text-amber-600">info</span>
                <p className="text-sm text-amber-800 font-medium">{summary.pendingContracts} contracts need renewal within 30 days</p>
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {employees.map(emp => (
                <div key={emp.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-gray-900 text-sm">{emp.full_name}</h3>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${emp.contract_type === 'permanent' ? 'bg-emerald-50 text-emerald-700' :
                            emp.contract_type === 'seasonal' ? 'bg-sky-50 text-sky-700' :
                                'bg-gray-100 text-gray-600'
                            }`}>{emp.contract_type}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">event</span>
                            {new Date(emp.contract_start).toLocaleDateString('en-NZ', { month: 'short', year: 'numeric' })}
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">attach_money</span>
                            ${emp.hourly_rate}/hr
                        </span>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export default ContractsTab;
