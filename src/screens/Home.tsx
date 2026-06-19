import type { NodeRecord } from '../registry/types';
import { nodeStatus } from '../registry/status';
import { NodeRow } from '../components/NodeRow';
import { IconNodes } from '../components/Icons';

/**
 * Home — the node roster. THE HERO of the app: an operator's monitored stations
 * read as a band of signals, strongest health first is not imposed (registry order
 * is the operator's own), but each row leads with its meter. This is Origin A (the
 * native shell); selecting a node is where reach-resolution runs before handing the
 * resolved origin to the child WebView.
 */
export function Home({
  nodes,
  activeId,
  onSelect,
  onAdd,
}: {
  nodes: NodeRecord[];
  activeId?: string | null;
  onSelect: (node: NodeRecord) => void;
  onAdd: () => void;
}) {
  if (nodes.length === 0) {
    return (
      <div className="state">
        <span className="state__glyph">
          <IconNodes width={40} height={40} />
        </span>
        <p className="state__title">No nodes yet</p>
        <p>Add a pdn or pico node to monitor and manage it from here.</p>
        <button type="button" className="btn btn--primary" onClick={onAdd}>
          Add your first node
        </button>
      </div>
    );
  }

  const online = nodes.filter((n) => nodeStatus(n).reachable).length;
  const offline = nodes.length - online;

  return (
    <div className="screen">
      <header className="screen__head">
        <p className="eyebrow">Nodes</p>
        <p className="roster-status">
          <span className="roster-status__n up">{online}</span>
          <span className="roster-status__l">online</span>
          {offline > 0 && (
            <>
              <span className="roster-status__n down">{offline}</span>
              <span className="roster-status__l">offline</span>
            </>
          )}
        </p>
      </header>

      <div className="roster" role="list" aria-label="Nodes">
        {nodes.map((node) => (
          <div role="listitem" key={node.id}>
            <NodeRow node={node} live={node.id === activeId} onSelect={onSelect} />
          </div>
        ))}
      </div>
    </div>
  );
}
