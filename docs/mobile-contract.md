# pdn mobile contract — the app → native data + event API

**Status:** Design, ready to implement. This is the concrete form of `docs/plan.md` §5, grounded in the real apps (`pdn-bpqchat`, `pdn-bbs`, `whatspacd`) and the live app-gateway, and hardened by an adversarial review. `chat` (bpqchat) is the reference surface; `mail` and `feed` follow the same core.

**Audience:** implementers of an app's server-side surface (in that app's repo), the node-side gateway binding (`packet.net`), and the native screens (`pdn-mobile`).

---

## 1. The model

A messaging app exposes a **structured JSON + SSE data API on its existing loopback HTTP server**, under a `/m/v1` path prefix. `pdn-mobile` reaches it **only through pdn's app-gateway**, as an authenticated HTTP client identical to the web UI:

```
phone ──HTTPS──▶  https://<node>/apps/<id>/m/v1/<path>   (Bearer JWT)
                  └─ app-gateway: auth + X-Pdn-* inject + strip /apps/<id> ─▶  http://127.0.0.1:<port>/m/v1/<path>
```

**The phone never speaks RHPv2** — that is the node's internal packet plane (loopback/LAN-trusted, no remote-auth/TLS). The phone is a plain authenticated HTTP client of the gateway, same `pdn_at`/Bearer auth and same `X-Pdn-*` identity injection the web surface already uses.

**Correction to the §5 draft (verified):** whatspac is **not** an "RHP bridge to the phone." `whatspacd` already serves HTTP+SSE on a loopback port and is reverse-proxied under `/apps/whatspac` like any app; RHP is only `whatspacd`'s *own outbound link* to WhatsPac. There is **no phone-facing RHP bridge to build** — the feed shape is ordinary `/m/v1` handlers on `whatspacd`, exactly like the other two.

**What already works (no gateway transport change needed):** the gateway proxies all seven HTTP methods, **streams SSE through unchanged**, and on every `/apps/*` request strips client-supplied identity headers and injects validated `X-Pdn-User` / `X-Pdn-Scope` / `X-Pdn-Gateway` / `X-Forwarded-Prefix`. The only node-side change v1 needs is teaching the node about the `mobile:` manifest block (§3).

---

## 2. The `mobile:` manifest block

An app declares a native surface with a new top-level `mobile:` block in `pdn-app.yaml`, sibling to `ui:`. The manifest binder uses `IgnoreUnmatchedProperties` behind a `manifest: 1` gate, so a `mobile:` block is a **safe no-op on older nodes** — apps can ship it ahead of node support.

```yaml
ui:                          # optional: the existing web surface (interim WebView path)
  mode: slot
mobile:                      # NEW: declares a native surface
  contract: chat             # REQUIRED enum: chat | mail | feed (closed set, kebab-case; unknown → validation error, never silently defaulted — the client switches its whole screen on this)
  base: /apps/bpqchat/m/v1   # REQUIRED. Informational for the client (the gateway does NOT read it). By convention /apps/<id>/m/v1; the app MUST actually serve /m/v1/* on its loopback server.
  apiVersion: 1              # OPTIONAL int (default 1). The contract major the app implements.
  events: [message, presence]# OPTIONAL: SSE kinds emitted at base/events. Empty/absent → poll-only, no live stream.
  push: [message]            # OPTIONAL: subset of events eligible for pointer-only push. Empty/absent → no push.
```

An app MAY declare both `ui:` and `mobile:` (web fallback + native). DAPPS/LOBBY declare neither.

---

## 3. Node-side changes required (packet.net)

These are the **only** node/gateway changes for v1 — they are shared infra, built once (build step 0–1):

1. **Bind the block.** Add `AppMobileConfig { AppMobileContract Contract; string Base; int ApiVersion = 1; IReadOnlyList<string> Events; IReadOnlyList<string> Push }` + enum `AppMobileContract { Chat, Mail, Feed }`; add a `Mobile` property to **both** `AppPackageManifest` and the inline `ApplicationConfig` (mirroring the shared `AppUiConfig`); add the kebab-case enum binder + `List<>` type-mappings in `AppPackageManifestYaml` (mirror `AppUiMode` / `AppForwardSpec`). Extend the catalog "at least one surface" rule so a **mobile-only** app (no `ui:`) is valid.
2. **Surface it on `GET /api/v1/apps`.** Widen the feed filter to also include apps where `Mobile != null` (union with the `ui` set; inline-wins-on-id-collision unchanged), and add a nullable `mobile { contract, base, apiVersion, events[], push[] }` object to the `AppTile` record. `pdn-mobile` renders a native tile when `tile.mobile != null` and dispatches by `contract`.
3. **⚠ Widen the reverse-proxy upstream resolver too (review blocker).** The proxy at `/apps/{id}/{**rest}` resolves the upstream by filtering on `Ui != null` — so a **mobile-only app would 404 at the proxy** even after appearing in the feed. The resolver MUST accept apps where `Mobile != null` and resolve the single shared `Upstream` (today `ui.upstream`). Without this, only apps that *also* declare `ui:` would work.

No `appsettings` / YARP route config is involved — it's the existing Minimal-API `MapMethods` endpoint + the custom `HttpTransformer`.

---

## 4. Core conventions (shared by all shapes)

### 4.1 Transport & prefix
One loopback upstream per app (the same server `ui.upstream` already names) serving `/m/v1/*`. The gateway matches `/apps/{id}/{**rest}`, strips `/apps/{id}`, forwards `<upstream>/m/v1/<path>` with the query string **preserved**. Use the trailing-path form — bare `/apps/{id}` (no slash) serves the SPA shell and is **not** proxied. Content type `application/json; charset=utf-8` everywhere except attachment fetch (`application/octet-stream`) and SSE (`text/event-stream`).

### 4.2 Auth + scope
The phone authenticates with `Authorization: Bearer <access_token>` — a **control-API-audience** JWT (the same login/refresh the SPA uses), scope `read` or higher. It MUST NOT rely on the `pdn_at` cookie (a browser-navigation affordance, `Path=/apps`). An MCP-audience token is rejected. A native `401` is returned **bare** (the 401→login-302 break-out is browser-only), so the phone refreshes/re-logs-in on `401`.

The gateway policy only enforces **`read`** at the boundary. **Write-scope enforcement is delegated to the app** reading `X-Pdn-Scope` — so it is a hard, testable per-app obligation, not prose. The normative matrix (every mutating endpoint requires `operate` or higher; a `read` token is a lurker → `403 forbidden_scope`):

| Endpoint | Scope |
|---|---|
| all `GET …` (lists, detail, events, attachments, presence) | `read` |
| `POST …/channels/{id}/messages`, `POST …/dms` (chat) | `operate` |
| `POST …/messages`, `POST …/messages/{n}/read` (mail) | `operate` |
| `POST …/threads/{id}/messages`, `POST …/threads/{id}/subscription` (feed) | `operate` |

**Auth-off exposure (review, security):** when `management.auth.enabled` is **off**, identity injects empty = node-owner = full access. A node serving the mobile contract to a **non-loopback/non-LAN** client with auth off would hand owner access to any reachable phone. The contract's rule: **do not expose the mobile surface to a remote client with auth off** — it is intended for the authenticated path (Tailscale/public HTTPS with auth on, or trusted LAN). Documented as an operator constraint, surfaced in the app onboarding.

### 4.3 Identity headers
On every proxied request the gateway removes client-supplied `X-Pdn-*` then injects: `X-Pdn-User` (authenticated username, **empty** when auth off/anonymous), `X-Pdn-Scope` (the scope claim, empty if none), `X-Pdn-Gateway: 1`, `X-Forwarded-Prefix: /apps/{id}` (the mount point, **not** including `/m/v1`). The app MUST `403` any request **lacking `X-Pdn-Gateway: 1`** (the loopback trust boundary; the app binds loopback so only the gateway reaches it). Identity truth table:

| `X-Pdn-User` | `X-Pdn-Scope` | meaning |
|---|---|---|
| empty | empty | auth **off** → node owner, full access (each app's degrade-to-owner rule) |
| set | set (`read`/`operate`/`admin`) | auth **on** → that user at that scope |
| set | empty | cannot occur under auth-on (the `read` gate requires a scoped token) |

A pdn username maps to an app identity (bpqchat: claims-table callsign; pdn-bbs: `User.PdnUsername`→callsign; whatspacd: provisioned callsign). An **unmapped/unclaimed** user gets `409 identity_unclaimed`, which the native client surfaces as an in-app claim prompt — **not** a hard failure of the whole tile.

### 4.4 Pagination & cursors
Cursor-based, forward-only. `since=<opaque cursor>` returns items **strictly after** the cursor, **oldest-first**; `limit=<n>` caps the page (default 50, max 200). Omitting `since` returns the most recent `limit` items oldest-first (cold-start backfill). Every list response uses one envelope:

```json
{ "items": [ … ], "nextCursor": "<opaque>", "hasMore": false }
```

`hasMore: true` means more items exist after `nextCursor` (page was limit-capped) — keep paging. **On an empty result, `nextCursor` is the current tip cursor** (the same value the SSE `hello` frame carries), so a cold-start with no items still yields a seed for incremental polling (review fix — otherwise the cold-start→poll handoff has no cursor).

The cursor is **opaque base64url**; clients MUST treat it as a blob and never parse it. **The shared artefact is only the envelope framing + the `{items,nextCursor,hasMore}` shape + the "`since=` is exclusive as observed by the client" rule** — each shape mints its *own* internal cursor (chat: ns timestamp + synth-id tie-break; mail: `Message.Number`; feed: normalised ms), so there is no single cross-shape cursor codec (review fix — the "one shared helper" was a fiction). **Cursor opacity is client ergonomics, not a security boundary** (a `Number` is trivially enumerable): the server MUST apply the same per-user visibility filter on the `since=`/list path as on detail `GET`, and tolerate arbitrary/forged cursors (`410 cursor_expired` on an unresolvable one).

### 4.5 Errors
Uniform envelope on every non-2xx (except SSE + attachment streams, which use bare status):

```json
{ "error": { "code": "<machine_token>", "message": "<human text>" } }
```

`400 invalid_request` · `401 unauthenticated` (bare) · `403 forbidden_scope | forbidden_gateway` · `404 not_found` (also "not yours" per the BBS `CanRead` 404-not-403 rule, to avoid leaking existence) · `409 identity_unclaimed | conflict | recipient_offline` · `410 cursor_expired` · `413 payload_too_large` · `429 rate_limited` · `503 dependency_unavailable` (e.g. whatspacd's outbound link down).

### 4.6 Versioning
Path-versioned major (`/m/v1`). The manifest declares `apiVersion` (the pre-flight contract the client checks). The app echoes `X-Pdn-Mobile-Api: <major.minor>` carrying its **actual implemented minor** so the client can feature-detect within v1 (review fix — otherwise it duplicates the manifest). Within v1, fields are added backward-compatibly (ignore unknown JSON fields both ways). A breaking change bumps to `/m/v2` (a new subtree; old clients never call it) with the manifest `base`/`apiVersion` updated together.

### 4.7 SSE event stream
`GET /m/v1/events` (`text/event-stream`), proxied unbuffered, is the single live channel per app. Named frames: the `event:` line is the kind; `data:` is `{ kind, ts (unix ms), cursor (opaque, == that item's list cursor), …summary }`; the `id:` line is the same cursor (records `Last-Event-ID`).

- **Resume:** the client reconnects with `?since=<cursor>` (preferred) or the `Last-Event-ID` header; the app replays strictly after that cursor (bounded backfill, e.g. last 200) then goes live — no gap, no full replay. On a cold connect it sends one `event: hello` `{cursor: <current tip>}` so the client learns the tip.
- **Summary completeness (review fix):** an SSE `…summary` SHOULD carry enough to **upsert a list row without a fetch** (e.g. mail's `message` event includes `from/subject/folder`). Where it genuinely can't, the event is **poke-only** and the client backfills via `since=`; each shape states which it is. `presence` is a **cursorless snapshot** event (no per-item cursor; `ts` = server-now).
- **Keepalive (review fix — testable obligation):** the app MUST emit an SSE comment (`": ping\n\n"`) **at least every 20 s** to stay under the gateway's fixed 100 s `ActivityTimeout`. v1 does **not** change the gateway timeout — keepalive is the contract obligation, and each app's SSE test MUST assert a comment arrives within 20 s on an idle stream. On stream drop the client reconnects with its last cursor.
- The gateway does **not** proxy WebSockets — SSE is the mandatory live transport. An app with no event bus (pdn-bbs today) serves a **poll-backed** stream server-side but still presents it as SSE.

### 4.8 Body encoding
Packet text is Latin-1-ish bytes. Message `text`/`body` fields are a **best-effort UTF-8 display projection** and are **not** guaranteed byte-faithful. A client that must quote/forward verbatim fetches a raw body endpoint (`…/raw`, `application/octet-stream`) — the same pattern as attachments. (v1 surfaces the display projection; the raw endpoint is per-shape, mail first.)

### 4.9 Testability (device vs web-dev)
- **On device:** the transport is **CapacitorHttp** (native) — no CORS, `Authorization: Bearer`, raw SSE. This is the real path.
- **Web dev/test:** pdn serves **no CORS**, so a browser at `http://localhost:5173` cannot call `https://<node>/apps/...`. Tests run against a **same-origin mock** implementing the `/m/v1` contract (so no CORS) — never point the browser cross-origin at a real node. The native screen is built + screenshotted against the mock, then validated on device against the real app. (Same shape as the auth/probe slices.)

---

## 5. The three shapes

All endpoints are under `…/m/v1` (i.e. `/apps/<id>/m/v1/...`). Lists use the §4.4 envelope.

### 5.1 `chat` (bpqchat) — reference surface, FIRST
- `GET /channels` → list of `{ id, name, topic?, unread? }`.
- `GET /channels/{id}/messages?since=&limit=` → `message` items `{ channel, id, from, node, text, ts, cursor }`.
- `POST /channels/{id}/messages { text }` → the created message (`operate`).
- `GET /channels/{id}/presence` → `{ call, state }[]` snapshot.
- `GET /dms` / `POST /dms { to, text }` → direct messages (same paging/resume as channels).
- `GET /events` → `message`, `presence`, optional `dm`.
- **Impl note (review — major):** the existing history query returns the *newest* N after a cursor; the `since=` path needs a **forward (oldest-first ASC) query** (`WHERE ts_unix_ns >= ? ORDER BY ts_unix_ns ASC LIMIT ?`) with `hasMore` via a `limit+1` probe, or a large-gap backfill silently skips the middle. Require the sqlite store (the ns column gives a real tie-break; `MemStore` is test-only). All chat data already exists in `chat.Hub` — only the thin `/m/v1` handlers + a wire message id + cursor encoding are net-new.

### 5.2 `mail` (pdn-bbs) — SECOND (richest)
- `GET /folders` → `{ id, name, unread, total }[]` (the derived-folder model: INBOX, Sent, Bulletins, …).
- `GET /folders/{id}/messages?since=&limit=` → summaries `{ number, folder, from, subject, ts, cursor }`.
- `GET /messages/{number}` → full `{ …summary, to, body, attachments: [{ name, size, kind }] }` (incl. 7plus-decoded attachments).
- `GET /messages/{number}/attachments/{name}` → `application/octet-stream`.
- `POST /messages { to, subject, body }` → created (`operate`).
- `POST /messages/{number}/read` → mark read (`operate`). **`GET` does NOT mark-read** — list + detail stay pure/cacheable (review recommendation; matches an explicit-read model, not webmail's read-on-open).
- `GET /events` → `message` (poll-backed SSE; bbs has no event bus today).
- **Impl note (review):** `nextCursor`/`hasMore` are computed **within the folder's query** (per-filter), not from a global `max(Number)`; the poll-backed SSE MUST filter each new `Number` through `CanRead` + the viewer's **derived-folder membership** before emitting (a `Number` cursor is enumerable — visibility is enforced server-side, returning `404` not `403` for not-yours). Zero node-side work beyond the shared core; all the work is the BBS JSON adapter.

### 5.3 `feed` (whatspacd) — THIRD
- `GET /threads` → `{ id, kind: "channel"|"dm", name, with?, unread? }[]` — channels **and** DMs under one tile, disambiguated by `kind` (recommended; see open decisions).
- `GET /threads/{id}/messages?since=&limit=` → `{ thread, id, from, text, ts, cursor }`.
- `POST /threads/{id}/messages { text }` → **`202 Accepted`** (`operate`). **Review blocker:** whatspacd sends are fire-and-forget/queued when the outbound link is down — it cannot synchronously `503`. The feed POST therefore returns `202` (accepted, deferred delivery), and the `status` event reports link health; it does **not** promise delivery on the POST.
- `POST /threads/{id}/subscription { subscribed }` → (`operate`).
- `GET /presence` → `{ call, online }[]` snapshot (cursorless).
- `GET /events` → `message`, `presence`, optional `status { linkUp }` (whatspacd's outbound WPS link health).
- **Impl note (review — major):** whatspacd's DM `_id` is ms but its DM `ts` column is **seconds** within the same record — define the feed cursor as **ms derived from the ordering field** and order both sub-shapes by a normalised ms value, reconciling DM `_id` (ms) against `ts*1000`. Its `/api/events` emits raw store objects with no envelope → the `/m/v1` layer wraps them in the standard envelope. No node-side bridge — whatspacd already HTTP+SSE behind the gateway.

---

## 6. Push (pointer-only, post-v1)

Deferred to a post-v1 slice; nothing app-side except the `mobile.push[]` declaration. A **new node service** (not the gateway — it has no push infra) subscribes to each mobile-capable app's `/m/v1/events` SSE (the node is a trusted loopback client), filters to the `push[]` kinds, and emits **pointer-only** APNs (later FCM) notifications carrying no message content — just a deep link `pdn://node/<nodeId>/app/<appId>/<kind>/<ref>` into the native surface. **The push service MUST apply the per-shape visibility filter** (bbs `CanRead`, chat claim/topic membership, whatspacd subscription), fetching as the entitled user, **before** emitting any pointer — the pointer + the entitlement re-check are the sensitive boundary, not the (absent) payload. Requires a control-API device-registration endpoint + a deep-link resolver in pdn-mobile.

---

## 7. Per-app fit, node-side work, build order

| App | Shape | Fit | Node-side (pdn) work | App-side work |
|---|---|---|---|---|
| bpqchat | chat | **clean** | shared core only | thin `/m/v1` handlers; wire msg id + cursor; upgrade `/events` resume |
| pdn-bbs | mail | with-work | shared core only | new JSON adapter (folders/messages/attachments/compose/read) + poll-backed SSE |
| whatspacd | feed | with-work | shared core only | `since=` store queries + cursor ms-normalisation + `/m/v1` aliases + SSE envelope |

**Build order:** **0** core/node: bind `mobile:` (§3.1). **1** core/node: surface on `/api/v1/apps` **+ widen the proxy resolver** (§3.2/§3.3). **2** freeze the shared envelope/cursor/error/SSE rules (this doc) + a tiny per-language helper. **3** bpqchat `/m/v1` (reference impl). **4** pdn-mobile native **chat** screen against it — validate the core end-to-end on the lab. **5** pdn-bbs mail + native mail screen. **6** whatspacd feed + native feed screen. **7** push (early-next, after v1).

---

## 8. Open decisions (maintainer)

1. **SSE idle timeout** — v1 relies on the app's ≤20 s keepalive under the gateway's fixed 100 s timeout. Accept as the contract obligation (recommended), or add a per-path longer `ForwarderRequestConfig` for `/m/v1/events` (needs a branched route)?
2. **Identity richness** — today only `X-Pdn-User` + `X-Pdn-Scope` are injected. Native headers/avatars want callsign + display-name. Inject `X-Pdn-Callsign` / `X-Pdn-Display` in the gateway (claims exist on the principal — one place, helps all surfaces; recommended), or have each app resolve them from `X-Pdn-User`?
3. **Unclaimed identity** — `409 identity_unclaimed` → an in-app claim prompt (vs blocking the tile). And: claim from the native client (a `/m/v1/claim` `POST`, `operate`) or only via the existing web claim form for v1 (recommended)?
4. **whatspacd shape** — model channels **and** DMs/presence under the single `feed` tile via a thread `kind` discriminator (recommended), or feed-only (channels/posts) in v1?
5. **bbs NTS Traffic (type T)** — expose as a fourth folder, fold into another surface, or omit from mobile mail v1?
6. **Read side-effect** — `GET /messages/{n}` stays pure with an explicit `POST …/read` (recommended), or mark-read on open like webmail?
7. **Push** — confirm post-v1 (foreground SSE only for v1), APNs-first (individual Apple acct), pointer-only, and that `<nodeId>` in the deep link is the stable node identity the phone already holds from login.
