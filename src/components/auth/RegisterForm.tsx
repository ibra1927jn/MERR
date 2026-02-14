import React from 'react';
import { Role } from '@/types';

interface RegisterFormProps {
    fullName: string;
    setFullName: (v: string) => void;
    email: string;
    setEmail: (v: string) => void;
    password: string;
    setPassword: (v: string) => void;
    selectedRole: Role;
    setSelectedRole: (v: Role) => void;
    isSubmitting: boolean;
    onSubmit: (e: React.FormEvent) => void;
}

const ROLE_OPTIONS = [
    { value: Role.MANAGER, label: 'Manager', icon: 'admin_panel_settings' },
    { value: Role.TEAM_LEADER, label: 'Team Lead', icon: 'groups' },
    { value: Role.RUNNER, label: 'Runner', icon: 'local_shipping' },
] as const;

const RegisterForm: React.FC<RegisterFormProps> = ({
    fullName, setFullName, email, setEmail, password, setPassword,
    selectedRole, setSelectedRole, isSubmitting, onSubmit,
}) => (
    <form onSubmit={onSubmit} className="space-y-4">
        <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 block">Full Name</label>
            <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Smith"
                className="w-full px-4 py-3 rounded-xl bg-background-light border border-border-light focus:border-primary focus:ring-2 focus:ring-primary/10 text-text-primary placeholder-text-muted outline-none transition-all font-medium"
                required
            />
        </div>

        <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 block">Email</label>
            <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 rounded-xl bg-background-light border border-border-light focus:border-primary focus:ring-2 focus:ring-primary/10 text-text-primary placeholder-text-muted outline-none transition-all font-medium"
                required
            />
        </div>

        <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 block">Password</label>
            <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full px-4 py-3 rounded-xl bg-background-light border border-border-light focus:border-primary focus:ring-2 focus:ring-primary/10 text-text-primary placeholder-text-muted outline-none transition-all font-medium"
                required
                minLength={6}
            />
        </div>

        <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 block">Role</label>
            <div className="grid grid-cols-3 gap-2">
                {ROLE_OPTIONS.map((role) => (
                    <button
                        key={role.value}
                        type="button"
                        onClick={() => setSelectedRole(role.value as Role)}
                        className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1.5 transition-all ${selectedRole === role.value
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border-light text-text-muted hover:border-border-medium'
                            }`}
                    >
                        <span className="material-symbols-outlined text-xl">{role.icon}</span>
                        <span className="text-[10px] font-bold uppercase">{role.label}</span>
                    </button>
                ))}
            </div>
        </div>

        <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-primary hover:bg-primary-dim text-white rounded-xl font-bold text-sm uppercase tracking-widest disabled:opacity-50 hover:shadow-lg hover:shadow-primary/25 active:scale-[0.98] transition-all"
        >
            {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                </span>
            ) : 'Create Account'}
        </button>
    </form>
);

export default RegisterForm;
