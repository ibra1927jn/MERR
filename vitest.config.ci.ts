import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// CI config for GitHub Actions runners (7GB RAM)
// Vitest 4 — poolOptions removed, all options are top-level
//
// Memory architecture:
//   - Orchestrator: gets NODE_OPTIONS heap (3GB) for storing test results
//   - Worker forks: limited to 1.5GB via execArgv (processes 1 file at a time)
//   - Total peak: 3GB + 1.5GB + ~1.5GB OS ≈ 6GB, under 7GB limit
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', 'tests', 'e2e'],
    testTimeout: 30_000,
    hookTimeout: 10_000,
    teardownTimeout: 5_000,
    pool: 'forks',
    // Vitest 4: execArgv is top-level (not inside poolOptions)
    execArgv: ['--max-old-space-size=1536'],
    maxWorkers: 1,
    // minWorkers removed in Vitest 4
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/test-setup.ts',
        'src/vite-env.d.ts',
        'src/**/*.d.ts',
        'src/**/index.ts',
        'src/**/__mocks__/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
