import { useState } from 'react';
import { IconScan } from '../components/Icons';

/**
 * AddNode — the add flow (plan §2.3 / §7.1). Two paths, both first-class:
 *   - LAN discovery (mDNS): the real reason this beats a browser bookmark. iOS
 *     gates it behind the Local Network prompt, so it's an explicit action with an
 *     explainer — disabled in P0 (discovery lands in P1).
 *   - manual add by address: ALWAYS available, so a permission denial is never a
 *     dead end. The floor that always works.
 */
export function AddNode({ onCancel }: { onCancel: () => void }) {
  const [address, setAddress] = useState('');
  const canAdd = address.trim().length > 0;

  return (
    <div className="screen">
      <header className="screen__head">
        <p className="eyebrow">Registry</p>
        <h1 className="screen__title">Add a node</h1>
      </header>

      <button type="button" className="discover" disabled>
        <span className="discover__icon">
          <IconScan width={22} height={22} />
        </span>
        <span className="discover__text">
          <span className="discover__title">Scan the local network</span>
          <span className="discover__sub">
            Finds pdn and pico nodes on your Wi-Fi. Lands in a later build.
          </span>
        </span>
      </button>

      <p className="section-label">Add by address</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          /* P1: resolve, probe, mint credRef, persist. */
        }}
      >
        <label className="field">
          <span className="field__label">Host or URL</span>
          <input
            className="input input--mono"
            type="url"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="pdn.local:8080"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </label>

        <button type="submit" className="btn btn--primary btn--block" disabled={!canAdd}>
          Add node
        </button>
        <button type="button" className="btn btn--ghost btn--block" onClick={onCancel}>
          Cancel
        </button>
      </form>
    </div>
  );
}
