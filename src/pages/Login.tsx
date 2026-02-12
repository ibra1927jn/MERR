import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Role } from '@/types';
import { useNavigate } from 'react-router-dom';

type AuthMode = 'LOGIN' | 'REGISTER' | 'DEMO';

const DASHBOARD_ROUTES: Record<Role, string> = {
  [Role.MANAGER]: '/manager',
  [Role.TEAM_LEADER]: '/team-leader',
  [Role.RUNNER]: '/runner',
  [Role.QC_INSPECTOR]: '/qc',
  [Role.PAYROLL_ADMIN]: '/manager',
};

const Login: React.FC = () => {
  const { signIn, signUp, isLoading, isAuthenticated, currentRole } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role>(Role.TEAM_LEADER);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Auto-redirect if authenticated ───────────
  React.useEffect(() => {
    if (isAuthenticated && currentRole) {
      navigate(DASHBOARD_ROUTES[currentRole], { replace: true });
    }
  }, [isAuthenticated, currentRole, navigate]);

  // ── Auth Handlers ────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const { profile } = await signIn(email, password);
      if (!profile) throw new Error('User profile could not be loaded.');
      const userRole = profile.role as Role;
      const targetPath = DASHBOARD_ROUTES[userRole];
      if (targetPath) navigate(targetPath, { replace: true });
      else throw new Error('User role not recognized.');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      console.error(err);
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await signUp(email, password, fullName, selectedRole);
      navigate(DASHBOARD_ROUTES[selectedRole], { replace: true });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoAccess = async (role: Role) => {
    const demoEmail = `demo@${role}.com`;
    const demoPass = 'password123';
    try {
      setIsSubmitting(true);
      await signIn(demoEmail, demoPass);
      const targetPath = DASHBOARD_ROUTES[role];
      if (targetPath) navigate(targetPath, { replace: true });
    } catch {
      setError('Demo accounts not ready. Please register.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Loading State ────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/70 font-medium text-sm">Connecting to HarvestPro...</p>
        </div>
      </div>
    );
  }

  // ── Main Render ──────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Background Decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Header / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-primary-dim shadow-glow mb-5">
            <span className="material-symbols-outlined text-white text-4xl">agriculture</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-1">HarvestPro<span className="text-primary">NZ</span></h1>
          <p className="text-slate-400 text-sm font-medium">Enterprise Cherry Harvest Management</p>
        </div>

        {/* Glass Card */}
        <div className="bg-white/[0.07] backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">

          {/* Mode Tabs */}
          <div className="flex p-1 bg-white/5 rounded-2xl mb-7">
            {(['LOGIN', 'REGISTER', 'DEMO'] as AuthMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${mode === m
                    ? 'bg-primary text-white shadow-glow'
                    : 'text-slate-400 hover:text-white'
                  }`}
              >
                {m === 'LOGIN' ? 'Sign In' : m === 'REGISTER' ? 'Register' : 'Demo'}
              </button>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-5 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
              <span className="material-symbols-outlined text-red-400 text-lg">error</span>
              <p className="text-sm text-red-300 font-medium">{error}</p>
            </div>
          )}

          {/* ── LOGIN FORM ────────────────── */}
          {mode === 'LOGIN' && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3.5 rounded-xl bg-white/5 border-2 border-white/10 focus:border-primary text-white placeholder-slate-500 outline-none transition-colors font-medium"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3.5 rounded-xl bg-white/5 border-2 border-white/10 focus:border-primary text-white placeholder-slate-500 outline-none transition-colors font-medium"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-gradient-to-r from-primary to-primary-vibrant text-white rounded-xl font-bold text-base uppercase tracking-widest disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-glow"
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : 'Sign In'}
              </button>
            </form>
          )}

          {/* ── REGISTER FORM ─────────────── */}
          {mode === 'REGISTER' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Smith"
                  className="w-full px-4 py-3.5 rounded-xl bg-white/5 border-2 border-white/10 focus:border-primary text-white placeholder-slate-500 outline-none transition-colors font-medium"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3.5 rounded-xl bg-white/5 border-2 border-white/10 focus:border-primary text-white placeholder-slate-500 outline-none transition-colors font-medium"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full px-4 py-3.5 rounded-xl bg-white/5 border-2 border-white/10 focus:border-primary text-white placeholder-slate-500 outline-none transition-colors font-medium"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: Role.MANAGER, label: 'Manager', icon: 'admin_panel_settings' },
                    { value: Role.TEAM_LEADER, label: 'Team Lead', icon: 'groups' },
                    { value: Role.RUNNER, label: 'Runner', icon: 'local_shipping' },
                  ].map((role) => (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => setSelectedRole(role.value as Role)}
                      className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1.5 transition-all ${selectedRole === role.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-white/10 text-slate-400 hover:border-white/20'
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
                className="w-full py-4 bg-gradient-to-r from-primary to-primary-vibrant text-white rounded-xl font-bold text-base uppercase tracking-widest disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-glow"
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </span>
                ) : 'Create Account'}
              </button>
            </form>
          )}

          {/* ── DEMO MODE ─────────────────── */}
          {mode === 'DEMO' && (
            <div className="space-y-3">
              <p className="text-center text-slate-400 text-sm mb-5">
                Explore the platform without an account. Select a role:
              </p>

              {[
                { role: Role.MANAGER, label: 'Manager', desc: 'Command center & analytics', icon: 'admin_panel_settings', gradient: 'from-violet-500 to-purple-600' },
                { role: Role.TEAM_LEADER, label: 'Team Leader', desc: 'Manage pickers & rows', icon: 'groups', gradient: 'from-primary to-primary-vibrant' },
                { role: Role.RUNNER, label: 'Bucket Runner', desc: 'Logistics & scanning', icon: 'local_shipping', gradient: 'from-sky-500 to-blue-600' },
              ].map((item) => (
                <button
                  key={item.role}
                  onClick={() => handleDemoAccess(item.role)}
                  disabled={isSubmitting}
                  className={`w-full p-4 bg-gradient-to-r ${item.gradient} text-white rounded-2xl flex items-center gap-4 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg disabled:opacity-50`}
                >
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-2xl">{item.icon}</span>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-lg leading-tight">{item.label}</p>
                    <p className="text-white/70 text-sm">{item.desc}</p>
                  </div>
                  <span className="material-symbols-outlined ml-auto text-white/50">arrow_forward</span>
                </button>
              ))}

              <p className="text-center text-slate-500 text-xs mt-4">
                Demo mode uses local data only. For full features, create an account.
              </p>
            </div>
          )}
        </div>

        {/* Trust Footer */}
        <div className="mt-6 text-center space-y-3">
          <div className="flex justify-center gap-4">
            <div className="flex items-center gap-1.5 text-slate-500 text-xs">
              <span className="material-symbols-outlined text-emerald-500 text-sm">shield</span>
              <span>RLS Secured</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500 text-xs">
              <span className="material-symbols-outlined text-sky-500 text-sm">cloud_sync</span>
              <span>Offline-First</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500 text-xs">
              <span className="material-symbols-outlined text-amber-500 text-sm">verified</span>
              <span>NZ Compliant</span>
            </div>
          </div>
          <p className="text-slate-600 text-xs">
            v4.2.0 • © 2024 HarvestPro NZ • Central Pac, Cromwell
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;