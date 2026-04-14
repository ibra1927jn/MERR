import { http, HttpResponse } from 'msw';
import { MOCK_SESSION, MOCK_AUTH_USER } from '../data';

export const authHandlers = [
  // Sign in — responde a cualquier intento de login con el usuario mock
  http.post('*/auth/v1/token', () => {
    return HttpResponse.json(MOCK_SESSION);
  }),

  // Refresh token
  http.put('*/auth/v1/token', () => {
    return HttpResponse.json(MOCK_SESSION);
  }),

  // Get current user (llamado por SDK en background)
  http.get('*/auth/v1/user', () => {
    return HttpResponse.json(MOCK_AUTH_USER);
  }),

  // Sign out
  http.post('*/auth/v1/logout', () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // Sign up
  http.post('*/auth/v1/signup', () => {
    return HttpResponse.json(MOCK_SESSION);
  }),

  // Auth settings (Supabase SDK lo consulta al init)
  http.get('*/auth/v1/settings', () => {
    return HttpResponse.json({
      external: { email: true },
      disable_signup: false,
      mailer_autoconfirm: true,
    });
  }),

  // MFA factors — devolver factor verificado para que MFAGuard no fuerce setup
  http.get('*/auth/v1/factors', () => {
    return HttpResponse.json([
      {
        id: 'mock-totp-factor-001',
        type: 'totp',
        friendly_name: 'Mock Authenticator',
        factor_type: 'totp',
        status: 'verified',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ]);
  }),

  // MFA enroll (por si alguien llega a la pantalla de setup)
  http.post('*/auth/v1/factors', () => {
    return HttpResponse.json({
      id: 'mock-totp-factor-001',
      type: 'totp',
      totp: {
        qr_code: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YwZmRmNCIvPjx0ZXh0IHg9IjEwMCIgeT0iMTEwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjMDY1ZjQ2IiBmb250LXNpemU9IjE0Ij5Nb2NrIFFSPC90ZXh0Pjwvc3ZnPg==',
        secret: 'MOCK_TOTP_SECRET_BASE32',
        uri: 'otpauth://totp/HarvestPro:manager@harvestpro.nz?secret=MOCK&issuer=HarvestPro',
      },
    });
  }),

  // MFA challenge
  http.post('*/auth/v1/factors/*/challenge', () => {
    return HttpResponse.json({ id: 'mock-challenge-001', type: 'totp' });
  }),

  // MFA verify
  http.post('*/auth/v1/factors/*/verify', () => {
    return HttpResponse.json(MOCK_SESSION);
  }),

  // Password recovery
  http.post('*/auth/v1/recover', () => {
    return HttpResponse.json({});
  }),

  // OTP
  http.post('*/auth/v1/otp', () => {
    return HttpResponse.json({});
  }),
];
