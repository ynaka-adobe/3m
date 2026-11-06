# Locator page v1 (desktop): real map, filters, "Show more", directions

Execution needs Execute mode. This is the plan only; nothing has been changed yet.

## Goal
Rebuild the existing **locator** block (used on the en/de/jp car-personalization locator pages and opened as a pop-up from the visualizer) as a real map plus list, with the look of the 3M Schweiz dealer finder. It sits inline on the page with no slide-in panel. Desktop only for now. The dealer data uses your backend JSON format, served from sample files until the real backend exists.

## What I found on the 3M Schweiz page
- **The finder isn't 3M's own code.** It is a widget from a third-party vendor, Commerce Connector, drawn on Google Maps. It uses 3M's red `#FF0000` and the 3MCircular font.
- **Maps key.** The Google key on that page belongs to Commerce Connector and is almost certainly limited to 3M domains. We won't reuse it, and the repo has no key of its own. Your decision: no key for v1, so I'll use **Leaflet** (a free map library) with a light grey **CARTO** map style, which is close to their muted grey map. Location search goes through **OpenStreetMap's free address lookup (Nominatim)**. Swapping to Google later only touches the map adapter.
- **Layout.**
  - Light grey panel `#F7F7F7`.
  - A search bar on top with a white 40px input, square corners, placeholder "ZIP, City" and a "Near me" button inside the input.
  - Two tabs, **Map view / List view**: 13px bold uppercase, the active tab has a 4px red underline.
  - In map view the list floats over the left of the map, 380px wide and scrolling on its own.
- **Cards.**
  - White, thin border at 15% black, 10px rounded corners.
  - Left column: a grey dot with the distance under it.
  - Name in 16px bold, address in 13px.
  - The selected card gets a 5px red bar on its left, the dot becomes a red pin, and the contact rows appear (phone, website, Get Directions).
- **Map.**
  - Red teardrop pins; the selected pin is larger.
  - Pins group into red circles with a white count once 20 or more results show.
  - No pop-up on the map. Clicking a pin or a card selects the dealer, scrolls its card into view, and zooms the map in on it.
- **"Show more".** A black pill button, 160×40. It shows 10 results first and adds 10 per click. After each click the map zooms out to fit every result shown, and the button disappears once all results are listed. A hidden live region tells screen readers "N results returned."
- **"Get Directions".** Opens in a new tab: `https://www.google.com/maps/dir/?api=1&destination={lat},{lon}`. This needs no key.
- **Filters there.** Only ZIP/City (with Google suggestions) and "Near me". Search by name and by product type are additions for us.

## Your decisions
| Topic | Decision |
|---|---|
| Map | No key for v1: Leaflet with CARTO tiles and Nominatim address lookup. The Leaflet files are kept in the repo, not loaded from a third-party script host. |
| Sample data | Both sets, picked by language: a US set for `/en` in miles, a Swiss set for `/de` in km. `/jp` uses the US set with km (my assumption). |
| Product filter | Multi-select chips, built from the product types in the data. Picking several chips shows dealers that offer any of them. |
| Block | Rebuild the locator in place. Keep `openLocatorModal()` for the visualizer and keep the "Get a quote" form. |

## Design

### Data
- **Format.** Each dealer is a record like your sample (`companyID`, `companyName`, `phone`, `address`, `address2`, `city`, `stateProvince`, `zip`, `country`, `productType`, `lat`, `lon`, `distanceInMiles`, `deleted`, …).
  - The loader accepts either a plain array or `{ data: [...] }`.
  - It drops `deleted: true` records.
  - It splits `productType` on commas and trims each value.
- **One place to swap in the backend.** A single function `fetchDealers({ lat, lon })` loads the data. For v1 it reads the sample file and works out distances itself. When the backend arrives, only this function changes; it will pass the search location and use the backend's `distanceInMiles`.
- **Sample files.**
  - `/data/dealers-us.json`: about 40 US dealers around Minneapolis/St. Paul, Chicago, Dallas and Los Angeles. Phone numbers are fake (555 numbers).
  - `/data/dealers-ch.json`: about 40 Swiss dealers across Zürich, Bern, Basel, Geneva and Lugano, in the same format.
  - Product types are a mix of 3M™ Automotive Window Film, 3M™ Paint Protection Film, 3M™ Ceramic Coating and 3M™ Wrap Film.
- **Block settings** (authorable rows): `source` (overrides the sample file), `title`, `quote` (the Marketo form, as today), `unit` (`mi`/`km`, which otherwise follows the language), `country` (limits the address lookup to `us` or `ch`, which otherwise follows the language).

### Filter bar (top, one row)
1. **Location**: one "ZIP, City or address" field.
   - Pressing Enter or the search icon looks the place up. There are no suggestions while typing, because the free lookup service only allows one request per second.
   - The map recentres on the place, and the list is sorted by distance.
   - The **Near me** button uses the browser's location and shows messages for "Getting location…", "Location blocked" and "Location unknown".
2. **Company name**: a text field that narrows the list as you type, matching `companyName` regardless of case.
3. **Product type**: the multi-select chips, plus a **Clear filters** link.
4. **Result count**: shown on screen ("24 installers found") and announced to screen readers.

### Results area (desktop, about 640px tall)
- **Map view (default).**
  - The map fills the area; the list floats over its left side.
  - Red teardrop pins, with grouping once there are many.
  - Clicking a pin or a card selects the dealer: red bar on the card, larger pin, map zooms in on it with room left for the list, and the card scrolls into view.
- **List view.** Full-width cards with their details always open, and no map.
- **Card content.**
  - Distance in the left column, shown once a location has been searched.
  - **Company name**.
  - **Address**: `address`, `address2`, `zip city`, `stateProvince`, laid out the right way for US or Switzerland.
  - **Phone** as a call link (`tel:`).
  - **Product types** as small tags.
  - **Get Directions**, opening Google Maps in a new tab with the dealer's coordinates.
  - **Get a quote**, the existing Marketo pop-up.
- **Show more.** 10 results first, then +10 per click. The map zooms out to fit all shown results and the selection clears. The button hides when everything is shown. Changing any filter goes back to 10 results.
- **Before any search.** All dealers that pass the filters show, sorted by name, with the map fitted to the first 10. The Swiss page starts empty until you search; I find a filled map more inviting, but I can match theirs if you prefer.
- **Empty and error states** use the Swiss wording: "We're sorry, we haven't found any installer nearby…" and "The service is currently not available…".

### Look and feel
- The site's own tokens: 3MCircular via the existing font token, red via the `--accent` token, black and grey from the site palette.
- The Swiss measurements above for the input, tabs, cards, pins and pill button.
- On-screen labels in en, de and jp: Map view, List view, ZIP/City, Company name, Near me, Show more, Get Directions, Get a quote, results text.

### Technical notes
- **Leaflet location.** Version 1.9.x and the marker-grouping plugin go in the repo under `/deps/leaflet/`. They load only when the block loads, so other pages aren't slowed down.
- **No site-wide changes needed.** The site's security policy only restricts scripts, so the map tiles and the address lookup work as they are. Map credits (© OpenStreetMap, © CARTO) stay visible, as the tile terms require.
- **Code conventions.**
  - All styles stay scoped to the locator block (`.locator …`), replacing the current `rs-loc-*` classes.
  - Code is split into small parts: data, filters, map adapter, list, quote pop-up.
  - Lint passes (`npm run lint`).
- **Page fixes (local only).**
  - The en page currently points `source` at the old `/installers.json`, so I'll remove that row and let the language default apply.
  - The de and jp pages have translated setting names (`Quelle`, `ソース`), which the block can't read. I'll fix them to the English names, or remove them.
  - These are local changes that the next import will overwrite.

## Checklist
- [ ] Add Leaflet 1.9.x and the marker-grouping plugin (JS, CSS, marker images) under `/deps/leaflet/`, with their licences.
- [ ] Create `/data/dealers-us.json` and `/data/dealers-ch.json`: about 40 dealers each in the backend format, with a mix of product types and a few records using `address2` and `deleted: true`.
- [ ] Rewrite `blocks/locator/locator.js`:
  - [ ] read the settings and work out language, unit and country;
  - [ ] build `fetchDealers()`, which tidies the records, splits product types, drops deleted ones and computes distances;
  - [ ] build the filter bar: location lookup on Enter, Near me, company name, product chips, clear filters, result count;
  - [ ] build the map adapter: red pins, grouping, select and zoom in, zoom out to fit all shown, map credits;
  - [ ] build the Map view / List view tabs;
  - [ ] build the cards: name, address, phone, product tags, distance, Get Directions, Get a quote;
  - [ ] build Show more: +10 per click, refit the map, screen-reader announcement;
  - [ ] link list and map selection both ways, with keyboard access (pins and cards can be focused, Enter selects);
  - [ ] add the empty, error and loading states;
  - [ ] add the en/de/jp labels;
  - [ ] keep `openLocatorModal()` working for the visualizer.
- [ ] Rewrite `blocks/locator/locator.css` for desktop to the Swiss look, using the site tokens.
- [ ] Fix the settings rows on the en/de/jp locator pages (local only).
- [ ] Check in the preview on the en and de locator pages:
  - [ ] the map draws;
  - [ ] searching "55344" or "Zürich" sorts by distance;
  - [ ] the name filter and product chips work;
  - [ ] Show more adds 10 and zooms out;
  - [ ] Get Directions opens the right Google Maps link;
  - [ ] Get a quote opens the form;
  - [ ] the visualizer's "Find an installer" pop-up still works.
- [ ] Run `npm run lint` and fix any issues.
- [ ] Commit to `november-golive_locator0` and push, if you want that, then share the branch preview link.

## Later (not in v1)
- Mobile layout.
- Connecting the real backend: send the search location and use its `distanceInMiles`.
- A 3M-owned Google Maps key with suggestions while typing, then switching the map adapter to Google.
- Website and email rows on the card, and "Copy address".
