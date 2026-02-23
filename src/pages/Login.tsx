import { logger } from '@/utils/logger';
import React, { useState, useCallback, useEffect, useRef } from 'react';
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

/* ══════════════════════════════════════════════════════
   ANIMATION HOOKS
   ══════════════════════════════════════════════════════ */

/** Typewriter effect — reveals text character by character */
const useTypewriter = (text: string, speed = 60, delay = 800) => {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    const timeout = setTimeout(() => {
      let i = 0;
      const interval = setInterval(() => {
        setDisplayed(text.slice(0, i + 1));
        i++;
        if (i >= text.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, speed);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [text, speed, delay]);

  return { displayed, done };
};

/** Animated counter from 0 → target */
const useCounter = (target: number, duration = 1800, delay = 1200) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const startTime = performance.now();
      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setCount(Math.round(eased * target));
        if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }, delay);
    return () => clearTimeout(timeout);
  }, [target, duration, delay]);

  return count;
};

/** Mouse-based parallax on the hero panel */
const useParallax = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      setOffset({ x, y });
    };
    const el = ref.current;
    el?.addEventListener('mousemove', handleMouseMove);
    return () => el?.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return { ref, offset };
};


/* ══════════════════════════════════════════════════════
   SVG DECORATIONS (organic / vineyard themed)
   ══════════════════════════════════════════════════════ */

const VineLeaf: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className = '', style }) => (
  <svg viewBox="0 0 60 60" fill="none" className={className} style={style}>
    <path d="M30 5C20 15 5 20 5 35c0 12 10 20 25 20s25-8 25-20C55 20 40 15 30 5z" fill="currentColor" opacity="0.15" />
    <path d="M30 5C30 20 22 28 15 35" stroke="currentColor" strokeWidth="1" opacity="0.2" fill="none" />
    <path d="M30 5C30 18 35 26 42 32" stroke="currentColor" strokeWidth="1" opacity="0.2" fill="none" />
  </svg>
);

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

/** Tiny floating particle dots for ambiance */
const ParticleDots: React.FC = () => {
  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    left: `${5 + Math.random() * 90}%`,
    top: `${5 + Math.random() * 90}%`,
    size: 2 + Math.random() * 3,
    duration: `${6 + Math.random() * 8}s`,
    delay: `${Math.random() * 5}s`,
    opacity: 0.15 + Math.random() * 0.25,
  }));

  return (
    <>
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full bg-lilac-glow login-vine-float pointer-events-none"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            '--duration': p.duration,
            '--delay': p.delay,
            '--start-rot': '0deg',
          } as React.CSSProperties}
        />
      ))}
    </>
  );
};


/* ══════════════════════════════════════════════════════
   LOGIN PAGE COMPONENT
   ══════════════════════════════════════════════════════ */

const Login: React.FC = () => {
  const { signIn, signUp, resetPassword, isLoading, isAuthenticated, currentRole } = useAuth();
  const navigate = useNavigate();
  const { ref: heroRef, offset } = useParallax();

  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [tabKey, setTabKey] = useState(0);

  // Typewriter for the hero title
  const { displayed: typedTitle, done: titleDone } = useTypewriter('Manage your harvest intelligently', 50, 600);

  // Animated counters
  const roleCount = useCounter(8, 1500, 1400);
  const complianceCount = useCounter(100, 2000, 1600);

  React.useEffect(() => {
    if (isAuthenticated && currentRole) {
      navigate(DASHBOARD_ROUTES[currentRole], { replace: true });
    }
  }, [isAuthenticated, currentRole, navigate]);

  const triggerShake = useCallback(() => {
    setShakeKey(k => k + 1);
  }, []);

  const switchTab = useCallback((newMode: AuthMode) => {
    setMode(newMode);
    setError('');
    setSuccess('');
    setTabKey(k => k + 1);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setIsSubmitting(true);
    try {
      const { profile } = await signIn(email, password);
      if (!profile) throw new Error('Could not load user profile.');
      const userRole = profile.role as Role;
      const targetPath = DASHBOARD_ROUTES[userRole];
      if (targetPath) navigate(targetPath, { replace: true });
      else throw new Error('Unrecognized user role.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
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
      setSuccess('✅ Account created! Check your email to confirm, then sign in.');
      setMode('LOGIN');
      setEmail(''); setPassword(''); setFullName('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setError(msg);
      triggerShake();
      logger.error(err);
    } finally { setIsSubmitting(false); }
  };

  const handleForgotPassword = async () => {
    if (!email) { setError('Enter your email first to reset your password.'); triggerShake(); return; }
    setError(''); setIsSubmitting(true);
    try {
      await resetPassword(email);
      setSuccess('📧 Recovery email sent. Check your inbox.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send email');
      triggerShake();
      logger.error(err);
    } finally { setIsSubmitting(false); }
  };


  /* ── Loading state ─────────── */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          {/* Pulsing rings behind spinner */}
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-lilac/20 animate-ping" />
            <div className="absolute inset-2 rounded-full border-2 border-lilac/30 animate-ping" style={{ animationDelay: '0.3s' }} />
            <div className="absolute inset-4 w-12 h-12 border-4 border-lilac/30 border-t-lilac rounded-full animate-spin login-spinner-glow" />
          </div>
          <p className="text-lilac-glow font-medium text-sm animate-pulse">Connecting to HarvestPro...</p>
        </div>
      </div>
    );
  }

  const tabs: AuthMode[] = ['LOGIN', 'REGISTER'];
  const tabLabels: Record<AuthMode, string> = { LOGIN: 'Sign In', REGISTER: 'Register' };
  const tabIcons: Record<AuthMode, string> = { LOGIN: 'login', REGISTER: 'person_add' };

  return (
    <div className="min-h-screen flex">
      {/* ════════════════════════════════════════════════
          LEFT PANEL — Vineyard Hero with Parallax + Particles
         ════════════════════════════════════════════════ */}
      <div ref={heroRef} className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        {/* Real vineyard photo with parallax */}
        <img
          src="/orchard-hero.png"
          alt="New Zealand Orchard"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out"
          style={{ transform: `scale(1.05) translate(${offset.x * -8}px, ${offset.y * -8}px)` }}
        />
        {/* Lilac overlay */}
        <div className="absolute inset-0 login-vineyard-overlay" />
        {/* Animated gradient layer */}
        <div className="absolute inset-0 login-hero-gradient opacity-40 mix-blend-overlay" />

        {/* Floating particles */}
        <ParticleDots />

        {/* Organic floating decorations — with parallax */}
        <VineLeaf
          className="absolute w-20 h-20 text-lilac-glow login-vine-float transition-transform duration-700"
          style={{
            top: '15%', right: '12%',
            '--duration': '9s', '--delay': '0s', '--start-rot': '-15deg',
            transform: `translate(${offset.x * 15}px, ${offset.y * 15}px)`,
          } as React.CSSProperties}
        />
        <VineLeaf
          className="absolute w-14 h-14 text-white login-vine-float transition-transform duration-700"
          style={{
            bottom: '25%', left: '8%',
            '--duration': '11s', '--delay': '2s', '--start-rot': '10deg',
            transform: `translate(${offset.x * -10}px, ${offset.y * -10}px)`,
          } as React.CSSProperties}
        />
        <GrapeCluster
          className="absolute w-16 h-20 text-lilac-light login-vine-float transition-transform duration-700"
          style={{
            top: '55%', right: '6%',
            '--duration': '10s', '--delay': '1s', '--start-rot': '5deg',
            transform: `translate(${offset.x * 20}px, ${offset.y * 12}px)`,
          } as React.CSSProperties}
        />
        <VineLeaf
          className="absolute w-10 h-10 text-lilac-glow/60 login-vine-float transition-transform duration-700"
          style={{
            top: '75%', left: '20%',
            '--duration': '8s', '--delay': '3s', '--start-rot': '-8deg',
            transform: `translate(${offset.x * -12}px, ${offset.y * 18}px)`,
          } as React.CSSProperties}
        />
        <GrapeCluster
          className="absolute w-12 h-16 text-white/40 login-vine-float transition-transform duration-700"
          style={{
            top: '30%', left: '15%',
            '--duration': '12s', '--delay': '4s', '--start-rot': '12deg',
            transform: `translate(${offset.x * 8}px, ${offset.y * -14}px)`,
          } as React.CSSProperties}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Top — Logo with pulsing ring */}
          <div className="flex items-center gap-3 animate-fade-in">
            <div className="relative">
              {/* Pulsing ring behind logo */}
              <div className="absolute -inset-2 rounded-2xl border border-lilac-glow/20 animate-ping opacity-40" style={{ animationDuration: '3s' }} />
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-lilac-glow/30 relative z-10">
                <span className="material-symbols-outlined text-white text-2xl">agriculture</span>
              </div>
            </div>
            <div>
              <h2 className="text-white font-black text-xl tracking-tight">HarvestPro<span className="text-lilac-light">NZ</span></h2>
              <p className="text-white/40 text-xs font-medium">Workforce Management</p>
            </div>
          </div>

          {/* Center — Hero text with typewriter effect */}
          <div className="max-w-md">
            <h1 className="text-5xl font-black text-white leading-tight mb-6 min-h-[180px]">
              {typedTitle.split('harvest').map((part, i) =>
                i === 0 ? (
                  <React.Fragment key={i}>{part}</React.Fragment>
                ) : (
                  <React.Fragment key={i}>
                    <span className="bg-gradient-to-r from-lilac-light to-lilac-glow bg-clip-text text-transparent">
                      harvest
                    </span>
                    {part}
                  </React.Fragment>
                )
              )}
              {!titleDone && <span className="inline-block w-[3px] h-[1em] bg-lilac-light ml-1 animate-pulse align-middle" />}
            </h1>
            <p className="text-white/50 text-base leading-relaxed mb-8 animate-fade-in" style={{ animationDelay: '2.5s', animationFillMode: 'both' }}>
              Complete control over your workforce, logistics, and New Zealand regulatory compliance — all in one platform.
            </p>

            {/* Animated counters */}
            <div className="flex gap-8">
              <div className="animate-slide-up stagger-1">
                <p className="text-3xl font-black text-white tabular-nums">{roleCount}</p>
                <p className="text-lilac-glow/60 text-xs font-medium uppercase tracking-wider">Roles</p>
              </div>
              <div className="w-px bg-lilac/20" />
              <div className="animate-slide-up stagger-2">
                <p className="text-3xl font-black text-white">24/7</p>
                <p className="text-lilac-glow/60 text-xs font-medium uppercase tracking-wider">Offline-First</p>
              </div>
              <div className="w-px bg-lilac/20" />
              <div className="animate-slide-up stagger-3">
                <p className="text-3xl font-black text-white tabular-nums">{complianceCount}%</p>
                <p className="text-lilac-glow/60 text-xs font-medium uppercase tracking-wider">NZ Compliant</p>
              </div>
            </div>
          </div>

          {/* Bottom — Trust badges with staggered entrance */}
          <div className="flex items-center gap-6">
            {[
              { icon: 'shield', label: 'RLS Secured', color: 'text-lilac-light', delay: '0.1s' },
              { icon: 'cloud_sync', label: 'Real-Time Sync', color: 'text-lilac-glow', delay: '0.2s' },
              { icon: 'verified', label: 'NZ Compliant', color: 'text-lilac-light', delay: '0.3s' },
            ].map((badge) => (
              <div
                key={badge.icon}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-lilac/20 backdrop-blur-sm hover:bg-white/10 hover:border-lilac/40 transition-all duration-300 animate-slide-up"
                style={{ animationDelay: badge.delay, animationFillMode: 'both' }}
              >
                <span className={`material-symbols-outlined ${badge.color} text-sm`}>{badge.icon}</span>
                <span className="text-white/50 text-xs font-medium">{badge.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          RIGHT PANEL — Auth Form
         ════════════════════════════════════════════════ */}
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-lilac-50 via-white to-lilac-50/50 p-6 sm:p-8 lg:p-12 relative overflow-hidden">
        {/* Animated background blobs */}
        <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full bg-lilac/5 blur-3xl pointer-events-none login-vine-float" style={{ '--duration': '15s', '--delay': '0s', '--start-rot': '0deg' } as React.CSSProperties} />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-lilac-dark/5 blur-3xl pointer-events-none login-vine-float" style={{ '--duration': '12s', '--delay': '3s', '--start-rot': '0deg' } as React.CSSProperties} />

        {/* Animated gradient border card */}
        <div className="w-full max-w-md relative">
          {/* Gradient border glow (behind the card) */}
          <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-r from-lilac/30 via-lilac-glow/20 to-lilac-dark/30 opacity-0 lg:opacity-100 blur-sm login-hero-gradient" />

          <div className="relative login-glass rounded-3xl p-8 sm:p-10 login-stagger-enter">
            {/* Mobile logo */}
            <div className="lg:hidden text-center mb-8">
              <div className="relative inline-block">
                <div className="absolute -inset-3 rounded-2xl border border-lilac/20 animate-ping opacity-30" style={{ animationDuration: '3s' }} />
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-lilac to-lilac-dark shadow-xl shadow-lilac/25 mb-4 relative">
                  <span className="material-symbols-outlined text-white text-3xl">agriculture</span>
                </div>
              </div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                HarvestPro<span className="text-lilac">NZ</span>
              </h1>
              <p className="text-slate-400 text-sm font-medium mt-1">Workforce Management Platform</p>
            </div>

            {/* Welcome text */}
            <div className="mb-8">
              <h2 className="text-2xl font-black text-slate-900 mb-1">
                {mode === 'LOGIN' ? 'Welcome back!' : 'Create your account'}
              </h2>
              <p className="text-slate-400 text-sm">
                {mode === 'LOGIN' ? 'Sign in to access your dashboard' :
                  'Register with the email authorized by HR'}
              </p>
            </div>

            {/* Tab Pills — with animated indicator */}
            <div className="flex p-1.5 bg-slate-100/80 rounded-2xl mb-8 border border-slate-200/50 relative">
              {tabs.map((m) => (
                <button
                  key={m}
                  onClick={() => switchTab(m)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-300 relative z-10 ${mode === m
                    ? 'bg-white text-lilac-dark shadow-md shadow-lilac/10 border border-lilac/20'
                    : 'text-slate-500 hover:text-lilac-dark hover:bg-white/40 border border-transparent'
                    }`}
                >
                  <span className={`material-symbols-outlined text-base transition-transform duration-300 ${mode === m ? 'scale-110' : ''}`}>{tabIcons[m]}</span>
                  {tabLabels[m]}
                </button>
              ))}
            </div>

            {/* Success Message — with draw-in checkmark */}
            {success && (
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 animate-slide-up">
                <div className="login-success-check">
                  <svg width="20" height="20" viewBox="0 0 20 20" className="text-emerald-500">
                    <circle cx="10" cy="10" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" className="login-check-circle" />
                    <path d="M6 10l3 3 5-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="login-check-mark" />
                  </svg>
                </div>
                <p className="text-sm text-emerald-700 font-medium">{success}</p>
              </div>
            )}

            {/* Error Message — with shake */}
            {error && (
              <div
                key={`error-${shakeKey}`}
                className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 login-shake"
              >
                <span className="material-symbols-outlined text-red-500 text-lg animate-pulse">error</span>
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            {/* Tab Content with slide transition */}
            <div key={`form-${tabKey}`} className="animate-scale-in">
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
            </div>

            {/* Footer */}
            <p className="text-center text-slate-300 text-xs mt-8">
              © {new Date().getFullYear()} HarvestPro NZ •{' '}
              <a href="#terms" className="hover:text-lilac transition-colors">Terms</a> •{' '}
              <a href="#privacy" className="hover:text-lilac transition-colors">Privacy</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;