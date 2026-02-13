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
  [Role.ADMIN]: '/admin',
  [Role.HR_ADMIN]: '/hhrr',
  [Role.LOGISTICS]: '/logistics-dept',
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
      setMode('LOGIN');
      setError('');
      setEmail('');
      setPassword('');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      console.error(err);
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoAccess = async (role: Role) => {
    setIsSubmitting(true);
    const demoAccounts: Record<string, { email: string; password: string }> = {
      [Role.MANAGER]: { email: 'manager@harvestpro.nz', password: '111111' },
      [Role.TEAM_LEADER]: { email: 'lead@harvestpro.nz', password: '111111' },
      [Role.RUNNER]: { email: 'runner@harvestpro.nz', password: '111111' },
      [Role.QC_INSPECTOR]: { email: 'qc@harvestpro.nz', password: '111111' },
      [Role.PAYROLL_ADMIN]: { email: 'payroll@harvestpro.nz', password: '111111' },
      [Role.ADMIN]: { email: 'admin@harvestpro.nz', password: '111111' },
      [Role.HR_ADMIN]: { email: 'hr@harvestpro.nz', password: '111111' },
      [Role.LOGISTICS]: { email: 'logistics@harvestpro.nz', password: '111111' },
    };
    const account = demoAccounts[role] || demoAccounts[Role.MANAGER];
    try {
      const { profile } = await signIn(account.email, account.password);
      if (profile) navigate(DASHBOARD_ROUTES[profile.role as Role], { replace: true });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Demo access failed';
      console.error(err);
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Loading State ────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-medium text-sm">Connecting to HarvestPro...</p>
        </div>
      </div>
    );
  }

  // ── Main Render ──────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50/30 flex items-center justify-center p-4">
      {/* Subtle background accents */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Header / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary shadow-lg shadow-primary/25 mb-4">
            <span className="material-symbols-outlined text-white text-3xl">agriculture</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-1">HarvestPro<span className="text-primary">NZ</span></h1>
          <p className="text-gray-500 text-sm font-medium">Workforce Management Platform</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8">

          {/* Mode Tabs */}
          <div className="flex p-1 bg-gray-100 rounded-xl mb-7">
            {(['LOGIN', 'REGISTER', 'DEMO'] as AuthMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${mode === m
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                {m === 'LOGIN' ? 'Sign In' : m === 'REGISTER' ? 'Register' : 'Demo'}
              </button>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
              <span className="material-symbols-outlined text-red-500 text-lg">error</span>
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          {/* ── LOGIN FORM ────────────────── */}
          {mode === 'LOGIN' && (
            <form onSubmit={handleLogin} className="space-y-5">
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
                Don't have an account? <button type="button" onClick={() => setMode('REGISTER')} className="text-primary font-semibold hover:underline">Create one</button>
              </p>
            </form>
          )}

          {/* ── REGISTER FORM ─────────────── */}
          {mode === 'REGISTER' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Smith"
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/10 text-gray-900 placeholder-gray-400 outline-none transition-all font-medium"
                  required
                />
              </div>

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
                  placeholder="Min 6 characters"
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/10 text-gray-900 placeholder-gray-400 outline-none transition-all font-medium"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Role</label>
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
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-gray-200 text-gray-400 hover:border-gray-300'
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
          )}

          {/* ── DEMO MODE ─────────────────── */}
          {mode === 'DEMO' && (
            <div className="space-y-3">
              <p className="text-center text-gray-500 text-sm mb-5">
                Explore the platform without an account. Select a role:
              </p>

              {[
                { role: Role.MANAGER, label: 'Manager', desc: 'Command center & analytics', icon: 'admin_panel_settings', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
                { role: Role.TEAM_LEADER, label: 'Team Leader', desc: 'Manage pickers & rows', icon: 'groups', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                { role: Role.RUNNER, label: 'Bucket Runner', desc: 'Logistics & scanning', icon: 'local_shipping', color: 'bg-sky-50 text-sky-700 border-sky-200' },
                { role: Role.QC_INSPECTOR, label: 'QC Inspector', desc: 'Quality & grading', icon: 'verified', color: 'bg-amber-50 text-amber-700 border-amber-200' },
                { role: Role.PAYROLL_ADMIN, label: 'Payroll Admin', desc: 'Wages & billing', icon: 'payments', color: 'bg-orange-50 text-orange-700 border-orange-200' },
                { role: Role.ADMIN, label: 'Admin', desc: 'System administration', icon: 'shield_person', color: 'bg-red-50 text-red-700 border-red-200' },
                { role: Role.HR_ADMIN, label: 'HR Admin', desc: 'Workforce & compliance', icon: 'badge', color: 'bg-purple-50 text-purple-700 border-purple-200' },
                { role: Role.LOGISTICS, label: 'Logistics', desc: 'Fleet & bin tracking', icon: 'local_shipping', color: 'bg-teal-50 text-teal-700 border-teal-200' },
              ].map((item) => (
                <button
                  key={item.role}
                  onClick={() => handleDemoAccess(item.role)}
                  disabled={isSubmitting}
                  className={`w-full p-4 rounded-xl border flex items-center gap-4 hover:shadow-md active:scale-[0.98] transition-all disabled:opacity-50 ${item.color}`}
                >
                  <div className="w-11 h-11 rounded-lg bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                    <span className="material-symbols-outlined text-xl">{item.icon}</span>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-base leading-tight">{item.label}</p>
                    <p className="text-sm opacity-70">{item.desc}</p>
                  </div>
                  <span className="material-symbols-outlined ml-auto opacity-40">arrow_forward</span>
                </button>
              ))}

              <p className="text-center text-gray-400 text-xs mt-4">
                Demo mode uses local data only. For full features, create an account.
              </p>
            </div>
          )}
        </div>

        {/* Trust Footer */}
        <div className="mt-6 text-center space-y-3">
          <div className="flex justify-center gap-4">
            <div className="flex items-center gap-1.5 text-gray-400 text-xs">
              <span className="material-symbols-outlined text-emerald-500 text-sm">shield</span>
              <span>RLS Secured</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400 text-xs">
              <span className="material-symbols-outlined text-sky-500 text-sm">cloud_sync</span>
              <span>Offline-First</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400 text-xs">
              <span className="material-symbols-outlined text-amber-500 text-sm">verified</span>
              <span>NZ Compliant</span>
            </div>
          </div>
          <p className="text-gray-400 text-xs">
            © 2026 HarvestPro NZ • Terms • Privacy
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;