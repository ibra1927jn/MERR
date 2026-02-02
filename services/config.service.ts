// =============================================
// CONFIGURATION SERVICE - Secure environment management
// =============================================

/**
 * Environment types for different deployment contexts
 */
export type Environment = 'development' | 'staging' | 'production';

/**
 * Configuration keys that must be present
 */
interface RequiredConfig {
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
}

/**
 * Optional configuration with defaults
 */
interface OptionalConfig {
    GEMINI_API_KEY?: string;
    APP_VERSION?: string;
    ENABLE_ANALYTICS?: boolean;
    LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error';
}

export interface AppConfig extends RequiredConfig, OptionalConfig {
    environment: Environment;
    isDevelopment: boolean;
    isProduction: boolean;
}

/**
 * Configuration validation errors
 */
export class ConfigurationError extends Error {
    constructor(
        message: string,
        public readonly missingKeys: string[] = []
    ) {
        super(message);
        this.name = 'ConfigurationError';
    }
}

/**
 * Detect current environment based on various signals
 */
function detectEnvironment(): Environment {
    // Check Vite mode
    const mode = import.meta.env.MODE;
    if (mode === 'production') return 'production';
    if (mode === 'staging') return 'staging';

    // Check URL for Vercel preview deployments
    if (typeof window !== 'undefined') {
        const host = window.location.hostname;
        if (host.includes('vercel.app') && !host.includes('prod')) {
            return 'staging';
        }
        if (host !== 'localhost' && host !== '127.0.0.1') {
            return 'production';
        }
    }

    return 'development';
}

/**
 * Fallback values for development only
 * These should NEVER be used in production
 */
const DEV_FALLBACKS: RequiredConfig = {
    SUPABASE_URL: 'https://mcbtyaebetzvzvnxydpy.supabase.co',
    SUPABASE_ANON_KEY:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jYnR5YWViZXR6dnp2bnh5ZHB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0OTQyNDIsImV4cCI6MjA4NDA3MDI0Mn0.GGLGSms0HE5o3R_MjbitUIqy0Dw4fdkrEEaVx_B7NhQ',
};

/**
 * Load and validate configuration
 */
function loadConfig(): AppConfig {
    const environment = detectEnvironment();
    const isDevelopment = environment === 'development';
    const isProduction = environment === 'production';

    // Get values from environment variables
    let supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    let supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    // Track missing required keys
    const missingKeys: string[] = [];
    if (!supabaseUrl) missingKeys.push('VITE_SUPABASE_URL');
    if (!supabaseAnonKey) missingKeys.push('VITE_SUPABASE_ANON_KEY');

    // In production, throw error if required config is missing
    if (isProduction && missingKeys.length > 0) {
        throw new ConfigurationError(
            `Missing required environment variables: ${missingKeys.join(', ')}. ` +
            `Please set these in your deployment environment.`,
            missingKeys
        );
    }

    // In development, use fallbacks with warning
    if (missingKeys.length > 0 && isDevelopment) {
        console.warn(
            `⚠️ [Config] Using development fallbacks for: ${missingKeys.join(', ')}. ` +
            `Set these in .env.local for production-like testing.`
        );
        if (!supabaseUrl) supabaseUrl = DEV_FALLBACKS.SUPABASE_URL;
        if (!supabaseAnonKey) supabaseAnonKey = DEV_FALLBACKS.SUPABASE_ANON_KEY;
    }

    // In staging, warn but continue with fallbacks
    if (missingKeys.length > 0 && environment === 'staging') {
        console.warn(
            `⚠️ [Config] Staging environment missing: ${missingKeys.join(', ')}. Using fallbacks.`
        );
        if (!supabaseUrl) supabaseUrl = DEV_FALLBACKS.SUPABASE_URL;
        if (!supabaseAnonKey) supabaseAnonKey = DEV_FALLBACKS.SUPABASE_ANON_KEY;
    }

    return {
        environment,
        isDevelopment,
        isProduction,
        SUPABASE_URL: supabaseUrl,
        SUPABASE_ANON_KEY: supabaseAnonKey,
        GEMINI_API_KEY: import.meta.env.VITE_GEMINI_API_KEY,
        APP_VERSION: import.meta.env.VITE_APP_VERSION || '4.2.0',
        ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
        LOG_LEVEL: (import.meta.env.VITE_LOG_LEVEL as AppConfig['LOG_LEVEL']) || 'info',
    };
}

// Create singleton config instance
let _config: AppConfig | null = null;

/**
 * Get application configuration
 * Throws ConfigurationError in production if required values are missing
 */
export function getConfig(): AppConfig {
    if (!_config) {
        _config = loadConfig();
    }
    return _config;
}

/**
 * Reset configuration (useful for testing)
 */
export function resetConfig(): void {
    _config = null;
}

/**
 * Check if a feature flag is enabled
 */
export function isFeatureEnabled(feature: string): boolean {
    const config = getConfig();
    const envVar = import.meta.env[`VITE_FEATURE_${feature.toUpperCase()}`];
    return envVar === 'true' || envVar === '1';
}

/**
 * Get current log level
 */
export function getLogLevel(): AppConfig['LOG_LEVEL'] {
    return getConfig().LOG_LEVEL || 'info';
}

export default {
    getConfig,
    resetConfig,
    isFeatureEnabled,
    getLogLevel,
    ConfigurationError,
};
