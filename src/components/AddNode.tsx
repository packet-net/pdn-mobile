/**
 * AddNode — the "Add node" STUB (plan §2.3 / §7.1, P1).
 *
 * The real flow (P1) offers:
 *   - mDNS / Bonjour discovery (browse `_pdn._tcp` for pdn; `_pico-node._tcp`
 *     later) — native-only, the real reason this app beats a browser bookmark.
 *     iOS triggers the Local Network permission prompt (the worst UX cliff), so a
 *     pre-prompt explainer is required.
 *   - manual add-by-IP/hostname — ALWAYS available so a permission denial isn't a
 *     dead end.
 *   - per-node `credRef` minted into Keychain/Keystore; metadata into the registry.
 *
 * STUB: renders a disabled affordance only — no discovery, no persistence yet.
 */
export function AddNode({ onAdd }: { onAdd?: () => void }) {
  return (
    <button className="add-node" type="button" onClick={onAdd} disabled>
      + Add node
      <span className="muted"> (stub — mDNS discovery + manual add land in P1)</span>
    </button>
  );
}
