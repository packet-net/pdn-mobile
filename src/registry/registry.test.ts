import { describe, it, expect } from 'vitest';
import { registryReducer, initialRegistryState } from './reducer';
import type { RegistryState } from './reducer';
import { nodeFromInput } from './manualAdd';
import type { NodeRecord } from './types';

function mkNode(over: Partial<NodeRecord> = {}): NodeRecord {
  return {
    id: 'n1',
    type: 'pdn',
    displayName: 'N1',
    reaches: [{ kind: 'lan', baseUrl: 'http://n1.local' }],
    credRef: 'cred:n1',
    ...over,
  };
}

const ready = (nodes: NodeRecord[]): RegistryState => ({ nodes, ready: true });

describe('registryReducer', () => {
  it('loaded replaces nodes and marks ready', () => {
    const next = registryReducer(initialRegistryState, { type: 'loaded', nodes: [mkNode()] });
    expect(next.ready).toBe(true);
    expect(next.nodes).toHaveLength(1);
  });

  it('add appends a new node', () => {
    const next = registryReducer(ready([mkNode()]), { type: 'add', node: mkNode({ id: 'n2' }) });
    expect(next.nodes.map((n) => n.id)).toEqual(['n1', 'n2']);
  });

  it('add with an existing id replaces rather than duplicates', () => {
    const next = registryReducer(ready([mkNode()]), {
      type: 'add',
      node: mkNode({ id: 'n1', displayName: 'renamed' }),
    });
    expect(next.nodes).toHaveLength(1);
    expect(next.nodes[0].displayName).toBe('renamed');
  });

  it('remove drops the node by id and leaves others', () => {
    const next = registryReducer(ready([mkNode(), mkNode({ id: 'n2' })]), { type: 'remove', id: 'n1' });
    expect(next.nodes.map((n) => n.id)).toEqual(['n2']);
  });

  it('patchReach updates the matching reach only', () => {
    const node = mkNode({
      reaches: [
        { kind: 'lan', baseUrl: 'http://n1.local' },
        { kind: 'tailscale', baseUrl: 'https://n1.x.ts.net' },
      ],
    });
    const next = registryReducer(ready([node]), {
      type: 'patchReach',
      id: 'n1',
      kind: 'lan',
      patch: { lastSeenAt: 123, rttMs: 5 },
    });
    const reaches = next.nodes[0].reaches;
    expect(reaches[0]).toMatchObject({ kind: 'lan', lastSeenAt: 123, rttMs: 5 });
    expect(reaches[1]).toEqual({ kind: 'tailscale', baseUrl: 'https://n1.x.ts.net' });
  });

  it('patchReach can clear liveness (undefined)', () => {
    const node = mkNode({ reaches: [{ kind: 'lan', baseUrl: 'http://n1.local', lastSeenAt: 999 }] });
    const next = registryReducer(ready([node]), {
      type: 'patchReach',
      id: 'n1',
      kind: 'lan',
      patch: { lastSeenAt: undefined },
    });
    expect(next.nodes[0].reaches[0].lastSeenAt).toBeUndefined();
  });

  it('does not mutate the previous state', () => {
    const prev = ready([mkNode()]);
    const next = registryReducer(prev, { type: 'add', node: mkNode({ id: 'n2' }) });
    expect(prev.nodes).toHaveLength(1);
    expect(next).not.toBe(prev);
  });
});

describe('nodeFromInput', () => {
  it('parses a bare host:port into an origin-keyed http lan node', () => {
    const node = nodeFromInput('pdn.local:8080');
    expect(node).toMatchObject({
      id: 'http://pdn.local:8080',
      type: 'pdn',
      displayName: 'pdn.local',
      reaches: [{ kind: 'lan', baseUrl: 'http://pdn.local:8080' }],
      credRef: 'cred:http://pdn.local:8080',
    });
  });

  it('keeps same-host different-port nodes distinct (no id/credRef collision)', () => {
    const a = nodeFromInput('pdn.local:8080');
    const b = nodeFromInput('pdn.local:9090');
    expect(a?.id).not.toBe(b?.id);
    expect(a?.credRef).not.toBe(b?.credRef);
  });

  it('classifies a .ts.net host as a tailscale reach and preserves https', () => {
    const node = nodeFromInput('https://node.tailnet.ts.net');
    expect(node?.reaches[0]).toEqual({ kind: 'tailscale', baseUrl: 'https://node.tailnet.ts.net' });
  });

  it('drops any path, keeping only the origin', () => {
    expect(nodeFromInput('http://1.2.3.4:8080/panel')?.reaches[0].baseUrl).toBe('http://1.2.3.4:8080');
  });

  it('returns null for empty or unparseable input', () => {
    expect(nodeFromInput('')).toBeNull();
    expect(nodeFromInput('   ')).toBeNull();
    expect(nodeFromInput('http://has spaces')).toBeNull();
  });
});
