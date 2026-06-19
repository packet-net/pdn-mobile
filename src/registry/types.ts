/**
 * Multi-node registry types — the single source of truth from which transport,
 * the child-WebView URL, and credentials derive (plan §2.3).
 *
 * STUB SCOPE: these types mirror the plan's `NodeRecord` model so the Home screen
 * has something real to render. Credential handling (Keychain/Keystore keyed by
 * `credRef`) and live reach-resolution/probing are NOT implemented here — they are
 * P1 work. Metadata here lives in plain app storage; creds must NEVER be inlined.
 */

export type NodeType = 'pdn' | 'pico';

/**
 * Reach kinds, ordered by typical preference (plan §2.3 / §2.4):
 *  - lan:       mDNS-resolved LAN address (HTTP-only ⇒ password login)
 *  - tailscale: the node's .ts.net MagicDNS name (bounded-timeout probe, not a
 *               detectable state)
 *  - ap:        the node's own soft-AP (pico provisioning; 192.168.4.1)
 *  - ble:       post-v1, gated; pico only when no IP path exists
 */
export type Reach = 'lan' | 'tailscale' | 'ap' | 'ble';

export interface NodeReach {
  kind: Reach;
  baseUrl?: string;
  apSsid?: string;
  bleDeviceId?: string;
  lastSeenAt?: number;
  rttMs?: number;
}

export interface NodeRecord {
  id: string;
  type: NodeType;
  displayName: string;
  /** Ordered by preference; probed in order at reach-resolution time. */
  reaches: NodeReach[];
  /**
   * KEY into secure storage — NEVER inline creds (plan §2.3 / §7.2).
   * STUB: nothing reads this yet; secure storage is P1.
   */
  credRef: string;
  /** pdn: [panel, apps, nativeMsg?]; pico: [portal, api?, ble?] (plan §2.3) */
  capabilities?: string[];
}
