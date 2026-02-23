/**
 * TeamLeaderProfileView — TL-specific profile: team overview, member list, compliance, details/edit
 */
import React, { useState, useMemo } from 'react';
import { Picker, PickerStatus } from '../../../types';
import { isPicker } from './roleUtils';

interface TeamLeaderProfileViewProps {
    picker: Picker;
    minWage: number;
    pieceRate: number;
    allCrew: Picker[];
    onUpdate: (id: string, updates: Partial<Picker>) => void;
}

const TeamLeaderProfileView: React.FC<TeamLeaderProfileViewProps> = React.memo(({
    picker,
    minWage,
    pieceRate,
    allCrew,
    onUpdate,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [status, setStatus] = useState<PickerStatus>(picker.status);

    const tlStats = useMemo(() => {
        const myPickers = allCrew.filter(p => p.team_leader_id === picker.id && isPicker(p.role || 'picker'));
        const activePickers = myPickers.filter(p => p.status === 'active');
        const totalBuckets = myPickers.reduce((s, p) => s + (p.total_buckets_today || 0), 0);
        const avgBuckets = myPickers.length > 0 ? Math.round(totalBuckets / myPickers.length) : 0;
        const belowMin = myPickers.filter(p => {
            const pRate = p.hours && p.hours > 0 ? (p.total_buckets_today * pieceRate) / p.hours : 0;
            return pRate < minWage && pRate > 0;
        }).length;
        return { teamSize: myPickers.length, activePickers: activePickers.length, totalBuckets, avgBuckets, belowMin };
    }, [allCrew, picker.id, pieceRate, minWage]);

    const handleSave = () => {
        onUpdate(picker.id, { status });
        setIsEditing(false);
    };

    return (
        <>
            {/* Team Overview */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-md p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Team Overview</p>
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-emerald-50 rounded-xl p-3 text-center">
                        <p className="text-2xl font-black text-emerald-700">{tlStats.teamSize}</p>
                        <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Pickers</p>
                        <p className="text-[10px] text-emerald-500 mt-1">{tlStats.activePickers} active</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 text-center">
                        <p className="text-2xl font-black text-slate-900">{tlStats.totalBuckets}</p>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">Team Buckets</p>
                        <p className="text-[10px] text-slate-400 mt-1">today</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 text-center">
                        <p className="text-2xl font-black text-slate-900">{tlStats.avgBuckets}</p>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">Avg/Picker</p>
                        <p className="text-[10px] text-slate-400 mt-1">buckets</p>
                    </div>
                </div>
                {tlStats.belowMin > 0 && (
                    <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber-600 text-[20px]">warning</span>
                        <p className="text-sm text-amber-700 font-medium">{tlStats.belowMin} picker{tlStats.belowMin > 1 ? 's' : ''} below minimum wage rate</p>
                    </div>
                )}
            </div>

            {/* Details Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Details</p>
                    {!isEditing && <button onClick={() => setIsEditing(true)} className="text-emerald-600 text-xs font-bold hover:text-emerald-800 transition-colors flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">edit</span>Edit</button>}
                </div>
                {isEditing ? (
                    <div className="space-y-3">
                        <div>
                            <label className="text-slate-500 text-xs block mb-1">Status</label>
                            <select value={status} onChange={(e) => setStatus(e.target.value as PickerStatus)} aria-label="Status"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-slate-900 bg-white transition-all">
                                <option value="active">Active</option>
                                <option value="on_break">On Break</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                        <div className="flex gap-2 pt-1">
                            <button onClick={handleSave} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-colors">Save</button>
                            <button onClick={() => setIsEditing(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors">Cancel</button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-50 rounded-xl p-3"><p className="text-[11px] text-slate-400 font-medium mb-0.5">Current Row</p><p className="text-sm font-bold text-slate-900">{picker.current_row ? `Row ${picker.current_row}` : 'Not assigned'}</p></div>
                        <div className="bg-slate-50 rounded-xl p-3"><p className="text-[11px] text-slate-400 font-medium mb-0.5">Hours On-Site</p><p className="text-sm font-bold text-slate-900">{picker.hours?.toFixed(1) || '0'}h</p></div>
                        <div className="bg-slate-50 rounded-xl p-3"><p className="text-[11px] text-slate-400 font-medium mb-0.5">Team Earnings</p><p className="text-sm font-bold text-emerald-600">${(tlStats.totalBuckets * pieceRate).toFixed(0)}</p></div>
                    </div>
                )}
            </div>
        </>
    );
});

TeamLeaderProfileView.displayName = 'TeamLeaderProfileView';
export default TeamLeaderProfileView;
