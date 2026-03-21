/**
 * OnboardingPage.tsx — Multi-step signup and orchard provisioning flow
 *
 * Step 1: Organisation details (orchard name, address, row count)
 * Step 2: Admin account (name, email, password)
 * Step 3: Terms acceptance (T&C + Privacy Policy)
 * Step 4: Success / first login
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onboardingService, type OnboardingData } from '@/services/onboarding.service';

// ── Step config ────────────────────────────────────────────────────────────

const STEPS = [
  { label: 'Organisation', icon: '🌿' },
  { label: 'Admin Account', icon: '👤' },
  { label: 'Terms', icon: '📋' },
  { label: 'Done', icon: '✅' },
];

// ── Main component ─────────────────────────────────────────────────────────

export function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OnboardingData>({
    orchardName: '',
    orchardAddress: '',
    totalRows: 20,
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    acceptedTerms: false,
    acceptedPrivacy: false,
  });

  const update = (fields: Partial<OnboardingData>) =>
    setData(prev => ({ ...prev, ...fields }));

  const nextStep = () => {
    setError(null);
    let validationError: string | null = null;
    if (step === 0) validationError = onboardingService.validateOrgStep({ orchardName: data.orchardName, totalRows: data.totalRows });
    if (step === 1) validationError = onboardingService.validateAdminStep({ adminName: data.adminName, adminEmail: data.adminEmail, adminPassword: data.adminPassword });
    if (validationError) { setError(validationError); return; }
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    const termsError = onboardingService.validateTermsStep({ acceptedTerms: data.acceptedTerms, acceptedPrivacy: data.acceptedPrivacy });
    if (termsError) { setError(termsError); return; }
    setLoading(true);
    setError(null);
    const result = await onboardingService.provisionOrchard(data);
    if (!result.success) {
      setLoading(false);
      setError(result.error ?? 'Signup failed. Please try again.');
      return;
    }
    await onboardingService.loginAfterSignup(data.adminEmail, data.adminPassword);
    setLoading(false);
    setStep(3);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <span className="text-3xl">🌿</span>
        <span className="text-2xl font-bold text-emerald-700 tracking-tight">HarvestPro NZ</span>
      </div>

      {/* Step indicator */}
      <nav className="flex items-center gap-2 mb-8" aria-label="Signup steps">
        {STEPS.map((s, i) => (
          <div key={s.label} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              i === step ? 'bg-emerald-600 text-white shadow-md' :
              i < step  ? 'bg-emerald-100 text-emerald-700' :
                          'bg-gray-100 text-gray-400'
            }`}>
              <span>{s.icon}</span>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-6 h-0.5 ${i < step ? 'bg-emerald-400' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </nav>

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        {step === 0 && <OrgStep data={data} onChange={update} />}
        {step === 1 && <AdminStep data={data} onChange={update} />}
        {step === 2 && <TermsStep data={data} onChange={update} />}
        {step === 3 && <SuccessStep orchardName={data.orchardName} onEnter={() => navigate('/')} />}

        {/* Error */}
        {error && (
          <div role="alert" className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
            <span className="shrink-0">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Navigation buttons */}
        {step < 3 && (
          <div className="flex gap-3 mt-6">
            {step > 0 && (
              <button
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                onClick={() => { setError(null); setStep(s => s - 1); }}
                disabled={loading}
              >
                ← Back
              </button>
            )}
            {step < 2 && (
              <button
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-sm"
                onClick={nextStep}
              >
                Continue →
              </button>
            )}
            {step === 2 && (
              <button
                id="onboarding-submit-btn"
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating account…
                  </span>
                ) : 'Create Account 🌿'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Login link */}
      {step < 3 && (
        <p className="mt-6 text-sm text-gray-500">
          Already have an account?{' '}
          <button
            className="text-emerald-600 font-medium hover:underline"
            onClick={() => navigate('/login')}
          >
            Log in
          </button>
        </p>
      )}
    </div>
  );
}

// ── Step 1: Organisation ───────────────────────────────────────────────────

function OrgStep({ data, onChange }: { data: OnboardingData; onChange: (f: Partial<OnboardingData>) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tell us about your orchard</h1>
        <p className="text-sm text-gray-500 mt-1">We'll set up your account with sensible defaults you can customise later.</p>
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Orchard / Business Name *</span>
          <input
            id="orchard-name-input"
            type="text"
            className="mt-1 w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow"
            value={data.orchardName}
            onChange={e => onChange({ orchardName: e.target.value })}
            placeholder="e.g. Sunny Hill Orchards"
            maxLength={100}
            autoFocus
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Address <span className="text-gray-400 font-normal">(optional)</span></span>
          <input
            id="orchard-address-input"
            type="text"
            className="mt-1 w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow"
            value={data.orchardAddress ?? ''}
            onChange={e => onChange({ orchardAddress: e.target.value })}
            placeholder="e.g. 123 Orchard Rd, Hawke's Bay"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Number of Rows</span>
          <input
            id="total-rows-input"
            type="number"
            className="mt-1 w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow"
            value={data.totalRows}
            onChange={e => onChange({ totalRows: parseInt(e.target.value, 10) || 20 })}
            min={1}
            max={500}
          />
          <p className="mt-1 text-xs text-gray-400">Can be changed later in Settings</p>
        </label>
      </div>
    </div>
  );
}

// ── Step 2: Admin account ──────────────────────────────────────────────────

function AdminStep({ data, onChange }: { data: OnboardingData; onChange: (f: Partial<OnboardingData>) => void }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create your admin account</h1>
        <p className="text-sm text-gray-500 mt-1">This will be the primary account with full access to your orchard.</p>
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Your Name *</span>
          <input
            id="admin-name-input"
            type="text"
            className="mt-1 w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow"
            value={data.adminName}
            onChange={e => onChange({ adminName: e.target.value })}
            placeholder="e.g. James Wilson"
            autoFocus
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Email Address *</span>
          <input
            id="admin-email-input"
            type="email"
            className="mt-1 w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow"
            value={data.adminEmail}
            onChange={e => onChange({ adminEmail: e.target.value })}
            placeholder="james@sunnyhill.co.nz"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Password *</span>
          <div className="relative mt-1">
            <input
              id="admin-password-input"
              type={showPassword ? 'text' : 'password'}
              className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow"
              value={data.adminPassword}
              onChange={e => onChange({ adminPassword: e.target.value })}
              placeholder="Min. 8 chars, 1 uppercase, 1 number"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              onClick={() => setShowPassword(s => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </label>
      </div>
    </div>
  );
}

// ── Step 3: Terms ──────────────────────────────────────────────────────────

function TermsStep({ data, onChange }: { data: OnboardingData; onChange: (f: Partial<OnboardingData>) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Terms & Privacy</h1>
        <p className="text-sm text-gray-500 mt-1">Please read and accept before creating your account.</p>
      </div>

      <div className="space-y-3">
        <label className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50 cursor-pointer transition-colors">
          <input
            id="accept-terms-checkbox"
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            checked={data.acceptedTerms}
            onChange={e => onChange({ acceptedTerms: e.target.checked })}
          />
          <span className="text-sm text-gray-700">
            I accept the{' '}
            <a href="/docs/legal/terms" target="_blank" rel="noopener noreferrer"
              className="text-emerald-600 font-medium hover:underline">
              Terms of Service
            </a>{' '}(v1.0)
          </span>
        </label>

        <label className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50 cursor-pointer transition-colors">
          <input
            id="accept-privacy-checkbox"
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            checked={data.acceptedPrivacy}
            onChange={e => onChange({ acceptedPrivacy: e.target.checked })}
          />
          <span className="text-sm text-gray-700">
            I accept the{' '}
            <a href="/docs/legal/privacy" target="_blank" rel="noopener noreferrer"
              className="text-emerald-600 font-medium hover:underline">
              Privacy Policy
            </a>{' '}
            (v1.0) — including how HarvestPro NZ processes worker data under the NZ Privacy Act 2020
          </span>
        </label>
      </div>

      <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-sm text-emerald-800 flex gap-2">
        <span className="shrink-0">🔒</span>
        <span>Your data is stored securely. Worker information is used only to provide the service and comply with NZ employment law. We never sell your data.</span>
      </div>
    </div>
  );
}

// ── Step 4: Success ────────────────────────────────────────────────────────

function SuccessStep({ orchardName, onEnter }: { orchardName: string; onEnter: () => void }) {
  return (
    <div className="text-center space-y-6 py-4">
      <div className="text-6xl">🎉</div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome to HarvestPro NZ!</h1>
        <p className="text-sm text-gray-500 mt-2">
          <strong className="text-gray-800">{orchardName}</strong> is ready to go. Your default wage rates
          and settings have been configured — you can update them in Settings.
        </p>
      </div>

      <div className="text-left space-y-2">
        {['Orchard account created', 'Default wage rates set (NZ minimums)', 'Admin access granted', 'Offline sync ready'].map(item => (
          <div key={item} className="flex items-center gap-2 text-sm text-gray-700">
            <span className="text-emerald-500">✅</span>
            <span>{item}</span>
          </div>
        ))}
      </div>

      <button
        id="enter-dashboard-btn"
        className="w-full px-4 py-3 bg-emerald-600 text-white rounded-xl font-semibold text-base hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-sm"
        onClick={onEnter}
      >
        Enter Dashboard →
      </button>
    </div>
  );
}
