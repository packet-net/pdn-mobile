import { useEffect, useRef } from 'react';
import { useRegistry } from './RegistryContext';
import { probe, reachPatch } from './probe';

/**
 * Background liveness probing. Probes each (node, reach) once it first appears
 * (loaded, added, or re-added with a changed baseUrl) and patches lastSeenAt/rttMs so
 * the roster meter reflects reachability. Never blocks navigation; an unknown (web/dev
 * or transient) result leaves last-known state untouched.
 *
 * Keyed on id|kind|baseUrl, NOT bare id: patchReach only mutates lastSeenAt/rttMs, so
 * the key is stable after a patch — the patchReach → nodes-change → effect-re-run loop
 * is still prevented — while a re-add with a new baseUrl yields a new key and re-probes.
 * The probed set is reconciled against live reaches each pass, so removed nodes don't
 * leak and a same-id re-add isn't suppressed.
 */
export function useRegistryProbe(): void {
  const { nodes, ready, patchReach } = useRegistry();
  const probed = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!ready) return;
    const live = new Set<string>();
    for (const node of nodes) {
      for (const reach of node.reaches) {
        const key = `${node.id}|${reach.kind}|${reach.baseUrl ?? ''}`;
        live.add(key);
        if (probed.current.has(key)) continue;
        probed.current.add(key);
        void probe(reach, node.type).then((result) => {
          const patch = reachPatch(result);
          if (patch) patchReach(node.id, reach.kind, patch);
        });
      }
    }
    for (const k of [...probed.current]) if (!live.has(k)) probed.current.delete(k);
  }, [ready, nodes, patchReach]);
}
