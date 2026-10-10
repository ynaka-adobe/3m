# 3M Edge Delivery Services POC — Solution Design

**Audience:** 3M IT, security review, and any engineer onboarding onto this proof-of-concept.
**Status:** Living document — reflects the system as of 2026-10-09.

---

## 1. Purpose & Scope

This POC demonstrates an Adobe **Edge Delivery Services (EDS)** website for 3M, built to show:

- Authoring a marketing site in a document-based, Markdown-based, Agentic CMS called Document Authoring ("DA") that renders directly to server-generated HTML pages - as part of a Performance-First Architecture
- Client-side analytics instrumentation feeding **Adobe Analytics** (Analysis Workspace)
- **Adobe Target** personalization (A/B and experience targeting)
- A **Marketo** lead-capture form embedded as a reusable block, wired into a car-customization "find an installer" flow
- A working reverse proxy pattern that lets the demo domain transparently surface pages/assets from `www.3m.com` and `order.3m.com`, so the POC can sit alongside 3M's real digital properties without a full migration
- A site-wide, categorized cookie-consent system gating both analytics and personalization

It is **not** production 3M infrastructure. Everything lives in demo GitHub orgs/repos and demo Adobe tenants; no real 3M credentials, customer data, or production traffic are involved.

---

## 2. Repositories

| Repo | Purpose |
|---|---|
| **`ynaka-adobe/3m`** | The EDS site itself: all page blocks, scripts, styles, and the DA-authored content. This is a standard aem-boilerplate-derived project. |
| **`ynaka-adobe/AEM-p154856`** | CDN / edge configuration (Adobe Managed CDN "CDN as code") for every `*.ynaka-adobe.com` demo domain in this environment, including 3M's. Deployed via Cloud Manager on every commit to `main`. |

### 2.1 Environments (ynaka-adobe/3m)

| Environment | URL pattern | Content source |
|---|---|---|
| Local dev | `http://localhost:3000` | Local working copy + previewed DA content |
| Feature preview | `https://{branch}--3m--ynaka-adobe.aem.page/` | Branch code + previewed DA content |
| Production preview | `https://main--3m--ynaka-adobe.aem.page/` | `main` + previewed DA content |
| Production live | `https://main--3m--ynaka-adobe.aem.live/` | `main` + **published** DA content |
| Custom domain (reverse-proxied) | `https://3m.ynaka-adobe.com/` | Same as production live, fronted by Adobe Managed CDN |

Authoring happens in **DA** (`https://da.live/#/ynaka-adobe/3m`), a Google-Docs-like editor. Authors create/edit pages and sheets there; "Preview" pushes a page to the `.aem.page` environment, "Publish" pushes it to `.aem.live`.

---

## 3. High-Level Architecture

```
┌───────────────────────┐        author         ┌──────────────────────┐
│   DA (da.live)        │ ───────────────────▶  │  EDS content bus     │
│  docs/library/*       │                       │ (preview/live)       │
│  pages (hero, cards…) │                       └──────────┬───────────┘
└───────────────────────┘                                  │
                                                           ▼
┌───────────────────────────────────────────────────────────────────────┐
│  ynaka-adobe/3m  (GitHub)                                             │
│  blocks/*.js + *.css   scripts/*.js   styles/*.css                    │
│  — vanilla JS, no build step, loaded directly by the EDS runtime —    │
└───────────────────────────────────────────┬───────────────────────────┘
                                             │ code-bus (AEM Code Sync)
                                             ▼
                         https://main--3m--ynaka-adobe.aem.live/
                                             │
                                             ▼
┌───────────────────────────────────────────────────────────────────────┐
│  Adobe Managed CDN  (config in ynaka-adobe/AEM-p154856, config-eds/)  │
│  originSelectors + requestTransformations per domain                  │
│                                                                       │
│   3m.ynaka-adobe.com/*            → EDS origin (default)              │
│   3m.ynaka-adobe.com/*.html       → rewritten to extensionless path   │
│   3m.ynaka-adobe.com/mmm          → www.3m.com   (homepage proxy)     │
│   3m.ynaka-adobe.com/mmm/login    → order.3m.com/store/.../login      │
│   3m.ynaka-adobe.com/store/*      → order.3m.com  (bCom asset tree)   │
│   3m.ynaka-adobe.com/en_US/* etc. → www.3m.com    (3m.com asset tree) │
└───────────────────────────────────────────────────────────────────────┘
                                             │
                      ┌──────────────────────┼───────────────────────┐
                      ▼                      ▼                       ▼
              www.3m.com (real)      order.3m.com (real)      Browser (visitor)
```

In the browser, visitor interaction triggers:

```
Page load → consent.js (banner) → analytics.js (queued events) → analytics-transport/*
                                 → target.js (gated on "personalization" consent)
Block render → locator.js ("Get a quote") → marketo.js (lazy-loaded form) → identity.js (demo-only, in-memory)
```

---

## 4. Content Model (DA)

Content lives under the DA org/repo **`ynaka-adobe/3m`**, mirroring the GitHub repo name (they are independent systems, not the same storage).

- **Pages** — authored as DA documents, one per site page (e.g. `/en/products`, `/en/car-personalization/installers-dealers`). Each page is built from sections, each section built from blocks.
- **`docs/library/blocks.json`** — the block-library *registry* sheet shown to authors inside DA's block picker. It must list every block + named variation that exists in code, or authors cannot discover/insert it.
- **`docs/library/blocks/*.html`** — one documentation page per block, showing example markup/variants for authors.

### 4.1 Block library status

An inventory pass (see §9) compared every block + CSS variant in `/blocks` against `blocks.json`. Result:
- 30 total block entries now registered (13 new pages added + 2 existing pages extended with newly-discovered variants: `hero (mds)`, `cards (mds)`, `cards (mds, product)`).
- **`blocks.json` is a JSON sheet; the preview/publish tooling available in this project cannot process sheets (only `.html` pages).** It must be published manually from the DA UI's sheet editor after any update to this file. This is a known tooling gap, not a content error — check the sheet's publish status in DA before assuming the library is live.

---

## 5. Blocks Inventory

| Block | Purpose |
|---|---|
| `hero`, `hero-video` | Page hero / promo banners, incl. an "mds" (Figma design-system) variant |
| `cards`, `dynamic-cards` | Card grids, incl. "mds" and "mds, product" variants |
| `carousel` | Media/content carousel (progress nav, legibility, hero-video and dynamic-media variants developed on feature branches) |
| `columns`, `column-link-list`, `stackable` | Layout helpers |
| `accordion`, `anchor-nav`, `jump-links`, `page-nav`, `breadcrumb` | Navigation/disclosure helpers |
| `compare-table`, `image-features`, `resource-list` | Content-rich marketing blocks |
| `product-selector`, `visualizer`, `industry-navigator` | 3M product-discovery blocks |
| `locator` | Installer/dealer locator (map + list + search + filters); see §6 |
| `marketo` | Marketo form embed; see §7 |
| `target-offer` | Adobe Target HTML-offer slot; see §8.2 |
| `news`, `who-we-are`, `contact-cta` | Corporate content blocks |
| `header`, `footer`, `fragment` | Global chrome / content reuse |

---

## 6. Locator → "Get a Quote" Flow

**File:** `blocks/locator/locator.js`

1. Block loads `installers.json` (or a per-language `/​{lang}/consumer/installers.json`), rendering a map (pins) + searchable/filterable list.
2. Selecting an installer (card or pin) reveals a **"Get a quote"** button on that card.
3. Clicking it lazy-loads the **Marketo block module** (`blocks/marketo/marketo.js`) and opens it inside a modal (`openQuote()`), titled with the installer's name (e.g. *"Get a quote — Apex Auto Styling"*).
4. The modal is dismissible via **✕**, **Esc**, or backdrop click; page scroll locks while open.
5. The locator is also exposed as a stand-alone full-screen modal (`openLocatorModal()`) so any other block (e.g. `visualizer`'s "Find an installer" CTA) can trigger the same flow.
6. The Marketo form URL is **authorable** per locator instance via a `quote` config row; it defaults to a built-in demo form (`860-YON-741` / form `3`).

---

## 7. Marketo Integration

**File:** `blocks/marketo/marketo.js` (46 lines, intentionally minimal)

- Authors paste a single **Marketo form design URL** into the block's cell, e.g.:
  ```
  https://engage-ab.marketo.com/?munchkinId=860-YON-741#/ds/mktform/3
  ```
- The block parses `munchkinId` from the query string and the form ID from the URL hash, derives the tenant's `mktoweb.com` host, loads Marketo's `forms2.min.js` from that host, and calls `MktoForms2.loadForm(...)`.
- Rendering is **inline** in the block (not Marketo's lightbox/popup). A lightbox variant was scoped but not built in this round.
- **Note for local testing:** Marketo rejects submissions from unrecognized origins, so `localhost` never completes a real POST. Verify form submission on a deployed preview or the live domain.

---

## 8. Analytics, Consent & Personalization

### 8.1 Consent (`scripts/consent.js`)

- Presents a cookie-consent banner on first visit with three categories, intentionally mirroring TCF/IAB-style grouping:
  - `necessary` — always on
  - `analytics` — gates the data layer / collection
  - `personalization` — gates Adobe Target
- Choice persists to **both** `localStorage` and a first-party cookie (`threem_consent`), so either a client script or a server/tag-manager consumer can read it.
- A "Cookie preferences" link is injected into the footer so visitors/auditors can reopen and change their choice at any time.
- Supports **named experience variants** (`?consent-variant=nudge`) for demonstrating consent-UX optimization guidance — copy/placement only changes; the underlying consent machinery and guarantees (reject-all always available, necessary always on) are identical across variants.
- `?consent-reset=1` clears the stored decision (demo/testing convenience only).

### 8.2 Analytics (`scripts/analytics.js`, `scripts/analytics-config.js`, `scripts/analytics-transport/*`)

- All instrumentation writes a single, transport-agnostic event stream to `window.adobeDataLayer`. Events are **queued until `analytics` consent is granted**, then flushed; revoking consent stops collection immediately.
- Event types captured: `page-view`, `block-view` (impressions), `cta-click`, `navigation-click`, `download-click`, `scroll-depth`, `form-view` / `form-start` / `form-submit`, `consent-update`.
- **Transport is swappable, chosen automatically by which credentials are configured** in `analytics-config.js` (single file to edit to "go live"):

  | Mode | Requires | Status in this POC |
  |---|---|---|
  | `websdk` (Adobe Experience Platform via alloy.js) | `edgeConfigId` + `orgId` | Built, dormant (no datastream configured) |
  | `appmeasurement` (classic Adobe Analytics) | `reportSuiteId` + `trackingServer` | **Active** — wired to a real demo report suite (`acsmarketingtebg`) in Adobe's `acsmarketing` org |
  | `debug` | nothing | Fallback; always available |

  Any value can be overridden per-page via `<meta>` tags, and forced via `?analytics-mode=debug` for testing.
- **No secrets are embedded.** Report suite IDs, org IDs, and tracking-server hostnames are public, client-side identifiers — the same values Adobe Analytics ships in every page's source in production.

### 8.3 Live Insights Panel (`scripts/insights.js`, `scripts/signals.js`)

- A **presenter-only** slide-over panel (never shown to a normal visitor) that visualizes the live event stream as it happens — impressions, CTA clicks, downloads, scroll depth, form engagement — computed entirely client-side from the same `window.adobeDataLayer` events the transport adapters read. It is a *consumer*, not a second instrumentation path, so what's shown is exactly what is being sent.
- Enabled only via `?insights=1` (remembered per-tab in `sessionStorage`); toggled with `Shift+Alt+I`; disabled with `?insights=0`.
- Shows an explicit "waiting for consent" state before analytics consent is granted — it never fabricates numbers.
- Also surfaces bot/invisible-traffic signals (`scripts/signals.js`) for demonstrating traffic-quality assessment.
- **In progress (PR #47, not yet merged to `main`):** a real-time **Identity card**, added above the panel's Observations section. When a visitor submits the Marketo "Get a quote" form, `scripts/identity.js` captures the submitted field values **in memory only** (never written to storage, never logged, never sent to Adobe) and the panel visualizes what a first-party identity looks like the moment it's created. This is deliberately kept off the real data layer/transport path — direct identifiers (name, email, phone) must never reach a report suite — while `analytics.js` continues to emit a privacy-safe `form-submit` event (component + form name only) on the real path. Capture is itself gated on analytics consent and only ever runs when the insights panel (`?insights=1`) is active.

### 8.4 Adobe Target (`scripts/target.js`, `blocks/target-offer`)

- Loaded **only** when a page has a `target` (or `target-mbox-hero`) meta tag, **and only after `personalization` consent is granted** — `at.js` never loads on an opt-out basis.
- Supports both the modern VEC/page-load flow (`getOffers`/`applyOffers`, targeting `.target-offer` blocks or named mboxes) and a legacy `getOffer`/`applyOffer` hero-mbox flow.
- Target-injected markup bypasses EDS's normal block-decoration pass; both `target.js` and `target-offer.js` explicitly re-run `decorateBlock`/`loadBlock` on whatever Target just injected so nested EDS blocks (e.g. a `hero` fragment delivered as a Target offer) render fully decorated, not as raw markup.
- Hero-mbox offers pin the resolved DOM element with a unique attribute before calling `applyOffer`, specifically to avoid at.js re-matching a loosely-scoped selector against the wrong element if the page's async header/subnav insertion hasn't completed yet.
- The Universal Editor's preview iframe is explicitly excluded from loading Target, so at.js doesn't fight UE's CSP.

---

## 9. Block Library Audit Process

To keep DA's authoring experience in sync with what's actually implemented in code, an inventory was run comparing:
1. Every block directory + CSS file (and any named `.block-name` variant classes within it) in `ynaka-adobe/3m`'s `/blocks`.
2. Every entry registered in `docs/library/blocks.json`.

Gaps were closed by creating a DA documentation page per missing block (13 pages) and adding missing variant rows to two existing pages (`hero`, `cards`). All 13 new + 2 updated **pages** were previewed and published. The **registry sheet itself** (`blocks.json`) could not be published by available tooling (see §4.1) and needs a manual publish in DA.

**Recommendation for 3M IT:** repeat this audit whenever a new block or named variant ships, and treat an unpublished `blocks.json` as a release-blocking checklist item — authors cannot use a block they cannot find in the picker.

---

## 10. CDN / Reverse-Proxy Architecture (ynaka-adobe/AEM-p154856)

**File:** `config-eds/cdn.yaml` — Adobe Managed CDN "CDN as code". Deployed automatically by Cloud Manager on every commit to `main` (a few minutes of propagation delay observed).

This file defines, per custom domain, an ordered list of **origin-selector rules** (which backend serves a given request) and **request-transformation rules** (path rewrites applied before forwarding).

### 10.1 Why a reverse proxy at all

The POC needed to demonstrate 3M-specific flows (bCom login, www.3m.com content) without migrating those systems into EDS. The CDN layer transparently fans requests out to 3M's **real, live** systems for specific paths, while everything else is served by the EDS site.

### 10.2 Rules implemented for `3m.ynaka-adobe.com`, in evaluation order

| Order | Rule | Matches | Routes to | Rewrites to |
|---|---|---|---|---|
| 1 | `route-3m-mmm-login` | `/mmm/login`, `/<lang>/mmm/login` | `order-3m` origin (`order.3m.com`) | — |
| 2 | `route-3m-mmm` | `/mmm`, `/<lang>/mmm` (and any sub-path) | `3m-www` origin (`www.3m.com`) | — |
| 3 | `route-3m-mmm-assets` | `/en_US/`, `/3m_theme_assets/`, `/3M/`, `/etc.clientlibs/`, `/etc/`, `/content/dam/`, `/wps/`, `/akam/`, `/favicon.ico` | `3m-www` origin | — |
| 4 | `route-3m-order-assets` | `/store/*` | `order-3m` origin | — |

Request transformations (applied regardless of selector order, matched independently):

| Rule | Matches | Rewrite |
|---|---|---|
| `rewrite-3m-mmm-login` | `/mmm/login`, `/<lang>/mmm/login` | → `/store/bComUSSite/en_US/login` |
| `normalize-3m-mmm-root` | `/mmm`, `/<lang>/mmm` (root only) | → `/` |
| `serve-html-extension` | any `*.html` path not already an EDS fragment/code path | strips `.html` so e.g. `/en/products.html` serves the EDS page `/en/products` without a redirect |

### 10.3 Why rule *order* matters

`route-3m-mmm`'s pattern (`^/([a-z]{2}/)?mmm(/|$)`) also matches `/mmm/login`. The more specific `route-3m-mmm-login` rule must be evaluated **first** so `/mmm/login` is routed to `order.3m.com` instead of falling into the generic `www.3m.com` proxy.

### 10.4 Why asset-routing rules were needed (not just the page route)

Proxying an HTML page from a third-party origin is not sufficient on its own: that page's **own root-relative asset references** (`/en_US/...`, `/store/_ui/...`, etc.) resolve against whatever domain the browser is currently on — `3m.ynaka-adobe.com`, not the real origin — once the page itself has been proxied there. Each proxied page family (`www.3m.com`, `order.3m.com`) therefore needed its *own* asset-prefix routing rule, or the browser gets 404s for every stylesheet/script/image the proxied page references.

### 10.5 Known limitations / open items

- **"mmm" is a purely internal demo alias**, not a real `www.3m.com` path segment. Only two mappings exist today: `/mmm` (and `/<lang>/mmm`) → 3m.com homepage, and `/mmm/login` → bCom login. **Any further `/mmm/*` sub-path a stakeholder wants working (e.g. `/mmm/products`, `/mmm/checkout`) needs an explicit new rule** — there is no generic path-mapping table, by design, since 3M's real site structure doesn't correspond 1:1 to the demo's alias scheme.
- CDN config changes require a Cloud Manager pipeline run; they are **not instant** on merge (observed: a few minutes). Always allow for deploy lag before concluding a merged fix "didn't work."
- Sandbox/local network restrictions can make `curl` to `www.3m.com` or to `3m.ynaka-adobe.com/mmm*` paths unreliable from some environments; a real browser is the reliable verification path for these specific routes.

---

## 11. Figma-to-EDS Page Migration (parallel workstream)

Two independent approaches were used to convert Figma designs into EDS sample pages, for comparison:

1. **Screenshot-based matrix** (this workstream): screen grabs → a block-usage matrix → a sample page (`/blocks/mds-components`) built from existing + new supporting blocks.
2. **Modernization Agent / Figma API migration** (a colleague's workstream, branch `aem-20261006-1739`): used the Experience Modernization Agent's native Figma integration to migrate pages directly, producing `/en/figma-site-template-1` and `/en/figma-site-template-2`.

Both were merged into `main` (PRs **#45** and **#46**) after confirming no file-level conflicts (they touched disjoint block/page sets). This is a useful reference for 3M IT evaluating which Figma-to-code migration path best fits their design-ops workflow.

---

## 12. Security & Compliance Notes for 3M IT

- **No secrets in source.** Every Adobe identifier committed (report suite ID, org ID, tracking server, Target server domain) is a public client-side value, equivalent to what ships in any production Adobe Analytics/Target page today.
- **Consent gates both measurement and personalization**, not just a cosmetic banner — `analytics.js` queues events until `analytics` consent exists; `target.js`/`initTarget()` never fetches `at.js` until `personalization` consent exists.
- **Direct identifiers (name, email, phone) from the Marketo quote form are never sent to Adobe Analytics.** They are held in an in-memory, demo-only channel (`identity.js`) solely to power the presenter-only insights panel, and are never persisted, logged, or forwarded — this was a deliberate architectural choice, not an oversight (see §8.3).
- **The reverse proxy forwards cookies and the Authorization header** (`forwardCookie: true`, `forwardAuthorization: true`) to `www.3m.com` and `order.3m.com` so session-bearing flows like bCom login behave correctly end-to-end. 3M IT should confirm this is acceptable for any further real-system paths added to the proxy, since it means the demo domain is, in effect, a trusted intermediary for those specific paths.
- **GitHub permissions are asymmetric per repo** in this environment (one account can push to `ynaka-adobe/3m`, a different account to `ynaka-adobe/AEM-p154856`) — purely an artifact of how this demo environment's accounts were provisioned, not a recommendation for how 3M should structure production access.

---

## 13. Glossary

| Term | Meaning |
|---|---|
| **EDS** | Adobe Edge Delivery Services — a document-based, performance-first web framework; pages are rendered server-side from authored content, not served purely headless/API-only |
| **DA** | Document Authoring — the da.live content-editing UI for EDS |
| **Block** | A reusable, self-contained content component (JS + CSS), the core EDS building block |
| **Code bus / Content bus** | EDS's two independent delivery pipelines — code (this GitHub repo) vs. content (DA) |
| **mmm** | Internal-only demo alias path prefix proxying to 3M's real domains; not a real 3m.com path |
| **bCom** | 3M's B2B ordering portal, served at `order.3m.com` |
| **mbox / offer** | Adobe Target's terms for a targeted placement and the content served into it |
