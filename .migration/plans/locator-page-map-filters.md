# Locator v2: customer feedback, gaps and changes (decisions applied)

Planning only, nothing has been changed yet. Executing it needs Execute mode. v1 is live on the `november-golive_locator0` branch sites: Google map, proxy data, product chips (AND), "Show more" widening the radius 50 → 100 → 200 mi, and Get a quote via Marketo.

## Gap analysis and decisions

| # | Area | Customer wants | Today | Change (decided) | Effort | Still open |
|---|---|---|---|---|---|---|
| 1 | Product filter | Five product options | Chips built from the data, AND | **Keep chips built from the data** (AND). No fixed list or label mapping | — | — |
| 2 | Partner type filter | Authorized Dealer and Pro Shop Dealer | None | A second chip group built from `partnerType` data; OR inside the group, AND with products | S | — |
| 3 | Sort order | Pro Shops first, then distance | Distance only | Sort by Pro Shop, then distance, within the loaded radius | S | — |
| 4 | Pro Shop badge | Logo badge on Pro Shop listings only | None | A badge with the logo on Pro Shop cards | S | The logo file (SVG) |
| 5 | Certification | Shown when applicable | Not shown | A small label from `certificationType` when not blank | S | — |
| 6 | Address | Links to the map/directions | Plain text, plus "Get Directions" | The address becomes a directions link (new tab), **and the "Get Directions" link stays** | S | — |
| 7 | Phone | Behind a toggle, tracked | Visible `tel:` link | A "Show phone number" button reveals a `tel:` link; reveal and call are tracked | S | — |
| 8 | WhatsApp | "Chat on WhatsApp" when present | Not shown | Revealed by the same toggle: a `wa.me/{digits}` link (new tab) when `whatsApp` isn't blank. Add the country code (US: 1) if it's missing | S | — |
| 9 | Website | Clickable link | Not shown | A new-tab link (`noopener`), adding `https://` when missing | S | — |
| 10 | Email | Not shown | Not shown ✓ | No change; never rendered | — | — |
| 11 | Get a Quote | Salesforce form in a pop-up | Marketo demo form | Load the Salesforce form in the existing pop-up, prefilled with the installer's ID | M | **The Salesforce form's address or embed code and the prefill field** |
| 12 | Outgoing links | New window, no disclosure | Directions only | All external links open in a new tab, with a screen-reader "opens in a new window" label | S | Compliance sign-off (no change expected) |
| 13 | Location declined | Default location per country | St. Paul / Zürich | **No IP lookup.** If location is declined or blocked, centre on the **centre of the country** (US: 39.83, −98.58; CH for de), start at 200 mi, and prompt for a ZIP or city | S | — |
| 14 | Numbered pins | Pins numbered and matched to the list | Plain pins and clusters | Numbers 1…N on pins and cards; **clustering stays**, so numbers show once zoomed in | M | — |
| 15 | Responsive | Responsive | Desktop only | Mobile and tablet layout: stacked filters, Map/List tabs, full-width cards | M–L | — |
| 16 | Distance | Miles | Shown ✓ | No change | — | — |
| 17 | Usage tracking | Track phone and WhatsApp use | None | Adobe Analytics events `locator:phone-reveal`, `locator:phone-call`, `locator:whatsapp`, `locator:website`, `locator:directions`, `locator:quote` | M | — |
| 18 | Data check | Pro Shop, certification, WhatsApp, website data | Only "Authorized Dealer" seen; `whatsApp` null; `website` often empty | Pull a wider proxy sample to confirm the values before building items 2–9 | S | — |

## Open points
- **Pro Shop logo** (item 4).
- **Salesforce form details** (item 11). Until then, the quote pop-up keeps the Marketo form.
- **Compliance sign-off** on outgoing links (item 12).

## Checklist
- [ ] Pull a wider proxy sample (e.g. Los Angeles, 200 mi): distinct `partnerType`, `certificationType`, `productType`, `whatsApp`, `website`.
- [ ] Partner type chips from the data (OR inside the group, AND with products), with "Clear filters" covering both groups.
- [ ] Sorting: Pro Shops first, then distance.
- [ ] Card:
  - [ ] Pro Shop badge
  - [ ] certification label
  - [ ] address as a directions link, keeping "Get Directions"
  - [ ] website link
  - [ ] "Show phone number" toggle revealing phone and WhatsApp
  - [ ] Get a Quote
- [ ] External links: new tab, `rel="noopener noreferrer"`, screen-reader label.
- [ ] Fallback location: centre of the country per language, starting at 200 mi, with a prompt to enter a ZIP or city.
- [ ] Numbered pins and cards (1…N) in both views, keeping clustering and selection linked both ways.
- [ ] Analytics events (item 17) through the existing Adobe Analytics setup.
- [ ] Responsive layout for mobile and tablet.
- [ ] en/de/jp labels for all new texts.
- [ ] Unit tests for sorting, partner filter, link building (phone, WhatsApp, website) and the country-centre fallback; then lint and a preview check.
- [ ] Get a Quote on the Salesforce form, once the details arrive.
- [ ] Commit, push and publish to the branch preview and live sites once reviewed.

Optional: I can turn on the **modern-web-guidance** plugin, which gives me current web best-practice guidance (useful for the responsive and accessibility work). Tell me if you want it.
