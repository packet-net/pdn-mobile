import { Preferences } from '@capacitor/preferences';
import type { NodeRecord } from './types';

/**
 * Registry persistence — node METADATA only (never secrets; those go to creds.ts).
 * @capacitor/preferences is UserDefaults / SharedPreferences on device and
 * localStorage on web-dev. Stored as a versioned envelope { version, nodes } so a
 * future NodeRecord shape change can migrate rather than silently mis-read old data.
 * A corrupt, absent, or unknown-version value reads as an empty registry rather than
 * throwing, and individual malformed records are filtered out.
 */
const KEY = 'pdn.registry';
const VERSION = 1;

interface Envelope {
  version: number;
  nodes: unknown;
}

function isNodeRecord(x: unknown): x is NodeRecord {
  return (
    !!x &&
    typeof x === 'object' &&
    typeof (x as NodeRecord).id === 'string' &&
    typeof (x as NodeRecord).credRef === 'string' &&
    Array.isArray((x as NodeRecord).reaches)
  );
}

function coerce(arr: unknown): NodeRecord[] {
  return Array.isArray(arr) ? arr.filter(isNodeRecord) : [];
}

export async function loadRegistry(): Promise<NodeRecord[]> {
  const { value } = await Preferences.get({ key: KEY });
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) return coerce(parsed); // legacy v0 bare array
    const env = parsed as Envelope;
    if (env && env.version === VERSION) return coerce(env.nodes);
    return []; // unknown / future version — discard rather than mis-read
  } catch {
    return [];
  }
}

export async function saveRegistry(nodes: NodeRecord[]): Promise<void> {
  try {
    await Preferences.set({ key: KEY, value: JSON.stringify({ version: VERSION, nodes }) });
  } catch (e) {
    console.warn('registry persist failed', e);
  }
}
