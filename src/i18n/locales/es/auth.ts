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
    // Claves adicionales para LoginForm, RegisterForm y Login
    'auth.signing_in': 'Iniciando sesión...',
    'auth.sign_up': 'Registrarse',
    'auth.full_name': 'Nombre Completo',
    'auth.or_register': '¿Nuevo? Crear cuenta',
    'auth.or_login': '¿Ya tienes cuenta? Iniciar sesión',
    'auth.create_account': 'Crear Cuenta',
    'auth.creating_account': 'Creando cuenta...',
    'auth.welcome_back': '¡Bienvenido de vuelta!',
    'auth.sign_in_desc_alt': 'Inicia sesión para acceder a tu panel',
    'auth.register_desc': 'Crear tu cuenta',
    'auth.register_hr_notice': 'Registrarse con el email autorizado por RR.HH.',
    'auth.register_hr_notice_full': 'Registrarse con el email autorizado por RR.HH. Tu rol y departamento se asignan automáticamente.',
};

export default auth;
