import type { NodeRecord, Reach } from './types';

/**
 * Build a NodeRecord from a manually-typed host/URL. Infers the reach kind from the
 * host (.ts.net → tailscale, otherwise lan) and defaults to a pdn node; the operator
 * can refine type/name later, and a probe (or a later /healthz identity check) can
 * confirm it. Returns null if the input can't be parsed as a host/URL. The id and
 * credRef are the full ORIGIN (scheme+host+port), so two nodes on one host but
 * different ports/schemes stay distinct (and don't share a Keychain entry), while
 * re-adding the exact same endpoint updates the record rather than duplicating it.
 */
export function nodeFromInput(input: string): NodeRecord | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  const host = url.hostname;
  if (!host) return null;
  const key = url.origin; // scheme+host+port — uniquely identifies the endpoint
  const kind: Reach = host.endsWith('.ts.net') ? 'tailscale' : 'lan';
  return {
    id: key,
    type: 'pdn',
    displayName: host, // bare hostname for readable UI
    reaches: [{ kind, baseUrl: url.origin }],
    credRef: `cred:${key}`,
  };
}
