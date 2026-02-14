import { logger } from '@/utils/logger';
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Role } from '@/types';
import { useNavigate } from 'react-router-dom';
import LoginForm from '@/components/auth/LoginForm';
import RegisterForm from '@/components/auth/RegisterForm';
import DemoAccess from '@/components/auth/DemoAccess';

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
      logger.error(err);
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
      logger.error(err);
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Demo access — only available in development builds
  const handleDemoAccess = import.meta.env.DEV
    ? async (role: Role) => {
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
        logger.error(err);
        setError(errorMessage);
      } finally {
        setIsSubmitting(false);
      }
    }
    : undefined;

  // ── Loading State ────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary font-medium text-sm">Connecting to HarvestPro...</p>
        </div>
      </div>
    );
  }

  // ── Main Render ──────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-background-light via-white to-indigo-50/30 flex items-center justify-center p-4">
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
          <h1 className="text-3xl font-black text-text-primary tracking-tight mb-1">HarvestPro<span className="text-primary">NZ</span></h1>
          <p className="text-text-secondary text-sm font-medium">Workforce Management Platform</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-border-light/50 border border-border-light p-8">

          {/* Mode Tabs */}
          <div className="flex p-1 bg-surface-secondary rounded-xl mb-7">
            {(['LOGIN', 'REGISTER', ...(import.meta.env.DEV ? ['DEMO' as const] : [])] as AuthMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${mode === m
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-text-muted hover:text-text-secondary'
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

          {/* Tab Content */}
          {mode === 'LOGIN' && (
            <LoginForm
              email={email} setEmail={setEmail}
              password={password} setPassword={setPassword}
              isSubmitting={isSubmitting}
              onSubmit={handleLogin}
              onSwitchToRegister={() => setMode('REGISTER')}
            />
          )}

          {mode === 'REGISTER' && (
            <RegisterForm
              fullName={fullName} setFullName={setFullName}
              email={email} setEmail={setEmail}
              password={password} setPassword={setPassword}
              selectedRole={selectedRole} setSelectedRole={setSelectedRole}
              isSubmitting={isSubmitting}
              onSubmit={handleRegister}
            />
          )}

          {import.meta.env.DEV && mode === 'DEMO' && DemoAccess && handleDemoAccess && (
            <DemoAccess isSubmitting={isSubmitting} onDemoAccess={handleDemoAccess} />
          )}
        </div>

        {/* Trust Footer */}
        <div className="mt-6 text-center space-y-3">
          <div className="flex justify-center gap-4">
            <div className="flex items-center gap-1.5 text-text-muted text-xs">
              <span className="material-symbols-outlined text-emerald-500 text-sm">shield</span>
              <span>RLS Secured</span>
            </div>
            <div className="flex items-center gap-1.5 text-text-muted text-xs">
              <span className="material-symbols-outlined text-sky-500 text-sm">cloud_sync</span>
              <span>Offline-First</span>
            </div>
            <div className="flex items-center gap-1.5 text-text-muted text-xs">
              <span className="material-symbols-outlined text-amber-500 text-sm">verified</span>
              <span>NZ Compliant</span>
            </div>
          </div>
          <p className="text-text-muted text-xs">
            © 2026 HarvestPro NZ • Terms • Privacy
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;