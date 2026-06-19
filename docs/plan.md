# pdn Mobile App — Implementation Plan

**Status:** Architecture locked, ready to execute (revised to make the NATIVE messaging product the spine; verified findings preserved)
**Author:** Lead architect synthesis (R1–R6), revised to absorb the adversarial critique, then re-spined around the locked product driver
**Date:** 2026-06-19
**Repo (LOCKED):** `packet-net/pdn-mobile` (public). Suggested `appId uk.m0lte.pdn`, `appName "pdn"`.
**Platform sequencing (Tom, LOCKED):** Ship iOS first. Android is a deliberate, designed-for fast-follow, NOT dropped. Every component's *design* stays Android-portable; only the build-out *order* is iOS-first. See the dedicated Section 12 for every iOS-only / Android-divergent choice to consult on before committing.
**Repos referenced:** `/home/tf/packet.net` (pdn), `/home/tf/pico-node` (Pico W firmware), `/home/tf/pdn-bbs`, `/home/tf/pdn-bpqchat`, `/home/tf/pdn-convers`, `/home/tf/whatspacd`

---

## 0. What changed in this revision (re-spine + critique fold-in log)

This revision re-points the plan's spine at the locked product driver — **a much better NATIVE messaging UX** — and absorbs an adversarial review verified against the repos on disk. The substantive changes:

- **The product driver is now stated honestly and put first (Section 1):** this app exists to give the messaging apps (pdn-bbs, bpqchat, WhatsPac) a real native mobile UX, plus push and native-only capabilities (LAN discovery, secure multi-node, later pico radios). WebView reuse is **scaffolding / bootstrap** — the fastest way to ship a real shell and validate auth + discovery + monitoring — **NOT the destination.** The doc says so plainly rather than dressing a config wrapper up as a product.
- **The roadmap is re-sequenced around that spine (Section 9):** P-1 accounts (INDIVIDUAL Apple account, Codemagic→TestFlight, no Mac) → P0 the WebView bootstrap **with** the Codemagic pipeline + LAN mDNS discovery + multi-node registry + password login (the fastest real thing) → **the CORE ARC: the per-app NATIVE messaging surfaces** (bpqchat, pdn-bbs, whatspac, each = a server-side mobile API in that app's repo + a native screen in pdn-mobile) → **push EARLY-NEXT** once a native surface exists → pico native + BLE + Android GA later.
- **A new Section 5 defines "The pdn app → mobile native contract"** — the structured data + event API each messaging app implements over the app-gateway / RHPv2, with foreground (SSE) and push event streams and identity pass-through (the `X-Pdn-*` headers). This is the iteration target the whole product converges on; it is a design, explicitly marked as the thing we refine while building the first native surface.
- **Push is reframed from "optional, maybe-never" to EARLY-NEXT (Section 6):** it lands right after the first native messaging surface exists (a native surface is exactly what makes a push tap meaningful), not indefinitely deferred. The foreground SSE feed is still the floor that ships in the bootstrap, and graceful degradation is still mandatory.
- **The Apple-account / build-pipeline decision is LOCKED into P0 (Section 7.3, Section 9):** INDIVIDUAL Apple Developer Program ($99/yr); Tom has **no Mac**; build via **Codemagic** (free tier, macOS M2, Capacitor-native) → auto-sign with an App Store Connect **API key** → **TestFlight**, installed via the TestFlight app. The "fast iteration in the browser, only native changes need a build" workflow, the no-on-device-debug caveat, and the optional cheap Mac mini escape hatch are all written down. GitHub-hosted macOS runners are noted as the DIY alternative; Codemagic is the recommended default. (The previous "org + DUNS, weeks of lead time" framing is removed — individual enrollment is near-immediate.)
- **BLE is demoted from "feasible additive arc" to "unproven, gating spike."** The previous draft asserted that pinned `cyw43` 0.7.0 already pulls `bt-hci` 0.8.1 (a `Cargo.lock` citation). That citation is FALSE on disk: there is no `bt-hci`, no `trouble`, no `bluetooth` feature anywhere in `/home/tf/pico-node`'s `Cargo.lock` or any `Cargo.toml`, and the firmware crate (`crates/ax25-node-fw`) is deliberately EXCLUDED from the workspace (`exclude = ["crates/ax25-node-fw"]`) with its `cyw43`/embassy deps not even fetched. The false citation is removed; BLE now sits behind an explicit compile-and-advertise entry-gate spike with a measured RAM budget (Section 3.4, Section 9 P-pico-ble).
- **The passkey-via-Associated-Domains per-node impossibility is corrected and reconciled with the password floor.** Associated Domains entitlements are baked into the app binary at build time and resolve per declared domain; you cannot enumerate every operator's distinct `.ts.net` MagicDNS name, and `.ts.net` is Tailscale's apex, not ours. WebView passkeys therefore work ONLY for a domain the app's AASA/assetlinks declares (`pdn.m0lte.uk`, or a future shared `*.nodes.packet.net`). **Password login is the required universal floor** on BOTH platforms; passkeys are a **bonus** on the shared-public-domain / Tailscale path only (Section 4.2, Section 12).
- **LAN mDNS discovery is moved into the bootstrap as a native-only capability** (a real reason the app beats a browser bookmark), with the small pdn-side `_pdn._tcp` advertise change named explicitly. LAN instances are HTTP-only ⇒ password login there (Section 2.3, Section 7.1, Section 4.3).
- **Push metadata minimisation** now goes beyond `redactPeers` (the subscription/delivery graph survives peer redaction) (Section 6, Section 11).
- **SSE-lifecycle and cookie-crossing are promoted to bootstrap gating spikes**, and the Slice-0 notification ring is deepened to be time-bounded for realistic background gaps (Section 6.2, Section 9 P0).
- **Several iOS-only / Android-divergent items missing from the consult section are added** (per-node passkey domain limit on both platforms, iOS BGAppRefresh vs Android WorkManager, WKWebView process termination) (Section 12).
- **A plugin-currency spike is added** (community Capacitor plugins are abandonment risks) and UGC App-Review compliance is hardened (Section 7.3, Section 7.4).
- **Convers Q is resolved from disk:** `WebChat.cs:484` already carries a viewport meta; `pdn-convers/pdn-app.yaml`'s `ui:` block has no explicit `mode:` (default applies) — only the effective default mode needs confirming. BBS cites `Webmail.cs:1070,1918` verified accurate (viewport-less doc-shell heads).

Where the critique was *not* adopted: nothing material — every actionable point is folded in. Two critique points were already correct in the prior draft and are merely reaffirmed (pdn has no CORS; `Ax25Listener.SessionAccepted` exists library-only and `NotificationEvent` is absent).

---

## 0.1 Amendments — post-build (2026-06-19)

These supersede the inline text below where they conflict (the older passkey passages in §1.3, §2.4, §4.2, §4.3, §7.1, §9 P-passkeys, §10 R-13, §12 are all corrected here rather than rewritten in place).

**Passkeys — DEFERRED, and the model is corrected (Tom).** The earlier "passkeys work only on a shared public domain the app's binary declares an AASA for (`pdn.m0lte.uk`)" model is wrong about the *gate* and the older "passkeys run web-context in the node-origin child WebView, gated only on HTTPS" framing is wrong about the *mechanism*. Corrected understanding: a passkey is a WebAuthn ceremony in a secure context against the node's OWN origin, so the eligibility gate is simply **valid HTTPS + a registrable (non-IP) RP host** — Tailscale's `tailscale cert` HTTPS qualifies (operators are steered to Tailscale, not port-forwarding), a genuinely public HTTPS node qualifies, and LAN/AP plain-http never does. BUT a verified iOS constraint stands: **WKWebView hard-gates `navigator.credentials` on the embedding app's `associated-domains` entitlement**, so the ceremony cannot run inside the node-origin *child WebView* for arbitrary per-operator nodes. The mechanism that preserves the goal (passkeys on any operator HTTPS/`.ts.net` node, no per-node app config) is a **system browser sheet — `ASWebAuthenticationSession`** — which validates the site's own WebAuthn with no app AASA, handing a one-time code back to the native shell. **DECISION: passkeys are deferred** until there is a concrete HTTPS lab node to test against; **password + refresh is the sole, universal auth for P0**, native in Origin A. Revisit the `ASWebAuthenticationSession` mechanism (and the registrable-host eligibility predicate already in `Login.tsx`, currently dormant) when that node exists.

**mDNS advertisement encodes the callsign (Tom, LOCKED).** The node-side `_pdn._tcp` advertise (and pico's needed *real* `_pico-node._tcp` service — today pico only publishes the bare `pico-node.local` A-record, which is not browsable by service type) MUST carry the node **callsign in a TXT record key `cs`** (lowercase, value the full callsign-SSID, e.g. `M0LTE-7`) — NOT encoded in the DNS-SD instance name (instance names are display-oriented and user/Bonjour-renamable). Recommended TXT set: `cs` (identity, source of truth), `name` (optional human label), `v` (optional node version); keep total TXT < ~200 bytes. The mobile client treats `cs` as the identity source of truth and the instance name as display only.

**P0 functionality architecture (built; supersedes the loose "bootstrap" wording for the chassis).** Persisted multi-node registry via **@capacitor/preferences** (metadata, key `pdn.registry`); per-node secrets via **@aparajita/capacitor-secure-storage** (iOS Keychain / Android Keystore, keyed by `credRef` — the plan's `@capacitor-community/secure-storage` does not exist on npm; this is the correction). Reach probing via **CapacitorHttp** (native, bypasses WebView CORS + mixed-content) against `/healthz` (pdn; unauthenticated, always-mapped, confirms identity) and `/` (pico; any < 500); web-dev returns `unknown` (never `down`). State is a Context + pure reducer (`reducer.ts`, unit-tested) consumed via `useRegistry()`. Build order, web-testable first: **S1 persistence + state (DONE), S2 probe (DONE), S3 real password login** (CapacitorHttp `POST /auth/login` → refresh token in Keychain → mint first-party cookie before the panel WebView; needs a live node), **S4 mDNS discovery** (`capacitor-zeroconf`, the `cs` TXT convention above; needs a device build + the node-side advertise), **S5 passkeys (deferred, above)**. iOS needs `NSAllowsLocalNetworking` (ATS) + `NSBonjourServices` + `NSLocalNetworkUsageDescription`, Android a scoped `network_security_config` cleartext allowance — injected at Codemagic build time.

---

## 1. Vision, value, and non-goals

### 1.1 Why this app exists — the product driver (LOCKED)

**This app exists to give the packet.net messaging apps — pdn-bbs (mail), bpqchat (chat), and WhatsPac — a genuinely good NATIVE mobile experience, with push notifications and native-only capabilities that a browser bookmark can never deliver.** Packet messaging today is a terminal-shaped, fixed-width, page-reload experience squeezed into a web shell; the value of a real app is a fast, touch-native, list/thread/compose UX for those three surfaces, an OS notification when a station connects or mail arrives, and the things only a native app can do: discover nodes on your LAN over mDNS, hold multiple nodes' credentials securely, switch between them instantly, and — later — talk to pico radios directly.

The native-only capabilities are the other half of the "why an app, not a bookmark" answer: **LAN mDNS discovery** of nodes on your network, **secure multi-node** credential storage + instant switching, and **(later) direct pico-radio management** over WiFi/BLE. These are structurally impossible in a browser tab and are first-class reasons the app beats a URL.

**WebView reuse is scaffolding, not the destination — and this doc says so honestly.** Loading the existing pdn React control panel in a child WebView, served from each live node's own origin, lets us ship a real, useful shell on day one with **zero pdn web changes** for config/monitoring and a validated auth + discovery + node-registry chassis. That is genuinely valuable as a bootstrap: it de-risks the shell, proves cookie/SSE/auth behaviour inside a real WebView, and gives the operator a working pocket console immediately. But it is the *floor*, not the *product*. The product is the native messaging surfaces, and the WebView is the thing they grow out of and eventually replace for the apps that get a native surface. We are not building a config wrapper; we are bootstrapping with one.

### 1.2 The shape of the destination

Each messaging app converges on the same target: a **per-app structured data + event API** (list / read / send + an event stream for new-message / inbound-connect / mail) served by that app over HTTPS through the **app-gateway**, consumed by a **native screen in pdn-mobile**. That contract — Section 5 — is the iteration target the whole product is organised around. The WebView shell carries everything until each app earns its native surface; the apps that get one (bpqchat, then pdn-bbs, then whatspac) graduate from iframe to native.

Push is part of the destination, not an afterthought: an OS notification that a station just connected or that mail arrived, deep-linking into the native thread, is one of the headline reasons the app exists. It lands **early-next** — right after the first native surface exists to deep-link into.

### 1.3 Scope — tiered by iteration

**Bootstrap (the first shippable thing, iOS → TestFlight):** the WebView shell + the chassis.
- pdn node config + monitoring + auth (password + refresh) by reusing the React control panel in a WebView served from the node's own origin (zero pdn web changes for the happy path).
- pdn apps (BBS, BPQ Chat, Convers) surfaced via the existing `/apps/{id}/` gateway in the same WebView (interim, until each gets a native surface).
- Multi-node registry, **LAN mDNS discovery**, manual add, secure per-node credential storage.
- **Password login** (the universal floor).
- The **Codemagic → TestFlight** pipeline (no Mac), wired and proven.
- Foreground notification feed off the panel's existing SSE (no relay).
- **pico-node = WebView reuse of its existing captive-portal config form** (zero firmware change), pointed at `http://pico-node.local/` or `http://192.168.4.1/`. A config *form* does not need an SPA to be WebView-usable.

**Core arc (the product — the native messaging surfaces):**
- The "pdn app → mobile native contract" (Section 5): server-side mobile API per app + native screen in pdn-mobile.
- Native bpqchat, then native pdn-bbs, then native whatspac.

**Early-next (right after the first native surface):**
- Hosted push relay (`pdn-push-relay`) + node `push:` client, with strict graceful degradation. Deep-links into the native surfaces.

**Later (each its own go/no-go, designed Android-portable, ordered iOS-first):**
- pico-node first-class *native* management over WiFi (a structured JSON API) — built only when a native feature (WiFi-scan picker, status dashboard) needs structured data.
- Native passkeys (shared public / Tailscale domain only; bonus over the password floor).
- pico-node BLE management (behind a gating compile-and-RAM spike).
- Android GA at parity.

### 1.4 Non-goals (explicit, locked)

- **This is NOT a config-wrapper product.** Config/monitoring reuse via WebView is bootstrap scaffolding (Section 1.1); the product is native messaging. Anyone reading the roadmap as "ship the panel and stop" is reading it wrong.
- **pdn-relays-pico-management-over-RF is DEMOTED.** Not core, not centred. If ever built, a separate pdn app, later. The plan does not depend on it. Only *push-event* forwarding for RF-only nodes is kept as a named long-tail slice (Section 6.6), and that is forwarding, not management.
- **DAPPS and LOBBY are not mobile surfaces** — packet/session plane only, no `ui:` web surface, and no native messaging surface.
- **No VPN / NetworkExtension.** The app relies on the OS Tailscale app for tailnet reach; it does not route traffic (also dodges VPN-entitlement review).
- **BLE background telemetry is out of scope.** BLE, if it ships at all, is foreground provisioning/management only.

---

## 2. Architecture

### 2.1 Capacitor hybrid, two origins

Per Tom's locked framework decision: **Capacitor 7 + TypeScript + React 18 + Vite**, deliberately the same stack as `web/packetnet-ui` so shared types and components lift across. The single most important architectural decision is **two origins**:

- **Origin A — bundled app origin** (`https://localhost` via `iosScheme=https` / `androidScheme=https`, both set to `https` for a secure context): all native-privileged JS. Hosts the app's own React chrome — multi-node Home/registry, Add-Node/discovery, Settings, **the native messaging screens (the product)**, and (in later iterations) pico-node native screens. Only this origin can reach the Capacitor bridge (BLE, WiFi, Keychain, push, mDNS).
- **Origin B — the node's own origin** (e.g. `https://pdn.m0lte.uk`, the node's `.ts.net` name, or LAN `http://<node>:8080`): renders the pdn React panel and the pdn app UIs (`/apps/{id}/`) in a sandboxed child WebView with **no plugin access**. This is the bootstrap scaffolding — load-bearing for security (a spoofed/compromised node origin must not reach BLE/Keychain) and for auth coherence (panel + apps + API + cookies all same-origin).

The pdn panel is loaded **remotely from the live node**, not bundled, so it stays version-matched to the node it manages and inherits ~100% of the SPA, SSE, auth, and app-gateway behaviour with **zero pdn web code changes** for the happy path. The native messaging screens, by contrast, live in Origin A and call the per-app mobile contract (Section 5) directly.

```
┌─────────────────────────── Capacitor app ───────────────────────────┐
│  Origin A (bundled, native-privileged React) — THE PRODUCT            │
│   • Home / multi-node registry      • Add-Node + LAN mDNS discovery   │
│   • NATIVE messaging screens: chat · BBS mail · whatspac  ◀── core    │
│   • Settings / notification prefs   • (later) pico NATIVE screens     │
│      │  Capacitor bridge ▼                                             │
│      └── BLE · WiFi/AP-join · mDNS · Keychain · Push · Biometric ·    │
│          CapacitorHttp (native fetch, shared cookie jar)              │
│                                                                       │
│  Origin B (sandboxed child WebView — NO bridge) — BOOTSTRAP SCAFFOLD  │
│   • pdn React panel  ── loaded from the live node origin ──┐          │
│   • pdn apps /apps/{id}/ (until each gets a native screen) │          │
│   • (bootstrap) pico captive-portal config form (LAN/AP)  │          │
└───────────────────────────────────────────────────────────┼─────────┘
                                                              │
         reach paths (resolved by the registry, §2.3)        ▼
   pdn node:  LAN http://<ip>:8080  |  Tailscale https://<fqdn>.ts.net  |  public https://pdn.m0lte.uk
   pico-node: LAN http://pico-node.local  |  AP http://192.168.4.1  |  (later) BLE GATT
   native messaging: Origin A → per-app mobile API over the app-gateway (HTTPS) (§5)
   push (early-next): node → pdn-push-relay → APNs/FCM   (best-effort, degradable)
```

### 2.2 What is WebView-reused (bootstrap) vs native (product)

| Surface | Mechanism | Why |
|---|---|---|
| pdn dashboard, monitor, sessions, console, config, ports, users, links, routes, capabilities, tuner | **WebView (Origin B)**, served from node | Entire SPA reusable as-is; config/monitoring is bootstrap reuse, not the product |
| pdn live data (frame monitor, session/console streams) | **WebView SSE** via `?access_token=` | Works unchanged in any WebView (subject to the lifecycle spike, §6.2) |
| messaging apps in the bootstrap: BBS, chat, convers | **WebView (Origin B)** `/apps/{id}/` iframes | Interim surface until each earns a native screen |
| **messaging apps — the product: chat, BBS, whatspac** | **Native React (Origin A)** calling the per-app mobile contract (§5) | The reason the app exists |
| pico-node config (bootstrap) | **WebView (Origin B)** of the existing captive-portal form | Zero firmware change; a form needs no SPA |
| pdn auth (password / refresh) | **WebView ceremony** + native Keychain for refresh token | Server is RP/origin driven; password is the floor |
| pdn passkeys (later, shared public / Tailscale domain only) | **WebView ceremony** via Associated Domains | RP-origin limited to declared domain (§4.2); bonus, not floor |
| Multi-node Home / registry / Add-Node / LAN discovery | **Native React (Origin A)** | App's own chrome; needs the bridge; native-only capability |
| pico-node native screens (later) | **Native React (Origin A)** calling pico JSON API | Only when structured data is needed |
| Discovery, secure storage, push, BLE, WiFi-join | **Native plugins** | Cross-cutting |

### 2.3 The multi-node registry + reach resolution

The Home screen is a list of `NodeRecord`s; the registry is the single source of truth from which transport, WebView URL, native-API base, and creds derive. Metadata lives in plain app storage (renders offline); **creds live only in Keychain/Keystore keyed by `credRef`** — never inline.

```ts
type NodeType = 'pdn' | 'pico';
type Reach    = 'lan' | 'tailscale' | 'ap' | 'ble';

interface NodeReach { kind: Reach; baseUrl?: string; apSsid?: string;
                      bleDeviceId?: string; lastSeenAt?: number; rttMs?: number; }
interface NodeRecord { id: string; type: NodeType; displayName: string;
                       reaches: NodeReach[];          // ordered by preference, probed in order
                       credRef: string;               // KEY into secure storage — never inline creds
                       capabilities?: string[]; }     // pdn: [panel,apps,nativeMsg?]; pico: [portal,api?,ble?]
```

**Reach resolution** on tap, gated by `@capacitor/network`: `lan` (mDNS-resolve `pico-node.local` / `_pdn._tcp`, then health-check) → `tailscale` (attempt the MagicDNS name) → `ap` (offer "join `pico-<callsign>`", endpoints at `192.168.4.1`) → `ble` (later; pico when no IP path exists). Type→experience mapping is the clean seam.

**LAN mDNS discovery is a native-only capability and part of the bootstrap (LOCKED).** The app browses `_pdn._tcp.local` to find pdn instances on the LAN — this requires **a small pdn-side change to advertise `_pdn._tcp`** (pico already advertises `pico-node.local`). LAN instances are **HTTP-only**, so they get **password login** there. This is precisely a reason the app beats a browser bookmark.

**Tailnet tier is a bounded-timeout probe, NOT a detectable state** (critique #6): iOS cannot query whether the OS Tailscale tunnel/DNS proxy is active; MagicDNS resolution from a different app is not observable. So `tailscale` reach is "attempt the `.ts.net` name with a short bounded timeout, fall back on failure" — the timeout is budgeted into the Home-tap UX so a 30 s connect stall never blocks the tap.

### 2.4 Reach paths summary

- **pdn:** LAN `http://<node>:8080` (password-only — plain HTTP, no secure context, no passkeys; this is the LAN-mDNS-discovered path); the node's `.ts.net` HTTPS (remote + secure cookie, but **no passkeys** — see §4.2 on the per-node domain limit); or the shared public `https://pdn.m0lte.uk` (the ONLY origin where WebView passkeys can work). Prefer HTTPS where available; surface the HTTP-vs-HTTPS posture to the user. Default node bind is `127.0.0.1:8080` (verified in `NodeConfig.cs`); the deployed/lab node must bind a LAN address for phone reach — config, not code.
- **pico-node:** **direct, no pdn relay** — LAN (`pico-node.local`), its own AP (`192.168.4.1`), or (later) BLE. AP and STA are mutually exclusive on cyw43 0.7 — one interface at a time.

---

## 3. pico-node management

This section is deliberately tiered. The bootstrap reuses what exists. Native and BLE are later arcs with explicit gates, reflecting that the pico firmware crate is a standalone, workspace-EXCLUDED crate whose radio deps are not even fetched (verified: `Cargo.toml` `exclude = ["crates/ax25-node-fw"]`). **pico-node is WebView-only for v1 (LOCKED).**

### 3.1 Bootstrap — WebView reuse of the existing captive-portal form (zero firmware change)

The pico already ships a captive-portal HTML config form and OTA over HTTP. For the bootstrap the app simply points Origin B at `http://pico-node.local/` or `http://192.168.4.1/` and renders that form. This delivers a real pocket-console pico experience with no parallel firmware program on the critical path. The only app-side work is reach resolution + the cleartext-LAN allowances (Section 12). This is the scaffolding path applied to the pico.

Limits to surface honestly: the existing form has no WiFi scan/picker (you type the SSID), reads are unauthenticated on the AP subnet, and there is no structured status dashboard. Those are exactly the gaps that justify the later native track — built only when wanted.

### 3.2 Later — pico WiFi JSON API (native track, only when a native feature needs it)

A structured JSON API on `:80`, mounted in both AP and STA modes, as a thin wrapper over the *existing* `config_store::handle_op` config seam and the status statics (reuse, not a new config model). Built only when a native screen needs structured data (the WiFi-scan picker is the strongest driver). Endpoints, priority order:

- `GET /api/v1/status` — request/response twin of the MQTT status JSON plus mode/identity.
- `GET /api/v1/config` — JSON form of `render_show`: per key `{value, source, default_value}`.
- `GET /api/v1/wifi/scan` — the single most-wanted mobile-provisioning capability the portal lacks (cyw43 scan → `[{ssid,rssi,security}]`).
- `GET /api/v1/routes`, `GET /api/v1/version` (JSON alongside the plain-text `/version` the OTA tool needs).
- `POST /api/v1/config` (batch through `handle_op(Set)` then `Save`), `POST /api/v1/reboot`, `POST /api/v1/factory-reset`, optional `POST /api/v1/connect`.
- OTA: keep `POST /firmware`; add `GET /api/v1/ota/status` and JSON progress.

Cross-cutting firmware work this implies: a hand-rolled `no_std` JSON writer (extend the existing `mqtt.rs` status-JSON pattern — no serde on the M0+ budget); a minimal HTTP method+path router; **a bearer-token write/OTA gate shipped WITH the write endpoints, not after** (adding writes/OTA to a structured API raises exposure); an mDNS `_pico-node._tcp` SRV/TXT record; CORS is moot if the native layer reads the JSON and renders native screens (the recommended path).

**Threat model for open reads (critique #15):** reads stay open ONLY in config-only/fresh-box AP mode, where the box holds no secrets worth protecting and the operator is standing next to it. A *provisioned* box that fell back to AP (e.g. an unattended hilltop) would otherwise leak callsign/grid/neighbours/IP to anyone who joins the open AP — so for a provisioned box either the AP must be WPA2 with the provisioning passphrase, or reads must be token-gated too. This is a decision to name explicitly, not leave as "reads stay open."

### 3.3 Later — provisioning + management UX (native)

- **Fresh box / hilltop:** discover over BLE (if/when BLE ships) or join the `pico-setup`/`pico-<callsign>` AP; provisioning wizard — WiFi scan → pick → callsign/alias/grid/passphrase → save → reboot, reconnect in ~30 s. **Config changes always require a reboot (~30 s); no hot-reload** — embrace "save & reconnect" as a defining UX constraint.
- **AP-join is best-effort, never load-bearing (critique #7):** iOS abandons a Wi-Fi network that fails its connectivity probe and may switch back to cellular/known Wi-Fi mid-provisioning, killing the `192.168.4.1` session; `NEHotspotConfiguration` `nil` error means "config added," not "connected" (verifying needs the Access-WiFi-Information entitlement to read SSID). The wizard MUST be resilient to mid-flow AP loss (detect `192.168.4.1` unreachable, retry/resume/re-prompt), and the pico AP should answer iOS's captive-portal connectivity probe or expect drops. Manual "join it yourself" instructions + (later) BLE are the real floor.

### 3.4 Later — pico BLE management (UNPROVEN, gating spike) (critique #1, #2)

**Honesty correction:** the prior draft's claim that pinned `cyw43` 0.7.0 already depends on `bt-hci` 0.8.1 is FALSE on disk. Verified: no `bt-hci`, no `trouble`, no `bluetooth` feature anywhere in `/home/tf/pico-node`'s `Cargo.lock` or any `Cargo.toml`; `cyw43` does not enable Bluetooth by default; and the firmware crate's radio deps are not even fetched (the crate is `exclude`d from the workspace). BLE here is therefore an unproven capability, not a low-risk additive arc.

The CYW43439 is a combo WiFi+BT part, so BLE is *plausible* via the `cyw43` `bluetooth` feature + a `trouble-host` stack — but plausible is not proven. Before any GATT or app work:

- **Entry-gate spike (must pass first):** get `cyw43` with `bluetooth` + `trouble-host` to **compile and link against the frozen memory layout**, and to **advertise on real hardware**. If it cannot compile/link/advertise, BLE is descoped — explicit exit condition, not a soft risk.
- **Measured RAM budget (must produce a number):** RAM is **264 KB total**; the heap arena is `16 * 1024` (`main.rs:77`); embassy-net `StackResources` + the AX.25 core + cyw43 already consume it. A second protocol stack (L2CAP + ATT buffers) on the *same shared PIO-SPI bus* is a material RAM hit, not a tweak. The spike must produce a heap high-water + static-allocation budget with WiFi+BLE both up; **if it does not fit with margin, BLE is descoped.** (Flash is plausible — ACTIVE is 512 KB, the BT patch blob `43439A0_btfw.bin` (~6 KB) goes in the 256 KB BLOBS region — but flash was never the constraint; RAM is.)

Only if both gates pass: vendor `43439A0_btfw.bin` into `cyw43-firmware/` + the `PBLB` manifest (`check-layout.sh`); a static GATT attribute table (no heap pressure); a "pico-node Management" GATT service reusing `handle_op(Set/Save/Reboot)` verbatim over chunked length-prefixed framing; LE Secure Connections bonding for authenticated management (replaces the WiFi bearer token on the BLE path; link-layer encrypted, *management* not on-air ham traffic, so no legal issue); and an on-hardware WiFi/BLE coexistence soak (the long pole).

### 3.5 pico-node firmware risks (named)

- **BLE is unproven (compile + RAM):** the dominant risk; gated above.
- **No STA link-down event in cyw43 0.7** (`net.rs`): a node whose home WiFi blips parks until reset; the app cannot observe/trigger re-association without a cyw43 bump. Flag for a driver-version review.
- **Unauthenticated `:80`:** gate writes/OTA with the bearer token shipped alongside them; constrain open reads per §3.2 threat model.
- **No hot-reload:** every config change reboots ~30 s — a UX constraint, not a bug.

---

## 4. pdn config + monitoring + auth on mobile (bootstrap scaffolding)

### 4.1 Config + monitoring — WebView reuse, zero pdn web changes

This is bootstrap reuse, not the product. Point the child WebView (Origin B) at the node's served origin and the entire panel works: Config (Forms/Raw-YAML, dry-run reconcile preview, 422 inline validation, Tailscale status, self-update Apply), Dashboard/Monitor/Sessions/Console/Routes/Capabilities/Ports/Link-troubleshoot, and the live SSE frame monitor + session/console streams. All API calls are same-origin relative `/api/v1/…`; there is **no CORS anywhere in the node host** (verified) — which is exactly why the WebView **must** be on the node origin. Loading the panel cross-origin would break REST + SSE + the `/apps/*` cookie simultaneously.

**Required follow-ups before ship (on the critical path, but not app code):**
- **Mobile-responsiveness pass** on the five wide table screens (`monitor`, `sessions`, `capabilities`, `routes`, `link-troubleshoot`) + console touch ergonomics. The shell + `Page` already adapt.
- **SSE longevity under WebView lifecycle — promoted to a bootstrap gating spike** (see §6.2 / critique #8).
- **BrowserRouter deep-links / `window.top` break-out** validated under the WebView navigation model.

### 4.2 Auth on mobile — password is the floor, passkeys are a bonus

- **Mechanism:** `POST /auth/login` (Argon2id) or `/auth/webauthn/assert/*` → `{token, refreshToken, scopes, expiresAt, username}`. JWT access (HS256, `aud=packet.net-control-api`, ~60 min); opaque refresh with rotation + family-revoke-on-reuse (~7 days, the real session length). Scopes `admin ⊃ operate ⊃ read`. There is **no separate native-app audience/grant** — a mobile client uses the ordinary control-API login + refresh. This is also the auth the native messaging contract (§5) carries.
- **Password login is the REQUIRED universal floor (LOCKED).** Every node — LAN/HTTP, `.ts.net`, public — is reachable with password + refresh on both iOS and Android. The native messaging surfaces authenticate the same way (the refresh token mints the access token the §5 contract uses).
- **Token ownership:** the native shell owns the refresh token in Keychain/Keystore keyed by `credRef`, NOT WebView storage. On launch, POST the refresh to mint a fresh `pdn_at` cookie/access token before showing the panel or the native screens. For native-layer calls use **CapacitorHttp** with `CapacitorCookies.enabled` so node cookies are first-party, sidestepping ITP/third-party-cookie blocking and CORS.
- **Passkeys are a BONUS on the shared-public-domain / Tailscale path only — CORRECTED to a per-domain capability, NOT a per-node primary path (critique #5):** Associated Domains entitlements are baked into the app binary at build time and Apple/Google fetch the association file (`apple-app-site-association` / `assetlinks.json`) from each declared domain. You **cannot** declare every operator's distinct `.ts.net` MagicDNS name, and `.ts.net` is Tailscale's apex (you can't serve the AASA there). So WebView passkeys work **only for nodes served under a domain the app's binary declares** — i.e. the shared public `pdn.m0lte.uk`, or a future shared `*.nodes.packet.net`. For arbitrary LAN/`.ts.net`/per-operator nodes, **password + refresh token is the only auth**, on BOTH iOS and Android (assetlinks has the identical per-domain constraint). Passkeys never gate anything — password works unchanged everywhere. **Never run the WebAuthn ceremony against `capacitor://localhost`/`https://localhost`** — the app's own scheme is not a valid RP origin. Consult Section 12 before committing the passkey path.

### 4.3 Server changes needed (named explicitly)

| Change | When needed | Status |
|---|---|---|
| **None** for the WebView-on-node-origin happy path (panel + API + SSE + apps + password auth) | bootstrap | Works as-is |
| **pdn advertises `_pdn._tcp` mDNS service** for LAN discovery | bootstrap | **Net-new, small pdn-side change (LOCKED)** |
| **Per-app mobile contract endpoints** (list/read/send + event stream) in bbs/bpqchat/whatspac repos | core arc | Net-new, per app (§5) |
| **Associated-domains / assetlinks served by the *shared public* domain** for passkeys | later, shared domain only | Net-new; per-node nodes cannot use it |
| **`WebAuthnConfig.AllowedOrigins`** must include the passkey origin | when passkeys wanted | Operator/build config |
| **CORS allowlist** for the app origin + `AllowCredentials` | **only if** native-layer `fetch` to `/api/v1` outside the WebView | Avoid via CapacitorHttp + same-origin WebView |
| **Node LAN bind** (`management.http.bind` ≠ `127.0.0.1`) for phone reach | bootstrap (lab/deploy) | Config, not code (verified default `127.0.0.1:8080`) |

---

## 5. The pdn app → mobile native contract (THE CORE ARC, design / iteration target)

This is the spine of the product: a **per-app structured data + event API** served by each messaging app **over HTTPS through the app-gateway**, consumed by a **native screen in pdn-mobile**. bpqchat, pdn-bbs, and whatspac each implement it.

> **The concrete, verified, implementable spec is now [`docs/mobile-contract.md`](mobile-contract.md)** — designed from the real apps + gateway and hardened by an adversarial review (2026-06-19). It supersedes the sketch in this section, which is kept as narrative context. Two findings worth flagging against the older sketch: (a) **whatspac is NOT an "RHP bridge to the phone"** — `whatspacd` already serves HTTP+SSE behind the gateway like any app (RHP is only its own outbound WhatsPac link), so all three shapes are ordinary `/m/v1` handlers; (b) the only node-side gateway work is binding the `mobile:` block **and widening the reverse-proxy upstream resolver** so a mobile-only app (no `ui:`) doesn't 404. See the doc's §8 for the open decisions needing a maintainer call.

**The phone never speaks RHPv2 — by design.** RHPv2 is the node's *internal packet plane*: a loopback/LAN-trusted, low-level JSON-over-TCP protocol between an app and the AX.25 engine (open/accept connections), with no remote-auth or TLS story. Pointing a remote phone at it would be the wrong shape — wrong trust boundary and the wrong abstraction level (the phone would be re-implementing app logic that already lives in bbs/chat/whatspac). Instead the phone is just another **authenticated HTTP client of the app-gateway**, exactly like the web UI — same `pdn_at` cookie / bearer token, same `X-Pdn-*` identity injection (§5.4). The apps keep using RHPv2 internally where they need the engine; whatspac's daemon (`whatspacd`) attaches over RHP and its mobile contract is bridged behind the gateway — but that bridge lives node-side and is invisible to the phone, which only ever sees plain JSON over HTTPS.

### 5.1 How an app declares a mobile surface (manifest)

An app that offers a native mobile surface declares it in its existing app manifest (`pdn-app.yaml` `ui:` block, extended with a `mobile:` sibling), so the panel's launcher (`GET /api/v1/apps`) can tell pdn-mobile "this app has a native surface, here is its base path and shape":

```yaml
ui:
  mode: slot                 # existing web surface (interim WebView path)
mobile:                      # NEW: declares a native surface
  contract: chat            # one of: chat | mail | feed   (shapes below)
  base: /apps/bpqchat/m/v1  # mounted behind the same app-gateway prefix + X-Pdn-* injection
  events: [message, connect]
  push: [message, connect]  # which event kinds are push-worthy
```

`GET /api/v1/apps` returns the `mobile` block for enabled apps so pdn-mobile renders a native tile (and falls back to the WebView slot when an app has no `mobile:`). DAPPS/LOBBY declare no `mobile:` block.

### 5.2 The data API (list / read / send)

Three contract shapes cover the three apps; all are plain JSON over HTTP behind the app-gateway prefix, identical auth/header semantics to the existing web surface:

- **`chat` (bpqchat):** `GET …/channels`, `GET …/channels/{id}/messages?since=<cursor>` (paged, reverse-chron), `POST …/channels/{id}/messages {text}`, `GET …/presence`.
- **`mail` (pdn-bbs):** `GET …/folders`, `GET …/messages?folder=&since=<cursor>`, `GET …/messages/{id}` (full body + attachments incl. 7plus-decoded), `POST …/messages {to, subject, body}`, `POST …/messages/{id}/read`.
- **`feed` (whatspac):** `GET …/threads`, `GET …/threads/{id}/messages?since=<cursor>`, `POST …/threads/{id}/messages {text}` — whatspac is an RHP daemon, so its mobile contract is served by `whatspacd` and bridged through RHPv2 (it is not a catalog app; the `mobile:` block + RHP bridge is how it joins without becoming one).

Cursors are opaque, monotonic, and the same cursor feeds both `since=` polling and the event stream's resume point.

### 5.3 The event stream (foreground SSE + push)

The same logical events drive two transports:

- **Foreground (SSE):** `GET …/events` emits `event: message|connect|mail` with `{kind, ts, cursor, …summary}`. The native screen holds an `EventSource` while foregrounded and live-updates the list; on reconnect it resumes from the last cursor and backfills via the `since=` data API. This reuses the panel's proven SSE-in-WebView behaviour but is consumed natively in Origin A.
- **Push (early-next):** the app declares (in its `mobile.push` list) which event kinds are push-worthy; those flow node → `pdn-push-relay` → APNs/FCM as **pointer-only** notifications (Section 6) that deep-link `pdn://node/<id>/app/<appId>/<kind>/<ref>` straight into the native surface. The native surface is exactly what makes a push tap land somewhere useful — which is why push is early-next, right after the first native surface exists.

### 5.4 Identity / auth pass-through (the X-Pdn-* headers)

The contract reuses the app-gateway's existing identity injection verbatim: the YARP reverse-proxy strips client-supplied identity headers and injects validated **`X-Pdn-User`**, **`X-Pdn-Scope`**, and **`X-Forwarded-Prefix`** on every proxied request, authenticated by the `pdn_at` HttpOnly cookie (browser navigations) or the bearer access token (native CapacitorHttp calls). The native screen therefore gets the same per-user identity and scope the web surface gets, with no new auth model — password/refresh (§4.2) underpins it. An app implementing the mobile contract reads `X-Pdn-User`/`X-Pdn-Scope` exactly as it does today.

### 5.5 Which apps implement it, and in what order

- **bpqchat (`chat`)** — first, and the one we use to shake out the contract (simplest shape, highest-frequency events, best push showcase).
- **pdn-bbs (`mail`)** — second (richest shape: folders, bodies, attachments incl. 7plus-decoded; the IMAP roadmap's data model informs this).
- **whatspac (`feed`)** — third (RHP-bridged; standalone `whatspacd`).

Each is two pieces: a **server-side mobile API in that app's own repo** (`packet-net/pdn-bpqchat`, `packet-net/pdn-bbs`, `m0lte/whatspacd`) and a **native screen in `packet-net/pdn-mobile`**. The contract stays platform-neutral by construction (it is server-side JSON + SSE), so Android consumes the identical API.

---

## 6. Notifications — foreground feed in the bootstrap; hosted relay is EARLY-NEXT

### 6.1 The degradation contract (the core requirement) (critique #3a, #10)

**Push is EARLY-NEXT** — it lands right after the first native messaging surface (bpqchat) exists to deep-link into. The foreground SSE feed is the floor that ships in the bootstrap and remains the always-available fallback. Tiers:

1. **Foregrounded (bootstrap floor, no relay):** the panel WebView already holds an `EventSource` on `GET /api/v1/events`; the native screens (§5.3) hold their own `EventSource`. In-app banners + live list updates render off those streams with zero relay involvement. This works today (subject to the lifecycle spike).
2. **Backgrounded, relay up (early-next):** node POSTs a NotificationEvent → relay → APNs/FCM → OS notification → tap deep-links into the **native surface**. The only tier needing the relay — and even visible alert pushes can be silently dropped/coalesced by iOS under Low Power Mode, Focus, or per-app budget. We never promise delivery.
3. **Backgrounded, relay down/unconfigured:** no OS push, nothing breaks. On foreground the app reconnects SSE and shows a catch-up feed.

Push is built once bpqchat's native surface lands (a push tap needs somewhere native to land), not deferred indefinitely.

### 6.2 The prerequisite for the foreground floor: Slice 0 — an app-altitude NotificationEvent (critique #8)

**pdn does not currently emit a notification-grade event** (verified: `PdnEventsApi.cs` / `NodeTelemetry` broadcast only L2 `MonitorEvent` frame traces — a firehose). The right signal exists in the library — `Ax25Listener.SessionAccepted` — **but is not surfaced through telemetry.** Slice 0 (node-side, small, benefits the foreground feed even before any relay; also feeds the §5 event stream): tap `SessionAccepted`; add a `NotificationEvent` record + a **time-bounded history ring deep enough to cover realistic background gaps (hours, not a 250-frame count that overflows in minutes on a busy node)**; emit as `event: notify` on `/api/v1/events` + add `GET /api/v1/notifications/recent`. Catch-up backfills from this ring on foreground.

Also handle **WKWebView web-content-process termination** (critique #8): under memory pressure iOS terminates the whole web process (blank page on return); the app must detect the dead web process and reload, then re-subscribe SSE. Promote the SSE-lifecycle behaviour to a **bootstrap gating spike** alongside the cookie spike — both are load-bearing for the notification floor.

```jsonc
NotificationEvent = { nodeId, kind: "inboundConnect|mailArrived|chatMessage|system|beaconMissed",
  title:"K2ABC connected", body:"Inbound AX.25 connect on port vhf-1",
  ts, deepLink:"pdn://node/<nodeId>/sessions", peer:"K2ABC" /* omitted when redactPeers */ }
```

### 6.3 The relay service — `pdn-push-relay` (early-next)

Stateless, multi-tenant, modelled on the OARC collector pattern (POST events; accept-and-queue; workers drain; `202` = queued, not delivered), with two deliberate divergences: **authenticated ingest** (push is an abuse vector) and the new app-altitude event above.

- **APNs (iOS):** relay talks APNs directly — `.p8` token auth (ES256 JWT, hourly refresh), HTTP/2 to `api.push.apple.com`, visible alert pushes (`apns-priority:10`). **No reliance on silent/background `content-available`** (Apple throttles it).
- **FCM (Android):** HTTP v1, service-account OAuth2 bearer (hourly refresh). Legacy server-key API is dead.
- **Payload = pointer only** (≤4 KB, in practice <500 B): nodeId + kind + short title/body + deep-link into the native surface. Never message bodies — dodges the privacy problem and stays clear of App Store 4.5.4.
- **Ingest auth:** per-node `nodeId` + `ingestKey` Bearer; per-node rate-limit (honour `429`).
- **Subscription binding:** a device proves it operates the node before receiving its pushes — the JWT-authenticated app calls a node endpoint that mints a short-lived relay-subscription grant signed by the node's ingest key; the app presents it to the relay to bind `(deviceToken → nodeId)`. Simpler alternative: operator pastes a node-displayed pairing code. **Name the chosen mechanism; prefer the signed grant.**
- **Token rotation:** app re-registers on every `registration` callback; relay accepts `POST /devices/{id}/token` and prunes dead tokens on APNs/FCM `410/Unregistered`.
- **Metadata minimisation BEYOND `redactPeers` (critique #3b):** even with peer redaction, `subscriptions(deviceId → nodeId)` + `delivery_log` reveal which operator's device subscribes to which node and how busy that node is — that IS the privacy-sensitive social/metadata graph and it survives redaction. Mitigations: hash/salt the `deviceId↔nodeId` binding; short `delivery_log` retention; consider designing the relay so it cannot correlate one device's multiple node subscriptions; and disclose the aggregated who-operates-what exposure to operators at enrolment.
- **Hosting:** single small VPS + systemd + SQLite/Postgres; strategic option to co-host beside OARC's collector infra (cleanest custodian for the Apple Developer account + `.p8`) — worth an OARC conversation.

### 6.4 Node-side `push:` config (twin of `oarc:`)

```yaml
push:
  enabled: false
  relayUrl: "https://push.packet.oarc.uk/"
  nodeId: "..."        # issued at enrolment
  ingestKey: "..."     # secret
  events: { inboundConnect: true, mailArrived: true, chatMessage: true, system: true, beaconMissed: false }
  redactPeers: true    # necessary but NOT sufficient — see §6.3 metadata minimisation
```

Resilience copied from `OarcIngestClient`/`OarcReporter`: bounded queue, drop-oldest, exponential backoff, honour `429`, `TimeProvider`-driven, fire-and-forget from the data path (radio never slowed).

### 6.5 Capacitor app push integration

Plugin: `@capacitor-firebase/messaging` (handles the killed-state hook + APNs-token→FCM mapping that bare `@capacitor/push-notifications` lacks). Register → relay; per-kind opt-in/opt-out UI (App Store 4.5.4); deep-link handler resolves `pdn://node/<id>/app/<appId>/…` into the registry + native surface. **Background-model divergence (critique #12):** the catch-up-on-foreground contract leans on iOS foreground lifecycle; Android's background model (WorkManager vs iOS BGAppRefresh) differs — verify the contract holds on both rather than assuming the iOS lifecycle (Section 12).

### 6.6 RF-only nodes (named long tail, NOT centred)

An internet-connected pdn gateway forwards NotificationEvents it can *observe* for RF-only nodes it serves, POSTing to the relay with its own delegated, logged ingest credential. This is push-event forwarding, not management — consistent with the locked demotion of pico-management-over-RF.

---

## 7. Cross-cutting concerns

### 7.1 Node discovery

mDNS/Bonjour via `capacitor-zeroconf`: browse `_pdn._tcp` (pdn — **requires the small pdn-side advertise change, LOCKED, §4.3**) and (later) `_pico-node._tcp`; `pico-node.local` already resolves. Foreground only. iOS needs `NSLocalNetworkUsageDescription` + `NSBonjourServices` and triggers the **Local Network permission** prompt (the worst UX cliff — Section 12). Always provide manual add-by-IP/hostname + (later) BLE fallbacks so a denial isn't a dead end. Android needs a held `MulticastLock` (plugin handles it). LAN-discovered instances are HTTP-only ⇒ password login.

### 7.2 Secure credential storage

`@capacitor-community/secure-storage` (iOS Keychain / Android Keystore), keyed by `credRef`: per-node `{refresh token, AP passphrase, (later) BLE bonding key, optional TOTP secret}`. Tokens never touch plain storage. Optional biometric gate (`@capgo/capacitor-native-biometric`) for the sysop tier.

### 7.3 Build, signing, and the no-Mac pipeline (LOCKED)

**Apple account:** INDIVIDUAL Apple Developer Program (**$99/yr**). Individual enrollment is near-immediate (no DUNS, no org lead time). Tom has **no Mac** and tests on an **iPhone 17 Pro Max**.

**Build pipeline (baked into P0):** **Codemagic** (free tier, hosted **macOS M2** runners, first-class Capacitor support) is the recommended default. Flow: push to `packet-net/pdn-mobile` → Codemagic runs `npm ci && vite build && npx cap sync` → `xcodebuild archive` on Codemagic's Mac → **auto-sign via an App Store Connect API key** (uploaded once to Codemagic; no Mac, no manual certs/profiles) → upload to **TestFlight** → install on the iPhone via the **TestFlight app**. Android lanes build on Linux (`./gradlew bundleRelease`).

**The iteration model (write this down, it shapes the workflow):** *Fast iteration happens in the browser* — the Origin-A React app (Home, registry, native messaging screens) runs in `vite dev` / desktop Safari/Chrome against a live node, so day-to-day UI work needs no build at all. **Only changes that touch native code or plugins require a Codemagic build → TestFlight cycle** (new entitlement, new Capacitor plugin, native config). Plan the work so native-touching changes are batched.

**Caveats (named):**
- **No on-device debugging without a Mac.** You cannot attach Xcode/Safari Web Inspector to the device without a Mac; on-device diagnosis is via in-app logging / remote logging, not a live debugger. This is the real cost of the no-Mac path.
- **Optional escape hatch:** a **cheap Mac mini** (even a used base model) removes the no-on-device-debug limitation and gives a local `xcodebuild`/Inspector loop. Optional, not required — Codemagic covers the build+ship path without it.
- **DIY alternative:** GitHub-hosted macOS runners can do the same archive+sign+upload via Fastlane; rejected as the default because this org has no Actions budget for hosted runners and Codemagic's free tier + Capacitor integration is lower-friction. (Self-hosted Linux runners cannot build iOS.)

**Repo layout:** `packet-net/pdn-mobile`, sibling/workspace-linked to `web/packetnet-ui` so shared React types/components are a workspace dep. Provisioning profile carries Associated Domains, Hotspot Configuration, Access Wi-Fi Information, Push. The `.p8` + FCM service-account creds live only on the relay — never ship in the app.

**Plugin-currency spike (P0) (critique #13):** `capacitor-zeroconf`, `@capacitor-community/secure-storage`, `@capgo/capacitor-native-biometric`, `@capawesome-team/capacitor-wifi`, `@capacitor-firebase/messaging` are community/single-maintainer projects with abandonment + lagging-major risk. Verify each supports Capacitor 7 + current iOS/Android SDK, with a maintenance-health check, and name a fallback for each (a native Swift/Kotlin wrapper if a plugin is dead).

### 7.4 Distribution + App Review

TestFlight (internal → external) and Play (internal → closed → open). **App Review risk is real and hardened (critique #11):**
- Not a VPN/NetworkExtension (say so in review notes).
- Each sensitive permission (BLE, Local Network, WiFi-join, Push) has a specific usage string tied to a visible feature.
- **Privacy nutrition labels / Guideline 5.1.2:** declare the relay's `deviceToken↔nodeId↔delivery` metadata collection; a relay handling "who connected to whom" reads as scrutinised data collection.
- **UGC compliance (Guideline 1.2) is assumed required, not deferred:** the native messaging surfaces (BBS mail, chat, whatspac) ship with report/block/mute, an EULA with a no-tolerance-for-objectionable-content clause, and content-filtering hooks. "It's the operator's own node" is a weak defence once arbitrary stations message in. This is a direct consequence of the messaging-first product — budget for it from the first native surface.
- **Provide a persistently reachable review node with stable working credentials**, not merely a recorded provisioning-flow video (reviewers may require a live node + creds).

### 7.5 Security + privacy

- **Two-origin isolation** keeps the BLE/Keychain bridge away from node-served content.
- **HTTP-vs-HTTPS posture surfaced to the user:** LAN plain-HTTP (the mDNS-discovered path) means creds in clear; prefer HTTPS.
- **Per-node trust:** each node is an independent identity with separate stored creds; passkeys are limited to the shared public / Tailscale domain (§4.2); password is the floor everywhere.
- **Push privacy:** pointer-only payloads + metadata minimisation beyond `redactPeers` (§6.3).
- **pico-node:** open AP reads constrained to fresh-box mode (§3.2); for any self-signed pico HTTPS use TOFU/cert-pinning.

---

## 8. New components / repos

| Component | New? | Repo / location | Tier |
|---|---|---|---|
| **Mobile app** | NEW repo | `packet-net/pdn-mobile` (`appId uk.m0lte.pdn`; sibling/workspace of `web/packetnet-ui`) | bootstrap |
| **pdn `_pdn._tcp` mDNS advertise** | Small node-side change | `packet.net` node host | bootstrap |
| **Codemagic → TestFlight pipeline** | NEW config | `packet-net/pdn-mobile` (`codemagic.yaml` + ASC API key) | bootstrap |
| **pdn-bbs viewport fix** | Small upstream fix | `pdn-bbs/.../Webmail.cs:1070,1918` | bootstrap |
| **pdn panel mobile-responsiveness pass** | Upstream change | `packet.net/web/packetnet-ui` (5 tables + console) | bootstrap |
| **pdn NotificationEvent (Slice 0)** | NEW node-side | `packet.net` (`PdnEventsApi.cs`, `NodeTelemetry`; taps `SessionAccepted`) | bootstrap (foreground floor) |
| **bpqchat mobile contract (`chat`)** | NEW app-side API + native screen | `packet-net/pdn-bpqchat` + `packet-net/pdn-mobile` | core arc |
| **pdn-bbs mobile contract (`mail`)** | NEW app-side API + native screen | `packet-net/pdn-bbs` + `packet-net/pdn-mobile` | core arc |
| **whatspac mobile contract (`feed`)** | NEW daemon-side API + native screen | `m0lte/whatspacd` + `packet-net/pdn-mobile` | core arc |
| **`pdn-push-relay`** | NEW repo | `packet-net/pdn-push-relay` | early-next |
| **pdn `push:` config + ingest client** | NEW node-side | `packet.net` `Packet.Node.Core` (twin of `oarc:`) | early-next |
| **pico WiFi JSON API** | NEW firmware module | `pico-node/crates/ax25-node-fw/src/api.rs` (+ `mdns.rs`/`config_store.rs`) | later |
| **pico BLE GATT service + `43439A0_btfw.bin`** | NEW firmware capability | `pico-node` fw + `cyw43-firmware/` + `PBLB` | later, behind gating spike |

Existing repos untouched at their core: the pdn panel SPA, the app-gateway, and the pico config/OTA paths are reused, not rewritten. The messaging apps gain a *new* mobile-contract surface alongside their existing web surface.

---

## 9. Phased roadmap — bootstrap fast, then the native messaging spine, iOS-first

**iOS-first throughout** (Section 12); Android tracks each phase as a designed-for fast-follow once iOS lands. The spine: bootstrap the shell fast, then build the native messaging surfaces (the product), with push landing as soon as the first native surface exists.

**Android port stood up early (2026-06-19).** Because Android builds on Linux (no Mac) and APKs sideload freely, the shared codebase was ported while the iOS device pipeline is unavailable: the `android/` Capacitor project is committed (unlike `ios/`, which stays generated-in-CI since it needs a Mac), with the cleartext `network_security_config` (§12) and a hosted-CI debug-APK build (`.github/workflows/ci.yml`). This validates the "platform-neutral by construction" claim for the current app (registry/probe/auth/design) — the device-gated features (discovery, push, AP-join, BLE) are still §12 consult-items for BOTH platforms, not yet built.

### P-1 — Accounts & entitlements (BLOCKING for any on-device build) (LOCKED)
- **Apple Developer Program enrollment ($99/yr, INDIVIDUAL)** — near-immediate, no DUNS, no org lead time.
- **App Store Connect API key** generated and uploaded to Codemagic (enables no-Mac auto-signing).
- **Google Play Developer account ($25 one-time)** (for the Android fast-follow).
- **App IDs provisioned with all four entitlements:** Associated Domains, Hotspot Configuration, Access Wi-Fi Information, Push.
- **Exit:** an empty Capacitor app builds on Codemagic and lands in TestFlight on Tom's iPhone via the TestFlight app — the no-Mac pipeline is proven end-to-end before any feature work.

### P0 — Bootstrap: "pdn panel in your pocket" + the chassis (the fastest real thing) — bootstrap
Capacitor wrap of the live pdn panel, plus the multi-node + discovery + auth chassis the product needs, plus the proven pipeline.
- **Build:** Capacitor 7 + React skeleton; child-WebView component (Origin B); `@capacitor/network`; cleartext-LAN config (`NSAllowsLocalNetworking` / scoped `network_security_config.xml`); both schemes `https`. `NodeRecord` registry + Home; Add-Node via **LAN mDNS discovery** (`_pdn._tcp`, needs the small pdn advertise change) + manual add-by-IP + Local-Network pre-prompt; per-node `credRef` in Keychain/Keystore; native shell owns the refresh token; **password login (the floor)**; reach-resolution (`lan`/`tailscale` bounded-probe); **pico via WebView of the captive-portal form**. The Codemagic→TestFlight pipeline from P-1 carries this build.
- **Gating spikes (all must pass):** (1) `pdn_at` cookie crosses the WebView against live `pdn.m0lte.uk` in a real WKWebView; (2) **SSE survives foreground/background + WKWebView process-termination recovery**; (3) `/apps/{id}/` slot rendering; (4) **plugin-currency** check (§7.3).
- **Parallel bootstrap polish:** pdn-bbs viewport fix (`Webmail.cs:1070,1918`) + breakpoint so BBS/chat/convers render mobile-clean in the WebView interim; pdn panel mobile-responsiveness pass (5 tables + console).
- **Exit:** on iOS via TestFlight, discover a node on the LAN over mDNS, log in with a password, see live Monitor (SSE), edit + save config, open BBS/chat in-panel; add multiple nodes (pdn + pico), switch, sessions persist across restarts without re-login; a pico's config form is editable in-app. **This is the bootstrap shell — real and useful, but explicitly the floor, not the product.**

### P-native-chat — bpqchat NATIVE surface (THE CORE ARC begins) — product
The first native messaging surface and the one that shakes out the §5 contract.
- **Build:** define + implement the `chat` mobile contract (§5) — server-side mobile API in `packet-net/pdn-bpqchat` (channels/messages list+read+send + `/events` SSE + `mobile:` manifest block) and a native chat screen in `packet-net/pdn-mobile` (Origin A, CapacitorHttp + refresh-token auth, live SSE list updates). Iterate the contract shapes as this lands.
- **Exit:** a native, touch-first chat UI — list channels, read history with cursor paging, send, see new messages live over SSE — backed by the bpqchat mobile API; no WebView in the chat path.

### P-push — Push (EARLY-NEXT, now that a native surface exists) — early-next
Depends on Slice-0 ring (from P0) + P-1 Apple/FCM + the bpqchat native surface to deep-link into + a custodian decision.
- **Build:** node `push:` client; `pdn-push-relay` (APNs direct + FCM v1, authenticated ingest, signed subscription grant, token pruning, metadata minimisation, VPS deploy); app push registration + per-kind prefs + deep-link into the native chat surface.
- **Exit:** background push for inbound-connect / new chat message on iOS, tapping into the native surface; relay-down ⇒ foreground catch-up shows missed events; push fully optional (App Store 4.5.4 demonstrable).

### P-native-bbs — pdn-bbs NATIVE surface — product
- **Build:** the `mail` mobile contract (§5) in `packet-net/pdn-bbs` (folders/messages/bodies/attachments incl. 7plus-decoded + compose + `/events`) + a native mail screen in pdn-mobile; wire `mailArrived` into push.
- **Exit:** a native mail UI — folders, thread/read, compose+send, attachments — backed by the bbs mobile API; mail-arrived push deep-links into it.

### P-native-whatspac — whatspac NATIVE surface — product
- **Build:** the `feed` mobile contract (§5) served by `whatspacd` and bridged over RHPv2 + `mobile:` manifest entry + a native whatspac screen in pdn-mobile.
- **Exit:** a native whatspac UI backed by the daemon's mobile API over RHP.

### P-passkeys — Passkeys (shared public / Tailscale domain only; bonus) + iOS App Store submission — later
- **Build:** Associated Domains entitlement + AASA served by the **shared public domain**; WebView passkey ceremony on that origin; biometric gate; TestFlight → App Store with the review-notes kit (live review node + creds, UGC compliance, privacy labels).
- **Exit:** passkey login on `pdn.m0lte.uk`-class nodes; password remains the floor for all other nodes; app live on the App Store.

### P-pico-wifi — pico-node first-class over WiFi (native) — later
Depends on firmware FW-WiFi (§3.2) landing in parallel — built only because a native feature (WiFi-scan picker, status dashboard) wants structured data.
- **Exit:** provision a fresh pico over AP and LAN with a native wizard (scan → pick → save+reboot+reconnect); OTA from the app with progress + rollback safety; open-reads threat model honoured.

### P-pico-ble — pico-node BLE (GATED) + Android GA — later
- **Firmware GATE (must pass before any GATT/app work):** `cyw43`+`bluetooth`+`trouble-host` compiles, links against the frozen layout, and advertises on hardware; a measured WiFi+BLE RAM budget fits with margin. **If either gate fails, BLE is descoped.** (§3.4)
- **If gates pass:** vendor `43439A0_btfw.bin` + `PBLB`; static GATT table; bonding; coexistence soak; app BLE provisioning path.
- **Android:** bring every prior phase to Play GA (the fast-follow consummated — most code shared; the contract is platform-neutral; divergent native items are designed-for in Section 12).
- **Exit:** (if BLE survives the gate) provision a pico entirely over BLE; Android app at parity on Play.

---

## 10. Phase exit-criteria summary

| Phase | Tier | Gate to enter | Exit criterion |
|---|---|---|---|
| P-1 | prereq | — | Empty app builds on Codemagic → TestFlight on device; no-Mac pipeline proven |
| P0 | bootstrap | P-1 | LAN-discover + password login + live panel/SSE + multi-node + pico form on iOS; 4 spikes pass — **shell ships (floor, not product)** |
| P-native-chat | product (core arc) | P0 | Native bpqchat UI over the §5 `chat` contract; no WebView in chat path |
| P-push | early-next | Slice-0 + Apple/FCM + native chat | Background push → native surface; degradation proven |
| P-native-bbs | product | §5 contract proven on chat | Native BBS mail UI over the `mail` contract |
| P-native-whatspac | product | §5 contract proven | Native whatspac UI over the `feed` contract (RHP-bridged) |
| P-passkeys | later | shared-domain AASA | Passkeys (bonus) on shared domain; on App Store |
| P-pico-wifi | later | FW-WiFi lands | Native pico provision + OTA |
| P-pico-ble | later | **BLE compile+RAM gate** | BLE provision (if gate passes); Android GA |

---

## 11. Open questions + risk register

| # | Item | Severity | Mitigation / decision needed |
|---|---|---|---|
| R-1 | `pdn_at` cookie crossing the WebView (WKWebView ITP) | High | **Bootstrap gating spike** vs live HTTPS node; native cookie-stamp fallback |
| R-2 | Origin coherence — panel hard-wired same-origin, no CORS | High | WebView on node origin; never bundle the panel cross-origin |
| R-3 | Plain-HTTP LAN = creds in clear, no passkeys | Med | Prefer HTTPS; surface posture; password (the floor) works on LAN |
| R-4 | **SSE lifecycle + WKWebView process termination** | High | **Bootstrap gating spike**; reconnect + reload-on-dead-process; deep Slice-0 ring |
| R-5 | **`_pdn._tcp` mDNS advertise** is a net-new pdn-side change | Low | Small node-side change; named in §4.3 — land before P0 discovery |
| R-6 | Push relay social/metadata graph survives `redactPeers` | Med | Hash/salt binding, short retention, can't-correlate design, disclose at enrolment |
| R-7 | iOS Local Network permission cliff | High (UX) | Pre-prompt explainer; manual-add + (later) BLE fallbacks |
| R-8 | App Review (BLE+LAN+WiFi-join+push, **UGC**, privacy labels) | Med-High | Not-a-VPN notes; UGC report/block + EULA on the native surfaces; privacy labels; **live review node + creds** |
| R-9 | cyw43 0.7 no STA link-down event | Med | Driver-version review; app can't trigger re-assoc remotely |
| R-10 | **BLE unproven: compile + WiFi/BLE RAM on 264 KB part** | High | **P-pico-ble entry-gate spike** (compile/link/advertise) + measured RAM budget; descope if it fails |
| R-11 | Unauthenticated pico `:80`; open AP reads leak on provisioned box | Med | Bearer-gate writes/OTA; constrain open reads to fresh-box mode (§3.2) |
| R-12 | No hot-reload on pico — every config change reboots ~30 s | Low (UX) | Embrace "save & reconnect" |
| R-13 | **Passkey per-node-domain impossibility** (AASA build-time, per-domain) | Med | Passkeys = shared public / Tailscale domain only; password+refresh floor everywhere (both platforms) |
| R-14 | Tailnet reach not observable from another app | Low | Bounded-timeout probe, not a detected state; budget the timeout |
| R-15 | AP-join flakiness (iOS abandons no-internet Wi-Fi mid-flow) | Med | Resilient/resumable wizard; AP answers connectivity probe; manual/BLE floor |
| R-16 | Community Capacitor plugin abandonment / Cap-7 lag | Med | **P0 plugin-currency spike** + named native fallbacks |
| R-17 | **No on-device debugging without a Mac** | Med | In-app/remote logging; optional cheap Mac mini escape hatch (§7.3) |
| R-18 | **§5 mobile contract is a design, not yet validated** | Med | Iterate it on bpqchat (P-native-chat) before BBS/whatspac adopt it |
| Q-1 | Subscription-binding: signed grant vs pairing-code? | — | Name before P-push — prefer signed grant |
| Q-2 | Relay hosting: own VPS vs OARC co-host? | — | Decide before P-push; OARC co-host is the coherent custodian story |
| Q-3 | Convers default `ui.mode` resolution (WebView interim) | — | **Resolved-ish:** viewport present (`WebChat.cs:484`), no explicit `mode:` — confirm default renders as a slot tile during the bootstrap |
| Q-4 | Does convers get a native `feed` surface too, or stay WebView? | — | Defer; bpqchat/bbs/whatspac are the locked three |
| Q-5 | App repo: monorepo with `packet.net` or sibling? | — | **Resolved:** separate repo `packet-net/pdn-mobile`, workspace-linked to `web/packetnet-ui` |

**Decisions resolved by the locked steer (no longer open):**
- **Product driver** — native messaging UX (BBS/chat/whatspac) + push + native-only capabilities; WebView is scaffolding. RESOLVED (§1).
- **Apple account** — INDIVIDUAL ($99/yr), no Mac, Codemagic→TestFlight via ASC API key, install via TestFlight; fast-iterate-in-browser / native-changes-need-a-build; no-on-device-debug caveat; optional Mac mini. RESOLVED (§7.3, P-1).
- **Auth floor** — password required everywhere; passkeys a bonus on the shared-public / Tailscale domain only. RESOLVED (§4.2).
- **LAN discovery** — mDNS `_pdn._tcp` (small pdn advertise change); LAN = HTTP-only ⇒ password; native-only capability. RESOLVED (§2.3, §7.1).
- **pico v1** — WebView-only (captive-portal form); native/BLE later, gated. RESOLVED (§3).
- **Repo / appId** — `packet-net/pdn-mobile`, `uk.m0lte.pdn`. RESOLVED (§8, header).
- **Push timing** — early-next (right after the first native surface), not indefinitely deferred. RESOLVED (§6, P-push).

---

## 12. iOS-first sequencing + Android compatibility — CONSULT BEFORE COMMITTING

**Locked guardrail:** ship iOS first; Android is a deliberate, designed-for fast-follow, NOT dropped. Every component's *design* stays Android-portable; only build-out *order* is iOS-first. The contracts (the §5 mobile messaging contract, pico WiFi JSON API, BLE GATT, relay protocol, pdn auth) are platform-neutral by construction — they are device/server-side and identical for both phones. The divergence is entirely in the app's native plugin layer.

The roadmap builds iOS through the native surfaces and push, then P-pico-ble brings Android to GA. **Every item below is an iOS-only or Android-divergent choice Tom must weigh before we build it — do not silently bake the iOS shortcut in.** Each lists the portable alternative.

| Choice | iOS approach | Android divergence | Portable alternative / consult point |
|---|---|---|---|
| **Joining the pico AP** | `NEHotspotConfiguration` (Hotspot Config entitlement); system join dialog; nil error = *config added* not *connected*; iOS abandons no-internet Wi-Fi mid-flow | `WifiNetworkSpecifier` — scoped, app-only binding; different lifecycle + UX, not a persistent system join | Models genuinely differ. **Consult:** treat AP-join as best-effort; portable floor = manual "join `pico-<callsign>` yourself" + (later) BLE; wizard resilient to mid-flow AP loss |
| **mDNS / LAN discovery** | iOS **Local Network permission** prompt + `NSLocalNetworkUsageDescription` + `NSBonjourServices`; denial silently kills discovery | Held `MulticastLock` + `ACCESS_FINE_LOCATION`; no system-modal cliff, but some APs block mDNS | **Consult:** the iOS Local-Network cliff is the worst UX risk. Pre-prompt explainer, manual add-by-IP always available, BLE fallback. (LAN discovery is a locked bootstrap capability, so this cliff is on the critical path.) |
| **Passkeys / WebAuthn RP origin — PER-NODE DOMAIN LIMIT** | WKWebView passkeys need **Associated Domains** baked into the binary at build time; AASA fetched per declared domain; HTTPS-from-verified-domain only | **Credential Manager** + **Digital Asset Links** (`assetlinks.json`) — identical per-domain, build-time constraint | **Consult before committing the passkey path:** you CANNOT enumerate every operator's `.ts.net`/LAN origin; `.ts.net` apex isn't yours. So passkeys are a bonus ONLY for a shared public / Tailscale domain (`pdn.m0lte.uk` / future `*.nodes.packet.net`). **Password+refresh is the universal floor on BOTH platforms** — not an iOS shortcut, a structural limit |
| **Accounts & entitlements asymmetry** | **Apple Developer Program $99/yr (INDIVIDUAL) required even for TestFlight; `.p8` + Push/Associated-Domains/Hotspot/Access-WiFi entitlements; build+sign on Codemagic (no Mac) via ASC API key** | Play $25 one-time; `POST_NOTIFICATIONS` runtime perm (Android 13+); FCM via `google-services.json` | **Consult:** the iOS account/entitlement burden is heavier and gates on-device builds. Individual enrollment chosen (near-immediate; no DUNS). The relay holds the `.p8`/FCM creds, never the app |
| **No-Mac build + debug** | Codemagic builds/signs/uploads to TestFlight; **no on-device debugger without a Mac** (in-app/remote logging only); optional cheap Mac mini restores Inspector | Android builds on Linux self-hosted; `adb logcat` + on-device debug available without extra hardware | **Consult:** the no-on-device-debug limitation is iOS-specific. Optional Mac mini removes it; not required for ship |
| **Bundled-origin scheme / secure context** | `iosScheme=https` for secure context | `androidScheme=https` (default) | Set both to `https` — portable; needed for crypto on the app's own origin |
| **Cross-origin node calls / cookies** | WKWebView isolates cookies, blocks 3rd-party; use **CapacitorHttp** (shared `WKProcessPool` jar) | System WebView has its own cookie/origin/mixed-content quirks; CapacitorHttp applies but the engine differs | **Consult:** same-origin WebView design avoids most of this; verify `pdn_at` cross-WebView on BOTH engines — iOS ITP is the hard case, don't assume Android is free |
| **WebView process termination / background lifecycle** | WKWebView terminates the web-content process under memory pressure (blank page on return); EventSource dies on background | Android System WebView doesn't terminate the same way; recovery code is iOS-specific | **Consult:** the process-termination recovery + reload is an iOS-specific path; verify the foreground-catch-up contract still holds on Android |
| **Background fetch / catch-up model** | iOS **BGAppRefresh** (OS-scheduled, sparse); catch-up leans on foreground lifecycle | Android **WorkManager** (more permissive background) | **Consult:** the catch-up contract is foreground-on-resume by design (portable); don't bake an iOS-foreground-only assumption that breaks Android's different background model |
| **Push transport** | **APNs** (`.p8`, `aps-environment`, Push capability) — relay talks APNs directly | **FCM** (`google-services.json`, runtime `POST_NOTIFICATIONS`) | Relay speaks BOTH (APNs direct + FCM v1) — protocol platform-neutral; only token registration differs (`@capacitor-firebase/messaging`) |
| **BLE permissions / background** | `NSBluetoothAlwaysUsageDescription`; no State Restoration in the community plugin; avoid `bluetooth-central` background mode | `BLUETOOTH_SCAN`/`BLUETOOTH_CONNECT` (12+) + location-or-`neverForLocation` scan flag | **Consult:** keep BLE foreground-only on both — portable, avoids the iOS background-restoration gap + review questions (and BLE itself is gated, §3.4) |
| **App Transport Security / self-signed LAN** | `NSAllowsLocalNetworking=true` (no-justification ATS opt-out for RFC-1918/`.local`); never `NSAllowsArbitraryLoads`; TOFU/pin self-signed | `network_security_config.xml` — **DECIDED (default, flagged): app-WIDE `cleartextTrafficPermitted`**, because Android matches cleartext by hostname/domain only (no RFC-1918 CIDR matcher like iOS) and the app supports IP-literal LAN nodes, so a domain allow-list can't cover them. Committed at `android/app/src/main/res/xml/network_security_config.xml` with the rationale inline | The intents differ: iOS auto-scopes to RFC-1918+.local; Android can't, so it's broader. The app only ever calls operator-configured node addresses. **HARDENING (consult):** tighten to a discovered-node allow-list once mDNS discovery lands. Keep the pico AP portal plain-HTTP so neither platform needs a cert |
| **SSID read** | needs Location + Access-Wi-Fi-Information entitlement | needs `ACCESS_FINE_LOCATION` | Portable: both gate SSID read behind location; design AP-join verify to tolerate "SSID unreadable" |
| **Distribution** | TestFlight + App Store (stricter, done first) | Play internal→closed→open (lighter) | Doing the stricter iOS review first de-risks Android; review-notes kit reusable |

**Net:** nothing in the iOS-first build forces an Android-incompatible decision **provided** we (a) keep AP-join and BLE-background as best-effort with manual/BLE/foreground fallbacks, (b) accept passkeys are shared-public/Tailscale-domain-only on BOTH platforms with password+refresh as the universal floor, (c) set both WebView schemes to `https`, (d) route native node calls (incl. the §5 messaging contract) through CapacitorHttp, (e) keep the relay dual-stack (APNs+FCM), and (f) treat the catch-up contract as foreground-on-resume rather than an iOS-background-only path. Each is flagged above as a consult-before-committing item rather than silently baked in.

---

## Appendix — citation map (research stream → load-bearing decisions)

- **R1 (panel reuse):** WebView-on-node-origin; same-origin/no-CORS wall (verified no CORS); SSE in-WebView; 5 table screens need a mobile pass; pico = WebView of the existing form. **Re-spined: panel/config reuse is bootstrap scaffolding, not the product.**
- **R2 (auth + API contract):** no native-app audience (login+refresh); refresh-token-in-Keychain; CORS only if native fetch; passkeys limited to a declared shared/Tailscale domain (revised: per-node `.ts.net` is impossible) — **password is the universal floor, passkeys a bonus**; per-node identity; `X-Pdn-*` injection underpins the §5 native contract.
- **R3 (pico WiFi+BLE):** WiFi JSON API + bearer gate + mDNS + WiFi-scan; **BLE corrected to unproven** (no `bt-hci`/`trouble`/`bluetooth` on disk; crate workspace-excluded, deps unfetched); no hot-reload; no STA link-down; WiFi-first, BLE-gated; **pico = WebView-only for v1 (locked)**.
- **R4 (catalog + surfacing):** catalog = DAPPS/BPQ Chat/Convers/BBS; chat+bbs+convers surfaceable in the WebView interim, DAPPS/whatspac not catalog apps; bbs missing viewport meta (`Webmail.cs:1070,1918`, verified) is the one hard WebView blocker; convers viewport already present + no explicit mode (resolved on disk); `pdn_at`-cross-WebView the top bootstrap integration risk. **Re-spined: the destination is the native §5 contract (chat/bbs/whatspac), not the iframes.**
- **R5 (push + degradation):** Slice-0 NotificationEvent prereq (`SessionAccepted` library-only, verified); OARC-pattern relay with authenticated ingest; pointer-only payloads + metadata minimisation beyond `redactPeers`; **push reframed as EARLY-NEXT (after the first native surface), not optional-maybe-never**; RF-gateway forwarding the long tail.
- **R6 (Capacitor shell):** Capacitor 7 + two-origin; plugin matrix (+ currency spike); multi-node registry; entitlements/ATS/signing/review (+ UGC + privacy labels); **INDIVIDUAL Apple account + Codemagic→TestFlight no-Mac pipeline (locked)**; CapacitorHttp cookie handoff; pico=WebView-then-native seam; **repo `packet-net/pdn-mobile`, appId `uk.m0lte.pdn`**.
