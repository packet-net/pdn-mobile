import type { NodeRecord, NodeReach, Reach } from './types';

/**
 * Pure registry reducer — split from RegistryContext so it can be unit-tested without
 * pulling in React or the Capacitor plugins. The provider owns the async load,
 * persistence, and secure-cred side effects; this is just the state transitions.
 */
export interface RegistryState {
  nodes: NodeRecord[];
  ready: boolean; // initial async load complete
}

export type RegistryAction =
  | { type: 'loaded'; nodes: NodeRecord[] }
  | { type: 'add'; node: NodeRecord }
  | { type: 'remove'; id: string }
  | { type: 'patchReach'; id: string; kind: Reach; patch: Partial<NodeReach> };

export const initialRegistryState: RegistryState = { nodes: [], ready: false };

export function registryReducer(state: RegistryState, action: RegistryAction): RegistryState {
  switch (action.type) {
    case 'loaded':
      return { nodes: action.nodes, ready: true };
    case 'add':
      // replace a same-id record (re-add / discovery refresh), else append
      return { ...state, nodes: [...state.nodes.filter((n) => n.id !== action.node.id), action.node] };
    case 'remove':
      return { ...state, nodes: state.nodes.filter((n) => n.id !== action.id) };
    case 'patchReach':
      return {
        ...state,
        nodes: state.nodes.map((n) =>
          n.id !== action.id
            ? n
            : { ...n, reaches: n.reaches.map((r) => (r.kind === action.kind ? { ...r, ...action.patch } : r)) },
        ),
      };
    default:
      return state;
  }
}
