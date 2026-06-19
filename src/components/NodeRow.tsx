import type { NodeRecord } from '../registry/types';
import { nodeStatus } from '../registry/status';
import { SignalMeter } from './SignalMeter';
import { ReachPill } from './Pill';
import { IconChevron } from './Icons';

/**
 * NodeRow — one monitored station in the roster (the hero list). Reads left→right
 * as an operator scans a band: signal first (the meter), then the station's wire
 * callsign in mono, its plain name, and how it's reached. The whole row is the
 * tap target into that node.
 */
export function NodeRow({
  node,
  live = false,
  onSelect,
}: {
  node: NodeRecord;
  /** carrier-pulse the meter (e.g. the currently-open node). */
  live?: boolean;
  onSelect?: (node: NodeRecord) => void;
}) {
  const status = nodeStatus(node);
  const callsign = node.callsign ?? node.displayName;

  return (
    <button
      type="button"
      className={`node-row${status.reachable ? '' : ' node-row--down'}`}
      onClick={() => onSelect?.(node)}
    >
      <SignalMeter level={status.level} state={status.state} live={live && status.reachable} />

      <span className="node-row__id">
        <span className="node-row__call mono">{callsign}</span>
        <span className="node-row__name">{node.displayName}</span>
      </span>

      <span className="node-row__meta">
        {status.reach ? (
          status.reachable ? (
            <ReachPill kind={status.reach.kind} />
          ) : (
            <span className="pill pill--offline pill--dot">Offline</span>
          )
        ) : null}
        <IconChevron className="node-row__chev" width={18} height={18} />
      </span>
    </button>
  );
}
