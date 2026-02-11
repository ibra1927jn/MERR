import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
// import { useHarvest } from '@/context/HarvestContext'; // Unused in new logic
import { Role } from '@/types'; // Importar Role correctamente
import { useNavigate } from 'react-router-dom';

type AuthMode = 'LOGIN' | 'REGISTER' | 'DEMO';

const Login: React.FC = () => {
  const { signIn, signUp, isLoading } = useAuth();
  const navigate = useNavigate(); // Hook de navegaciÃ³n

  // If completeSetup is needed for demo, check if AuthContext exposes it or if we mock it
  // ... (Demo context logic preserved implicitly by just calling signIn)

  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  // Usar el Enum 'Role' para el estado inicial
  const [selectedRole, setSelectedRole] = useState<Role>(Role.TEAM_LEADER);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // 1. Autenticar
      const { profile } = await signIn(email, password);

      if (!profile) throw new Error('User profile could not be loaded.');

      // 2. Leer Rol
      const userRole = profile.role as Role;

      // 3. Mapa de Rutas Estricto
      const dashboardRoutes: Record<Role, string> = {
        [Role.MANAGER]: '/manager',
        [Role.TEAM_LEADER]: '/team-leader',
        [Role.RUNNER]: '/runner'
      };

      const targetPath = dashboardRoutes[userRole];

      if (targetPath) {
        // âœ… ACCIÃ“N CRÃTICA: Ejecutar la navegaciÃ³n
        navigate(targetPath, { replace: true });
      } else {
        throw new Error('User role recognized or invalid.');
      }

    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error(err);
      setError(err.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Asegurarse de que signUp maneje el rol correctamente
      await signUp(email, password, fullName, selectedRole);

      const dashboardRoutes: Record<Role, string> = {
        [Role.MANAGER]: '/manager',
        [Role.TEAM_LEADER]: '/team-leader',
        [Role.RUNNER]: '/runner'
      };

      navigate(dashboardRoutes[selectedRole], { replace: true });
    } catch (err: any) {
      setError(err.message || 'Error al registrar');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Redirect if already authenticated
  const { isAuthenticated, currentRole } = useAuth();
  React.useEffect(() => {
    if (isAuthenticated && currentRole) {
      const dashboardRoutes: Record<Role, string> = {
        [Role.MANAGER]: '/manager',
        [Role.TEAM_LEADER]: '/team-leader',
        [Role.RUNNER]: '/runner'
      };
      navigate(dashboardRoutes[currentRole], { replace: true });
    }
  }, [isAuthenticated, currentRole, navigate]);

  const handleDemoAccess = async (role: Role) => {
    // Demo logic placeholder - likely standard accounts in DB
    const demoEmail = `demo@${role}.com`; // Replaces string interpolation using enum value
    // Adjust logic if roles are 'manager', 'team_leader' etc. and demo emails differ.
    // Assuming demo emails are cleaner: demo@manager.com?
    // Let's stick to simple logic or manual mapping if known.
    // For now assuming the role value is directly usable in email.

    // Quick Fix: Enum values have underscores 'team_leader', might want 'team-leader' or just use the raw value.
    // Using raw value as per user request context.

    const demoPass = 'password123';

    try {
      setIsSubmitting(true);
      await signIn(demoEmail, demoPass);
      // Login handleLogin logic handles redirect internally? No, signIn returns promise.
      // We need to redirect manually here too if signIn doesn't auto-redirect.
      // But wait! handleLogin calls signIn THEN redirects.
      // handleDemoAccess calls signIn directly. We should duplicate redirect logic or reuse logic.
      // Reusing logic:

      const dashboardRoutes: Record<Role, string> = {
        [Role.MANAGER]: '/manager',
        [Role.TEAM_LEADER]: '/team-leader',
        [Role.RUNNER]: '/runner'
      };

      // Since signIn returns {user, profile}, get it.
      // Actually usage above in handleDemoAccess just awaited it. 

      // I need to fetch profile to redirect correctly or just trust the requested role.
      // Trusting the requested role for Demo purposes is faster.

      const targetPath = dashboardRoutes[role];
      if (targetPath) navigate(targetPath, { replace: true });

    } catch (e) {
      setError('Demo accounts not ready. Please register.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#d91e36] to-[#8b0000] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#d91e36] to-[#8b0000] flex flex-col">
      {/* Header */}
      <div className="pt-safe-top px-6 py-8">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="size-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-3xl">agriculture</span>
          </div>
        </div>
        <h1 className="text-3xl font-black text-white text-center tracking-tight">HarvestPro NZ</h1>
        <p className="text-white/70 text-center text-sm mt-1">Cherry Harvest Management</p>
      </div>

      {/* Main Card */}
      <div className="flex-1 bg-white rounded-t-[2.5rem] px-6 pt-8 pb-safe-bottom shadow-2xl">

        {/* Mode Tabs */}
        <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
          <button
            onClick={() => setMode('LOGIN')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${mode === 'LOGIN' ? 'bg-white shadow-sm text-[#d91e36]' : 'text-gray-500'
              }`}
          >
            Login
          </button>
          <button
            onClick={() => setMode('REGISTER')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${mode === 'REGISTER' ? 'bg-white shadow-sm text-[#d91e36]' : 'text-gray-500'
              }`}
          >
            Register
          </button>
          <button
            onClick={() => setMode('DEMO')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${mode === 'DEMO' ? 'bg-white shadow-sm text-[#d91e36]' : 'text-gray-500'
              }`}
          >
            Demo
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-600 font-medium">{error}</p>
          </div>
        )}

        {/* LOGIN FORM */}
        {mode === 'LOGIN' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#d91e36] outline-none text-gray-900"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#d91e36] outline-none text-gray-900"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-[#d91e36] text-white rounded-xl font-bold uppercase tracking-widest disabled:bg-gray-300 active:scale-[0.98] transition-all shadow-lg shadow-red-200"
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        )}

        {/* REGISTER FORM */}
        {mode === 'REGISTER' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Smith"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#d91e36] outline-none text-gray-900"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#d91e36] outline-none text-gray-900"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#d91e36] outline-none text-gray-900"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Role</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: Role.MANAGER, label: 'Manager', icon: 'admin_panel_settings' },
                  { value: Role.TEAM_LEADER, label: 'Team Lead', icon: 'groups' },
                  { value: Role.RUNNER, label: 'Bucket Runner', icon: 'local_shipping' },
                ].map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => setSelectedRole(role.value as Role)}
                    className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${selectedRole === role.value
                      ? 'border-[#d91e36] bg-red-50 text-[#d91e36]'
                      : 'border-gray-200 text-gray-500'
                      }`}
                  >
                    <span className="material-symbols-outlined">{role.icon}</span>
                    <span className="text-[10px] font-bold uppercase">{role.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-[#d91e36] text-white rounded-xl font-bold uppercase tracking-widest disabled:bg-gray-300 active:scale-[0.98] transition-all shadow-lg shadow-red-200"
            >
              {isSubmitting ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        )}

        {/* DEMO MODE */}
        {mode === 'DEMO' && (
          <div className="space-y-4">
            <p className="text-center text-gray-600 text-sm mb-6">
              Try the app without creating an account. Select a role to explore:
            </p>

            <button
              onClick={() => handleDemoAccess(Role.MANAGER)}
              className="w-full p-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl flex items-center gap-4 active:scale-[0.98] transition-all shadow-lg"
            >
              <div className="size-12 rounded-xl bg-white/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">admin_panel_settings</span>
              </div>
              <div className="text-left">
                <p className="font-bold text-lg">Manager</p>
                <p className="text-white/70 text-sm">Command center & analytics</p>
              </div>
            </button>

            <button
              onClick={() => handleDemoAccess(Role.TEAM_LEADER)}
              className="w-full p-4 bg-gradient-to-r from-[#d91e36] to-[#ff1f3d] text-white rounded-xl flex items-center gap-4 active:scale-[0.98] transition-all shadow-lg"
            >
              <div className="size-12 rounded-xl bg-white/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">groups</span>
              </div>
              <div className="text-left">
                <p className="font-bold text-lg">Team Leader</p>
                <p className="text-white/70 text-sm">Manage pickers & rows</p>
              </div>
            </button>

            <button
              onClick={() => handleDemoAccess(Role.RUNNER)}
              className="w-full p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl flex items-center gap-4 active:scale-[0.98] transition-all shadow-lg"
            >
              <div className="size-12 rounded-xl bg-white/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">local_shipping</span>
              </div>
              <div className="text-left">
                <p className="font-bold text-lg">Bucket Runner</p>
                <p className="text-white/70 text-sm">Logistics & scanning</p>
              </div>
            </button>

            <p className="text-center text-gray-400 text-xs mt-6">
              Demo mode uses local data only. For full features, create an account.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-gray-400 text-xs">
            Central Pac â€¢ Cromwell, Otago
          </p>
          <p className="text-gray-300 text-xs mt-1">
            v4.2.0 â€¢ Â© 2024 HarvestPro NZ
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
