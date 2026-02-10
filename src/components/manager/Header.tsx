import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useHarvest } from '../../context/HarvestContext';
import { useNavigate } from 'react-router-dom';
import ProfileModal from '../modals/ProfileModal';
// import { LanguageSelector } from '../LanguageSelector'; // Use correct import if previously present, user provided this in snippet so I will include it. Oh wait, user provided: "import { LanguageSelector } from '../LanguageSelector';", I need to be careful with paths. User's snippet had it.
// Actually, looking at the user snippet for Header.tsx:
// `import { LanguageSelector } from '../LanguageSelector';` is present.
// And `// ❌ ELIMINADO: import OrchardSelector...` is commented out or just instruction.
// I will just use the code provided in the snippet.

import { LanguageSelector } from '../LanguageSelector';

interface HeaderProps {
    user: any;
    toggleSettings: () => void;
    activeTab: string;
}

const Header: React.FC<HeaderProps> = ({ user, toggleSettings, activeTab }) => {
    const { signOut } = useAuth();
    const { bucketRecords } = useHarvest();
    const navigate = useNavigate();

    // UI States
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showSystemPrefs, setShowSystemPrefs] = useState(false);

    const menuRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);
    const prefsRef = useRef<HTMLDivElement>(null);

    const recentScans = bucketRecords?.slice(0, 5) || [];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsMenuOpen(false);
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) setShowNotifications(false);
            if (prefsRef.current && !prefsRef.current.contains(event.target as Node)) setShowSystemPrefs(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    return (
        <>
            <header className="bg-white dark:bg-[#1e1e1e] border-b border-gray-200 dark:border-white/5 h-16 px-6 flex items-center justify-between sticky top-0 z-50 shadow-sm">
                {/* 1. RESTAURADO: Logo & Título (SIN SELECTOR) */}
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-tr from-[#d91e36] to-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20 shrink-0">
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
                    {/* Botón Manage Day (Donde ahora estará el selector al hacer clic) */}
                    <button
                        onClick={toggleSettings}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors relative group"
                        title="Manage Day"
                    >
                        <span className="material-symbols-outlined">tune</span>
                    </button>

                    {/* Notificaciones */}
                    <div className="relative" ref={notifRef}>
                        <button onClick={() => setShowNotifications(!showNotifications)} className={`p-2 transition-colors relative ${showNotifications ? 'text-blue-500' : 'text-slate-400 hover:text-white'}`}>
                            <span className="material-symbols-outlined">notifications</span>
                            {recentScans.length > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full border-2 border-[#1e1e1e]"></span>}
                        </button>
                    </div>

                    <div className="h-8 w-px bg-slate-200 dark:bg-white/10 mx-2"></div>

                    {/* Perfil */}
                    <div className="relative" ref={menuRef}>
                        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex items-center gap-3">
                            <img src={`https://ui-avatars.com/api/?name=${user?.email || 'Admin'}&background=0D8ABC&color=fff`} alt="Profile" className="w-8 h-8 rounded-full shadow-sm" />
                        </button>
                        {isMenuOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#252525] rounded-xl shadow-2xl border border-slate-100 dark:border-white/5 py-1 z-50">
                                <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-red-500 hover:bg-white/5 flex items-center gap-2">
                                    <span className="material-symbols-outlined">logout</span> Sign Out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>
            {showProfile && <ProfileModal onClose={() => setShowProfile(false)} onLogout={handleLogout} roleLabel="Manager" />}
        </>
    );
};

export default Header;
