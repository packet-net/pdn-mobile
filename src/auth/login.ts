import { Capacitor, CapacitorHttp } from '@capacitor/core';
import type { NodeReach } from '../registry/types';
import { getCreds, setCreds, clearCreds } from '../registry/creds';

/**
 * Password auth against a pdn node (contract verified against the live node + source,
 * `PdnAuthApi.cs`):
 *   POST {origin}/api/v1/auth/login   {username,password}
 *     → 200 {token, expiresAt, scopes, refreshToken, username}  (+ HttpOnly gateway cookie)
 *     → 401 wrong creds (also malformed/empty body) / 429 throttled-lockout / 503 unavailable
 *   POST {origin}/api/v1/auth/refresh {refreshToken}
 *     → 200 {…, refreshToken} (ROTATED; a 200 always carries a successor) / 401 dead/reused
 *
 * Uses CapacitorHttp (NATIVE) — pdn serves NO CORS (confirmed), so a WebView fetch
 * would be blocked; the native request also drops the gateway cookie into the shared
 * cookie jar, which (with CapacitorCookies enabled) pre-authenticates the child WebView's
 * requests to the proxied app UIs (the cookie is Path=/apps). The panel shell itself
 * authenticates via its own bearer-token fetch — wiring that token into the WebView is a
 * later piece. The refresh token is the real session and is held in the Keychain
 * (creds.ts); the native shell owns it because the child WebView gets no bridge.
 *
 * On WEB (vite dev) CapacitorHttp falls back to a CORS-blocked fetch, so login() returns
 * a mock session — enough to exercise the UI flow; real auth runs on device.
 */
export interface Session {
  token: string;
  expiresAt: string;
  scopes: string;
  username: string;
}

export type AuthErrorKind = 'credentials' | 'throttled' | 'unreachable' | 'unavailable';

export class AuthError extends Error {
  constructor(
    readonly kind: AuthErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

interface LoginResponse {
  token: string;
  expiresAt: string;
  scopes: string;
  refreshToken?: string | null;
  username: string;
}

const LOGIN_PATH = '/api/v1/auth/login';
const REFRESH_PATH = '/api/v1/auth/refresh';

function origin(reach: NodeReach): string {
  return (reach.baseUrl ?? '').replace(/\/$/, '');
}

function toSession(body: LoginResponse): Session {
  return { token: body.token, expiresAt: body.expiresAt, scopes: body.scopes, username: body.username };
}

export async function login(
  reach: NodeReach,
  credRef: string,
  username: string,
  password: string,
): Promise<Session> {
  if (!Capacitor.isNativePlatform()) {
    await setCreds(credRef, { ...(await getCreds(credRef)), refreshToken: 'dev-mock-refresh' });
    return { token: 'dev-mock', expiresAt: '', scopes: 'admin', username: username || 'dev' };
  }

  let res;
  try {
    res = await CapacitorHttp.post({
      url: `${origin(reach)}${LOGIN_PATH}`,
      headers: { 'Content-Type': 'application/json' },
      data: { username, password },
    });
  } catch {
    throw new AuthError('unreachable', "Couldn't reach this node.");
  }
  // 429 = lockout (sliding window, per username AND source IP), checked BEFORE the
  // password verify — so a correct password while locked still 429s. Must read as
  // "back off", never "wrong password", or the user keeps re-arming the lockout.
  if (res.status === 429) {
    throw new AuthError('throttled', 'Too many attempts — wait a bit, then try again.');
  }
  // 401 = wrong creds (also a malformed/empty body — callers must validate non-empty
  // username+password first, as Login.tsx does).
  if (res.status === 401) {
    throw new AuthError('credentials', 'Wrong username or password.');
  }
  if (res.status < 200 || res.status >= 300) {
    throw new AuthError('unavailable', 'The node is unavailable right now.');
  }

  const body = res.data as LoginResponse;
  if (body.refreshToken) {
    try {
      await setCreds(credRef, { ...(await getCreds(credRef)), refreshToken: body.refreshToken });
    } catch {
      // Keychain write failed: the access token + gateway cookie are valid this session;
      // only next-launch silent refresh is lost. Don't fail an already-successful login.
    }
  }
  return toSession(body);
}

/**
 * Mint a fresh access token + gateway cookie from the stored refresh token (rotating
 * it). Returns null when there's nothing valid to refresh — caller falls back to
 * password login. Best-effort: never throws.
 */
export async function refreshSession(reach: NodeReach, credRef: string): Promise<Session | null> {
  if (!Capacitor.isNativePlatform()) return null; // no native cookie bridge on web
  const creds = await getCreds(credRef);
  if (!creds?.refreshToken) return null;

  let res;
  try {
    res = await CapacitorHttp.post({
      url: `${origin(reach)}${REFRESH_PATH}`,
      headers: { 'Content-Type': 'application/json' },
      data: { refreshToken: creds.refreshToken },
    });
  } catch {
    return null;
  }
  if (res.status !== 200) {
    if (res.status === 401) await clearCreds(credRef); // dead/reused token — force re-login
    return null;
  }

  const body = res.data as LoginResponse;
  // A 200 from /auth/refresh has already consumed (revoked) the presented token server-
  // side and ALWAYS carries a rotated successor. If one is somehow absent, the stored
  // token is now the revoked one — never replay it; drop creds and force re-login.
  if (!body.refreshToken) {
    await clearCreds(credRef);
    return null;
  }
  try {
    await setCreds(credRef, { ...(await getCreds(credRef)), refreshToken: body.refreshToken });
  } catch {
    /* persist of the rotated token failed — next silent refresh will re-login */
  }
  return toSession(body);
}
