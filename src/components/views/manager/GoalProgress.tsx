/**
 * GoalProgress — Daily target progress with ETA indicator
 */
import React from 'react';

interface GoalProgressProps {
    progress: number;
    currentTons: number;
    targetTons: number;
    eta: string;
    etaStatus: 'ahead' | 'on_track' | 'behind' | 'complete' | 'no_data';
}

const GoalProgress: React.FC<GoalProgressProps> = ({
    progress,
    currentTons,
    targetTons,
    eta,
    etaStatus,
}) => (
    <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white p-6 !rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-400 rounded-full blur-3xl opacity-20 -mr-16 -mt-16 pointer-events-none"></div>
        <div className="relative z-10 flex justify-between items-end mb-4">
            <div>
                <p className="text-slate-400 text-xs font-bold uppercase mb-1">Daily Target</p>
                <h3 className="text-3xl font-black">
                    {progress.toFixed(0)}% <span className="text-lg text-slate-400 font-medium">Complete</span>
                </h3>
            </div>
            <div className="text-right">
                <p className="text-xl font-bold">{currentTons.toFixed(1)} / {targetTons} t</p>
                <div className={`flex items-center gap-1 mt-1 text-sm font-bold ${etaStatus === 'ahead' ? 'text-green-400' :
                        etaStatus === 'on_track' ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                    <span className="material-symbols-outlined text-sm">
                        {etaStatus === 'ahead' ? 'rocket_launch' :
                            etaStatus === 'on_track' ? 'schedule' : 'warning'}
                    </span>
                    <span>ETA: {eta}</span>
                </div>
            </div>
        </div>
        {/* Custom Progress Bar */}
        <div className="h-4 bg-white/20 rounded-full overflow-hidden">
            <div
                className="h-full dynamic-width bg-gradient-to-r from-white/90 to-indigo-200 transition-all duration-1000 ease-out"
                style={{ '--w': `${progress}%` } as React.CSSProperties}
            ></div>
        </div>
    </div>
);

export default GoalProgress;
