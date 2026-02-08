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
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

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
                setOrchards(data || []);
            } catch (error) {
                console.error('Error fetching orchards:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchOrchards();
    }, []);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // INSTANT search filter - case insensitive
    const filteredOrchards = useMemo(() => {
        if (!searchTerm.trim()) return orchards;

        const term = searchTerm.toLowerCase();
        return orchards.filter(o =>
            o.name.toLowerCase().includes(term) ||
            o.id.toLowerCase().includes(term) ||
            o.location?.toLowerCase().includes(term)
        );
    }, [orchards, searchTerm]);

    const handleSelect = (orchard: Orchard) => {
        onSelect(orchard);
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <div ref={wrapperRef} className={`relative ${className}`}>
            {/* Trigger Button */}
            <button
                onClick={() => {
                    setIsOpen(!isOpen);
                    setTimeout(() => inputRef.current?.focus(), 100);
                }}
                className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-white/5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors border border-slate-200 dark:border-white/10"
            >
                <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-sm">eco</span>
                <span className="text-sm font-medium text-slate-700 dark:text-white truncate max-w-[150px]">
                    {selectedOrchard?.name || 'Select Orchard'}
                </span>
                <span className="material-symbols-outlined text-slate-400 text-sm">
                    {isOpen ? 'expand_less' : 'expand_more'}
                </span>
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-[#1e1e1e] rounded-xl shadow-2xl border border-slate-200 dark:border-white/10 z-50 overflow-hidden">
                    {/* Search Input */}
                    <div className="p-3 border-b border-slate-100 dark:border-white/5">
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search orchards..."
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-white/5 rounded-lg text-sm text-slate-700 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                    </div>

                    {/* Results List */}
                    <div className="max-h-64 overflow-y-auto">
                        {isLoading ? (
                            <div className="p-4 text-center text-slate-400 text-sm">
                                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                            </div>
                        ) : filteredOrchards.length === 0 ? (
                            <div className="p-4 text-center text-slate-400 text-sm">
                                {searchTerm ? `No orchards matching "${searchTerm}"` : 'No orchards found'}
                            </div>
                        ) : (
                            filteredOrchards.map(orchard => (
                                <button
                                    key={orchard.id}
                                    onClick={() => handleSelect(orchard)}
                                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-3 transition-colors ${selectedOrchard?.id === orchard.id ? 'bg-primary/10' : ''
                                        }`}
                                >
                                    <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-sm">park</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-700 dark:text-white truncate">
                                            {orchard.name}
                                        </p>
                                        <p className="text-[10px] text-slate-400">
                                            {orchard.total_rows || '?'} rows • {orchard.id.slice(0, 8)}
                                        </p>
                                    </div>
                                    {selectedOrchard?.id === orchard.id && (
                                        <span className="material-symbols-outlined text-primary text-lg">check_circle</span>
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
