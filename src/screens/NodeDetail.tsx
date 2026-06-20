import { useState } from 'react';
import type { NodeRecord } from '../registry/types';
import { useRegistry } from '../registry/RegistryContext';
import { probeNode } from '../registry/probe';
import { nodeStatus } from '../registry/status';
import { SignalMeter } from '../components/SignalMeter';
import { ReachPill } from '../components/Pill';

/**
 * NodeDetail — the per-node management hub (the roster row drills in here). Shows the
 * node's identity + signal, lists its reaches with live latency, and offers the actions:
 * open the panel (→ login → webview), re-check reachability on demand, and forget the node.
 */
export function NodeDetail({
  node,
  onOpen,
  onForget,
}: {
  node: NodeRecord;
  onOpen: () => void;
  onForget: () => void;
}) {
  const { patchReach } = useRegistry();
  const [checking, setChecking] = useState(false);
  const status = nodeStatus(node);
  const callsign = node.callsign ?? node.displayName;

  async function refresh() {
    setChecking(true);
    try {
      await probeNode(node, patchReach);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="screen">
      <header className="detail-head">
        <SignalMeter level={status.level} state={status.state} bars={4} />
        <span className="detail-head__id">
          <span className="detail-head__call mono">{callsign}</span>
          <span className="detail-head__name">{node.displayName}</span>
        </span>
      </header>

      <p className="section-label">Reaches</p>
      <div className="card">
        {node.reaches.map((r) => {
          const reachable = r.lastSeenAt != null;
          return (
            <div className="reach-row" key={`${r.kind}:${r.baseUrl ?? r.apSsid ?? ''}`}>
              <ReachPill kind={r.kind} dot={false} />
              <span className="reach-row__url mono">{r.baseUrl ?? r.apSsid ?? '—'}</span>
              <span className={`reach-row__rtt mono${reachable ? '' : ' is-down'}`}>
                {reachable ? (r.rttMs != null ? `${r.rttMs} ms` : 'ok') : 'unreachable'}
              </span>
            </div>
          );
        })}
      </div>

      <div className="detail-actions">
        <button type="button" className="btn btn--secondary btn--block" onClick={refresh} disabled={checking}>
          {checking ? 'Checking…' : 'Check reachability'}
        </button>
        <button type="button" className="btn btn--primary btn--block" onClick={onOpen}>
          Open panel
        </button>
        <button type="button" className="btn btn--danger btn--block" onClick={onForget}>
          Forget this node
        </button>
      </div>
    </div>
  );
}
