import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite + React. Output goes to `dist/`, which Capacitor copies into the native
// app as the bundled Origin-A web layer (see capacitor.config.ts webDir).
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
});
