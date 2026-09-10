/* eslint-disable */
/* global WebImporter */
/**
 * Parser for contact-cta.
 * Base block: contact-cta (local 3M block).
 * Source: https://www.3m.com/3M/en_US/government-us/
 *   (div.mds-footer.MDS-mmm-flex-col)
 * Generated for 3M Government landing migration.
 *
 * contact-cta authoring: one cell per row.
 *   Row 1: heading.
 *   Row 2: body copy (a <strong> or <a tel:> phone is preserved).
 *   Row 3: CTA link(s).
 * Source: h3 heading, address <p> lines, a <p> with a tel: link, and two CTA
 * buttons each wrapped in an <a> (Contact us, Request a quote).
 */
export default function parse(element, { document }) {
  const heading = element.querySelector('h1, h2, h3');
  // Body paragraphs (address lines + phone) — exclude any that live in the CTA button group.
  const bodyPs = [...element.querySelectorAll('p')].filter(
    (p) => !p.closest('.footer-buttons'),
  );
  // CTA links live in the footer button group; each wraps a <button>.
  const ctaLinks = [...element.querySelectorAll('.footer-buttons a, a:has(button)')];

  if (!heading && bodyPs.length === 0 && ctaLinks.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];

  // Row 1: heading.
  if (heading) cells.push([heading]);

  // Row 2: body copy (all address/phone paragraphs; tel: link preserved).
  if (bodyPs.length) cells.push([bodyPs]);

  // Row 3: CTA links — convert each button-wrapping <a> to a plain text link.
  if (ctaLinks.length) {
    const actions = ctaLinks.map((a) => {
      const link = document.createElement('a');
      link.setAttribute('href', a.getAttribute('href'));
      link.textContent = a.textContent.trim();
      return link;
    });
    cells.push([actions]);
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'contact-cta', cells });
  element.replaceWith(block);
}
