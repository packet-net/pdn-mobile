import type { NodeRecord, NodeReach } from './types';
import type { MeterState } from '../components/SignalMeter';

/**
 * Reach → signal-meter mapping. The roster's signature element reads node health at
 * a glance, so this is the one place that decides "how many bars, which colour".
 *
 * Bar HEIGHT encodes reachability/health, NOT transport latency: a node either has a
 * usable reach (full bars) or it doesn't (none). Colour carries the transport — teal
 * for a remote link (Tailscale), amber for a direct reach (LAN/AP). We deliberately
 * do NOT bucket raw RTT into bars: on a LAN-vs-tunnel that mostly measures the
 * transport rather than the station, and colour already conveys that — so RTT-as-
 * height would be a misleading double-encode. When live probing lands (P1), a genuine
 * quality signal (probe success + freshness, or real RF link reports for a packet
 * node) can drive partial bars; until then the meter is binary.
 *
 * STUB semantics: a reach with no `lastSeenAt` is treated as unreachable.
 */
export interface NodeStatus {
  reach: NodeReach | null;
  level: number;
  state: MeterState;
  reachable: boolean;
}

const FULL_BARS = 4;

/** The reach we'd actually use: first one seen recently, else the preferred one. */
export function primaryReach(node: NodeRecord): NodeReach | null {
  return node.reaches.find((r) => r.lastSeenAt != null) ?? node.reaches[0] ?? null;
}

export function nodeStatus(node: NodeRecord): NodeStatus {
  const reach = primaryReach(node);
  const reachable = reach?.lastSeenAt != null;
  if (!reach || !reachable) {
    return { reach, level: 0, state: 'down', reachable: false };
  }
  return {
    reach,
    level: FULL_BARS,
    state: reach.kind === 'tailscale' ? 'link' : 'on',
    reachable: true,
  };
}
