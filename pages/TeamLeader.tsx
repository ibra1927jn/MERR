import React, { useState } from 'react';
import HomeView from '../components/views/team-leader/HomeView';
import TeamView from '../components/views/team-leader/TeamView';
import TasksView from '../components/views/team-leader/TasksView';
import ProfileView from '../components/views/team-leader/ProfileView';
import MessagingView from '../components/views/team-leader/MessagingView';

const TeamLeader = () => {
    // Solo dejamos las pestañas necesarias
    const [activeTab, setActiveTab] = useState<'home' | 'team' | 'tasks' | 'profile' | 'chat'>('home');

    return (
        <div className="bg-background-light font-display min-h-screen flex flex-col pb-20">
            <main className="flex-1 w-full relative">
                {activeTab === 'home' && <HomeView />}
                {activeTab === 'team' && <TeamView />}
                {activeTab === 'tasks' && <TasksView />} {/* Aquí estará el mapa ahora */}
                {activeTab === 'profile' && <ProfileView />}
                {activeTab === 'chat' && <MessagingView />}
            </main>

            {/* Navegación Limpia */}
            <nav className="fixed bottom-0 w-full bg-white border-t border-border-light z-50 pb-safe-bottom">
                <div className="flex justify-around items-center h-16 px-2">
                    <NavButton icon="home" label="Home" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
                    <NavButton icon="group" label="Team" active={activeTab === 'team'} onClick={() => setActiveTab('team')} />
                    <NavButton icon="map" label="Tasks" active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} />
                    <NavButton icon="forum" label="Chat" active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
                    <NavButton icon="person" label="Profile" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
                </div>
            </nav>
        </div>
    );
};

// Componente auxiliar para limpiar el código repetitivo
const NavButton = ({ icon, label, active, onClick }: any) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-center min-w-[50px] transition-colors ${active ? 'text-primary-vibrant' : 'text-text-sub hover:text-primary-vibrant'}`}>
        <span className="material-symbols-outlined text-[24px]" style={active ? { fontVariationSettings: "'FILL' 1" } : {}}>{icon}</span>
        <span className="text-[10px] font-medium mt-1">{label}</span>
    </button>
);

export default TeamLeader;