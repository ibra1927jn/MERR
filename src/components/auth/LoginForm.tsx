import React, { useState } from 'react';

interface LoginFormProps {
    email: string;
    setEmail: (v: string) => void;
    password: string;
    setPassword: (v: string) => void;
    isSubmitting: boolean;
    onSubmit: (e: React.FormEvent) => void;
    onForgotPassword: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({
    email, setEmail, password, setPassword, isSubmitting, onSubmit, onForgotPassword,
}) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <form onSubmit={onSubmit} className="space-y-5">
            <div>
                <label className="text-xs font-semibold text-indigo-200/50 uppercase tracking-wider mb-2 block">Email</label>
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300/30 text-lg">mail</span>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@email.com"
                        className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/[0.06] border border-white/10 focus:border-primary focus:ring-2 focus:ring-primary/20 text-white placeholder-indigo-300/30 outline-none transition-all font-medium"
                        required
                    />
                </div>
            </div>

            <div>
                <label className="text-xs font-semibold text-indigo-200/50 uppercase tracking-wider mb-2 block">Contraseña</label>
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300/30 text-lg">lock</span>
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-12 pr-12 py-3.5 rounded-xl bg-white/[0.06] border border-white/10 focus:border-primary focus:ring-2 focus:ring-primary/20 text-white placeholder-indigo-300/30 outline-none transition-all font-medium"
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-300/40 hover:text-indigo-200/70 transition-colors"
                    >
                        <span className="material-symbols-outlined text-lg">{showPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={onForgotPassword}
                    className="text-xs text-primary/80 font-semibold hover:text-primary transition-colors"
                >
                    ¿Olvidaste tu contraseña?
                </button>
            </div>

            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-gradient-to-r from-primary to-indigo-500 hover:from-primary hover:to-indigo-400 text-white rounded-xl font-bold text-sm uppercase tracking-widest disabled:opacity-50 hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] transition-all duration-200"
            >
                {isSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Iniciando sesión...
                    </span>
                ) : 'Iniciar Sesión'}
            </button>
        </form>
    );
};

export default LoginForm;
