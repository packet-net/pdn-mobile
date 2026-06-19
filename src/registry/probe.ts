import { Capacitor, CapacitorHttp } from '@capacitor/core';
import type { NodeReach, NodeType } from './types';

/**
 * Liveness + RTT probe for a single reach. Uses CapacitorHttp (NATIVE http) — never
 * window.fetch — so the app's https://localhost origin can reach an http LAN/AP node
 * without WebView CORS or mixed-content blocking. (iOS still needs the ATS
 * NSAllowsLocalNetworking opt-out and Android the scoped cleartext config, injected at
 * build time — see docs/plan.md §12.)
 *
 * Targets: pdn → GET /healthz (unauthenticated, always mapped, confirms a pdn node);
 * pico → GET / (portal root; any status < 500 counts as reachable). The tailscale
 * timeout is generous to absorb a cold tunnel / MagicDNS wake.
 *
 * On WEB (vite dev) there is no native layer, so CORS + mixed-content apply and we
 * return `reachable: undefined` ("unknown") — NEVER `false`, so a dev environment can
 * never make a node look offline. Callers leave last-known state untouched on unknown.
 */
export interface ProbeResult {
  /** true = reachable, false = definitively down, undefined = unknown (web/dev). */
  reachable: boolean | undefined;
  rttMs?: number;
}

function deadline(ms: number): Promise<never> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('probe-timeout')), ms));
}

export async function probe(reach: NodeReach, nodeType: NodeType): Promise<ProbeResult> {
  if (!reach.baseUrl) return { reachable: false };
  // Web/dev cannot do the cross-origin/cleartext probe — report unknown, not down.
  if (!Capacitor.isNativePlatform()) return { reachable: undefined };

  const base = reach.baseUrl.replace(/\/$/, '');
  const url = nodeType === 'pdn' ? `${base}/healthz` : base;
  const timeoutMs = reach.kind === 'tailscale' ? 6000 : 2500;
  const t0 = performance.now();
  try {
    const res = await Promise.race([
      CapacitorHttp.get({ url, connectTimeout: timeoutMs, readTimeout: timeoutMs, responseType: 'text' }),
      deadline(timeoutMs + 500), // belt-and-braces: CapacitorHttp has no AbortController
    ]);
    const rttMs = Math.round(performance.now() - t0);
    const status = res.status; // res is HttpResponse (deadline resolves to never)
    const ok = nodeType === 'pdn' ? status >= 200 && status < 300 : status < 500;
    return ok ? { reachable: true, rttMs } : { reachable: false };
  } catch {
    // Timeout / connection error — degrade to UNKNOWN, not down: with one-shot probing
    // a transient mount-time flap must not strip a node to "no signal". (Genuine
    // offline detection wants periodic probing + a consecutive-failure threshold, a
    // later refinement; only a real HTTP response that fails the ok check is "down".)
    return { reachable: undefined };
  }
}

/** Map a probe result to a reach patch; null means "leave as-is" (unknown). */
export function reachPatch(result: ProbeResult): Partial<NodeReach> | null {
  if (result.reachable === undefined) return null;
  if (result.reachable) return { lastSeenAt: Date.now(), rttMs: result.rttMs };
  return { lastSeenAt: undefined, rttMs: undefined };
}
