# 3M Brand Guideline Report

**Overall assessment: recognizable and partly on brand, but not yet aligned with the September 2026 identity refresh.**

The strongest foundations are the genuine 3M Circular typeface, science-led storytelling, purposeful imagery, the desktop logo lockup, and correctly colored primary homepage CTAs. The most material deviations are the outdated red in logo assets, Light headline styling, inconsistent interface colors, and uncontrolled Japanese font fallback. Preview content also contains unfinished material that should not be treated as launch-ready.

## Scope and evidence

- Review date: November 9, 2026.
- Authority: supplied **3M Visual Identity Guidelines, September 2026, Version 7.0**, 98 pages. Page references below are PDF page numbers.
- Repository baseline: `november-golive`, commit `91dcf76`.
- Method: document text and section review, visual inspection of selected guideline diagrams, repository CSS/SVG inspection, and browser screenshots/computed styles. This is a brand-alignment review, not formal 3M approval, an exhaustive accessibility audit, or a review of every page on 3m.com.
- Rendered sample: [English homepage](https://november-golive--3m--ynaka-adobe.aem.page/en/) at 1440px and 390px; [Japanese homepage](https://november-golive--3m--ynaka-adobe.aem.page/jp/) at 1440px; [car-personalization landing page](https://november-golive--3m--ynaka-adobe.aem.page/en/car-personalization) at 1440px; [Restyling Studio](https://november-golive--3m--ynaka-adobe.aem.page/en/car-personalization/studio) at 1440px and 390px.
- All listed sample routes returned HTTP 200. `/en/car-personalization/` with a trailing slash returned 404; that response was not used to assess the landing-page design.
- `localhost:3000` served an unrelated dashboard, so browser evidence was collected from the branch preview, not that local server.
- Screenshots, extracted guideline text, and browser measurements are retained in the current Copilot session's `files/` directory. No website code was changed for this review.

**Status key:** On brand = supported by observed evidence; Partial = aligned foundation with material exceptions; Deviation = observed conflict with a stated guideline; Review needed = insufficient evidence or guidance requiring interpretation. No percentage score is assigned because the sample is not an exhaustive compliance inventory.

## Alignment summary

| Area | Assessment | What is working / what is missing | Guide |
|---|---|---|---|
| Positioning and voice | On brand in finished homepage copy | Materials science, people, progress, and useful outcomes are central. Unfinished application-page copy is a separate exception. | pp. 5, 7-9, 14, 18 |
| Core typeface | On brand for Latin text | Real 3M Circular Light, Regular/Book, and Bold webfonts load successfully. | p. 33 |
| Headline typography | Deviation | Main headlines and major section headings use Light; headline leading and tracking also differ from the specified treatment. | pp. 35-39 |
| Primary brand red | Partial | Homepage primary CTA is exactly `#D10411`; logos and several application controls still use other reds. | pp. 16, 21, 41, 44 |
| Logo and lockup | Partial | Top-left desktop lockup, red mark, black tagline, and sufficient displayed size are present. The digital red is outdated; clear-space approval remains open. | pp. 21-29 |
| Typography colors | Partial | White-on-dark text and red emphasis work well. Blue links, gray body/legal text, and near-black headings depart from the strict type-color guidance. | pp. 35, 37, 42-44 |
| Layout and simplicity | Partial | Clear sections, whitespace, and recognizable actions support clarity. Mobile consent obscures the main message; grid relationships are not consistently demonstrated. | pp. 17, 24, 69-73 |
| Imagery and scientific context | Partial | People at work and relevant environments support the brand. Asset approval, product-render accuracy, and some synthetic-looking imagery need confirmation. | pp. 46-59, 83-88 |
| Japanese localization | Deviation from recommended approach | The Japanese homepage has no explicit Noto Sans JP stack; actual Japanese H1 glyphs used an OS fallback. | p. 34 |
| Graphic elements and gradients | Review needed | Red accents support recognition; legacy rainbow-divider code needs review. The guide does not prohibit every gradient or require decorative elements everywhere. | pp. 43-44, 61-67, 81 |
| Content readiness | Deviation on sampled preview routes | Placeholder copy, placeholder imagery, and visible metadata undermine a finished, intentional brand experience. | pp. 9, 14, 17-18 |
| Iconography | Review needed | Simple interface symbols support clarity; approved-library provenance and consistent optical line weight are not established. | pp. 77-81 |

## Where the implementation is on brand

### 1. Science is connected to outcomes

The homepage explains materials science through recognizable industries and real-world work rather than treating science as decoration. The news stories connect optical innovation, skilled trades, and automotive applications to useful outcomes. This supports the genuine, imaginative, and insightful voice described on p. 9 and the contextual storytelling principle on p. 18.

The people/ideas/science section reinforces the corporate positioning. Its selective red emphasis is directionally consistent with p. 37, which permits concise, purposeful red typography.

### 2. The correct brand typeface is actually rendering

`styles/styles.css:7-25` registers three 3M Circular webfont faces. Browser evidence confirms loaded 300, 400, and 700 faces on the English homepage. Restyling Studio's Latin H1 resolves to a custom 3M Circular Light face, rather than merely declaring a family name.

The eight additional TTFs in `styles/fonts/` expand the available asset inventory, including italic and Black variants. They are not currently registered in CSS. Their presence alone does not change the rendered typography.

### 3. The homepage uses the new primary red correctly in important places

`styles/styles.css:45` defines `--accent: #d10411`. The rendered homepage primary CTA has background `rgb(209, 4, 17)`, exactly matching pp. 21 and 41. The selected industry tab and short red emphasis establish recognizable brand anchors against neutral backgrounds.

This is consistent with leading with red without making every surface red: p. 16 explicitly favors purposeful emphasis rather than indiscriminate fill.

### 4. Desktop identity presentation has a strong foundation

The lockup is placed at the top left with an outlined/vector tagline, not a separately retyped tagline. The tagline remains black on white, and the SVG includes the trademark artwork. The desktop lockup renders at 227 x 40px; the mobile mark renders at 55 x 30px and the English footer mark at 48 x 26px. These displayed heights exceed the p. 24 minimums of 19px for the lockup and 13px for the mark.

The mobile standalone mark is not automatically a violation: p. 23 prefers the lockup for websites but allows the simpler logo where the layout calls for it.

### 5. Much of the imagery supports authentic, purposeful work

The homepage hero shows a person working with scientific equipment. Skilled-trades and automotive scenes communicate people, process, and application. These are consistent with the intent of pp. 46-56.

The Restyling Studio's configurable vehicle has a legitimate explanatory purpose. Three-dimensional rendering is not inherently off brand: p. 88 allows it when it communicates the story effectively. Product-swatch colors are representations of products, not automatically violations of the corporate interface palette.

### 6. The layout often expresses clarity and restraint

Readable left-aligned copy, clearly separated content regions, whitespace, and straightforward CTAs reflect the simplicity principle on p. 17. The studio reorganizes its preview and controls into a stacked mobile layout. The global CTA treatment is rectilinear and visually restrained.

## Priority deviations and recommendations

### P1 - Replace outdated digital logo assets

**Evidence:** `icons/3m-logo.svg:4-5` identifies a CMYK-origin lockup and uses `#FF0000` for the mark. `icons/3m-logo-mark.svg:1` also uses `#FF0000`. The header and English footer reference these assets (`blocks/header/header.js:212-213`; `blocks/footer/footer.js:13`).

**Guideline:** p. 21 changes digital logo red from `#FF0000` to `#D10411`; p. 29 prohibits unauthorized lockup changes.

**Recommendation:** obtain and replace with the current approved RGB logo and lockup from Brand Central. Preserve the approved geometry, tagline, trademark, and proportions. Do not assume recoloring an older asset is equivalent to adopting the newly approved artwork.

### P1 - Bring headline weight, leading, and tracking into the refreshed hierarchy

**Evidence:** the English homepage H1 renders at weight 300, 88px size, 92.4px leading, and -1.76px tracking. Restyling Studio's H1 renders at weight 300, 56px size, 58.8px leading, and -1.12px tracking. Relevant sources include `blocks/hero-video/hero-video.css:42-48`, `blocks/hero/hero.css:55-60`, `styles/styles.css:333-340`, and `blocks/who-we-are/who-we-are.css:12-17`.

**Guideline:** p. 35 specifies Bold or Black headlines and 1.1 leading. P. 36 allows Regular as a hierarchy substitution and Light for other important information, not a general Light headline treatment. P. 39 limits headline tracking to -5 in the publishing tools.

**Recommendation:** use Bold as the headline default, with Black where justified; reserve Light for secondary display information. Adopt 1.1 headline leading. Translate the publishing-tool tracking guidance deliberately into CSS; current -0.02em is substantially tighter than the usual -0.005em interpretation of -5/1000 em. Verify line breaks after the change.

The homepage eyebrow also renders in Bold rather than the Regular treatment illustrated on p. 36. Treat its illustrated 1:6 size relationship as a hierarchy check across breakpoints, not a mandate to make mobile labels illegibly small.

### P1 - Consolidate interface colors without recoloring products

**Evidence:** the correct global red coexists with `#c80000` in consent (`styles/consent.css:9`), `#e00` in visualizer active controls (`blocks/visualizer/visualizer.css:163-165`), and other red values in carousel/locator styling. The mobile studio visibly uses bright legacy red for tabs, selection borders, and its installer action. Global links use `#03c`, body text uses `#4b4b4b`, and headings use `#202024` (`styles/styles.css:43-49`).

**Guideline:** pp. 37 and 41-44 define the typography and color system. P. 37 restricts typography to black, white, and purposeful 3M Red. The secondary Rosewood value is `#5F0E11`, not the current `--accent-deep: #8a041f`.

**Recommendation:** centralize brand-facing controls on `#D10411`, define any interaction-state variants explicitly, and review body/link/legal colors against p. 37. Do not present Blue's presence in the functional palette as blanket approval for blue UI text. Preserve real vehicle-film swatches and meaningful product-render colors.

Dark Gray is an approved secondary color on pp. 42-44, but that does not settle its use for body/legal typography under p. 37. Obtain brand-team agreement on any digital exception instead of silently treating all gray text as compliant.

### P1 - Make Japanese typography intentional

**Evidence:** the Japanese page uses the same Latin-first stack (`styles/styles.css:54-55`). Chromium's actual-font inspection reported **PingFang SC Light** for the Japanese H1 glyphs on this machine. A declared 3M Circular family therefore does not mean the Japanese text is rendered in 3M Circular.

**Guideline:** p. 34 recommends Noto Sans for languages unsupported by 3M Circular, including Japanese.

**Recommendation:** define a locale-appropriate Noto Sans JP stack with explicit weights and Japanese language metadata. Check glyph shapes, wrapping, and punctuation at desktop and mobile sizes. The observed OS fallback is machine-specific, not a claim that every visitor receives PingFang SC.

### P1 - Remove unfinished content from the launch surface

**Evidence:** the car-personalization preview displays an unfinished application title, an H1 reading "Insights page title goes here", lorem ipsum, generic product/insight labels, and placeholder imagery. The Japanese homepage and car-personalization page also show metadata fields as visible body content near the footer.

**Guideline:** pp. 9, 14, and 17-18 call for genuine communication, clear purpose, a focal message, and meaningful context.

**Recommendation:** replace placeholder content with approved copy and imagery, and ensure metadata is consumed as metadata rather than displayed. If this is intentionally a component/demo page, exclude it from launch navigation and approval scope. This is a preview-content finding; it does not establish that the same material is published on production 3m.com.

### P2 - Restore the primary message on mobile first visits

**Evidence:** the initial English mobile capture shows the consent panel covering a large part of the hero and obscuring its primary message/actions. Desktop places substantial legal copy over the right-hand hero region.

**Guideline:** p. 17 calls for clear hierarchy and a focal message.

**Recommendation:** review the mobile consent presentation with privacy/legal stakeholders so legally required content and choices remain available without unnecessarily overwhelming the experience. This is an experience/alignment concern, not a claim that the guide prescribes a specific consent-banner design.

### P2 - Review clear space, grid relationships, and legacy decoration

**Evidence:** the desktop logo box begins 15px from the top with a 40px displayed height; mobile has 10px top padding around a 30px mark. These do not demonstrate the preferred half-mark-height clearance from p. 24. The homepage's content begins at x=120px while its desktop lockup begins at x=72px. Various block-specific grids do not establish a shared three-column foundation.

**Recommendation:** measure the visible mark, rather than only its SVG box, against the preferred and minimum clear-space diagrams; agree a website-chrome application of pp. 69-73. Do not label every two- or four-column component a violation: the guideline permits subdivision and optimization for different formats.

`styles/styles.css:306-322` retains a six-color "unicorn" divider using legacy colors. This divider was not observed on the sampled homepage. Review or retire that treatment before authors use it as a general brand device. P. 81 allows specific gradient icon treatments, so "all gradients are forbidden" would be an incorrect reading.

Pp. 62-67 describe suggested red square/rectangle/bar treatments and restrict their application; they are not mandatory decorations for every page. Confirm the scope of any marketing bar treatment in interactive product experiences with the brand team.

### P2 - Confirm imagery and icon provenance rather than assuming approval

**Evidence:** the homepage uses convincing application photography, but a fiber-optic visual appears synthetic/stylized and cannot be certified from the screenshot alone. Studio uses a rendered vehicle; product accuracy and approval records were not available. The icon assets are simple, but their Brand Central provenance is not documented by the inspected code.

**Guideline:** pp. 46-59 prefer authentic, relevant imagery and require production approvals; p. 50 restricts rendering use in application imagery. Pp. 78-81 emphasize consistent, approved icon treatments.

**Recommendation:** establish approved DAM/library sources and usage rights; have a product expert check studio model/material/finish accuracy. Confirm whether the studio falls under an authorized product-visualization exception to p. 50. Treat dramatic lighting or an explanatory 3D view as contextual review items, not automatic failures.

## Decisions required before sign-off

1. Obtain the current approved RGB logo/lockup assets and resolve website clear-space application.
2. Confirm how pp. 35-38 apply to digital typography: headline substitutions, red emphasis, body/legal colors, and short-copy weight. P. 36 specifies Regular body copy while p. 38 recommends Bold for short copy; do not globally bold every web paragraph without interpretation.
3. Agree approved UI color/state tokens and whether any functional-color text exceptions are allowed.
4. Confirm Japanese typeface selection, imagery/icon provenance, and any rendering exception for the studio.
5. Identify the actual launch-page inventory and remove or finish component/demo content within it.
6. Resolve production webfont/embedding rights. `styles/fonts/LICENSING.md` still records unverified WOFF licensing. Permission to commit supplied TTF files does not by itself establish production webfont rights.

## Recommended sequence

**First:** approved digital logo assets, headline hierarchy, shared interface color tokens, intentional Japanese fonts, and launch-content cleanup.

**Then:** mobile consent presentation, clear-space/grid review, imagery/icon approvals, and removal or restriction of legacy treatments.

**Preserve:** the materials-science narrative, authentic people/process scenes, useful product visualization, whitespace, clear CTAs, and the correct primary red already used by the homepage.

**Conclusion:** this implementation communicates 3M convincingly, but it mixes the refreshed system with older visual conventions and unfinished preview content. It needs a focused identity-alignment pass and explicit brand approval, not an unrelated redesign.
