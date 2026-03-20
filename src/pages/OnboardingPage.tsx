/**
 * OnboardingPage.tsx — Multi-step signup and orchard provisioning flow
 *
 * Step 1: Organisation details (orchard name, address, row count)
 * Step 2: Admin account (name, email, password)
 * Step 3: Terms acceptance (T&C + Privacy Policy)
 * Step 4: Success / first login
 *
 * Calls provision-orchard Edge Function on submit → auto-logs in the new admin.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onboardingService, type OnboardingData } from '@/services/onboarding.service';

// ── Step indicator ─────────────────────────────────────────────────────────

const STEPS = [
  { label: 'Organisation', icon: '🌿' },
  { label: 'Admin Account', icon: '👤' },
  { label: 'Terms', icon: '📋' },
  { label: 'Done', icon: '✅' },
];

// ── Component ──────────────────────────────────────────────────────────────

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

    if (step === 0) {
      validationError = onboardingService.validateOrgStep({
        orchardName: data.orchardName,
        totalRows: data.totalRows,
      });
    } else if (step === 1) {
      validationError = onboardingService.validateAdminStep({
        adminName: data.adminName,
        adminEmail: data.adminEmail,
        adminPassword: data.adminPassword,
      });
    }

    if (validationError) {
      setError(validationError);
      return;
    }
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    const termsError = onboardingService.validateTermsStep({
      acceptedTerms: data.acceptedTerms,
      acceptedPrivacy: data.acceptedPrivacy,
    });
    if (termsError) { setError(termsError); return; }

    setLoading(true);
    setError(null);

    const result = await onboardingService.provisionOrchard(data);
    if (!result.success) {
      setLoading(false);
      setError(result.error ?? 'Signup failed. Please try again.');
      return;
    }

    // Auto-login after successful provisioning
    await onboardingService.loginAfterSignup(data.adminEmail, data.adminPassword);
    setLoading(false);
    setStep(3); // Success step
  };

  return (
    <div className="onboarding-container">
      {/* Logo */}
      <div className="onboarding-logo">
        🌿 <span>HarvestPro NZ</span>
      </div>

      {/* Step progress */}
      <div className="onboarding-steps" role="navigation" aria-label="Signup steps">
        {STEPS.map((s, i) => (
          <div
            key={s.label}
            className={`onboarding-step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
            aria-current={i === step ? 'step' : undefined}
          >
            <span className="step-icon">{s.icon}</span>
            <span className="step-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="onboarding-card">
        {step === 0 && (
          <OrgStep data={data} onChange={update} />
        )}
        {step === 1 && (
          <AdminStep data={data} onChange={update} />
        )}
        {step === 2 && (
          <TermsStep data={data} onChange={update} />
        )}
        {step === 3 && (
          <SuccessStep orchardName={data.orchardName} onEnter={() => navigate('/')} />
        )}

        {/* Error */}
        {error && (
          <div className="onboarding-error" role="alert">
            {error}
          </div>
        )}

        {/* Navigation */}
        {step < 3 && (
          <div className="onboarding-nav">
            {step > 0 && (
              <button
                className="btn-secondary"
                onClick={() => { setError(null); setStep(s => s - 1); }}
                disabled={loading}
              >
                ← Back
              </button>
            )}
            {step < 2 && (
              <button className="btn-primary" onClick={nextStep}>
                Continue →
              </button>
            )}
            {step === 2 && (
              <button
                className="btn-primary btn-submit"
                onClick={handleSubmit}
                disabled={loading}
                id="onboarding-submit-btn"
              >
                {loading ? 'Creating account…' : 'Create Account'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Login link */}
      {step < 3 && (
        <p className="onboarding-login-link">
          Already have an account?{' '}
          <button className="link-btn" onClick={() => navigate('/login')}>
            Log in
          </button>
        </p>
      )}
    </div>
  );
}

// ── Step 1: Organisation ───────────────────────────────────────────────────

function OrgStep({
  data,
  onChange,
}: {
  data: OnboardingData;
  onChange: (f: Partial<OnboardingData>) => void;
}) {
  return (
    <div className="step-content">
      <h1 className="step-title">Tell us about your orchard</h1>
      <p className="step-subtitle">We'll set up your account with sensible defaults you can customise later.</p>

      <label className="form-label">
        Orchard / Business Name *
        <input
          className="form-input"
          type="text"
          value={data.orchardName}
          onChange={e => onChange({ orchardName: e.target.value })}
          placeholder="e.g. Sunny Hill Orchards"
          maxLength={100}
          autoFocus
          id="orchard-name-input"
        />
      </label>

      <label className="form-label">
        Address (optional)
        <input
          className="form-input"
          type="text"
          value={data.orchardAddress ?? ''}
          onChange={e => onChange({ orchardAddress: e.target.value })}
          placeholder="e.g. 123 Orchard Rd, Hawke's Bay"
          id="orchard-address-input"
        />
      </label>

      <label className="form-label">
        Number of Rows
        <input
          className="form-input"
          type="number"
          value={data.totalRows}
          onChange={e => onChange({ totalRows: parseInt(e.target.value, 10) || 20 })}
          min={1}
          max={500}
          id="total-rows-input"
        />
        <span className="form-hint">This can be changed later in Settings</span>
      </label>
    </div>
  );
}

// ── Step 2: Admin account ──────────────────────────────────────────────────

function AdminStep({
  data,
  onChange,
}: {
  data: OnboardingData;
  onChange: (f: Partial<OnboardingData>) => void;
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="step-content">
      <h1 className="step-title">Create your admin account</h1>
      <p className="step-subtitle">This will be the primary account with full access to your orchard.</p>

      <label className="form-label">
        Your Name *
        <input
          className="form-input"
          type="text"
          value={data.adminName}
          onChange={e => onChange({ adminName: e.target.value })}
          placeholder="e.g. James Wilson"
          autoFocus
          id="admin-name-input"
        />
      </label>

      <label className="form-label">
        Email Address *
        <input
          className="form-input"
          type="email"
          value={data.adminEmail}
          onChange={e => onChange({ adminEmail: e.target.value })}
          placeholder="james@sunnyhill.co.nz"
          id="admin-email-input"
        />
      </label>

      <label className="form-label">
        Password *
        <div className="password-input-wrap">
          <input
            className="form-input"
            type={showPassword ? 'text' : 'password'}
            value={data.adminPassword}
            onChange={e => onChange({ adminPassword: e.target.value })}
            placeholder="Min. 8 characters, 1 uppercase, 1 number"
            id="admin-password-input"
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword(s => !s)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>
      </label>
    </div>
  );
}

// ── Step 3: Terms ──────────────────────────────────────────────────────────

function TermsStep({
  data,
  onChange,
}: {
  data: OnboardingData;
  onChange: (f: Partial<OnboardingData>) => void;
}) {
  return (
    <div className="step-content">
      <h1 className="step-title">Terms & Privacy</h1>
      <p className="step-subtitle">Please read and accept before creating your account.</p>

      <label className="checkbox-label" id="terms-label">
        <input
          type="checkbox"
          checked={data.acceptedTerms}
          onChange={e => onChange({ acceptedTerms: e.target.checked })}
          id="accept-terms-checkbox"
        />
        <span>
          I accept the{' '}
          <a href="/docs/legal/terms" target="_blank" rel="noopener noreferrer">
            Terms of Service
          </a>{' '}
          (v1.0)
        </span>
      </label>

      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={data.acceptedPrivacy}
          onChange={e => onChange({ acceptedPrivacy: e.target.checked })}
          id="accept-privacy-checkbox"
        />
        <span>
          I accept the{' '}
          <a href="/docs/legal/privacy" target="_blank" rel="noopener noreferrer">
            Privacy Policy
          </a>{' '}
          (v1.0) — including how HarvestPro NZ processes worker data under the NZ Privacy Act 2020
        </span>
      </label>

      <div className="terms-notice">
        <p>
          🔒 Your data is stored securely. Worker information is used only to provide the service
          and comply with NZ employment law. We never sell your data.
        </p>
      </div>
    </div>
  );
}

// ── Step 4: Success ────────────────────────────────────────────────────────

function SuccessStep({
  orchardName,
  onEnter,
}: {
  orchardName: string;
  onEnter: () => void;
}) {
  return (
    <div className="step-content step-success">
      <div className="success-icon">🎉</div>
      <h1 className="step-title">Welcome to HarvestPro NZ!</h1>
      <p className="step-subtitle">
        <strong>{orchardName}</strong> is ready to go. Your default wage rates and settings
        have been configured — you can update them in Settings.
      </p>

      <div className="success-checklist">
        <div className="checklist-item">✅ Orchard account created</div>
        <div className="checklist-item">✅ Default wage rates set (NZ minimums)</div>
        <div className="checklist-item">✅ Admin access granted</div>
        <div className="checklist-item">✅ Offline sync ready</div>
      </div>

      <button
        className="btn-primary btn-large"
        onClick={onEnter}
        id="enter-dashboard-btn"
      >
        Enter Dashboard →
      </button>
    </div>
  );
}
