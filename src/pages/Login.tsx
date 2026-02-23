import { logger } from '@/utils/logger';
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Role } from '@/types';
import { useNavigate } from 'react-router-dom';
import LoginForm from '@/components/auth/LoginForm';
import RegisterForm from '@/components/auth/RegisterForm';
import DemoAccess from '@/components/auth/DemoAccess';

type AuthMode = 'LOGIN' | 'REGISTER' | 'DEMO';

// Demo mode is only available when VITE_DEMO_PASSWORD is set.
// In production (Vercel), leave this env var UNSET so the password
// is never baked into the static bundle and the Demo tab disappears.
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD || '';
const isDemoEnabled = DEMO_PASSWORD.length > 0;

const DASHBOARD_ROUTES: Record<Role, string> = {
  [Role.MANAGER]: '/manager',
  [Role.TEAM_LEADER]: '/team-leader',
  [Role.RUNNER]: '/runner',
  [Role.QC_INSPECTOR]: '/qc',
  [Role.PAYROLL_ADMIN]: '/payroll',
  [Role.ADMIN]: '/admin',
  [Role.HR_ADMIN]: '/hhrr',
  [Role.LOGISTICS]: '/logistics-dept',
};

const Login: React.FC = () => {
  const { signIn, signUp, resetPassword, isLoading, isAuthenticated, currentRole } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
    setSuccess('');
    setIsSubmitting(true);
    try {
      const { profile } = await signIn(email, password);
      if (!profile) throw new Error('No se pudo cargar el perfil de usuario.');
      const userRole = profile.role as Role;
      const targetPath = DASHBOARD_ROUTES[userRole];
      if (targetPath) navigate(targetPath, { replace: true });
      else throw new Error('Rol de usuario no reconocido.');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error al iniciar sesión';
      logger.error(err);
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);
    try {
      await signUp(email, password, fullName);
      setSuccess('✅ Cuenta creada. Revisa tu email para confirmar y luego inicia sesión.');
      setMode('LOGIN');
      setEmail('');
      setPassword('');
      setFullName('');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error en el registro';
      logger.error(err);
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Escribe tu email primero para recuperar la contraseña.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await resetPassword(email);
      setSuccess('📧 Email de recuperación enviado. Revisa tu bandeja de entrada.');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error al enviar email';
      logger.error(err);
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Demo access
  const handleDemoAccess = async (role: Role) => {
    setIsSubmitting(true);
    const demoAccounts: Record<string, { email: string; password: string }> = {
      [Role.MANAGER]: { email: 'manager@harvestpro.nz', password: DEMO_PASSWORD },
      [Role.TEAM_LEADER]: { email: 'lead@harvestpro.nz', password: DEMO_PASSWORD },
      [Role.RUNNER]: { email: 'runner@harvestpro.nz', password: DEMO_PASSWORD },
      [Role.QC_INSPECTOR]: { email: 'qc@harvestpro.nz', password: DEMO_PASSWORD },
      [Role.PAYROLL_ADMIN]: { email: 'payroll@harvestpro.nz', password: DEMO_PASSWORD },
      [Role.ADMIN]: { email: 'admin@harvestpro.nz', password: DEMO_PASSWORD },
      [Role.HR_ADMIN]: { email: 'hr@harvestpro.nz', password: DEMO_PASSWORD },
      [Role.LOGISTICS]: { email: 'logistics@harvestpro.nz', password: DEMO_PASSWORD },
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
  };

  // ── Loading State ────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary font-medium text-sm">Conectando con HarvestPro...</p>
        </div>
      </div>
    );
  }

  // ── Available tabs ───────────────────────────
  const tabs: AuthMode[] = ['LOGIN', 'REGISTER', ...(isDemoEnabled ? ['DEMO' as const] : [])];
  const tabLabels: Record<AuthMode, string> = {
    LOGIN: 'Iniciar Sesión',
    REGISTER: 'Registrarse',
    DEMO: 'Demo',
  };

  // ── Main Render ──────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-primary/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-emerald-500/15 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Header / Brand */}
        <div className="text-center mb-8 animate-slide-up">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-indigo-600 shadow-2xl shadow-primary/30 mb-5 relative">
            <span className="material-symbols-outlined text-white text-4xl">agriculture</span>
            <div className="absolute inset-0 rounded-3xl bg-white/10 animate-pulse" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">
            HarvestPro<span className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">NZ</span>
          </h1>
          <p className="text-indigo-200/60 text-sm font-medium tracking-wide">Workforce Management Platform</p>
        </div>

        {/* Main Card */}
        <div className="bg-white/[0.07] backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/10 p-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>

          {/* Mode Tabs */}
          <div className="flex p-1 bg-white/[0.06] rounded-2xl mb-7">
            {tabs.map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); setSuccess(''); }}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${mode === m
                  ? 'bg-white text-slate-900 shadow-lg shadow-white/20'
                  : 'text-indigo-200/50 hover:text-indigo-200/80'
                  }`}
              >
                {tabLabels[m]}
              </button>
            ))}
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-5 p-4 bg-emerald-500/10 border border-emerald-400/20 rounded-2xl flex items-center gap-3 animate-slide-up">
              <span className="material-symbols-outlined text-emerald-400 text-lg">check_circle</span>
              <p className="text-sm text-emerald-300 font-medium">{success}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-5 p-4 bg-red-500/10 border border-red-400/20 rounded-2xl flex items-center gap-3 animate-slide-up">
              <span className="material-symbols-outlined text-red-400 text-lg">error</span>
              <p className="text-sm text-red-300 font-medium">{error}</p>
            </div>
          )}

          {/* Tab Content */}
          {mode === 'LOGIN' && (
            <LoginForm
              email={email} setEmail={setEmail}
              password={password} setPassword={setPassword}
              isSubmitting={isSubmitting}
              onSubmit={handleLogin}
              onForgotPassword={handleForgotPassword}
            />
          )}

          {mode === 'REGISTER' && (
            <RegisterForm
              fullName={fullName} setFullName={setFullName}
              email={email} setEmail={setEmail}
              password={password} setPassword={setPassword}
              isSubmitting={isSubmitting}
              onSubmit={handleRegister}
            />
          )}

          {isDemoEnabled && mode === 'DEMO' && (
            <DemoAccess isSubmitting={isSubmitting} onDemoAccess={handleDemoAccess} />
          )}
        </div>

        {/* Trust Footer */}
        <div className="mt-8 text-center space-y-3 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex justify-center gap-5">
            <div className="flex items-center gap-1.5 text-indigo-300/40 text-xs">
              <span className="material-symbols-outlined text-emerald-400/60 text-sm">shield</span>
              <span>RLS Secured</span>
            </div>
            <div className="flex items-center gap-1.5 text-indigo-300/40 text-xs">
              <span className="material-symbols-outlined text-sky-400/60 text-sm">cloud_sync</span>
              <span>Offline-First</span>
            </div>
            <div className="flex items-center gap-1.5 text-indigo-300/40 text-xs">
              <span className="material-symbols-outlined text-amber-400/60 text-sm">verified</span>
              <span>NZ Compliant</span>
            </div>
          </div>
          <p className="text-indigo-300/30 text-xs">
            © {new Date().getFullYear()} HarvestPro NZ • <a href="#terms" className="hover:text-indigo-300/50 transition-colors">Términos</a> • <a href="#privacy" className="hover:text-indigo-300/50 transition-colors">Privacidad</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;