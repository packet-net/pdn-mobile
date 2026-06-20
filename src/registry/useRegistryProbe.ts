import { useEffect, useRef } from 'react';
import { useRegistry } from './RegistryContext';
import { probeNode } from './probe';

/**
 * Background liveness probing for the registry. Probes a node's reaches once it first
 * appears (loaded, added, or re-added with changed reaches), then patches lastSeenAt/rttMs
 * so the roster meter reflects reachability. Never blocks navigation; an unknown (web/dev
 * or transient) result leaves last-known state untouched (see probe.ts / reachPatch).
 *
 * Dedup is keyed on a node-reaches signature (id + each reach's kind|baseUrl), NOT just id:
 * patchReach only mutates lastSeenAt/rttMs, so the signature is stable after a patch — the
 * patchReach → nodes-change → effect-re-run loop is prevented — while a re-add with changed
 * reaches yields a new signature and re-probes. The set is reconciled against live nodes
 * each pass so removed nodes don't leak. (The detail screen probes on demand, bypassing this.)
 */
export function useRegistryProbe(): void {
  const { nodes, ready, patchReach } = useRegistry();
  const probed = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!ready) return;
    const live = new Set<string>();
    for (const node of nodes) {
      const sig = `${node.id}|${node.reaches.map((r) => `${r.kind}:${r.baseUrl ?? ''}`).join(',')}`;
      live.add(sig);
      if (probed.current.has(sig)) continue;
      probed.current.add(sig);
      void probeNode(node, patchReach);
    }
    for (const k of [...probed.current]) if (!live.has(k)) probed.current.delete(k);
  }, [ready, nodes, patchReach]);
}
