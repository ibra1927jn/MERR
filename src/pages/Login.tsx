import { logger } from '@/utils/logger';
import React, { useState } from 'react';
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

  React.useEffect(() => {
    if (isAuthenticated && currentRole) {
      navigate(DASHBOARD_ROUTES[currentRole], { replace: true });
    }
  }, [isAuthenticated, currentRole, navigate]);

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
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
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
      setError(err instanceof Error ? err.message : 'Error en el registro');
      logger.error(err);
    } finally { setIsSubmitting(false); }
  };

  const handleForgotPassword = async () => {
    if (!email) { setError('Escribe tu email primero para recuperar la contraseña.'); return; }
    setError(''); setIsSubmitting(true);
    try {
      await resetPassword(email);
      setSuccess('📧 Email de recuperación enviado. Revisa tu bandeja de entrada.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al enviar email');
      logger.error(err);
    } finally { setIsSubmitting(false); }
  };



  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-medium text-sm">Conectando con HarvestPro...</p>
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
          LEFT PANEL — Hero / Branding (hidden on mobile)
         ════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        {/* Background Image */}
        <img
          src="/orchard-hero.png"
          alt="New Zealand Orchard"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Dark overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-indigo-950/70 to-emerald-900/60" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Top — Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <span className="material-symbols-outlined text-white text-2xl">agriculture</span>
            </div>
            <div>
              <h2 className="text-white font-black text-xl tracking-tight">HarvestPro<span className="text-emerald-400">NZ</span></h2>
              <p className="text-white/40 text-xs font-medium">Workforce Management</p>
            </div>
          </div>

          {/* Center — Main message */}
          <div className="max-w-md">
            <h1 className="text-5xl font-black text-white leading-tight mb-6">
              Gestiona tu<br />
              <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                cosecha
              </span>{' '}
              de forma<br />inteligente
            </h1>
            <p className="text-white/50 text-base leading-relaxed mb-8">
              Control total de tu fuerza laboral, logística y cumplimiento normativo de Nueva Zelanda en una sola plataforma.
            </p>

            {/* Stats */}
            <div className="flex gap-8">
              <div>
                <p className="text-3xl font-black text-white">8</p>
                <p className="text-white/40 text-xs font-medium uppercase tracking-wider">Roles</p>
              </div>
              <div className="w-px bg-white/10" />
              <div>
                <p className="text-3xl font-black text-white">24/7</p>
                <p className="text-white/40 text-xs font-medium uppercase tracking-wider">Offline-First</p>
              </div>
              <div className="w-px bg-white/10" />
              <div>
                <p className="text-3xl font-black text-white">100%</p>
                <p className="text-white/40 text-xs font-medium uppercase tracking-wider">NZ Compliant</p>
              </div>
            </div>
          </div>

          {/* Bottom — Trust badges */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
              <span className="material-symbols-outlined text-emerald-400 text-sm">shield</span>
              <span className="text-white/50 text-xs font-medium">RLS Secured</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
              <span className="material-symbols-outlined text-sky-400 text-sm">cloud_sync</span>
              <span className="text-white/50 text-xs font-medium">Sync en Tiempo Real</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
              <span className="material-symbols-outlined text-amber-400 text-sm">verified</span>
              <span className="text-white/50 text-xs font-medium">NZ Compliant</span>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          RIGHT PANEL — Auth Form
         ════════════════════════════════════════════════ */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-6 sm:p-8 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo (hidden on desktop) */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 shadow-xl shadow-primary/25 mb-4">
              <span className="material-symbols-outlined text-white text-3xl">agriculture</span>
            </div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">
              HarvestPro<span className="text-primary">NZ</span>
            </h1>
            <p className="text-slate-400 text-sm font-medium mt-1">Workforce Management Platform</p>
          </div>

          {/* Welcome text */}
          <div className="mb-8">
            <h2 className="text-2xl font-black text-slate-800 mb-1">
              {mode === 'LOGIN' ? '¡Bienvenido de vuelta!' :
                mode === 'REGISTER' ? 'Crear tu cuenta' : 'Acceso Demo'}
            </h2>
            <p className="text-slate-400 text-sm">
              {mode === 'LOGIN' ? 'Inicia sesión para acceder a tu panel' :
                mode === 'REGISTER' ? 'Regístrate con el email autorizado por RRHH' :
                  'Explora la plataforma sin cuenta'}
            </p>
          </div>

          {/* Tab Pills */}
          <div className="flex p-1.5 bg-slate-100 rounded-2xl mb-8">
            {tabs.map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); setSuccess(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${mode === m
                  ? 'bg-white text-slate-800 shadow-md shadow-slate-200/50'
                  : 'text-slate-400 hover:text-slate-500'
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

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 animate-slide-up">
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
            <a href="#terms" className="hover:text-slate-500 transition-colors">Términos</a> •{' '}
            <a href="#privacy" className="hover:text-slate-500 transition-colors">Privacidad</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;