import React from 'react';

interface HelpOnboardingModalProps {
    onClose: () => void;
}

const HelpOnboardingModal: React.FC<HelpOnboardingModalProps> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-slide-up">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Estrategia de Campo</h2>
                        <button onClick={onClose} className="size-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-all">
                            <span className="material-symbols-outlined text-gray-400">close</span>
                        </button>
                    </div>

                    <div className="space-y-6">
                        {/* Haptic Feedback Section */}
                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Vibraciones (Siente el Éxito)</h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-xl bg-green-100 flex items-center justify-center text-green-600">
                                        <span className="material-symbols-outlined">vibration</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-gray-900">Éxito: 1 Larga</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Bucket registrado correctamente</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                                        <span className="material-symbols-outlined">vibration</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-gray-900">Error: 3 Cortas</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Duplicado o ID inválido</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sunlight Mode */}
                        <div className="flex items-center gap-4">
                            <div className="size-12 rounded-2xl bg-yellow-100 flex items-center justify-center text-yellow-700">
                                <span className="material-symbols-outlined text-2xl">wb_sunny</span>
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-gray-900">Modo Solar (Sunlight Mode)</h3>
                                <p className="text-xs font-medium text-gray-500">Usa el icono del sol si no ves bien la pantalla por el reflejo.</p>
                            </div>
                        </div>

                        {/* Offline Support */}
                        <div className="flex items-center gap-4">
                            <div className="size-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-700">
                                <span className="material-symbols-outlined text-2xl">cloud_off</span>
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-gray-900">Trabajo Offline</h3>
                                <p className="text-xs font-medium text-gray-500">Puedes seguir escaneando sin señal. La app sincronizará automáticamente al recuperar internet.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-gray-50 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest active:scale-[0.98] transition-all shadow-xl shadow-gray-200"
                    >
                        Entendido, ¡A la Huerta!
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HelpOnboardingModal;
