import type { Reach } from '../registry/types';

/**
 * ReachPill — compact chip for how a node is reached (LAN / Tailscale / AP / BLE).
 * Colour tracks the signal meter: direct (LAN/AP) = amber, remote link = teal.
 * See index.css `.pill--*`.
 */
const REACH_LABEL: Record<Reach, string> = {
  lan: 'LAN',
  tailscale: 'Tailscale',
  ap: 'AP',
  ble: 'BLE',
};

export function ReachPill({ kind, dot = true }: { kind: Reach; dot?: boolean }) {
  return (
    <span className={`pill pill--${kind}${dot ? ' pill--dot' : ''}`}>
      {REACH_LABEL[kind]}
    </span>
  );
}
