import { SecureStorage } from '@aparajita/capacitor-secure-storage';

/**
 * Per-node secrets in the iOS Keychain / Android Keystore (with a plaintext
 * localStorage fallback on web-dev), keyed by NodeRecord.credRef. These must NEVER
 * live in the plain registry (storage.ts). iOS Keychain survives app uninstall, so
 * removeNode MUST clear the node's creds (see RegistryContext.removeNode).
 *
 * The plugin serializes/parses objects itself, so we store/read NodeCreds directly.
 * Reads and clears are resilient (a Keychain/availability error returns null / no-op);
 * setCreds deliberately rejects so a caller knows a credential failed to persist.
 */
export interface NodeCreds {
  /** opaque refresh token from the node's /auth/login — the real session (P0: Slice 3). */
  refreshToken?: string;
  /** soft-AP join passphrase (pico provisioning), if the operator saved it. */
  apPassphrase?: string;
}

export async function getCreds(credRef: string): Promise<NodeCreds | null> {
  try {
    const v = await SecureStorage.get(credRef);
    return v && typeof v === 'object' ? (v as NodeCreds) : null;
  } catch {
    return null;
  }
}

export async function setCreds(credRef: string, creds: NodeCreds): Promise<void> {
  await SecureStorage.set(credRef, creds as Record<string, unknown>);
}

export async function clearCreds(credRef: string): Promise<void> {
  try {
    await SecureStorage.remove(credRef);
  } catch {
    /* already absent / keychain unavailable — nothing to clear */
  }
}
