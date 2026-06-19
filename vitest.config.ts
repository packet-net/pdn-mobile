import { defineConfig } from 'vitest/config';

// Pure-logic unit tests (reducer, parsing). Node environment — no DOM/Capacitor
// needed because the modules under test import only types.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
