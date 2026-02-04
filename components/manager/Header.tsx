import React from 'react';

interface HeaderProps {
    title: string;
    onProfileClick: () => void;
    onSettingsClick: () => void;
}

const Header: React.FC<HeaderProps> = ({
    title,
    onProfileClick,
    onSettingsClick
}) => (
    <header className="sticky top-0 z-40 bg-[#121212]/95 backdrop-blur-md border-b border-[#27272a]">
        <div className="px-4 h-16 flex justify-between items-center">
            <div>
                <h1 className="text-xl font-[800] text-white tracking-tight">{title}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-[10px] font-[500] text-green-500 uppercase tracking-wide">Live Sync</span>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={onSettingsClick}
                    className="size-10 rounded-full bg-[#27272a] flex items-center justify-center text-[#a1a1aa] hover:text-white transition-colors"
                >
                    <span className="material-symbols-outlined text-[20px]">settings</span>
                </button>
                <button
                    onClick={onProfileClick}
                    className="size-10 rounded-full bg-primary flex items-center justify-center text-white font-bold"
                >
                    MG
                </button>
            </div>
        </div>
    </header>
);

export default Header;
