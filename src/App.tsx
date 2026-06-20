import { useEffect, useState } from 'react';
import type { NodeRecord } from './registry/types';
import { useRegistry } from './registry/RegistryContext';
import { useRegistryProbe } from './registry/useRegistryProbe';
import { applyTheme, loadTheme, saveTheme, type ThemePref } from './theme';
import { Home } from './screens/Home';
import { NodeDetail } from './screens/NodeDetail';
import { AddNode } from './screens/AddNode';
import { Login } from './screens/Login';
import { Settings } from './screens/Settings';
import { NodeWebView } from './components/NodeWebView';
import { TabBar, type Tab } from './components/TabBar';
import { IconBack, IconPlus } from './components/Icons';

/**
 * App root (Origin A — the native-privileged React shell). A small hand-rolled nav stack
 * (no router dep at P0): a tab plus, within Nodes, roster → detail → (login → webview) / add.
 * Routes carry a node ID (not a node object) so they survive the async registry load and
 * re-resolve against the live registry. The webview is the only surface that loads a node's
 * own origin, and it gets no bridge access (see NodeWebView).
 */
type NodesRoute =
  | { name: 'roster' }
  | { name: 'add' }
  | { name: 'detail'; id: string }
  | { name: 'login'; id: string }
  | { name: 'webview'; id: string };

const ID_ROUTES = ['detail', 'login', 'webview'] as const;

/**
 * Optional deep-link seed from the URL hash (#settings, #add, #detail:<id>, #login:<id>,
 * #webview:<id>), read ONCE at startup. NOT kept in sync afterwards (in-app nav doesn't write
 * it back). A dev/preview convenience — #webview:<id>/#login:<id> reach a node-origin surface
 * past the (currently stub) Login gate, so gate/remove once Login authenticates. Split on the
 * FIRST colon only (ids are origins and contain colons). Absent/unknown → the roster.
 */
function initialRoute(): { tab: Tab; route: NodesRoute } {
  const hash = window.location.hash.replace(/^#/, '');
  if (hash === 'settings') return { tab: 'settings', route: { name: 'roster' } };
  if (hash === 'add') return { tab: 'nodes', route: { name: 'add' } };
  const sep = hash.indexOf(':');
  const name = sep === -1 ? hash : hash.slice(0, sep);
  const id = sep === -1 ? '' : hash.slice(sep + 1);
  if (id && (ID_ROUTES as readonly string[]).includes(name)) {
    return { tab: 'nodes', route: { name: name as (typeof ID_ROUTES)[number], id } };
  }
  return { tab: 'nodes', route: { name: 'roster' } };
}

function hasId(route: NodesRoute): route is Extract<NodesRoute, { id: string }> {
  return route.name === 'detail' || route.name === 'login' || route.name === 'webview';
}

export default function App() {
  const { nodes, ready, addNode, removeNode } = useRegistry();
  useRegistryProbe();

  const [seed] = useState(initialRoute);
  const [tab, setTab] = useState<Tab>(seed.tab);
  const [route, setRoute] = useState<NodesRoute>(seed.route);
  const [theme, setTheme] = useState<ThemePref>(loadTheme);

  useEffect(() => {
    applyTheme(theme);
    saveTheme(theme);
  }, [theme]);

  // The node an id-route points at, re-resolved against the live registry.
  const selected = hasId(route) ? (nodes.find((n) => n.id === route.id) ?? null) : null;

  // Auto-correct an id-route whose node is gone (removed / stale deep-link) once loaded.
  const selectedMissing = hasId(route) && !selected;
  useEffect(() => {
    if (ready && selectedMissing) setRoute({ name: 'roster' });
  }, [ready, selectedMissing]);

  const atRoot = tab === 'settings' || route.name === 'roster';
  // login/webview pop back to the node's detail; detail/add pop to the roster.
  const back = () =>
    setRoute(
      (route.name === 'login' || route.name === 'webview')
        ? { name: 'detail', id: route.id }
        : { name: 'roster' },
    );
  const backLabel =
    route.name === 'login' || route.name === 'webview' ? (selected?.callsign ?? 'Back') : 'Nodes';

  // Drives NodeRow `live` (the carrier pulse). Dormant in P0: non-null only on the webview
  // route, where the roster is unmounted — first visible once probing/messaging drive `live`.
  const activeNodeId = route.name === 'webview' ? route.id : null;

  const callsignTitle =
    (route.name === 'detail' || route.name === 'webview') && selected
      ? (selected.callsign ?? selected.displayName)
      : null;
  const title = tab === 'settings' ? 'Settings' : (callsignTitle ?? 'pdn');

  return (
    <div className="app">
      <nav className="navbar">
        {!atRoot && (
          <button type="button" className="navbar__action navbar__action--left" onClick={back}>
            <IconBack width={22} height={22} />
            {backLabel}
          </button>
        )}

        <span className="navbar__title">
          {title === 'pdn' ? (
            <span className="wordmark"><b>pdn</b></span>
          ) : callsignTitle ? (
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
              setRoute({ name: 'detail', id: node.id });
            }}
          />
        ) : route.name === 'detail' && selected ? (
          <NodeDetail
            node={selected}
            onOpen={() => setRoute({ name: 'login', id: selected.id })}
            onForget={() => {
              removeNode(selected.id);
              setRoute({ name: 'roster' });
            }}
          />
        ) : route.name === 'login' && selected ? (
          <Login
            node={selected}
            onCancel={() => setRoute({ name: 'detail', id: selected.id })}
            onAuthed={() => setRoute({ name: 'webview', id: selected.id })}
          />
        ) : route.name === 'webview' && selected ? (
          <NodeWebView node={selected} />
        ) : (
          <Home
            nodes={nodes}
            activeId={activeNodeId}
            onSelect={(node: NodeRecord) => setRoute({ name: 'detail', id: node.id })}
            onAdd={() => setRoute({ name: 'add' })}
          />
        )}
      </main>

      <TabBar
        tab={tab}
        onChange={(t) => {
          setTab(t);
          // Re-tapping Nodes returns to the roster from any drill-down.
          if (t === 'nodes' && route.name !== 'roster') setRoute({ name: 'roster' });
        }}
      />
    </div>
  );
}
