import React from 'react';

interface TeamsToolbarProps {
    orchardId?: string;
    usersCount: number;
    setIsAddTeamLeaderModalOpen: (open: boolean) => void;
    setShowAddUser: (show: boolean) => void;
    search: string;
    setSearch: (value: string) => void;
}

const TeamsToolbar: React.FC<TeamsToolbarProps> = ({
    orchardId,
    usersCount,
    setIsAddTeamLeaderModalOpen,
    setShowAddUser,
    search,
    setSearch
}) => {
    return (
        <div className="bg-white dark:bg-card-dark border-b border-slate-200 dark:border-white/10 px-6 py-4 space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        Teams & Hierarchy
                    </h2>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">
                        Orchard ID: {orchardId || 'MISSING'} • DB Loaded: {usersCount}
                    </p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setIsAddTeamLeaderModalOpen(true)}
                        disabled={!orchardId}
                        className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${orchardId
                            ? 'bg-purple-600 text-white hover:bg-purple-700'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                    >
                        <span className="material-symbols-outlined text-lg">person_add</span>
                        Link Leader
                    </button>

                    <button
                        onClick={() => setShowAddUser(true)}
                        className="bg-slate-900 dark:bg-white dark:text-black text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition-all"
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
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-white/5 border-none rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/50"
                />
            </div>
        </div>
    );
};

export default TeamsToolbar;
