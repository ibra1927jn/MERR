import type { TranslationDict } from '../../types';

const auth: TranslationDict = {
    'auth.welcome': 'Welcome back!',
    'auth.sign_in': 'Sign In',
    'auth.sign_in_desc': 'Sign in to access your dashboard',
    'auth.register': 'Register',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.forgot_password': 'Forgot your password?',
    // 2FA / MFA
    'auth.twoFactor.title': 'Two-Factor Authentication',
    'auth.twoFactor.subtitle': 'Enter the 6-digit code from your authenticator app',
    'auth.twoFactor.verify': 'Verify',
    'auth.twoFactor.verifying': 'Verifying...',
    'auth.twoFactor.cancel': 'Cancel',
    'auth.twoFactor.back': '← Back to login',
    'auth.twoFactor.resend': 'Resend code',
    'auth.twoFactor.resend_in': 'Resend in {n}s',
    'auth.twoFactor.expires_in': 'Code expires in {mm}:{ss}',
    'auth.twoFactor.lost_access': 'Lost access to your authenticator?',
    'auth.twoFactor.contact_admin': 'Contact your administrator for assistance.',
    'auth.twoFactor.error_length': 'Please enter a 6-digit code',
    'auth.twoFactor.error_invalid': 'Invalid code. Please try again.',
};

export default auth;
