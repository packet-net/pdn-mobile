import type { NodeRecord } from '../registry/types';

/**
 * NodeWebView — the child-WebView component STUB ("Origin B", plan §2.1 / §2.2).
 *
 * This is the place the pdn React control panel loads from the LIVE NODE'S OWN
 * ORIGIN (e.g. https://pdn.m0lte.uk, the node's .ts.net name, or LAN
 * http://<node>:8080). Loading it same-origin to the node is load-bearing:
 *
 *   - pdn has NO CORS anywhere (verified in the plan) — a cross-origin load would
 *     break REST + SSE + the /apps/* cookie simultaneously.
 *   - the panel + apps + API + cookies must all be same-origin for auth coherence.
 *   - this WebView gets NO Capacitor bridge access (a spoofed/compromised node
 *     origin must never reach BLE/Keychain/push). The bridge lives in Origin A.
 *
 * In v1 this also hosts the pico-node captive-portal config form (WebView reuse,
 * zero firmware change), and the pdn apps (BBS / BPQ Chat / Convers) via the
 * /apps/{id}/ gateway.
 *
 * STUB: on web (vite dev/build) there is no native child-WebView, so we render a
 * placeholder describing what loads here. The real implementation (P0/P1) embeds a
 * sandboxed native WebView (e.g. an <iframe> on web for dev, a Capacitor child
 * WebView / WKWebView on device) pointed at the resolved reach baseUrl, with the
 * cookie-crossing + SSE-lifecycle + process-termination spikes from plan §5/§6.2.
 */
export function NodeWebView({ node }: { node: NodeRecord }) {
  const target = node.reaches[0]?.baseUrl ?? '(no reach configured)';
  return (
    <div className="webview-stub">
      <h2>{node.displayName}</h2>
      <p className="muted">
        Child WebView placeholder (Origin B). The node's own panel / app UIs load
        here from the node's origin — no Capacitor bridge access.
      </p>
      <dl className="kv">
        <dt>type</dt>
        <dd>{node.type}</dd>
        <dt>would load</dt>
        <dd><code>{target}</code></dd>
        <dt>capabilities</dt>
        <dd>{node.capabilities?.join(', ') ?? '—'}</dd>
      </dl>
      <p className="note">
        STUB — native WebView not wired yet (P0/P1). See
        ../packet.net/docs/mobile-app-plan.md §2.1.
      </p>
    </div>
  );
}
