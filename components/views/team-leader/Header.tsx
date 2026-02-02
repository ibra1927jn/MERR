/**
 * Header Component - Team Leader
 * Sticky header with title, subtitle and profile button
 */
import React from 'react';

interface HeaderProps {
    title: string;
    subtitle: string;
    onProfileClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, onProfileClick }) => (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="flex items-center px-4 py-3 justify-between">
            <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-white border border-[#ff1f3d]/20 text-[#ff1f3d] shadow-sm flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">agriculture</span>
                </div>
                <div>
                    <h1 className="text-gray-900 text-lg font-bold">{title}</h1>
                    <p className="text-xs text-gray-500">{subtitle}</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button className="size-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 relative">
                    <span className="material-symbols-outlined">notifications</span>
                    <span className="absolute top-2 right-2 size-2 bg-[#ff1f3d] rounded-full border border-white"></span>
                </button>
                <button onClick={onProfileClick} className="size-10 rounded-full bg-[#ff1f3d] text-white flex items-center justify-center font-bold">TL</button>
            </div>
        </div>
    </header>
);

export default Header;
