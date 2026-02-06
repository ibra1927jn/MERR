import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
    user: any;
    toggleSettings: () => void;
    activeTab: string;
}

const Header: React.FC<HeaderProps> = ({ user, toggleSettings, activeTab }) => {
    const { signOut } = useAuth();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    return (
        <header className="bg-white dark:bg-[#1e1e1e] border-b border-gray-200 dark:border-white/5 h-16 px-6 flex items-center justify-between sticky top-0 z-50 shadow-sm">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-tr from-[#d91e36] to-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20">
                    <span className="material-symbols-outlined text-white text-lg">agriculture</span>
                </div>
                <div>
                    <h1 className="font-black text-lg tracking-tight text-slate-900 dark:text-white leading-none">
                        MERR <span className="text-[#d91e36]">Harvest</span>
                    </h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Manager Console
                    </p>
                </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
                {/* Day Settings Button */}
                <button
                    onClick={toggleSettings}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors relative group"
                    title="Day Settings"
                >
                    <span className="material-symbols-outlined">tune</span>
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-[#1e1e1e] hidden group-hover:block"></span>
                </button>

                {/* Notifications (Visual only for now) */}
                <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors relative">
                    <span className="material-symbols-outlined">notifications</span>
                    <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full border-2 border-white dark:border-[#1e1e1e]"></span>
                </button>

                {/* Divider */}
                <div className="h-8 w-px bg-slate-200 dark:bg-white/10 mx-2"></div>

                {/* Profile Dropdown */}
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-white/5 p-1.5 pr-3 rounded-full transition-all border border-transparent hover:border-slate-200 dark:hover:border-white/10"
                    >
                        <img
                            src={`https://ui-avatars.com/api/?name=${user?.email || 'Admin'}&background=0D8ABC&color=fff`}
                            alt="Profile"
                            className="w-8 h-8 rounded-full shadow-sm"
                        />
                        <div className="hidden md:block text-left">
                            <p className="text-xs font-bold text-slate-700 dark:text-white leading-tight">
                                {user?.email?.split('@')[0] || 'Manager'}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium">Online</p>
                        </div>
                        <span className="material-symbols-outlined text-slate-400 text-lg">expand_more</span>
                    </button>

                    {/* Dropdown Menu */}
                    {isMenuOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#252525] rounded-xl shadow-2xl border border-slate-100 dark:border-white/5 py-2 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                            <div className="px-4 py-3 border-b border-slate-100 dark:border-white/5 mb-2">
                                <p className="text-xs font-bold text-slate-400 uppercase">Signed in as</p>
                                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user?.email}</p>
                            </div>

                            <a href="#" className="block px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">account_circle</span>
                                My Profile
                            </a>
                            <a href="#" className="block px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">settings</span>
                                System Preferences
                            </a>

                            <div className="my-2 border-t border-slate-100 dark:border-white/5"></div>

                            <button
                                onClick={handleLogout}
                                className="w-full text-left px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined text-lg">logout</span>
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
