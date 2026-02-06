import React, { useState } from 'react';
import { useHarvest } from '../context/HarvestContext';
import { useAuth } from '../context/AuthContext';

// Vistas
import HomeView from '../components/views/team-leader/HomeView';
import TeamView from '../components/views/team-leader/TeamView';
import LogisticsView from '../components/views/team-leader/LogisticsView';
import ProfileView from '../components/views/team-leader/ProfileView';
import MessagingView from '../components/views/team-leader/MessagingView';

// Iconos
import { Home, Users, Map, MessageCircle, User } from 'lucide-react';

const TeamLeader = () => {
    const [activeTab, setActiveTab] = useState<'home' | 'team' | 'logistics' | 'chat' | 'profile'>('home');
    const { currentUser } = useHarvest();

    const renderContent = () => {
        switch (activeTab) {
            case 'home': return <HomeView />;
            case 'team': return <TeamView />;
            case 'logistics': return <LogisticsView />;
            case 'chat': return <MessagingView />;
            case 'profile': return <ProfileView />;
            default: return <HomeView />;
        }
    };

    const NavButton = ({ tab, icon: Icon, label }: { tab: typeof activeTab, icon: any, label: string }) => {
        const isActive = activeTab === tab;
        return (
            <button
                onClick={() => setActiveTab(tab)}
                className={`flex flex-col items-center justify-center w-full h-full transition-all ${isActive ? 'text-[#d91e36]' : 'text-slate-400 hover:text-[#d91e36]/70'
                    }`}
            >
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                <span className={`text-[10px] font-medium mt-1 ${isActive ? 'font-bold' : ''}`}>{label}</span>
            </button>
        );
    };

    return (
        <div className="min-h-screen bg-[#f4f5f7] pb-24 font-sans text-slate-800">
            <main className="w-full">{renderContent()}</main>

            <nav className="fixed bottom-0 w-full bg-white border-t border-slate-200 z-50 pb-safe-bottom shadow-[0_-5px_20px_rgba(0,0,0,0.03)]">
                <div className="grid grid-cols-5 h-16 items-center">
                    <NavButton tab="home" icon={Home} label="Home" />
                    <NavButton tab="team" icon={Users} label="Team" />
                    <NavButton tab="logistics" icon={Map} label="Rows" />
                    <NavButton tab="chat" icon={MessageCircle} label="Chat" />
                    <NavButton tab="profile" icon={User} label="Profile" />
                </div>
            </nav>
            <div className="fixed bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white to-transparent pointer-events-none z-10"></div>
        </div>
    );
};

export default TeamLeader;