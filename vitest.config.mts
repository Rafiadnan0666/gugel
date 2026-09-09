import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': `${import.meta.dirname}/src`,
    },
  },
  test: {
    environment: 'node',
    testTimeout: 30000,
    exclude: ['node_modules', '.next'],
  },
});
