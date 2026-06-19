import { createContext, useContext, useEffect, useReducer, useRef } from 'react';
import type { ReactNode } from 'react';
import type { NodeRecord, NodeReach, Reach } from './types';
import { registryReducer, initialRegistryState } from './reducer';
import { loadRegistry, saveRegistry } from './storage';
import { clearCreds } from './creds';
import { sampleNodes } from './sampleNodes';

/**
 * The multi-node registry — the single source of truth for the app's nodes, loaded
 * once from persistent storage and mutated through a reducer (so persistence and
 * probe-updates flow through one place). Metadata persists via storage.ts; secrets
 * live in creds.ts (Keychain). State transitions are the pure reducer in reducer.ts
 * (unit-tested). Consume via useRegistry().
 */

export interface RegistryApi {
  nodes: NodeRecord[];
  ready: boolean;
  addNode: (node: NodeRecord) => void;
  removeNode: (id: string) => void;
  /** update one reach of one node (e.g. liveness probe results). */
  patchReach: (id: string, kind: Reach, patch: Partial<NodeReach>) => void;
}

const RegistryCtx = createContext<RegistryApi | null>(null);

export function RegistryProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(registryReducer, initialRegistryState);
  const loadedRef = useRef(false);
  const seededRef = useRef(false);

  // Load once (StrictMode double-invoke guard). DEV seeds the placeholder roster when
  // storage is empty so dev/preview has content; a real production first-run stays empty.
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    void (async () => {
      let nodes = await loadRegistry();
      if (nodes.length === 0 && import.meta.env.DEV) {
        nodes = sampleNodes;
        seededRef.current = true; // in-memory only — don't persist the seed (below)
      }
      dispatch({ type: 'loaded', nodes });
    })();
  }, []);

  // Persist on change — but not the pre-load initial render (would clobber storage with
  // []), nor the one-time DEV seed (which must stay in-memory so storage stays empty).
  useEffect(() => {
    if (!state.ready) return;
    if (seededRef.current) {
      seededRef.current = false;
      return;
    }
    void saveRegistry(state.nodes);
  }, [state.nodes, state.ready]);

  const api: RegistryApi = {
    nodes: state.nodes,
    ready: state.ready,
    addNode: (node) => dispatch({ type: 'add', node }),
    removeNode: (id) => {
      const node = state.nodes.find((n) => n.id === id);
      if (node) void clearCreds(node.credRef); // Keychain survives uninstall — clear explicitly
      dispatch({ type: 'remove', id });
    },
    patchReach: (id, kind, patch) => dispatch({ type: 'patchReach', id, kind, patch }),
  };

  return <RegistryCtx.Provider value={api}>{children}</RegistryCtx.Provider>;
}

export function useRegistry(): RegistryApi {
  const ctx = useContext(RegistryCtx);
  if (!ctx) throw new Error('useRegistry must be used within RegistryProvider');
  return ctx;
}
