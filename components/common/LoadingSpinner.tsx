import React from 'react';

interface LoadingSpinnerProps {
    message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = "Cargando..." }) => {
    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white p-4">
            <div className="relative">
                {/* Outer Ring */}
                <div className="w-16 h-16 rounded-full border-4 border-slate-100 animate-pulse"></div>
                {/* Inner Spinning Ring */}
                <div className="absolute top-0 w-16 h-16 rounded-full border-4 border-t-orange-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
            </div>
            <div className="mt-6 flex flex-col items-center gap-2">
                <h2 className="text-xl font-black text-gray-900 animate-pulse uppercase tracking-widest">{message}</h2>
                <div className="text-xs text-gray-400 font-mono tracking-tighter italic">MOTOR MERR-V2 ACTIVE</div>
            </div>
        </div>
    );
};

export default LoadingSpinner;
