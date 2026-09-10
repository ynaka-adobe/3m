/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: 3M section breaks + section-metadata.
 *
 * Runs in afterTransform only. Reads payload.template.sections and, in reverse
 * order, inserts a <hr> before every non-first section and a Section Metadata
 * block for every section that declares a `style`.
 *
 * Section selectors come from tools/importer/page-templates.json, all verified
 * against migration-work/cleaned.html:
 *   div.MDS > div.MDS-bannerHero                              (hero)
 *   div.MDS > div.MDS-cardsContentComplex.bb-10               (mission-intro)
 *   div.MDS > div.MDS-cardsIconBlock                          (here-to-help)
 *   div.MDS > div.MDS-cardsContentComplex.product-cards--4    (government-grid)
 *   div.MDS > div.MDS-cardsArticles                           (proof-science, style=grey)
 *   div.MDS > div.MDS-cardsContentComplex.mds-3cards-container-w (keep-exploring)
 *   div.MDS > div.mds-footer.MDS-mmm-flex-col                 (customer-support)
 *
 * Expected results for a 7-section template with 1 styled section:
 *   <hr> section breaks: 6 (one before each non-first section)
 *   Section Metadata blocks: 1 (proof-science -> style "grey")
 */
const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

/**
 * Resolve the first element matching a section selector, relative to the
 * content root. Template selectors are written as "div.MDS > ...". The
 * transform `element` may already be the div.MDS content root, so we try
 * the selector as-is first, then fall back to the segment after "div.MDS >".
 */
function findSectionElement(root, selector) {
  let el = root.querySelector(selector);
  if (el) return el;
  const child = selector.replace(/^\s*div\.MDS\s*>\s*/, '');
  if (child && child !== selector) {
    el = root.querySelector(child);
    if (el) return el;
  }
  return null;
}

export default function transform(hookName, element, payload) {
  // Run in beforeTransform so section boundaries are inserted while the
  // original section elements still exist. Block parsers run AFTER this and
  // replace the section elements via replaceWith(...), which leaves the
  // inserted <hr> breaks and Section Metadata blocks intact as siblings.
  if (hookName === TransformHook.beforeTransform) {
    const sections = payload
      && payload.template
      && Array.isArray(payload.template.sections)
      ? payload.template.sections
      : [];

    if (sections.length < 2) return;

    const doc = element.ownerDocument || document;

    // Process in reverse so earlier insertions do not shift later lookups.
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      const sectionEl = findSectionElement(element, section.selector);
      if (!sectionEl) continue;

      // Section Metadata block for styled sections, inserted AFTER the section.
      if (section.style) {
        const metaBlock = WebImporter.Blocks.createBlock(doc, {
          name: 'Section Metadata',
          cells: { style: section.style },
        });
        sectionEl.after(metaBlock);
      }

      // Section break before every section except the first.
      if (i > 0) {
        const hr = doc.createElement('hr');
        sectionEl.before(hr);
      }
    }
  }
}
