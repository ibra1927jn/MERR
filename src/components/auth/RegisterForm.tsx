import React, { useState } from 'react';

interface RegisterFormProps {
    fullName: string;
    setFullName: (v: string) => void;
    email: string;
    setEmail: (v: string) => void;
    password: string;
    setPassword: (v: string) => void;
    isSubmitting: boolean;
    onSubmit: (e: React.FormEvent) => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({
    fullName, setFullName, email, setEmail, password, setPassword,
    isSubmitting, onSubmit,
}) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <form onSubmit={onSubmit} className="space-y-5">
            {/* HR Authorization Notice — lilac theme */}
            <div className="p-4 bg-lilac-50 border border-lilac/15 rounded-xl flex items-start gap-3">
                <span className="material-symbols-outlined text-lilac text-lg mt-0.5">info</span>
                <p className="text-xs text-lilac-dark leading-relaxed">
                    Registra tu cuenta con el <strong className="text-lilac-dark font-bold">email autorizado por RRHH</strong>. Tu rol y departamento se asignan automáticamente.
                </p>
            </div>

            <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Nombre Completo</label>
                <div className="relative group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-lilac-glow/60 group-focus-within:text-lilac text-lg transition-colors">person</span>
                    <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Juan Pérez"
                        className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white border-2 border-slate-200 focus:border-lilac focus:ring-4 focus:ring-lilac/10 text-slate-800 placeholder-slate-300 outline-none transition-all font-medium"
                        required
                    />
                </div>
            </div>

            <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Email</label>
                <div className="relative group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-lilac-glow/60 group-focus-within:text-lilac text-lg transition-colors">mail</span>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@email.com"
                        className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white border-2 border-slate-200 focus:border-lilac focus:ring-4 focus:ring-lilac/10 text-slate-800 placeholder-slate-300 outline-none transition-all font-medium"
                        required
                    />
                </div>
            </div>

            <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Contraseña</label>
                <div className="relative group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-lilac-glow/60 group-focus-within:text-lilac text-lg transition-colors">lock</span>
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mín. 6 caracteres"
                        className="w-full pl-12 pr-12 py-3.5 rounded-xl bg-white border-2 border-slate-200 focus:border-lilac focus:ring-4 focus:ring-lilac/10 text-slate-800 placeholder-slate-300 outline-none transition-all font-medium"
                        required
                        minLength={6}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-lilac transition-colors"
                    >
                        <span className="material-symbols-outlined text-lg">{showPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                </div>
            </div>

            <button
                type="submit"
                disabled={isSubmitting}
                className="login-btn-ripple w-full py-4 bg-gradient-to-r from-lilac to-lilac-dark hover:from-lilac-light hover:to-lilac text-white rounded-xl font-bold text-sm uppercase tracking-widest disabled:opacity-50 shadow-lg shadow-lilac/25 hover:shadow-xl hover:shadow-lilac/30 active:scale-[0.97] transition-all duration-200"
            >
                {isSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Creando cuenta...
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-2">
                        <span className="material-symbols-outlined text-base">person_add</span>
                        Crear Cuenta
                    </span>
                )}
            </button>
        </form>
    );
};

export default RegisterForm;
