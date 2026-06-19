import { useEffect, useState } from 'react';
import type { NodeRecord } from './registry/types';
import { useRegistry } from './registry/RegistryContext';
import { useRegistryProbe } from './registry/useRegistryProbe';
import { applyTheme, loadTheme, saveTheme, type ThemePref } from './theme';
import { Home } from './screens/Home';
import { AddNode } from './screens/AddNode';
import { Login } from './screens/Login';
import { Settings } from './screens/Settings';
import { NodeWebView } from './components/NodeWebView';
import { TabBar, type Tab } from './components/TabBar';
import { IconBack, IconPlus } from './components/Icons';

/**
 * App root (Origin A — the native-privileged React shell). Holds a small hand-rolled
 * nav stack (no router dependency at P0): a tab plus, within Nodes, a roster →
 * add / login / webview drill-down. Routes carry a node ID (not a node object) so they
 * survive the async registry load and re-resolve against the live registry. The
 * webview is the only surface that loads a node's own origin, and it gets no bridge
 * access (see NodeWebView).
 */
type NodesRoute =
  | { name: 'roster' }
  | { name: 'add' }
  | { name: 'login'; id: string }
  | { name: 'webview'; id: string };

/**
 * Optional deep-link seed from the URL hash (e.g. #settings, #add, #login:<id>,
 * #webview:<id>), read ONCE at startup to seed nav state. The hash is NOT kept in
 * sync afterwards (in-app nav doesn't write it back; later hashchanges are ignored).
 * A dev/preview convenience — note #webview:<id> reaches the node-origin WebView
 * without passing the (currently stub) Login gate, so gate or remove this once Login
 * actually authenticates. Absent or unknown → the roster.
 */
function initialRoute(): { tab: Tab; route: NodesRoute } {
  const hash = window.location.hash.replace(/^#/, '');
  if (hash === 'settings') return { tab: 'settings', route: { name: 'roster' } };
  if (hash === 'add') return { tab: 'nodes', route: { name: 'add' } };
  const [name, id] = hash.split(':');
  if (id && (name === 'login' || name === 'webview')) {
    return { tab: 'nodes', route: { name, id } };
  }
  return { tab: 'nodes', route: { name: 'roster' } };
}

export default function App() {
  const { nodes, ready, addNode } = useRegistry();
  useRegistryProbe();

  const [seed] = useState(initialRoute);
  const [tab, setTab] = useState<Tab>(seed.tab);
  const [route, setRoute] = useState<NodesRoute>(seed.route);
  const [theme, setTheme] = useState<ThemePref>(loadTheme);

  useEffect(() => {
    applyTheme(theme);
    saveTheme(theme);
  }, [theme]);

  // The node a login/webview route points at, re-resolved against the live registry.
  const selected =
    route.name === 'login' || route.name === 'webview'
      ? (nodes.find((n) => n.id === route.id) ?? null)
      : null;

  // Auto-correct a route whose node is gone (removed, or a stale deep-link) once loaded.
  // Derived boolean so the effect doesn't churn on `selected`'s per-render identity.
  const selectedMissing = (route.name === 'login' || route.name === 'webview') && !selected;
  useEffect(() => {
    if (ready && selectedMissing) setRoute({ name: 'roster' });
  }, [ready, selectedMissing]);

  const atRoot = tab === 'settings' || route.name === 'roster';
  const back = () => setRoute({ name: 'roster' });

  // Drives NodeRow `live` (the carrier pulse on the peak meter bar). Dormant in P0:
  // non-null only on the webview route, where the roster is unmounted — the pulse
  // first becomes visible once live reach-probing / messaging surfaces drive `live`
  // from an on-screen row.
  const activeNodeId = route.name === 'webview' ? route.id : null;

  const title =
    tab === 'settings'
      ? 'Settings'
      : route.name === 'webview' && selected
        ? (selected.callsign ?? selected.displayName)
        : 'pdn';

  return (
    <div className="app">
      <nav className="navbar">
        {!atRoot && (
          <button type="button" className="navbar__action navbar__action--left" onClick={back}>
            <IconBack width={22} height={22} />
            Nodes
          </button>
        )}

        <span className="navbar__title">
          {title === 'pdn' ? (
            <span className="wordmark"><b>pdn</b></span>
          ) : route.name === 'webview' ? (
            <span className="mono">{title}</span>
          ) : (
            title
          )}
        </span>

        {tab === 'nodes' && route.name === 'roster' && ready && nodes.length > 0 && (
          <button
            type="button"
            className="navbar__action navbar__action--right"
            onClick={() => setRoute({ name: 'add' })}
            aria-label="Add node"
          >
            <IconPlus width={22} height={22} />
          </button>
        )}
      </nav>

      <main className="app__body">
        {!ready ? (
          <div className="state" role="status" aria-live="polite">
            <span className="spinner" />
            <p>Loading your nodes…</p>
          </div>
        ) : tab === 'settings' ? (
          <Settings theme={theme} onTheme={setTheme} />
        ) : route.name === 'add' ? (
          <AddNode
            onCancel={() => setRoute({ name: 'roster' })}
            onAdd={(node) => {
              addNode(node);
              setRoute({ name: 'roster' });
            }}
          />
        ) : route.name === 'login' && selected ? (
          <Login
            node={selected}
            onCancel={() => setRoute({ name: 'roster' })}
            onAuthed={() => setRoute({ name: 'webview', id: selected.id })}
          />
        ) : route.name === 'webview' && selected ? (
          <NodeWebView node={selected} />
        ) : (
          <Home
            nodes={nodes}
            activeId={activeNodeId}
            onSelect={(node: NodeRecord) => setRoute({ name: 'login', id: node.id })}
            onAdd={() => setRoute({ name: 'add' })}
          />
        )}
      </main>

      <TabBar
        tab={tab}
        onChange={(t) => {
          setTab(t);
          // Re-tapping Nodes returns to the roster from any drill-down (add/login/webview).
          if (t === 'nodes' && route.name !== 'roster') setRoute({ name: 'roster' });
        }}
      />
    </div>
  );
}
