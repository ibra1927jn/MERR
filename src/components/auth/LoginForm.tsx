import React from 'react';

interface LoginFormProps {
    email: string;
    setEmail: (v: string) => void;
    password: string;
    setPassword: (v: string) => void;
    isSubmitting: boolean;
    onSubmit: (e: React.FormEvent) => void;
    onSwitchToRegister: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({
    email, setEmail, password, setPassword, isSubmitting, onSubmit, onSwitchToRegister,
}) => (
    <form onSubmit={onSubmit} className="space-y-5">
        <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Email</label>
            <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/10 text-gray-900 placeholder-gray-400 outline-none transition-all font-medium"
                required
            />
        </div>

        <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Password</label>
            <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/10 text-gray-900 placeholder-gray-400 outline-none transition-all font-medium"
                required
            />
        </div>

        <div className="flex justify-end">
            <button type="button" className="text-xs text-primary font-semibold hover:underline">Forgot password?</button>
        </div>

        <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-primary hover:bg-primary-dim text-white rounded-xl font-bold text-sm uppercase tracking-widest disabled:opacity-50 hover:shadow-lg hover:shadow-primary/25 active:scale-[0.98] transition-all"
        >
            {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                </span>
            ) : 'Sign In'}
        </button>

        <p className="text-center text-sm text-gray-500">
            Don't have an account? <button type="button" onClick={onSwitchToRegister} className="text-primary font-semibold hover:underline">Create one</button>
        </p>
    </form>
);

export default LoginForm;
