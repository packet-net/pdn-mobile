import { Home } from './screens/Home';

/**
 * App root (Origin A — the native-privileged React shell).
 *
 * Skeleton: a single Home screen. Native messaging-app screens (BBS / chat /
 * WhatsPac) — the actual product driver — and pico-native screens are later arcs
 * layered on this shell. See ../packet.net/docs/mobile-app-plan.md.
 */
export default function App() {
  return <Home />;
}
