import { useState } from 'react';
import type { NodeRecord, NodeReach } from '../registry/types';
import { primaryReach } from '../registry/status';
import { IconKey } from '../components/Icons';

/**
 * Login — the auth gate before a node's panel loads (plan §7). Password is the
 * universal floor (every node, every reach). Passkey is a bonus ONLY on the
 * shared-public declared-domain path (pdn.m0lte.uk; future *.nodes.packet.net),
 * where the app binary can declare an associated domain so AASA/assetlinks resolve.
 * LAN, AP and Tailscale (.ts.net) are password-only — .ts.net is Tailscale's apex,
 * so a per-node AASA can't be served there (plan §2.4 / §4.2). No P0 sample node has
 * a declared-domain reach, so the passkey branch is correctly dormant until one does.
 */

// Domains the app binary declares for passkeys (AASA/assetlinks shipped at build time).
const PASSKEY_DOMAINS = ['pdn.m0lte.uk'];

function passkeyEligible(reach: NodeReach | null): boolean {
  if (!reach?.baseUrl) return false;
  let host: string;
  try {
    host = new URL(reach.baseUrl).hostname;
  } catch {
    return false;
  }
  return PASSKEY_DOMAINS.some((d) => host === d || host.endsWith('.' + d));
}

export function Login({
  node,
  onCancel,
  onAuthed,
}: {
  node: NodeRecord;
  onCancel: () => void;
  onAuthed: () => void;
}) {
  const [password, setPassword] = useState('');
  const reach = primaryReach(node);
  const showPasskey = passkeyEligible(reach);
  const callsign = node.callsign ?? node.displayName;

  return (
    <div className="screen">
      <header className="screen__head">
        <p className="eyebrow">Sign in</p>
        <h1 className="screen__title">{node.displayName}</h1>
        <p className="screen__sub mono">{callsign}</p>
      </header>

      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault();
          onAuthed();
        }}
      >
        <label className="field">
          <span className="field__label">Password</span>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            placeholder="Node password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <button type="submit" className="btn btn--primary btn--block" disabled={!password}>
          Sign in
        </button>

        {showPasskey && (
          <>
            <p className="or"><span>or</span></p>
            <button type="button" className="btn btn--secondary btn--block">
              <IconKey width={18} height={18} />
              Use a passkey
            </button>
          </>
        )}
      </form>

      <button type="button" className="btn btn--ghost btn--block" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}
