import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration for the pdn mobile app.
 *
 * appId / appName are LOCKED (Tom): bundle id `uk.m0lte.pdn`, display name "pdn".
 * Repo: packet-net/pdn-mobile. Plan: ../packet.net/docs/mobile-app-plan.md.
 *
 * webDir is the Vite production output (`dist/`). The native platform folders
 * (ios/, android/) are NOT generated on this Linux box — they are produced in CI
 * (Codemagic, macOS) via `cap add ios`. See codemagic.yaml + README.
 *
 * Both schemes are set to `https` (plan §2.1 / §12): the app's own bundled origin
 * must be a SECURE CONTEXT so WebCrypto / passkey ceremonies / secure cookies work.
 * This is "Origin A" — the native-privileged shell. The pdn React panel and the
 * app UIs load in a sandboxed child WebView from each live node's OWN origin
 * ("Origin B"), which has no Capacitor bridge access.
 */
const config: CapacitorConfig = {
  appId: 'uk.m0lte.pdn',
  appName: 'pdn',
  webDir: 'dist',
  // Origin A — the bundled, native-privileged shell. Secure context on both platforms.
  ios: {
    scheme: 'https',
  },
  server: {
    iosScheme: 'https',
    androidScheme: 'https',
  },
  plugins: {
    // Native HTTP (probing + auth) bypasses WebView CORS/mixed-content; CapacitorCookies
    // shares the node's HttpOnly gateway cookie (set by the native /auth/login + refresh)
    // with the child WebView that loads the node's same-origin panel. See src/auth/login.ts.
    CapacitorHttp: { enabled: true },
    CapacitorCookies: { enabled: true },
  },
};

export default config;
