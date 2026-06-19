import { useEffect, useState } from 'react';
import type { NodeRecord } from './registry/types';
import { sampleNodes } from './registry/sampleNodes';
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
 * add / login / webview drill-down. The webview is the only surface that loads a
 * node's own origin, and it gets no bridge access (see NodeWebView).
 *
 * Native messaging screens (BBS / chat / WhatsPac) — the actual product driver —
 * become first-class surfaces layered on this shell in later arcs.
 */
type NodesRoute =
  | { name: 'roster' }
  | { name: 'add' }
  | { name: 'login'; node: NodeRecord }
  | { name: 'webview'; node: NodeRecord };

/**
 * Optional deep-link seed from the URL hash (e.g. #settings, #add, #login:<id>,
 * #webview:<id>), read ONCE at startup to seed nav state. The hash is NOT kept in
 * sync afterwards (in-app nav doesn't write it back; later hashchanges are ignored).
 * A dev/preview convenience — note #webview:<id> reaches the node-origin WebView
 * without passing the (currently stub) Login gate, so gate or remove this once Login
 * actually authenticates. Absent or unknown → the roster.
 */
function initialRoute(nodes: NodeRecord[]): { tab: Tab; route: NodesRoute } {
  const hash = window.location.hash.replace(/^#/, '');
  if (hash === 'settings') return { tab: 'settings', route: { name: 'roster' } };
  if (hash === 'add') return { tab: 'nodes', route: { name: 'add' } };
  const [name, id] = hash.split(':');
  const node = id ? nodes.find((n) => n.id === id) : undefined;
  if (node && (name === 'login' || name === 'webview')) {
    return { tab: 'nodes', route: { name, node } };
  }
  return { tab: 'nodes', route: { name: 'roster' } };
}

export default function App() {
  const [nodes] = useState<NodeRecord[]>(sampleNodes);
  // Seed nav state once from the URL hash (lazy initializer: read window.location.hash
  // exactly at mount, not on every render). References sampleNodes directly to avoid
  // coupling to the nodes-state hook order.
  const [seed] = useState(() => initialRoute(sampleNodes));
  const [tab, setTab] = useState<Tab>(seed.tab);
  const [route, setRoute] = useState<NodesRoute>(seed.route);
  const [theme, setTheme] = useState<ThemePref>(loadTheme);

  useEffect(() => {
    applyTheme(theme);
    saveTheme(theme);
  }, [theme]);

  const atRoot = tab === 'settings' || route.name === 'roster';
  const back = () => setRoute({ name: 'roster' });

  // Drives NodeRow `live` (the carrier pulse on the peak meter bar). Dormant in P0:
  // non-null only on the webview route, where the roster is unmounted — the pulse
  // first becomes visible once live reach-probing / messaging surfaces drive `live`
  // from an on-screen row.
  const activeNodeId = route.name === 'webview' ? route.node.id : null;

  const title =
    tab === 'settings'
      ? 'Settings'
      : route.name === 'webview'
        ? (route.node.callsign ?? route.node.displayName)
        : 'pdn';

  return (
    <div className="app">
      <nav className="navbar">
        {!atRoot && (
          <button
            type="button"
            className="navbar__action navbar__action--left"
            onClick={back}
          >
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

        {tab === 'nodes' && route.name === 'roster' && nodes.length > 0 && (
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
        {tab === 'settings' ? (
          <Settings theme={theme} onTheme={setTheme} />
        ) : route.name === 'roster' ? (
          <Home
            nodes={nodes}
            activeId={activeNodeId}
            onSelect={(node) => setRoute({ name: 'login', node })}
            onAdd={() => setRoute({ name: 'add' })}
          />
        ) : route.name === 'add' ? (
          <AddNode onCancel={() => setRoute({ name: 'roster' })} />
        ) : route.name === 'login' ? (
          <Login
            node={route.node}
            onCancel={() => setRoute({ name: 'roster' })}
            onAuthed={() => setRoute({ name: 'webview', node: route.node })}
          />
        ) : (
          <NodeWebView node={route.node} />
        )}
      </main>

      <TabBar
        tab={tab}
        onChange={(t) => {
          setTab(t);
          if (t === 'nodes' && (route.name === 'login' || route.name === 'add')) {
            setRoute({ name: 'roster' });
          }
        }}
      />
    </div>
  );
}
