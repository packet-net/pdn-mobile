import { useEffect, useState } from 'react';
import type { NodeRecord } from '../registry/types';
import { primaryReach } from '../registry/status';

/**
 * NodeWebView — the child-WebView host ("Origin B", plan §2.1 / §2.2). The pdn
 * panel / app UIs load here from the LIVE NODE'S OWN ORIGIN (same-origin to the
 * node: pdn has no CORS, and panel+apps+API+cookies must share an origin for auth
 * coherence). That WebView WILL get NO Capacitor bridge access — a spoofed node
 * origin must never reach BLE / Keychain / push; the bridge lives only in Origin A.
 *
 * This component owns the *chrome* around that webview — the origin strip and the
 * connecting / linked / error states. The body itself is the node's own content
 * (a sandboxed native WebView on device; a placeholder here on web, where no such
 * webview exists). NOTE: the isolation above is the contract P0/P1 must build — this
 * stub renders no webview and enforces none of it. The phase below is a SIMULATED
 * connect cycle to exercise the loading + error chrome; P0/P1 wires it to real load
 * events. Reachability mirrors the roster (a reach with no lastSeenAt → error).
 */
type Phase = 'connecting' | 'linked' | 'error';

export function NodeWebView({ node }: { node: NodeRecord }) {
  const reach = primaryReach(node);
  const target = reach?.baseUrl ?? null;
  const reachable = reach?.lastSeenAt != null;
  const linkLabel = reach?.kind === 'tailscale' ? 'Linked remotely' : 'Linked';

  const [phase, setPhase] = useState<Phase>(reachable ? 'connecting' : 'error');
  const [attempt, setAttempt] = useState(0);

  // Simulated connect — re-runs on retry via the attempt counter (so "Try again"
  // actually re-attempts instead of spinning forever). Real load events land in P1.
  useEffect(() => {
    if (!reachable) {
      setPhase('error');
      return;
    }
    setPhase('connecting');
    const t = setTimeout(() => setPhase('linked'), 700);
    return () => clearTimeout(t);
  }, [reachable, attempt]);

  return (
    <div className="wv">
      <div className="wv__bar">
        <span className={`wv__dot wv__dot--${phase}`} aria-hidden="true" />
        <span className="wv__origin mono">{target ?? 'no reachable address'}</span>
        <span className="wv__status" role="status" aria-live="polite">
          {phase === 'connecting' ? 'Connecting' : phase === 'linked' ? linkLabel : 'Offline'}
        </span>
      </div>

      <div className="wv__body">
        {phase === 'connecting' && (
          <div className="state" role="status" aria-live="polite">
            <span className="spinner" />
            <p>Reaching {node.displayName}…</p>
          </div>
        )}

        {phase === 'error' && (
          <div className="state state--error" role="alert">
            <p className="state__title">Can't reach this node</p>
            <p>No address responded. Check it's powered on and on your network.</p>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => setAttempt((n) => n + 1)}
            >
              Try again
            </button>
          </div>
        )}

        {phase === 'linked' && (
          <div className="wv__placeholder">
            <p className="muted">
              The node's own panel loads here, served from{' '}
              <code className="mono">{target}</code> — same-origin, sandboxed, no bridge access.
            </p>
            <p className="note muted">
              Simulated connect — the native WebView host renders on device; P1 wires real
              load events.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
