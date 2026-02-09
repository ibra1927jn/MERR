// pages/TeamLeader.tsx
import React, { useState } from 'react';
import HomeView from '../components/views/team-leader/HomeView';
import TeamView from '../components/views/team-leader/TeamView';
import TasksView from '../components/views/team-leader/TasksView';
import ProfileView from '../components/views/team-leader/ProfileView';
import MessagingView from '../components/views/team-leader/MessagingView';
import LogisticsView from '../components/views/team-leader/LogisticsView';
import RunnersView from '../components/views/team-leader/RunnersView';

const TeamLeader = () => {
    const [activeTab, setActiveTab] = useState<'home' | 'team' | 'tasks' | 'logistics' | 'runners' | 'profile' | 'chat'>('home');

    return (
        <div className="bg-background-light font-display min-h-screen flex flex-col antialiased selection:bg-primary-vibrant selection:text-white text-text-main pb-20">

            {/* Contenido Dinámico */}
            <main className="flex-1 w-full relative">
                {activeTab === 'home' && <HomeView />}
                {activeTab === 'team' && <TeamView />}
                {activeTab === 'tasks' && <TasksView />}
                {activeTab === 'logistics' && <LogisticsView />}
                {activeTab === 'runners' && <RunnersView />}
                {activeTab === 'profile' && <ProfileView />}
                {activeTab === 'chat' && <MessagingView />}
            </main>

            {/* Barra de Navegación Inferior Fija - Scroll Horizontal si es necesario */}
            <nav className="fixed bottom-0 w-full bg-white border-t border-border-light z-50 pb-safe-bottom shadow-[0_-5px_20px_rgba(0,0,0,0.03)] overflow-x-auto no-scrollbar">
                <div className="flex justify-between items-center h-16 min-w-max px-2 gap-2">
                    <button
                        onClick={() => setActiveTab('home')}
                        className={`flex flex-col items-center justify-center min-w-[50px] transition-colors ${activeTab === 'home' ? 'text-primary-vibrant' : 'text-text-sub hover:text-primary-vibrant'}`}
                    >
                        <span className="material-symbols-outlined text-[24px]" style={activeTab === 'home' ? { fontVariationSettings: "'FILL' 1" } : {}}>home</span>
                        <span className="text-[10px] font-medium mt-1">Home</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('team')}
                        className={`flex flex-col items-center justify-center min-w-[50px] transition-colors ${activeTab === 'team' ? 'text-primary-vibrant' : 'text-text-sub hover:text-primary-vibrant'}`}
                    >
                        <span className="material-symbols-outlined text-[24px]" style={activeTab === 'team' ? { fontVariationSettings: "'FILL' 1" } : {}}>group</span>
                        <span className="text-[10px] font-medium mt-1">Team</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('tasks')}
                        className={`flex flex-col items-center justify-center min-w-[50px] transition-colors ${activeTab === 'tasks' ? 'text-primary-vibrant' : 'text-text-sub hover:text-primary-vibrant'}`}
                    >
                        <span className="material-symbols-outlined text-[24px]" style={activeTab === 'tasks' ? { fontVariationSettings: "'FILL' 1" } : {}}>assignment</span>
                        <span className="text-[10px] font-medium mt-1">Tasks</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('logistics')}
                        className={`flex flex-col items-center justify-center min-w-[50px] transition-colors ${activeTab === 'logistics' ? 'text-primary-vibrant' : 'text-text-sub hover:text-primary-vibrant'}`}
                    >
                        <span className="material-symbols-outlined text-[24px]" style={activeTab === 'logistics' ? { fontVariationSettings: "'FILL' 1" } : {}}>map</span>
                        <span className="text-[10px] font-medium mt-1">Map</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('runners')}
                        className={`flex flex-col items-center justify-center min-w-[50px] transition-colors ${activeTab === 'runners' ? 'text-primary-vibrant' : 'text-text-sub hover:text-primary-vibrant'}`}
                    >
                        <span className="material-symbols-outlined text-[24px]" style={activeTab === 'runners' ? { fontVariationSettings: "'FILL' 1" } : {}}>local_shipping</span>
                        <span className="text-[10px] font-medium mt-1">Runners</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('chat')}
                        className={`flex flex-col items-center justify-center min-w-[50px] transition-colors relative ${activeTab === 'chat' ? 'text-primary-vibrant' : 'text-text-sub hover:text-primary-vibrant'}`}
                    >
                        <div className="absolute top-0 right-3 size-2 bg-primary-vibrant rounded-full border border-white"></div>
                        <span className="material-symbols-outlined text-[24px]" style={activeTab === 'chat' ? { fontVariationSettings: "'FILL' 1" } : {}}>forum</span>
                        <span className="text-[10px] font-medium mt-1">Chat</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`flex flex-col items-center justify-center min-w-[50px] transition-colors ${activeTab === 'profile' ? 'text-primary-vibrant' : 'text-text-sub hover:text-primary-vibrant'}`}
                    >
                        <span className="material-symbols-outlined text-[24px]" style={activeTab === 'profile' ? { fontVariationSettings: "'FILL' 1" } : {}}>person</span>
                        <span className="text-[10px] font-medium mt-1">Profile</span>
                    </button>
                </div>
            </nav>
        </div>
    );
};

export default TeamLeader;