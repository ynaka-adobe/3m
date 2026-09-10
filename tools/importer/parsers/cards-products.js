/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-products.
 * Base block: cards (local 3M block), "products" variant.
 * Source: https://www.3m.com/3M/en_US/government-us/
 *   (div.MDS-cardsContentComplex.product-cards--4)
 * Generated for 3M Government landing migration.
 *
 * cards convention: 2 columns, multiple rows.
 *   Row 1: block name (+ variant).
 *   Each card row: cell 1 = image, cell 2 = text content
 *     (title as heading, description, optional CTA linked text).
 * Section heading (h2 "Government") stays as default content OUTSIDE the block.
 * Source: ul > li.MDS-cardsContentComplex_card; each li wraps everything in an
 * <a> (whole-card link) containing an image, a title div, and a description div.
 */
export default function parse(element, { document }) {
  const items = element.querySelectorAll(':scope ul > li');

  const cells = [];
  items.forEach((li) => {
    const cardLink = li.querySelector('a');
    const img = li.querySelector('.MDS-cardsContentComplex_cardImg img, img, picture');
    const titleText = li.querySelector('.mds-font_header--5');
    const details = li.querySelector('.MDS-cardsContentComplex_cardDetails');
    // Description is the detail div that is NOT the title.
    let descText = null;
    if (details) {
      descText = [...details.children].find((c) => c !== titleText && c.textContent.trim());
    }

    // Cell 2: title (heading), description, and a whole-card link.
    const content = [];
    if (titleText) {
      const h = document.createElement('h3');
      h.textContent = titleText.textContent.trim();
      content.push(h);
    }
    if (descText) {
      const p = document.createElement('p');
      p.textContent = descText.textContent.trim();
      content.push(p);
    }
    if (cardLink) {
      const a = document.createElement('a');
      a.setAttribute('href', cardLink.getAttribute('href'));
      a.textContent = titleText ? titleText.textContent.trim() : (cardLink.textContent.trim() || 'Learn more');
      content.push(a);
    }

    cells.push([img || '', content]);
  });

  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // Preserve the section heading (and any rule) as default content ABOVE the block.
  const ul = element.querySelector(':scope ul');
  const preserved = [...element.querySelectorAll('hr, h1, h2, h3, h4, h5, h6')]
    .filter((n) => !ul || !ul.contains(n));

  const block = WebImporter.Blocks.createBlock(document, { name: 'Cards (products)', cells });
  element.replaceWith(...preserved, block);
}
