import { useState } from 'react';
import type { NodeRecord } from '../registry/types';
import { sampleNodes } from '../registry/sampleNodes';
import { AddNode } from '../components/AddNode';
import { NodeWebView } from '../components/NodeWebView';

/**
 * Home — the multi-node registry screen (plan §2.3, Origin A / native shell).
 *
 * P0 skeleton: lists the registry's NodeRecords (type pdn|pico, reach lan|tailscale|
 * ap), an "Add node" stub, and lets you select a node to reveal the child-WebView
 * placeholder. This is the app's own native chrome — the only surface with bridge
 * access. Selecting a node is where reach-resolution (lan → tailscale → ap → ble)
 * will run in P1 before handing the resolved origin to the child WebView.
 */
export function Home() {
  const [nodes] = useState<NodeRecord[]>(sampleNodes);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = nodes.find((n) => n.id === selectedId) ?? null;

  return (
    <div className="home">
      <header className="home-header">
        <h1>pdn</h1>
        <p className="muted">native messaging surfaces, bootstrapped on the node-WebView shell — skeleton (P0)</p>
      </header>

      <section className="node-list" aria-label="Nodes">
        {nodes.map((node) => {
          const reaches = node.reaches.map((r) => r.kind).join(' · ');
          return (
            <button
              key={node.id}
              type="button"
              className={
                'node-row' + (node.id === selectedId ? ' node-row--selected' : '')
              }
              onClick={() => setSelectedId(node.id)}
            >
              <span className={'node-badge node-badge--' + node.type}>{node.type}</span>
              <span className="node-name">{node.displayName}</span>
              <span className="node-reach muted">{reaches}</span>
            </button>
          );
        })}
      </section>

      <AddNode />

      <section className="node-detail">
        {selected ? (
          <NodeWebView node={selected} />
        ) : (
          <p className="muted">Select a node to open its panel (child WebView).</p>
        )}
      </section>
    </div>
  );
}
