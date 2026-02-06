import React from 'react';
import { HarvestState } from '../../../context/HarvestContext';

interface DashboardViewProps {
    stats: HarvestState['stats'];
    teamLeaders: any[];
    setActiveTab: (tab: any) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ stats, teamLeaders, setActiveTab }) => {
    // Stats calculations
    const targetTons = 16.0; // In a real app, this might come from settings or props
    const currentTons = stats.tons || 0;
    const progressPercent = Math.min(100, Math.round((currentTons / targetTons) * 100));

    return (
        <div className="flex flex-col gap-6 p-4">
            {/* Velocity Monitor */}
            <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold tracking-tight">Velocity Monitor</h2>
                    <button className="text-xs text-primary font-medium hover:text-primary/80 transition-colors">View Report</button>
                </div>
                <div className="bg-white dark:bg-card-dark rounded-xl p-5 shadow-sm border border-gray-100 dark:border-white/5">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Picking vs Collection</p>
                            <h3 className="text-2xl font-bold tracking-tight">Bottleneck Warning</h3>
                        </div>
                        <div className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-2.5 py-1 rounded-full text-xs font-bold border border-yellow-500/20 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">warning</span>
                            +30 Surplus
                        </div>
                    </div>
                    <div className="flex items-center gap-6 mb-6">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="w-2 h-2 rounded-full bg-primary"></span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">Picking</span>
                            </div>
                            <p className="text-2xl font-bold">{Math.round(stats.velocity)} <span className="text-sm font-normal text-gray-500">bkt/hr</span></p>
                            <p className="text-xs text-green-500 font-medium mt-1 flex items-center">
                                <span className="material-symbols-outlined text-[14px] mr-0.5">trending_up</span>
                                +5% Last hr
                            </p>
                        </div>
                        <div className="w-px h-12 bg-gray-200 dark:bg-white/10"></div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">Collection</span>
                            </div>
                            <p className="text-2xl font-bold">{Math.round(stats.velocity * 0.9)} <span className="text-sm font-normal text-gray-500">bkt/hr</span></p>
                            <p className="text-xs text-primary font-medium mt-1 flex items-center">
                                <span className="material-symbols-outlined text-[14px] mr-0.5">trending_down</span>
                                -2% Last hr
                            </p>
                        </div>
                    </div>
                    <div className="h-[140px] w-full relative">
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                            <div className="border-t border-dashed border-gray-200 dark:border-white/10 w-full h-0"></div>
                            <div className="border-t border-dashed border-gray-200 dark:border-white/10 w-full h-0"></div>
                            <div className="border-t border-dashed border-gray-200 dark:border-white/10 w-full h-0"></div>
                        </div>
                        <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 50">
                            <defs>
                                <linearGradient id="gradientPick" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor="#ec1337" stopOpacity="0.3"></stop>
                                    <stop offset="100%" stopColor="#ec1337" stopOpacity="0"></stop>
                                </linearGradient>
                                <linearGradient id="gradientCollect" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3"></stop>
                                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"></stop>
                                </linearGradient>
                            </defs>
                            <path d="M0,40 Q10,38 20,35 T40,30 T60,32 T80,38 T100,42" fill="url(#gradientCollect)" stroke="none"></path>
                            <path d="M0,40 Q10,38 20,35 T40,30 T60,32 T80,38 T100,42" fill="none" stroke="#3b82f6" strokeLinecap="round" strokeWidth="2" vectorEffect="non-scaling-stroke"></path>
                            <path d="M0,35 Q10,30 20,25 T40,15 T60,18 T80,12 T100,10" fill="url(#gradientPick)" stroke="none"></path>
                            <path d="M0,35 Q10,30 20,25 T40,15 T60,18 T80,12 T100,10" fill="none" stroke="#ec1337" strokeLinecap="round" strokeWidth="2" vectorEffect="non-scaling-stroke"></path>
                        </svg>
                    </div>
                    <div className="flex justify-between mt-2 text-[10px] text-gray-400 uppercase font-semibold tracking-wider">
                        <span>10am</span>
                        <span>11am</span>
                        <span>12pm</span>
                        <span>1pm</span>
                        <span>Now</span>
                    </div>
                </div>
            </section>

            {/* Orchard Forecast */}
            <section className="flex flex-col gap-3">
                <h2 className="text-lg font-bold tracking-tight">Orchard Forecast</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 bg-white dark:bg-card-dark rounded-xl p-5 shadow-sm border border-gray-100 dark:border-white/5 flex items-center justify-between relative overflow-hidden">
                        <div className="z-10 flex flex-col gap-1">
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Daily Target (Tons)</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold dark:text-white text-gray-900">{currentTons.toFixed(1)}</span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">/ {targetTons.toFixed(1)}</span>
                            </div>
                            <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-bold w-fit">
                                {progressPercent}% Complete
                            </div>
                        </div>
                        <div className="relative w-24 h-24 flex items-center justify-center">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                <path className="text-gray-200 dark:text-white/10" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3"></path>
                                <path className="text-primary" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${progressPercent}, 100`} strokeLinecap="round" strokeWidth="3"></path>
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-[10px] text-gray-400 font-semibold uppercase">Rem</span>
                                <span className="text-sm font-bold">3h</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Teams Overview */}
            <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold tracking-tight">Teams Overview</h2>
                    <div className="flex gap-2 items-center">
                        <button onClick={() => setActiveTab('teams')} className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors mr-1">
                            View All Teams
                        </button>
                    </div>
                </div>
                <div className="-mx-4 px-4 overflow-x-auto hide-scrollbar pb-2">
                    <div className="flex gap-4 w-max">
                        {teamLeaders.length > 0 ? teamLeaders.map((tl, i) => (
                            <div key={tl.id || i} className="min-w-[200px] w-[200px] bg-white dark:bg-card-dark rounded-xl p-4 shadow-sm border border-gray-100 dark:border-white/5 flex flex-col gap-3 relative group">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-cover bg-center border-2 border-green-500" style={{ backgroundImage: `url('https://ui-avatars.com/api/?name=${tl.name}&background=random')` }}></div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{tl.name}</span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">Team {String.fromCharCode(65 + i)}</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-gray-500 dark:text-gray-400">Location</span>
                                        <span className="font-medium dark:text-gray-200">Block {i + 1}B</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-gray-500 dark:text-gray-400">Yield</span>
                                        <span className="font-medium dark:text-gray-200">{(Math.random() * 2).toFixed(1)} Tons</span>
                                    </div>
                                    <div className="pt-2 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Quality</span>
                                        <span className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded">95% (A)</span>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="p-4 text-sm text-gray-400">No active teams found.</div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default DashboardView;
