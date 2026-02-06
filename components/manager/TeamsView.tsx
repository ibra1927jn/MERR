/**
 * Manager Teams View Component
 * Displays team members with filtering and sorting
 */
import React, { useState } from 'react';
import { Picker } from '../../types';

interface TeamsViewProps {
    crew: Picker[];
    onViewPicker: (picker: Picker) => void;
}

const TeamsView: React.FC<TeamsViewProps> = ({ crew, onViewPicker }) => {
    const [filter, setFilter] = useState<'all' | 'active' | 'break' | 'below'>('all');
    const [sortBy, setSortBy] = useState<'name' | 'buckets' | 'status'>('buckets');

    const filteredCrew = crew
        .filter(p => {
            if (filter === 'all') return true;
            if (filter === 'active') return p.status === 'active';
            if (filter === 'break') return p.status === 'on_break';
            if (filter === 'below') return p.total_buckets_today < 20; // Simplified threshold
            return true;
        })
        .sort((a, b) => {
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            if (sortBy === 'buckets') return b.total_buckets_today - a.total_buckets_today;
            if (sortBy === 'status') return a.status.localeCompare(b.status);
            return 0;
        });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-500';
            case 'on_break':
                return 'bg-orange-500';
            default:
                return 'bg-gray-400';
        }
    };

    return (
        <main className="flex-1 overflow-y-auto pb-24 px-4 pt-4">
            {/* Filters */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                {[
                    { key: 'all', label: 'All' },
                    { key: 'active', label: 'Active' },
                    { key: 'break', label: 'On Break' },
                    { key: 'below', label: 'Below Min' },
                ].map(f => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key as typeof filter)}
                        className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${filter === f.key
                            ? 'bg-[#d91e36] text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2 mb-4">
                <span className="text-xs text-gray-500">Sort by:</span>
                <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as typeof sortBy)}
                    className="text-xs font-bold text-gray-700 bg-transparent"
                >
                    <option value="buckets">Buckets</option>
                    <option value="name">Name</option>
                    <option value="status">Status</option>
                </select>
            </div>

            {/* Team List */}
            <div className="space-y-2">
                {filteredCrew.map(picker => (
                    <div
                        key={picker.id}
                        onClick={() => onViewPicker(picker)}
                        className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3 active:scale-[0.98] transition-transform cursor-pointer"
                    >
                        <div className="relative">
                            <div className="size-12 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center font-bold text-lg">
                                {picker.avatar}
                            </div>
                            <span
                                className={`absolute bottom-0 right-0 size-3 rounded-full border-2 border-white ${getStatusColor(
                                    picker.status
                                )}`}
                            />
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-gray-900">{picker.name}</p>
                            <p className="text-xs text-gray-500">
                                {picker.picker_id} • Row {picker.row || '-'}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xl font-black text-[#d91e36]">{picker.total_buckets_today}</p>
                            <p className="text-xs text-gray-500">buckets</p>
                        </div>
                        <span className="material-symbols-outlined text-gray-300">chevron_right</span>
                    </div>
                ))}
            </div>

            {filteredCrew.length === 0 && (
                <div className="text-center py-12">
                    <span className="material-symbols-outlined text-gray-300 text-6xl">
                        person_search
                    </span>
                    <p className="text-gray-500 mt-2">No team members match this filter</p>
                </div>
            )}
        </main>
    );
};

export default TeamsView;
