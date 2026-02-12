/**
 * Header Component - Professional Light Theme
 * Shared header across Manager, Team Leader, and Runner views
 */
import React from 'react';

interface HeaderProps {
    title: string;
    subtitle: string;
    onProfileClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, onProfileClick }) => (
    <header className="sticky top-0 z-30 glass-header">
        <div className="flex items-center px-4 py-3 justify-between">
            <div className="flex items-center gap-3">
                {/* Logo mark */}
                <div className="size-10 rounded-xl bg-primary shadow-md shadow-primary/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-[22px]">agriculture</span>
                </div>
                <div>
                    <h1 className="text-gray-900 text-lg font-bold tracking-tight">{title}</h1>
                    <p className="text-xs text-gray-500">{subtitle}</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button className="size-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors relative">
                    <span className="material-symbols-outlined text-[20px]">notifications</span>
                    <span className="absolute top-1.5 right-1.5 size-2 bg-primary rounded-full ring-2 ring-white"></span>
                </button>
                <button onClick={onProfileClick} className="size-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-sm shadow-md shadow-primary/20 hover:bg-primary-dim transition-colors">TL</button>
            </div>
        </div>
    </header>
);

export default Header;
