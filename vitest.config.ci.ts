import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// CI config for GitHub Actions runners (7GB RAM)
//
// Strategy: pool 'threads' + 5 shards
//   - Threads share a single V8 heap → simpler error handling (jsdom errors
//     are caught instead of killing the process like in forks mode)
//   - 5 shards split ~365 files into ~73 per shard, reducing heap pressure
//     to ~1/5 of original (well within 6GB limit)
//   - NODE_OPTIONS=--max-old-space-size=6144 set in CI workflow
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
    pool: 'threads',
    maxWorkers: 1,
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
