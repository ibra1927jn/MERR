import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../../services/supabase';

interface Orchard {
    id: string;
    name: string;
    total_rows?: number;
    location?: string;
}

interface OrchardSelectorProps {
    selectedOrchard: Orchard | null;
    onSelect: (orchard: Orchard) => void;
    className?: string;
}

const OrchardSelector: React.FC<OrchardSelectorProps> = ({ selectedOrchard, onSelect, className = '' }) => {
    const [orchards, setOrchards] = useState<Orchard[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Fetch orchards on mount
    useEffect(() => {
        const fetchOrchards = async () => {
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('orchards')
                    .select('id, name, total_rows, location')
                    .order('name');

                if (error) throw error;
                console.log('[OrchardSelector] Loaded', data?.length, 'orchards');
                setOrchards(data || []);
            } catch (error) {
                console.error('[OrchardSelector] Error:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchOrchards();
    }, []);

    // Click outside to close search mode
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsSearching(false);
                setSearchTerm('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Auto-focus when entering search mode
    useEffect(() => {
        if (isSearching && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isSearching]);

    // FILTER: Show all when empty, filter otherwise
    const filteredOrchards = useMemo(() => {
        if (!searchTerm.trim()) return orchards;

        const term = searchTerm.toLowerCase();
        return orchards.filter(o =>
            o.name.toLowerCase().includes(term) ||
            o.id.toString().toLowerCase().includes(term)
        );
    }, [orchards, searchTerm]);

    // Handle orchard selection
    const handleSelect = (orchard: Orchard) => {
        console.log('[OrchardSelector] Selected:', orchard.name);
        onSelect(orchard);
        setIsSearching(false);
        setSearchTerm('');
    };

    // Activate search mode
    const activateSearch = () => {
        setSearchTerm(''); // ALWAYS start clean
        setIsSearching(true);
    };

    // STATE A: Display Mode (not searching)
    if (!isSearching) {
        return (
            <div ref={wrapperRef} className={`relative ${className}`}>
                <button
                    onClick={activateSearch}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-white/5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors border border-slate-200 dark:border-white/10 group"
                >
                    <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-sm">eco</span>
                    <span className="text-sm font-medium text-slate-700 dark:text-white truncate max-w-[150px] group-hover:text-[#00f0ff] transition-colors">
                        {selectedOrchard?.name || "Select Orchard"}
                    </span>
                    <span className="material-symbols-outlined text-slate-400 text-sm">expand_more</span>
                </button>
            </div>
        );
    }

    // STATE B: Search Mode (actively searching)
    return (
        <div ref={wrapperRef} className={`relative ${className}`}>
            {/* Search Input - Born Clean, Never Pre-filled */}
            <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#00f0ff] text-lg">search</span>
                <input
                    ref={inputRef}
                    type="text"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Type to search..."
                    className="w-64 pl-10 pr-4 py-2 bg-slate-900 dark:bg-[#0a0a0a] border border-[#00f0ff]/50 text-white rounded-lg text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00f0ff]/50 focus:border-[#00f0ff] font-mono"
                />
                <button
                    onClick={() => { setIsSearching(false); setSearchTerm(''); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                    <span className="material-symbols-outlined text-sm">close</span>
                </button>
            </div>

            {/* Dropdown Results */}
            <div className="absolute top-full left-0 w-64 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-[#00f0ff]/30 mt-1 max-h-60 overflow-y-auto z-50 rounded-lg shadow-2xl">
                {isLoading ? (
                    <div className="p-3 text-center text-slate-400 text-sm">
                        <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                        <span className="ml-2">Loading...</span>
                    </div>
                ) : filteredOrchards.length === 0 ? (
                    <div className="p-3 text-center text-slate-400 text-sm">
                        {searchTerm ? `No results for "${searchTerm}"` : 'No orchards found'}
                    </div>
                ) : (
                    filteredOrchards.slice(0, 15).map(orchard => (
                        <div
                            key={orchard.id}
                            className={`px-3 py-2.5 hover:bg-[#00f0ff]/10 cursor-pointer text-sm flex items-center gap-2 transition-colors ${selectedOrchard?.id === orchard.id ? 'bg-[#00f0ff]/20 border-l-2 border-[#00f0ff]' : ''
                                }`}
                            onMouseDown={() => handleSelect(orchard)}
                        >
                            <span className="material-symbols-outlined text-green-500 text-sm">park</span>
                            <div className="flex-1">
                                <span className="text-slate-700 dark:text-white font-medium">{orchard.name}</span>
                                <span className="text-slate-400 text-[10px] ml-2">{orchard.total_rows || '?'} rows</span>
                            </div>
                            {selectedOrchard?.id === orchard.id && (
                                <span className="material-symbols-outlined text-[#00f0ff] text-sm">check</span>
                            )}
                        </div>
                    ))
                )}
                {filteredOrchards.length > 15 && (
                    <div className="px-3 py-2 text-center text-xs text-slate-400 border-t border-slate-100 dark:border-white/5">
                        +{filteredOrchards.length - 15} more • Type to filter
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrchardSelector;
