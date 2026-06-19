# pdn-mobile

**Native mobile UIs for the [packet.net](https://github.com/packet-net) messaging apps — BBS (mail), chat (bpqchat), and WhatsPac — on an iPhone**, with push notifications and native-only capabilities (LAN mDNS discovery, secure multi-node credential storage + instant switching, later direct pico-radio management) that a browser bookmark can never deliver. Those native messaging surfaces — each backed by a structured per-app data + event API over the app-gateway / RHPv2 — are the product. A Capacitor 7 + React + TypeScript app delivers them.

The bootstrap (the first shippable thing) reuses each node's existing React control panel inside a sandboxed child WebView served from the node's own origin (zero pdn web changes for the happy path), giving an operator a working pocket console immediately while the chassis (auth, discovery, multi-node registry, the Codemagic→TestFlight pipeline) is proven. That WebView shell is the **floor, not the product** — the native messaging surfaces grow out of it and replace it app by app. The full architecture, phasing, and locked decisions live in the plan: [`docs/plan.md`](docs/plan.md).

This repo is currently a **skeleton** (P0): a Home/node-registry screen, an "Add node" stub, and a child-WebView component stub — just enough to render and build. The clearly-marked stubs are placeholders for the P0/P1 work in the plan, not finished features.

## The no-Mac build story

Tom has no Mac and tests on an iPhone. The iOS build therefore does **not** happen on a developer machine:

1. **Web layer iterates locally / in a browser.** `npm run dev` gives the full React app in a browser with hot reload — the fastest loop for everything that isn't a native plugin. `npm run build` produces the `dist/` bundle Capacitor wraps.
2. **The signed iOS build happens in CI on [Codemagic](https://codemagic.io).** Its free tier provides a macOS (M2) runner and auto-signs via an **App Store Connect API key** — so a signed IPA is produced with no Mac and no manual certificate handling. See [`codemagic.yaml`](./codemagic.yaml) (heavily commented; Tom fills in his team / bundle / API-key integration name).
3. **TestFlight delivers it to the phone.** Codemagic publishes the build to TestFlight; install it on the iPhone via the **TestFlight app**.

The native platform folders (`ios/`, `android/`) are **not** in the repo — they are generated in CI (`cap add ios`) from `capacitor.config.ts` + the web build, and are `.gitignore`d. Do not run `cap add ios`/`cap add android` on this Linux box; they need a Mac / Android SDK.

**On-device debug caveat:** because there is no local Mac/Xcode, you cannot attach a native debugger or live-reload onto the device here. Native behaviour (plugins, WebView lifecycle, cookies, SSE under background) can only be exercised on a TestFlight build on the actual phone — so the loop for *native* changes is slower (push to CI → wait for the TestFlight build). Keep as much logic as possible in the browser-testable web layer; treat the native layer as a thin, deliberately-spiked seam (see the plan's P0 gating spikes).

## Stack

- **Capacitor 7** + **React 18** + **TypeScript** + **Vite** (deliberately the same stack as `packet.net/web/packetnet-ui` so types/components can lift across).
- Two origins by design (plan §2.1): the bundled, native-privileged shell ("Origin A", `https://localhost`) and the node's own origin rendered in a sandboxed child WebView with no bridge access ("Origin B"). Both schemes are `https` for a secure context.
- App id `uk.m0lte.pdn`, display name **pdn**.

## Dev quickstart

```sh
npm install      # install dependencies
npm run dev      # Vite dev server (browser, hot reload) — the fast web loop
npm run build    # typecheck + Vite production build into dist/
```

`npm run build` is what CI runs before wrapping the app; if it passes locally, the web layer is shippable. `npm run cap:sync` copies `dist/` into the native projects (only meaningful where the native folders exist — i.e. in CI).

## Layout

```
capacitor.config.ts     Capacitor config (appId/appName, https schemes, webDir=dist)
codemagic.yaml          CI: web build → cap add ios → auto-sign → TestFlight
index.html              Vite entry
vite.config.ts          Vite + React
src/
  main.tsx              React bootstrap
  App.tsx               app root (Origin A shell)
  screens/Home.tsx      multi-node registry screen (P0 skeleton)
  components/
    NodeWebView.tsx     child-WebView stub (Origin B — where the node panel loads)
    AddNode.tsx         "Add node" stub (mDNS + manual add land in P1)
  registry/
    types.ts            NodeRecord / reach types (plan §2.3)
    sampleNodes.ts      placeholder registry seed
```

## Status / roadmap

See [`docs/plan.md`](docs/plan.md) §9 for the phased roadmap. This skeleton corresponds to the start of **P0** ("pdn panel in your pocket"). Android is a designed-for fast-follow (plan §12); contracts stay platform-neutral.
