import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor Configuration — HarvestPro NZ
 *
 * Wraps the Vite PWA build as a native iOS/Android app
 * with access to native camera, push notifications, haptics,
 * and biometric authentication.
 *
 * Build: npm run build → npx cap sync
 * Run:  npx cap run android / npx cap run ios
 */
const config: CapacitorConfig = {
  appId: 'com.harvestpro.nz',
  appName: 'HarvestPro NZ',
  webDir: 'dist',
  server: {
    // Allow mixed content for Supabase connections
    androidScheme: 'https',
  },
  plugins: {
    // Native camera for QR scanning
    Camera: {},
    // Push notifications via Firebase Cloud Messaging
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    // Haptic feedback for scan confirmation
    Haptics: {},
    // Status bar styling
    StatusBar: {
      style: 'dark',
      backgroundColor: '#16a34a',
    },
    // Splash screen
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#16a34a',
      showSpinner: true,
      spinnerColor: '#ffffff',
    },
  },
  // iOS-specific
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
  },
  // Android-specific
  android: {
    allowMixedContent: false,  // SEC-1 FIX: Supabase is always HTTPS. HTTP mixed content not needed.
    backgroundColor: '#16a34a',
  },
};

export default config;
