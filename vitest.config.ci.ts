import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// CI config for GitHub Actions runners (7GB RAM)
// Memory architecture:
//   - Orchestrator (main process): gets NODE_OPTIONS heap (3GB) — stores accumulated test results
//   - Worker forks (1 per test file): limited to 1.5GB via execArgv — only processes 1 file at a time
//   - Total peak: 3GB + 1.5GB + ~1.5GB OS ≈ 6GB, well under 7GB limit
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
    poolOptions: {
      forks: {
        execArgv: ['--max-old-space-size=1536'],
      },
    },
    maxWorkers: 1,
    minWorkers: 1,
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
