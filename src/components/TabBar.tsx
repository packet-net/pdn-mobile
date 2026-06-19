import { IconNodes, IconMessages, IconSettings } from './Icons';

export type Tab = 'nodes' | 'settings';

/**
 * TabBar — the app's primary navigation. Two live tabs in P0 (Nodes, Settings);
 * Messages is shown disabled as a deliberate signpost that native messaging is the
 * product still landing — not a hidden surprise.
 */
export function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="tabbar" aria-label="Primary">
      <button
        type="button"
        className={`tab${tab === 'nodes' ? ' tab--active' : ''}`}
        aria-current={tab === 'nodes' ? 'page' : undefined}
        onClick={() => onChange('nodes')}
      >
        <IconNodes />
        Nodes
      </button>

      <button
        type="button"
        className="tab tab--disabled"
        disabled
        aria-label="Messages — coming soon"
      >
        <IconMessages />
        Messages
      </button>

      <button
        type="button"
        className={`tab${tab === 'settings' ? ' tab--active' : ''}`}
        aria-current={tab === 'settings' ? 'page' : undefined}
        onClick={() => onChange('settings')}
      >
        <IconSettings />
        Settings
      </button>
    </nav>
  );
}
