import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'favicon-32x32.png', 'favicon-16x16.png'],
        manifest: {
          name: 'HarvestPro NZ',
          short_name: 'HarvestPro',
          description: 'Harvest workforce management platform for New Zealand orchards',
          theme_color: '#16a34a',
          background_color: '#1a1a2e',
          icons: [
            {
              src: '/icons/icon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any'
            },
            {
              src: '/icons/icon-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: '/icons/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.origin.includes('supabase.co'),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-api-cache',
                networkTimeoutSeconds: 5,
                cacheableResponse: { statuses: [0, 200] }
              }
            },
            {
              urlPattern: ({ url }) => url.origin.includes('googleapis.com'),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-fonts-stylesheets',
                cacheableResponse: { statuses: [0, 200] }
              }
            }
          ]
        }
      })
    ],
    build: {
      rollupOptions: {
        external: ['@capacitor-community/barcode-scanner'],
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-supabase': ['@supabase/supabase-js'],
            // QA-3 FIX: Added react-query to vendor-state — shared dep reduces cache misses
            'vendor-state': ['zustand', 'dexie', '@tanstack/react-query'],
            'vendor-monitoring': ['@sentry/react', 'posthog-js'],
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    },
    // QA-4 FIX: Vitest coverage configuration
    // Run: npm run test:coverage to generate coverage report
    test: {
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'lcov'],
        reportsDirectory: './coverage',
        exclude: [
          'src/types/database.types.ts',  // Generated — not hand-written
          'src/stories/**',
          '**/*.test.ts',
          '**/*.test.tsx',
          '**/__tests__/**',
          'src/config/sentry.ts',          // Third-party integration wrapper
        ],
        thresholds: {
          // Baseline thresholds — increase by 5% each quarter
          statements: 70,
          functions:  70,
          branches:   60,
          lines:      70,
        },
      },
    },
  };
});
