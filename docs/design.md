# pdn-mobile design language

> "A precision instrument tuned to your stations."

This is the canonical design system for pdn-mobile. The P0 shell (roster, add-node,
login, settings, webview host) is built to it, and the native messaging surfaces
(BBS / chat / WhatsPac — the real product) inherit it. Tokens live in
`src/styles/tokens.css`; component styles in `src/index.css`.

## Thesis

A packet operator's companion should feel like bench equipment, not a generic app.
The visual world is the operator's: a navy-slate equipment housing, an amber
dial-light, a teal "carrier/linked" signal, transmit-red for on-air/critical. Dark
is the lead (night-bench); light is a clean cool-paper daytime variant — deliberately
**not** the AI-default cream/serif/terracotta, near-black/acid, or broadsheet looks.

## Colour (semantic, theme-aware)

| Token | Dark | Light | Meaning |
|---|---|---|---|
| `--ink` / `--ink-2` | `#0E1419` / `#0A0F13` | `#EEF1F4` / `#E4E9EE` | app / under-content background |
| `--panel` / `--panel-2` | `#151D26` / `#1B2530` | `#FFFFFF` / `#F3F6F9` | surfaces / raised |
| `--line` / `--line-strong` | `#25303D` / `#34424F` | `#DCE3EA` / `#C4CFD9` | hairlines / dividers |
| `--text` / `--muted` / `--text-tertiary` | `#E8EBEE` / `#8A97A6` / `#828E9C` | `#14202B` / `#5A6675` / `#647080` | text tiers (all ≥4.5:1) |
| `--faint` | `#586473` | `#8492A1` | **decorative / disabled only — never readable text** |
| `--signal` (amber) | `#F4B23E` | `#8C5E0F` | primary accent; **direct reach** (LAN/AP) |
| `--link` (teal) | `#45C2C8` | `#128A90` | **remote link** (Tailscale); carrier/linked |
| `--transmit` (red) | `#E5544B` | `#C8392F` | on-air / error / critical |

Reach colour is load-bearing and consistent across the meter and the pills:
**direct = amber, remote link = teal.** Light-mode amber is deepened so accent text,
the active tab, and the focus ring clear WCAG; on-amber text is near-black (`--on-signal`).

`--faint` is for decoration/disabled states only — readable tertiary text uses
`--text-tertiary`. The two light-palette blocks (`@media` auto + `[data-theme]`) are
hand-maintained duplicates; **any palette change must be applied to both.**

## Type

- **Body:** `system-ui` — real SF Pro on iOS, genuinely native.
- **Display:** `Saira Variable` — condensed technical face for eyebrows, titles,
  section + field labels, pills, buttons (the "equipment silkscreen" voice).
- **Mono:** `IBM Plex Mono` — callsigns, grids, origins, IDs, status numerals. The
  "wire identity," true to packet radio.

Scale: `--t-eyebrow` 11 · `--t-meta` 12 · `--t-body` 15 · `--t-row` 16 · `--t-title`
18 · `--t-screen` 24 · `--t-display` 32 (hero numerals, e.g. the roster count).

## Signature: the S-meter

`SignalMeter` (`src/components/SignalMeter.tsx`) — an abstract carrier/S-meter of
rising bars on every roster row. Bar **height = reachability/health** (full when a
reach responds, none when down); **colour = transport** (amber direct, teal linked).
Height is intentionally NOT bucketed from RTT — on LAN-vs-tunnel that measures the
transport, which colour already conveys (see `src/registry/status.ts`). When live
probing lands (P1), partial bars can encode real quality/freshness — or real RF link
reports, the meter's natural meaning for a packet node. The motif carries into
messaging (per-thread carrier / unread activity). The `live` peak-bar carrier pulse
respects `prefers-reduced-motion`.

## Structure & restraint

The hero is the roster, and each row leads with its meter — an operator scans signal
first, then the mono callsign, the plain name, the reach. The screen header is a
status readout (`N online · M offline`) with the count promoted to the hero numeral,
because that's the fact an operator actually scans for. Numbered markers are avoided
(the roster isn't a sequence). One bold thing — the meter — and everything around it
stays quiet.

## Quality floor

Responsive to mobile, dark + light parity, visible `:focus-visible`, `prefers-reduced-motion`
respected, ≥44px primary tap targets (tab bar, navbar actions), live regions on the
webview connect/error states, list semantics on the roster. Established via an
adversarial multi-lens review (design / a11y / React-TS / CSS / coherence) before
this system was committed.
