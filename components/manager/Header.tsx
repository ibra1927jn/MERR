import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useHarvest } from '../../context/HarvestContext';
import { useNavigate } from 'react-router-dom';
import ProfileModal from '../modals/ProfileModal';
import { LanguageSelector } from '../LanguageSelector';
import OrchardSelector from './OrchardSelector';

interface HeaderProps {
    user: any;
    toggleSettings: () => void;
    activeTab: string;
}

const Header: React.FC<HeaderProps> = ({ user, toggleSettings, activeTab }) => {
    const { signOut } = useAuth();
    const { bucketRecords, orchard } = useHarvest();
    const navigate = useNavigate();

    // Handle orchard switching (future: integrate with context)
    const handleOrchardSelect = (newOrchard: any) => {
        console.log('[Header] Selected orchard:', newOrchard.name, newOrchard.id);
        // TODO: Add setOrchard to HarvestContext if persistent switching is needed
        // For now, just log the selection
    };

    // UI States
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showSystemPrefs, setShowSystemPrefs] = useState(false);

    const menuRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);
    const prefsRef = useRef<HTMLDivElement>(null);

    // Recent Scans for Notifications (last 5)
    const recentScans = bucketRecords?.slice(0, 5) || [];

    // Click Outside Handlers
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
                {/* Logo & Title */}
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-tr from-[#d91e36] to-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20">
                        <span className="material-symbols-outlined text-white text-lg">agriculture</span>
                    </div>
                    <div className="h-10 flex items-center">
                        <OrchardSelector
                            selectedOrchard={orchard ? { id: orchard.id, name: orchard.name || 'Unknown' } : null}
                            onSelect={handleOrchardSelect}
                        />
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
                    </button>

                    {/* Notifications Button */}
                    <div className="relative" ref={notifRef}>
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className={`p-2 transition-colors relative ${showNotifications ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/20 rounded-xl' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}
                        >
                            <span className="material-symbols-outlined">notifications</span>
                            {recentScans.length > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full border-2 border-white dark:border-[#1e1e1e]"></span>}
                        </button>

                        {/* Notifications Dropdown */}
                        {showNotifications && (
                            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#252525] rounded-xl shadow-2xl border border-slate-100 dark:border-white/5 py-2 animate-in fade-in zoom-in-95 duration-100 z-50">
                                <div className="px-4 py-2 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
                                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">Recent Activity</h3>
                                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">LIVE</span>
                                </div>
                                <div className="max-h-64 overflow-y-auto">
                                    {recentScans.length === 0 ? (
                                        <div className="p-4 text-center text-slate-400 text-xs py-8">No recent activity</div>
                                    ) : (
                                        recentScans.map((scan, idx) => (
                                            <div key={idx} className="px-4 py-3 border-b border-slate-50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 flex gap-3">
                                                <div className="mt-1 w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                                                <div>
                                                    <p className="text-xs font-bold text-slate-700 dark:text-gray-300">
                                                        Picker <span className="text-slate-900 dark:text-white">{scan.picker_id?.slice(0, 5)}...</span> scanned
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 mt-1">
                                                        {new Date(scan.scanned_at).toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' })} • Row {scan.row_number || '?'}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Divider */}
                    <div className="h-8 w-px bg-slate-200 dark:bg-white/10 mx-2"></div>

                    {/* Profile Dropdown */}
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className={`flex items-center gap-3 p-1.5 pr-3 rounded-full transition-all border ${isMenuOpen ? 'bg-slate-50 dark:bg-white/5 border-slate-200' : 'border-transparent hover:bg-slate-50 hover:border-slate-200'}`}
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
                            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#252525] rounded-xl shadow-2xl border border-slate-100 dark:border-white/5 py-2 animate-in fade-in zoom-in-95 duration-100 origin-top-right z-50">
                                <div className="px-4 py-3 border-b border-slate-100 dark:border-white/5 mb-2">
                                    <p className="text-xs font-bold text-slate-400 uppercase">Signed in as</p>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user?.email}</p>
                                </div>

                                <button
                                    onClick={() => { setIsMenuOpen(false); setShowProfile(true); }}
                                    className="w-full text-left px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-lg">account_circle</span>
                                    My Profile
                                </button>

                                <button
                                    onClick={() => { setIsMenuOpen(false); setShowSystemPrefs(true); }}
                                    className="w-full text-left px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-lg">settings</span>
                                    System Preferences
                                </button>

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

            {/* Profile Modal */}
            {showProfile && (
                <ProfileModal
                    onClose={() => setShowProfile(false)}
                    onLogout={handleLogout}
                    roleLabel="Manager"
                />
            )}

            {/* System Preferences Overlay */}
            {showSystemPrefs && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowSystemPrefs(false)}>
                    <div className="bg-white dark:bg-[#1e1e1e] p-6 rounded-2xl shadow-xl w-80 space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-lg dark:text-white">System Preferences</h3>
                            <button onClick={() => setShowSystemPrefs(false)} className="text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined">close</span></button>
                        </div>

                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase mb-2">Language</p>
                            <LanguageSelector compact={false} dark={false} />
                        </div>

                        <div className="pt-4 border-t dark:border-white/10">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-2">Display</p>
                            <div className="flex gap-2">
                                <button className="flex-1 py-2 bg-slate-100 dark:bg-white/5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300">Light</button>
                                <button className="flex-1 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium">Dark</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Header;
