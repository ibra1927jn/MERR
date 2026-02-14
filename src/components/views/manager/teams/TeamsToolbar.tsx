import React from 'react';


interface TeamsToolbarProps {
    orchardId?: string;
    usersCount: number;
    setIsAddTeamLeaderModalOpen: (open: boolean) => void;
    setShowAddUser: (show: boolean) => void;
    setShowImportCSV: (show: boolean) => void;
    search: string;
    setSearch: (value: string) => void;
}

const TeamsToolbar: React.FC<TeamsToolbarProps> = ({
    orchardId,
    usersCount,
    setIsAddTeamLeaderModalOpen,
    setShowAddUser,
    setShowImportCSV,
    search,
    setSearch
}) => {
    return (
        <div className="glass-header px-6 py-4 space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-black text-text-main flex items-center gap-2">
                        Teams & Hierarchy
                    </h2>
                    <p className="text-[10px] text-text-muted font-mono mt-1">
                        Orchard ID: {orchardId || 'MISSING'} • DB Loaded: {usersCount}
                    </p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setIsAddTeamLeaderModalOpen(true)}
                        disabled={!orchardId}
                        className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${orchardId
                            ? 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'
                            : 'bg-slate-50 text-text-muted cursor-not-allowed border border-border-light'
                            }`}
                    >
                        <span className="material-symbols-outlined text-lg">person_add</span>
                        Link Leader
                    </button>

                    <button
                        onClick={() => setShowImportCSV(true)}
                        disabled={!orchardId}
                        className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${orchardId
                            ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                            : 'bg-slate-50 text-text-muted cursor-not-allowed border border-border-light'
                            }`}
                    >
                        <span className="material-symbols-outlined text-base">upload</span>
                        Import CSV
                    </button>

                    <button
                        onClick={() => setShowAddUser(true)}
                        className="gradient-primary glow-primary text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:scale-105 transition-all"
                    >
                        <span className="material-symbols-outlined text-lg">add</span>
                        New Member
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                <input
                    placeholder="Search Personnel..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-border-light rounded-xl text-sm font-bold text-text-main placeholder-slate-400 outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30"
                />
            </div>
        </div>
    );
};

export default TeamsToolbar;
