import React, { useState } from 'react';
import HomeView from '../components/views/team-leader/HomeView';
import TeamView from '../components/views/team-leader/TeamView';
import TasksView from '../components/views/team-leader/TasksView';
import ProfileView from '../components/views/team-leader/ProfileView';
import MessagingView from '../components/views/team-leader/MessagingView';

const TeamLeader = () => {
    // Solo estas 5 pestañas:
    const [activeTab, setActiveTab] = useState<'home' | 'team' | 'tasks' | 'profile' | 'chat'>('home');

    return (
        <div className="bg-slate-50 font-display min-h-screen flex flex-col pb-20">
            {/* CORRECCIÓN: Quitamos 'max-w-md mx-auto' para que ocupe todo el ancho */}
            <main className="flex-1 w-full relative bg-white shadow-sm min-h-screen">
                {activeTab === 'home' && <HomeView />}
                {activeTab === 'team' && <TeamView />}
                {activeTab === 'tasks' && <TasksView />} {/* El mapa vivirá aquí dentro */}
                {activeTab === 'profile' && <ProfileView />}
                {activeTab === 'chat' && <MessagingView />}
            </main>

            {/* Navegación: Quitamos restricciones de ancho también */}
            <nav className="fixed bottom-0 w-full bg-white border-t border-slate-200 z-50 pb-safe-bottom left-0 right-0">
                <div className="flex justify-around items-center h-16 px-4 max-w-5xl mx-auto">
                    <NavButton icon="home" label="Home" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
                    <NavButton icon="groups" label="Team" active={activeTab === 'team'} onClick={() => setActiveTab('team')} />
                    <NavButton icon="map" label="Tasks" active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} />
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
        className={`flex flex-col items-center justify-center w-full h-full transition-colors ${active ? 'text-[#ff1f3d]' : 'text-slate-400 hover:text-slate-600'
            }`}
    >
        <span className={`material-symbols-outlined text-[26px] ${active ? 'font-variation-fill' : ''}`}>
            {icon}
        </span>
        <span className="text-[10px] font-bold mt-0.5">{label}</span>
    </button>
);

export default TeamLeader;