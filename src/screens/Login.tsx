import { useState } from 'react';
import type { NodeRecord } from '../registry/types';

/**
 * Login — the auth gate before a node's panel loads (plan §7). Password is the
 * universal floor on every reach (LAN http, .ts.net, public).
 *
 * Passkeys are DEFERRED (no concrete HTTPS node to test against yet). When revisited,
 * the open question is the ceremony mechanism: WKWebView hard-gates WebAuthn on the
 * embedding app's associated-domains entitlement, so passkeys can't run in the
 * node-origin child WebView for arbitrary nodes — the likely path is a system browser
 * sheet (ASWebAuthenticationSession) that validates the node's own WebAuthn with no
 * per-node app config. See docs/plan.md §4.2.
 */
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
      </form>

      <button type="button" className="btn btn--ghost btn--block" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}
