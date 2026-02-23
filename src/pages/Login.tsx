import { logger } from '@/utils/logger';
import React, { useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Role } from '@/types';
import { useNavigate } from 'react-router-dom';
import LoginForm from '@/components/auth/LoginForm';
import RegisterForm from '@/components/auth/RegisterForm';

type AuthMode = 'LOGIN' | 'REGISTER';

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

/* ── SVG Vine Leaf (organic decorative element) ─────────── */
const VineLeaf: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className = '', style }) => (
  <svg viewBox="0 0 60 60" fill="none" className={className} style={style}>
    <path
      d="M30 5C20 15 5 20 5 35c0 12 10 20 25 20s25-8 25-20C55 20 40 15 30 5z"
      fill="currentColor"
      opacity="0.15"
    />
    <path
      d="M30 5C30 20 22 28 15 35"
      stroke="currentColor"
      strokeWidth="1"
      opacity="0.2"
      fill="none"
    />
    <path
      d="M30 5C30 18 35 26 42 32"
      stroke="currentColor"
      strokeWidth="1"
      opacity="0.2"
      fill="none"
    />
  </svg>
);

/* ── Grape cluster SVG ─────────── */
const GrapeCluster: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className = '', style }) => (
  <svg viewBox="0 0 40 50" fill="none" className={className} style={style}>
    <circle cx="14" cy="20" r="6" fill="currentColor" opacity="0.12" />
    <circle cx="26" cy="20" r="6" fill="currentColor" opacity="0.10" />
    <circle cx="20" cy="30" r="6" fill="currentColor" opacity="0.14" />
    <circle cx="10" cy="32" r="5" fill="currentColor" opacity="0.08" />
    <circle cx="30" cy="32" r="5" fill="currentColor" opacity="0.08" />
    <circle cx="20" cy="40" r="5" fill="currentColor" opacity="0.10" />
    <path d="M20 4C20 4 18 12 20 16" stroke="currentColor" strokeWidth="1.5" opacity="0.2" />
    <path d="M20 4C24 6 28 4 30 2" stroke="currentColor" strokeWidth="1" opacity="0.15" />
  </svg>
);


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
  const [shakeKey, setShakeKey] = useState(0);

  React.useEffect(() => {
    if (isAuthenticated && currentRole) {
      navigate(DASHBOARD_ROUTES[currentRole], { replace: true });
    }
  }, [isAuthenticated, currentRole, navigate]);

  const triggerShake = useCallback(() => {
    setShakeKey(k => k + 1);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setIsSubmitting(true);
    try {
      const { profile } = await signIn(email, password);
      if (!profile) throw new Error('No se pudo cargar el perfil de usuario.');
      const userRole = profile.role as Role;
      const targetPath = DASHBOARD_ROUTES[userRole];
      if (targetPath) navigate(targetPath, { replace: true });
      else throw new Error('Rol de usuario no reconocido.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesión';
      setError(msg);
      triggerShake();
      logger.error(err);
    } finally { setIsSubmitting(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setIsSubmitting(true);
    try {
      await signUp(email, password, fullName);
      setSuccess('✅ Cuenta creada. Revisa tu email para confirmar y luego inicia sesión.');
      setMode('LOGIN');
      setEmail(''); setPassword(''); setFullName('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error en el registro';
      setError(msg);
      triggerShake();
      logger.error(err);
    } finally { setIsSubmitting(false); }
  };

  const handleForgotPassword = async () => {
    if (!email) { setError('Escribe tu email primero para recuperar la contraseña.'); triggerShake(); return; }
    setError(''); setIsSubmitting(true);
    try {
      await resetPassword(email);
      setSuccess('📧 Email de recuperación enviado. Revisa tu bandeja de entrada.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al enviar email');
      triggerShake();
      logger.error(err);
    } finally { setIsSubmitting(false); }
  };


  /* ── Loading state ─────────── */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-lilac/30 border-t-lilac rounded-full animate-spin mx-auto mb-4 login-spinner-glow" />
          <p className="text-lilac-glow font-medium text-sm animate-pulse">Conectando con HarvestPro...</p>
        </div>
      </div>
    );
  }

  const tabs: AuthMode[] = ['LOGIN', 'REGISTER'];
  const tabLabels: Record<AuthMode, string> = { LOGIN: 'Iniciar Sesión', REGISTER: 'Registrarse' };
  const tabIcons: Record<AuthMode, string> = { LOGIN: 'login', REGISTER: 'person_add' };

  return (
    <div className="min-h-screen flex">
      {/* ════════════════════════════════════════════════
          LEFT PANEL — Vineyard Hero with Lilac Treatment
         ════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        {/* Real vineyard photo */}
        <img
          src="/orchard-hero.png"
          alt="New Zealand Orchard"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Lilac overlay gradient (Opción B: Híbrido) */}
        <div className="absolute inset-0 login-vineyard-overlay" />
        {/* Animated gradient layer on top for movement */}
        <div className="absolute inset-0 login-hero-gradient opacity-40 mix-blend-overlay" />

        {/* Organic floating decorations — vine leaves & grapes */}
        <VineLeaf
          className="absolute w-20 h-20 text-lilac-glow login-vine-float"
          style={{ top: '15%', right: '12%', '--duration': '9s', '--delay': '0s', '--start-rot': '-15deg' } as React.CSSProperties}
        />
        <VineLeaf
          className="absolute w-14 h-14 text-white login-vine-float"
          style={{ bottom: '25%', left: '8%', '--duration': '11s', '--delay': '2s', '--start-rot': '10deg' } as React.CSSProperties}
        />
        <GrapeCluster
          className="absolute w-16 h-20 text-lilac-light login-vine-float"
          style={{ top: '55%', right: '6%', '--duration': '10s', '--delay': '1s', '--start-rot': '5deg' } as React.CSSProperties}
        />
        <VineLeaf
          className="absolute w-10 h-10 text-lilac-glow/60 login-vine-float"
          style={{ top: '75%', left: '20%', '--duration': '8s', '--delay': '3s', '--start-rot': '-8deg' } as React.CSSProperties}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Top — Logo (white/lilac to match theme) */}
          <div className="flex items-center gap-3 animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-lilac-glow/30">
              <span className="material-symbols-outlined text-white text-2xl">agriculture</span>
            </div>
            <div>
              <h2 className="text-white font-black text-xl tracking-tight">HarvestPro<span className="text-lilac-light">NZ</span></h2>
              <p className="text-white/40 text-xs font-medium">Workforce Management</p>
            </div>
          </div>

          {/* Center — Main message (positioned away from floating elements) */}
          <div className="max-w-md animate-slide-up">
            <h1 className="text-5xl font-black text-white leading-tight mb-6">
              Gestiona tu<br />
              <span className="bg-gradient-to-r from-lilac-light to-lilac-glow bg-clip-text text-transparent">
                cosecha
              </span>{' '}
              de forma<br />inteligente
            </h1>
            <p className="text-white/50 text-base leading-relaxed mb-8">
              Control total de tu fuerza laboral, logística y cumplimiento normativo de Nueva Zelanda en una sola plataforma.
            </p>

            {/* Stats */}
            <div className="flex gap-8">
              <div className="animate-slide-up stagger-1">
                <p className="text-3xl font-black text-white">8</p>
                <p className="text-lilac-glow/60 text-xs font-medium uppercase tracking-wider">Roles</p>
              </div>
              <div className="w-px bg-lilac/20" />
              <div className="animate-slide-up stagger-2">
                <p className="text-3xl font-black text-white">24/7</p>
                <p className="text-lilac-glow/60 text-xs font-medium uppercase tracking-wider">Offline-First</p>
              </div>
              <div className="w-px bg-lilac/20" />
              <div className="animate-slide-up stagger-3">
                <p className="text-3xl font-black text-white">100%</p>
                <p className="text-lilac-glow/60 text-xs font-medium uppercase tracking-wider">NZ Compliant</p>
              </div>
            </div>
          </div>

          {/* Bottom — Trust badges (lilac accent) */}
          <div className="flex items-center gap-6 animate-fade-in">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-lilac/20 backdrop-blur-sm">
              <span className="material-symbols-outlined text-lilac-light text-sm">shield</span>
              <span className="text-white/50 text-xs font-medium">RLS Secured</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-lilac/20 backdrop-blur-sm">
              <span className="material-symbols-outlined text-lilac-glow text-sm">cloud_sync</span>
              <span className="text-white/50 text-xs font-medium">Sync en Tiempo Real</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-lilac/20 backdrop-blur-sm">
              <span className="material-symbols-outlined text-lilac-light text-sm">verified</span>
              <span className="text-white/50 text-xs font-medium">NZ Compliant</span>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          RIGHT PANEL — Auth Form (white glass on subtle lilac bg)
         ════════════════════════════════════════════════ */}
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-lilac-50 via-white to-lilac-50/50 p-6 sm:p-8 lg:p-12 relative overflow-hidden">
        {/* Subtle decorative lilac glow in background */}
        <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full bg-lilac/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-lilac-dark/5 blur-3xl pointer-events-none" />

        <div className="w-full max-w-md login-stagger-enter">
          {/* Mobile logo (hidden on desktop — white/lilac themed) */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-lilac to-lilac-dark shadow-xl shadow-lilac/25 mb-4">
              <span className="material-symbols-outlined text-white text-3xl">agriculture</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              HarvestPro<span className="text-lilac">NZ</span>
            </h1>
            <p className="text-slate-400 text-sm font-medium mt-1">Workforce Management Platform</p>
          </div>

          {/* Welcome text */}
          <div className="mb-8">
            <h2 className="text-2xl font-black text-slate-900 mb-1">
              {mode === 'LOGIN' ? '¡Bienvenido de vuelta!' : 'Crear tu cuenta'}
            </h2>
            <p className="text-slate-400 text-sm">
              {mode === 'LOGIN' ? 'Inicia sesión para acceder a tu panel' :
                'Regístrate con el email autorizado por RRHH'}
            </p>
          </div>

          {/* Tab Pills — improved inactive state visibility */}
          <div className="flex p-1.5 bg-slate-100/80 rounded-2xl mb-8 border border-slate-200/50">
            {tabs.map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); setSuccess(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${mode === m
                  ? 'bg-white text-lilac-dark shadow-md shadow-lilac/10 border border-lilac/20'
                  : 'text-slate-500 hover:text-lilac-dark hover:bg-white/40 border border-transparent'
                  }`}
              >
                <span className="material-symbols-outlined text-base">{tabIcons[m]}</span>
                {tabLabels[m]}
              </button>
            ))}
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 animate-slide-up">
              <span className="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
              <p className="text-sm text-emerald-700 font-medium">{success}</p>
            </div>
          )}

          {/* Error Message — with shake */}
          {error && (
            <div
              key={`error-${shakeKey}`}
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 login-shake"
            >
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

          {/* Footer */}
          <p className="text-center text-slate-300 text-xs mt-8">
            © {new Date().getFullYear()} HarvestPro NZ •{' '}
            <a href="#terms" className="hover:text-lilac transition-colors">Términos</a> •{' '}
            <a href="#privacy" className="hover:text-lilac transition-colors">Privacidad</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;