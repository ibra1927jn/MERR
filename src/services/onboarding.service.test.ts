/**
 * onboarding.service — validation helpers + edge function wrapper.
 * Focus on validation functions (pure, easy); edge function mocked.
 */
import { describe, it, expect } from 'vitest';
import { onboardingService } from './onboarding.service';

describe('onboardingService.validateOrgStep', () => {
    it('OK cuando orchardName válido y rows en rango', () => {
        expect(onboardingService.validateOrgStep({ orchardName: 'Farm A', totalRows: 50 })).toBeNull();
    });

    it('rejects empty name', () => {
        expect(onboardingService.validateOrgStep({ orchardName: '', totalRows: 50 })).toMatch(/required/i);
    });

    it('rejects whitespace-only name', () => {
        expect(onboardingService.validateOrgStep({ orchardName: '   ', totalRows: 50 })).toMatch(/required/i);
    });

    it('rejects name < 2 chars', () => {
        expect(onboardingService.validateOrgStep({ orchardName: 'A', totalRows: 50 })).toMatch(/at least 2/);
    });

    it('rejects name > 100 chars', () => {
        expect(
            onboardingService.validateOrgStep({ orchardName: 'x'.repeat(101), totalRows: 50 }),
        ).toMatch(/under 100/);
    });

    it('rejects rows 0', () => {
        expect(onboardingService.validateOrgStep({ orchardName: 'Farm', totalRows: 0 })).toMatch(/between 1 and 500/);
    });

    it('rejects rows > 500', () => {
        expect(onboardingService.validateOrgStep({ orchardName: 'Farm', totalRows: 501 })).toMatch(/between 1 and 500/);
    });

    it('OK en extremos 1 y 500', () => {
        expect(onboardingService.validateOrgStep({ orchardName: 'Farm', totalRows: 1 })).toBeNull();
        expect(onboardingService.validateOrgStep({ orchardName: 'Farm', totalRows: 500 })).toBeNull();
    });
});

describe('onboardingService.validateAdminStep', () => {
    const valid = { adminName: 'Alice', adminEmail: 'alice@farm.nz', adminPassword: 'Strong1Pass' };

    it('OK para datos válidos', () => {
        expect(onboardingService.validateAdminStep(valid)).toBeNull();
    });

    it('rejects empty name', () => {
        expect(onboardingService.validateAdminStep({ ...valid, adminName: '' })).toMatch(/name is required/i);
    });

    it('rejects email sin @', () => {
        expect(onboardingService.validateAdminStep({ ...valid, adminEmail: 'alice.com' })).toMatch(/email/i);
    });

    it('rejects email sin .', () => {
        expect(onboardingService.validateAdminStep({ ...valid, adminEmail: 'alice@farm' })).toMatch(/email/i);
    });

    it('rejects password < 8', () => {
        expect(onboardingService.validateAdminStep({ ...valid, adminPassword: 'Ab1' })).toMatch(/at least 8/);
    });

    it('rejects password sin mayúscula', () => {
        expect(onboardingService.validateAdminStep({ ...valid, adminPassword: 'nomayus1' })).toMatch(/uppercase/);
    });

    it('rejects password sin número', () => {
        expect(onboardingService.validateAdminStep({ ...valid, adminPassword: 'NoNumber' })).toMatch(/number/);
    });
});

describe('onboardingService.validateTermsStep', () => {
    it('OK cuando ambos true', () => {
        expect(
            onboardingService.validateTermsStep({ acceptedTerms: true, acceptedPrivacy: true }),
        ).toBeNull();
    });

    it('rejects sin acceptedTerms', () => {
        expect(
            onboardingService.validateTermsStep({ acceptedTerms: false, acceptedPrivacy: true }),
        ).toMatch(/Terms/);
    });

    it('rejects sin acceptedPrivacy', () => {
        expect(
            onboardingService.validateTermsStep({ acceptedTerms: true, acceptedPrivacy: false }),
        ).toMatch(/Privacy/);
    });
});

// NOTE: provisionOrchard + loginAfterSignup no se testean aquí porque
// MSW intercepta las llamadas a supabase.functions/auth y el spy no
// sustituye el handler. Los validators puros cubren la mayor parte de
// la lógica client-side.
