/**
 * RequestsTab.tsx — Logistics Transport Requests
 * Priority-sorted request cards with status and assignment info
 */
import React from 'react';
import { TransportRequest } from '@/services/logistics-dept.service';

const PRIORITY_BADGES: Record<string, string> = {
    urgent: 'bg-red-100 text-red-700',
    high: 'bg-amber-100 text-amber-700',
    normal: 'bg-gray-100 text-gray-600',
};

const STATUS_BADGES: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700',
    assigned: 'bg-sky-50 text-sky-700',
    in_progress: 'bg-indigo-50 text-indigo-700',
    completed: 'bg-emerald-50 text-emerald-700',
    cancelled: 'bg-red-50 text-red-700',
};

interface RequestsTabProps {
    requests: TransportRequest[];
}

const RequestsTab: React.FC<RequestsTabProps> = ({ requests }) => (
    <div className="space-y-3">
        {requests.length === 0 && (
            <div className="text-center py-12 text-gray-400">
                <span className="material-symbols-outlined text-4xl mb-2 block">inbox</span>
                <p className="font-medium">No pending requests</p>
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {requests.map(req => (
                <div key={req.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${PRIORITY_BADGES[req.priority] || 'bg-gray-100 text-gray-600'}`}>
                                {req.priority}
                            </span>
                            <h4 className="font-bold text-gray-900 text-sm">Zone {req.zone}</h4>
                        </div>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${STATUS_BADGES[req.status] || 'bg-gray-100 text-gray-600'}`}>
                            {req.status.replace('_', ' ')}
                        </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                        <span>{req.requester_name}</span>
                        <span>•</span>
                        <span>{req.bins_count} bins</span>
                        {req.assigned_tractor && (
                            <>
                                <span>•</span>
                                <span className="text-indigo-600 font-medium">Assigned to {req.assigned_tractor}</span>
                            </>
                        )}
                    </div>
                    {req.notes && (
                        <p className="text-xs text-gray-400 italic">{req.notes}</p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-1">
                        {new Date(req.created_at).toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' })} — {new Date(req.created_at).toLocaleDateString('en-NZ')}
                    </p>
                </div>
            ))}
        </div>
    </div>
);

export default RequestsTab;
