import React, { useState, useEffect } from 'react';
import { useHarvestStore } from '../src/stores/useHarvestStore';
import HomeView from '../components/views/team-leader/HomeView';
import TeamView from '../components/views/team-leader/TeamView';
import TasksView from '../components/views/team-leader/TasksView';
import ProfileView from '../components/views/team-leader/ProfileView';
import MessagingView from '../components/views/team-leader/MessagingView';
import AttendanceView from '../components/views/team-leader/AttendanceView';

const TeamLeader = () => {
    const fetchGlobalData = useHarvestStore((state) => state.fetchGlobalData);

    useEffect(() => {
        fetchGlobalData();
    }, []);

    // Solo estas 5 pestañas:
    const [activeTab, setActiveTab] = useState<'home' | 'team' | 'tasks' | 'profile' | 'chat' | 'attendance'>('home');

    return (
        <div className="bg-slate-50 font-display min-h-screen flex flex-col pb-20">
            {/* CORRECCIÓN: Quitamos 'max-w-md mx-auto' para que ocupe todo el ancho */}
            <main className="flex-1 w-full relative bg-white shadow-sm min-h-screen">
                {activeTab === 'home' && <HomeView onNavigate={(tab) => setActiveTab(tab as any)} />}
                {activeTab === 'attendance' && <AttendanceView />}
                {activeTab === 'team' && <TeamView />}
                {activeTab === 'tasks' && <TasksView />} {/* El mapa vivirá aquí dentro */}
                {activeTab === 'profile' && <ProfileView />}
                {activeTab === 'chat' && <MessagingView />}
            </main>

            {/* Navbar Inferior: Clean White Design */}
            <nav className="fixed bottom-0 w-full bg-white border-t border-border-light z-50 pb-safe-bottom left-0 right-0">
                <div className="flex justify-around items-center h-16 px-4 max-w-5xl mx-auto">
                    <NavButton icon="home" label="Home" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
                    <NavButton icon="fact_check" label="Roll Call" active={activeTab === 'attendance'} onClick={() => setActiveTab('attendance')} />
                    <NavButton icon="groups" label="Team" active={activeTab === 'team'} onClick={() => setActiveTab('team')} />
                    <NavButton icon="assignment" label="Tasks" active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} />
                    <NavButton icon="forum" label="Chat" active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
                    <NavButton icon="person" label="Profile" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
                </div>
            </nav>
        </div>
    );
};

const NavButton = ({ icon, label, active, onClick }: any) => (
    <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center w-full h-full transition-colors ${active ? 'text-primary-vibrant' : 'text-text-sub hover:text-text-main'
            }`}
    >
        <span className={`material-symbols-outlined text-[26px] ${active ? 'font-variation-fill' : ''}`}>
            {icon}
        </span>
        <span className="text-[10px] font-medium mt-0.5">{label}</span>
    </button>
);

export default TeamLeader;