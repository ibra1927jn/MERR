/**
 * OrchardSelector - Smart dropdown with real-time filtering
 * Filters orchard list as user types (e.g., "SM" shows SMILING TIGER)
 */
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabase';

interface Orchard {
    id: string;
    name: string;
    location?: string;
    total_rows?: number;
}

interface OrchardSelectorProps {
    currentOrchard?: Orchard | null;
    onSelect: (orchard: Orchard) => void;
}

const OrchardSelector: React.FC<OrchardSelectorProps> = ({ currentOrchard, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [orchards, setOrchards] = useState<Orchard[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Load orchards from Supabase (only after confirming auth session)
    useEffect(() => {
        const loadOrchards = async () => {
            setIsLoading(true);
            try {
                // Check auth session using session check first
                const { data: { session } } = await supabase.auth.getSession();

                if (!session?.user) {
                    console.warn('[OrchardSelector] No active user, waiting...');
                    setIsLoading(false);
                    return;
                }

                const { data, error } = await supabase
                    .from('orchards')
                    .select('id, name, location, total_rows')
                    .order('name');

                if (error) throw error;
                setOrchards(data || []);
            } catch (err) {
                console.error('[OrchardSelector] Failed to load orchards:', err);
            } finally {
                setIsLoading(false);
            }
        };

        // Slight delay to ensure auth state is settled if coming from context
        const timer = setTimeout(loadOrchards, 100);
        return () => clearTimeout(timer);
    }, []);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // CLIENT-SIDE FILTER - Instant filtering as user types
    const filteredOrchards = orchards.filter(o =>
        o.name.toLowerCase().includes(search.toLowerCase()) ||
        (o.location && o.location.toLowerCase().includes(search.toLowerCase()))
    );

    const handleSelect = (orchard: Orchard) => {
        onSelect(orchard);
        setSearch('');
        setIsOpen(false);
    };

    return (
        <div ref={dropdownRef} className="relative">
            {/* Trigger Button */}
            <button
                onClick={() => !isLoading && setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                disabled={isLoading}
            >
                <span className="material-symbols-outlined text-emerald-600">
                    {isLoading ? 'sync' : 'location_on'}
                </span>
                <span className="font-bold text-sm text-slate-700 truncate max-w-[150px]">
                    {isLoading ? 'Loading...' : (currentOrchard?.name || 'Select Orchard')}
                </span>
                <span className="material-symbols-outlined text-slate-400 text-sm">
                    {isLoading ? '' : (isOpen ? 'expand_less' : 'expand_more')}
                </span>
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute left-0 mt-2 w-80 bg-white dark:bg-[#252525] rounded-2xl shadow-2xl border border-slate-100 dark:border-white/10 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                    {/* Search Input */}
                    <div className="p-3 border-b border-slate-100 dark:border-white/5">
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                            <input
                                type="text"
                                placeholder="Filter orchards..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                autoFocus
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-white/5 border-none rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-green-500/50"
                            />
                        </div>
                    </div>

                    {/* Orchard List */}
                    <div className="max-h-64 overflow-y-auto">
                        {isLoading ? (
                            <div className="p-6 text-center text-slate-400 text-xs">Loading orchards...</div>
                        ) : filteredOrchards.length === 0 ? (
                            <div className="p-6 text-center text-slate-400 text-xs">
                                {search ? `No results for "${search}"` : 'No orchards found'}
                            </div>
                        ) : (
                            filteredOrchards.map(o => (
                                <button
                                    key={o.id}
                                    onClick={() => handleSelect(o)}
                                    className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left ${currentOrchard?.id === o.id ? 'bg-green-50 dark:bg-green-900/20' : ''
                                        }`}
                                >
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${currentOrchard?.id === o.id
                                        ? 'bg-green-500 text-white'
                                        : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                                        }`}>
                                        <span className="material-symbols-outlined text-xl">park</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{o.name}</p>
                                        <p className="text-[10px] text-slate-500 truncate">
                                            {o.location || 'Location N/A'} • {o.total_rows || '?'} rows
                                        </p>
                                    </div>
                                    {currentOrchard?.id === o.id && (
                                        <span className="material-symbols-outlined text-green-500">check_circle</span>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrchardSelector;
