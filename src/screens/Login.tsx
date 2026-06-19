import { useState } from 'react';
import type { NodeRecord } from '../registry/types';
import { primaryReach } from '../registry/status';
import { login, AuthError } from '../auth/login';

/**
 * Login — the auth gate before a node's panel loads (plan §7). Password is the
 * universal floor on every reach (LAN http, .ts.net, public). On submit the native
 * shell POSTs to the node's /api/v1/auth/login, stores the refresh token in the
 * Keychain, and (with CapacitorCookies) leaves the gateway cookie ready for the panel.
 *
 * Passkeys are DEFERRED (no concrete HTTPS node to test against yet). When revisited,
 * the gate is valid-HTTPS + a registrable host, but the WebAuthn ceremony likely runs
 * in a system browser sheet (ASWebAuthenticationSession), not the node-origin child
 * WebView — WKWebView gates WebAuthn on the app's own entitlement. See docs/plan.md §0.1.
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
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reach = primaryReach(node);
  const callsign = node.callsign ?? node.displayName;
  // An ap/ble reach (or a node not yet probed) may have no HTTP origin — password auth
  // needs one, so gate on baseUrl rather than mere reach existence.
  const noHttp = !!reach && !reach.baseUrl;
  const canSubmit = !!reach?.baseUrl && username.trim().length > 0 && password.length > 0 && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reach) return;
    setBusy(true);
    setError(null);
    try {
      await login(reach, node.credRef, username.trim(), password);
      onAuthed();
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Sign-in failed.');
      setBusy(false);
    }
  }

  return (
    <div className="screen">
      <header className="screen__head">
        <p className="eyebrow">Sign in</p>
        <h1 className="screen__title">{node.displayName}</h1>
        <p className="screen__sub mono">{callsign}</p>
      </header>

      <form className="card" onSubmit={submit}>
        <label className="field">
          <span className="field__label">Username</span>
          <input
            className="input"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Sysop username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>

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

        {noHttp && (
          <p className="form-error" role="alert">
            This connection ({reach?.kind}) can't do password sign-in.
          </p>
        )}
        {error && <p className="form-error" role="alert">{error}</p>}

        <button type="submit" className="btn btn--primary btn--block" disabled={!canSubmit}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <button type="button" className="btn btn--ghost btn--block" onClick={onCancel} disabled={busy}>
        Cancel
      </button>
    </div>
  );
}
