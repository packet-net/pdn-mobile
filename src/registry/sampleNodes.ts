import type { NodeRecord } from './types';

/**
 * Placeholder registry seed (plan §2.3). These records exist ONLY so the Home
 * roster renders realistically in the skeleton. P1 replaces this with a persisted
 * registry (plain app storage for metadata; creds in Keychain/Keystore).
 *
 * Reaches carry `lastSeenAt` (presence = reachable) so the signal meter has online
 * and offline nodes to render — a node with no `lastSeenAt` reads as unreachable.
 * `rttMs` is illustrative latency only; it does NOT drive meter height (see status.ts).
 * ALL callsigns are synthetic Q0-block placeholders (never real amateur calls).
 *
 * `lastSeenAt` values are fixed offsets from an arbitrary reference epoch; the UI
 * never shows absolute time, only reachable/stale derived from presence.
 */
const REF = 1_750_000_000_000; // arbitrary fixed reference (not "now")

export const sampleNodes: NodeRecord[] = [
  {
    id: 'pdn-home',
    type: 'pdn',
    displayName: 'Home node',
    callsign: 'Q0PDN-1',
    reaches: [
      { kind: 'lan', baseUrl: 'http://pdn.local:8080', rttMs: 11, lastSeenAt: REF },
      { kind: 'tailscale', baseUrl: 'https://pdn-home.example.ts.net', rttMs: 90 },
    ],
    credRef: 'cred:pdn-home',
    capabilities: ['panel', 'apps', 'nativeMsg'],
  },
  {
    id: 'pdn-gateway',
    type: 'pdn',
    displayName: 'Hilltop gateway',
    callsign: 'Q0PDN-7',
    reaches: [
      { kind: 'tailscale', baseUrl: 'https://pdn-hill.example.ts.net', rttMs: 86, lastSeenAt: REF },
    ],
    credRef: 'cred:pdn-gateway',
    capabilities: ['panel', 'apps'],
  },
  {
    id: 'pico-shack',
    type: 'pico',
    displayName: 'Shack pico',
    callsign: 'Q0PCO-9',
    reaches: [
      { kind: 'lan', baseUrl: 'http://pico-node.local', rttMs: 38, lastSeenAt: REF },
      { kind: 'ap', apSsid: 'pico-Q0PCO', baseUrl: 'http://192.168.4.1' },
    ],
    credRef: 'cred:pico-shack',
    capabilities: ['portal'],
  },
  {
    id: 'pico-field',
    type: 'pico',
    displayName: 'Field kit',
    callsign: 'Q0PCO-2',
    reaches: [
      // No lastSeenAt on any reach ⇒ unreachable: meter reads "no signal".
      { kind: 'lan', baseUrl: 'http://pico-field.local' },
      { kind: 'ap', apSsid: 'pico-field', baseUrl: 'http://192.168.4.1' },
    ],
    credRef: 'cred:pico-field',
    capabilities: ['portal'],
  },
];
