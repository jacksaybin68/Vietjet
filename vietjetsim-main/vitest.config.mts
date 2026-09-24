import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    include: ['src/test/**/*.test.ts', 'src/test/**/*.test.tsx'],
    // `src/test/auth.test.ts` hashes several passwords with bcrypt, which is
    // intentionally CPU-bound. On a loaded machine the file already takes ~4.5s
    // against the 5s default, so it fails intermittently on CI runners for no
    // reason other than machine speed.
    testTimeout: 20000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/', '**/*.d.ts', '**/*.config.*'],
    },
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
});
