import type { TranslationDict } from '../../types';

const auth: TranslationDict = {
    'auth.welcome': '¡Bienvenido!',
    'auth.sign_in': 'Iniciar Sesión',
    'auth.sign_in_desc': 'Inicia sesión para acceder a tu panel',
    'auth.register': 'Registrarse',
    'auth.email': 'Correo Electrónico',
    'auth.password': 'Contraseña',
    'auth.forgot_password': '¿Olvidaste tu contraseña?',
    // 2FA / MFA
    'auth.twoFactor.title': 'Autenticación de Dos Factores',
    'auth.twoFactor.subtitle': 'Ingresa el código de 6 dígitos de tu app autenticadora',
    'auth.twoFactor.verify': 'Verificar',
    'auth.twoFactor.verifying': 'Verificando...',
    'auth.twoFactor.cancel': 'Cancelar',
    'auth.twoFactor.back': '← Volver al inicio de sesión',
    'auth.twoFactor.resend': 'Reenviar código',
    'auth.twoFactor.resend_in': 'Reenviar en {n}s',
    'auth.twoFactor.expires_in': 'Código expira en {mm}:{ss}',
    'auth.twoFactor.lost_access': '¿Perdiste acceso a tu autenticador?',
    'auth.twoFactor.contact_admin': 'Contacta a tu administrador para obtener ayuda.',
    'auth.twoFactor.error_length': 'Por favor ingresa un código de 6 dígitos',
    'auth.twoFactor.error_invalid': 'Código inválido. Inténtalo de nuevo.',
};

export default auth;
