# Locator: mobile and tablet polish + Lighthouse 100 (desktop and mobile)

Planning only, nothing has been changed yet. Executing it needs Execute mode. Locator v2 is live on the `november-golive_locator0` branch sites.

## Decisions
| Topic | Decision |
|---|---|
| Google Maps loading | Load it in the **EDS delayed phase** (`scripts/delayed.js`, about 3 s after page load). The list, filters and results load right away, and the map area shows a light grey placeholder until then. |
| Location prompt | Never on page load. Start with the country-centre results, and ask for the location on the visitor's **first interaction** (scroll, tap, click or key). Results then switch to their area. |
| Where to measure | The branch live site (`…aem.live`). The `…aem.page` preview tells search engines not to index it, so its SEO score can't reach 100. |

**Risk:** the delayed phase still runs within Lighthouse's measuring window. If loading Google Maps there costs main-thread time, the mobile score drops (Total Blocking Time). If that happens, I'll also wait until the browser is idle, or for the first interaction, and report the scores before and after.

## Gaps found

| # | Area | Issue today | Change | Effort |
|---|---|---|---|---|
| 1 | Performance | Google Maps (≈ 200 KB+ of script) loads while the page builds the block. The block is in the first section, so the cost lands in the initial load | Wait for the delayed phase (a signal from `delayed.js` the block listens for, which also works if the phase already ran); keep the grey placeholder at the map's final size | M |
| 2 | Best practices | The browser's location prompt appears on load, which Lighthouse fails ("geolocation on start") | Ask on the first interaction, once only; until then show the country-centre results and the "Enter a ZIP" hint | S |
| 3 | Best practices | A console error, "Failed to load resource: 404", on the page | Find the missing file and fix or remove the request | S |
| 4 | Layout shift (CLS) | The chip rows, result count and status line appear after the data loads, pushing the tabs and map down | Reserve their space from the start: chip-row placeholders at the final height, and a fixed-height status line | S |
| 5 | Layout shift (CLS) | The list grows from "Loading…" to 10 cards; on desktop the height is fixed, on mobile it can push later content | Placeholder cards with fixed heights while loading; check the shift score on both presets | S |
| 6 | Accessibility | Possible failures: small tap targets ("Show phone number", website link), colour contrast (grey text, chips, badge), heading order (page: h5 breadcrumb → h3 → h1 hero) | Touch targets at least 24 px (44 px on touch screens); contrast at least 4.5:1; fix the heading order in the block and flag content issues | S–M |
| 7 | SEO | The locator pages' title and description are plain text paragraphs, not a metadata block, so there's no meta description and the text shows on the page | Turn them into a proper metadata block in Document Authoring for en/de/jp. This needs your explicit go-ahead to upload and publish when we get there | S |
| 8 | Mobile | Tapping a pin tries to scroll the list, but on mobile the list isn't a scrolling panel, so nothing happens | Scroll the page to the card instead; tapping a card's name brings the map into view | S |
| 9 | Mobile | Map gestures and the quote dialog on small screens | Keep two-finger map panning so the page still scrolls; full-screen quote dialog on phones; check the suggestions dropdown above the keyboard | S |
| 10 | Tablet (600–899 px) | The list is a single column in map view, and two columns only in list view | Two-column cards under the map too; check 768 px portrait and 1024 px landscape (floating list) | S |
| 11 | Touch screens | 32 px buttons are small for fingers | 40–44 px height for chips, Get a quote, Show more and the toggle on touch screens | S |
| 12 | Pop-up locator | Not yet checked on mobile (visualizer → "Find an installer") | Check it and fix its layout on phones and tablets | S |

## Measuring
- Lighthouse run from here against the branch live URL, with the mobile (throttled) and desktop presets, before and after each round of fixes.
- Out of scope unless they block 100: site-wide parts such as the header, footer, consent banner, analytics and Target. I'll report anything there that stops the page reaching 100.

## Checklist
- [ ] Baseline: Lighthouse mobile and desktop on the branch live locator page; note each audit that's below 100.
- [ ] Map in the delayed phase: `delayed.js` signals the block; grey placeholder until the map loads; works if the phase already ran.
- [ ] Location prompt on first interaction only (once); country-centre results until then.
- [ ] Find and fix the console 404.
- [ ] Reserve the space for chip rows, count and status line, and add loading placeholder cards (no layout shift).
- [ ] Accessibility pass: tap targets, contrast, heading order, labels.
- [ ] Mobile: a pin tap scrolls to its card, and a card tap brings the map into view; full-screen quote dialog; suggestions dropdown checked.
- [ ] Tablet: two-column cards under the map from 600 px; check 768 px and 1024 px.
- [ ] Touch-screen sizes (44 px) for the main controls.
- [ ] Check the pop-up locator from the visualizer on mobile and tablet.
- [ ] Content: proper metadata block for the en/de/jp locator pages. Upload to Document Authoring and publish only with your explicit go-ahead.
- [ ] Re-run Lighthouse, mobile and desktop, until every category reaches 100; report the final scores.
- [ ] Unit tests, lint and a preview check on phone, tablet and desktop sizes.
- [ ] Commit, push and publish once reviewed.

Optional: I can turn on the **modern-web-guidance** plugin, which gives me current web best-practice guidance (useful here for performance, accessibility and responsive work). It needs a small project settings file; tell me if you want it and I'll add it.
