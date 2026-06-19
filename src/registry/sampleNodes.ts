import type { NodeRecord } from './types';

/**
 * Placeholder registry seed (plan §2.3). These two records exist ONLY so the Home
 * screen renders a realistic node list in the skeleton. P1 replaces this with a
 * persisted registry (plain app storage for metadata; creds in Keychain/Keystore).
 *
 * The two seeded reaches — pdn over `lan`, pico over `lan` — match the P0/P1 happy
 * path: a pdn node discovered on the LAN via mDNS (`_pdn._tcp`), and a pico-node at
 * its advertised `pico-node.local`.
 */
export const sampleNodes: NodeRecord[] = [
  {
    id: 'pdn-lab',
    type: 'pdn',
    displayName: 'pdn (lab)',
    reaches: [
      { kind: 'lan', baseUrl: 'http://pdn.local:8080' },
      { kind: 'tailscale', baseUrl: 'https://pdn-lab.example.ts.net' },
    ],
    credRef: 'cred:pdn-lab',
    capabilities: ['panel', 'apps'],
  },
  {
    id: 'pico-shack',
    type: 'pico',
    displayName: 'pico-node',
    reaches: [
      { kind: 'lan', baseUrl: 'http://pico-node.local' },
      { kind: 'ap', apSsid: 'pico-<callsign>', baseUrl: 'http://192.168.4.1' },
    ],
    credRef: 'cred:pico-shack',
    capabilities: ['portal'],
  },
];
